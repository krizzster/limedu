// CONFIGURATION ENGINE
const CONFIG = {
    owner: "krizzster",       
    repo: "limedu",              
    branch: "main"
};

// INITIALIZE SUPABASE STORAGE & DATABASE ENGINE SECURELY
const supabaseUrl = 'https://unjdjduiqtldgoybgmnq.supabase.co';
// Make sure to double check this matches your exact copied anon public key from Supabase Dashboard -> Settings -> API Subtab!
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamRqcHVpcXRsZGdveWJnbW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAsImV4cCI6MjA0MH0.YOUR_UPDATED_SIGNATURE_KEY_HERE';

let dbInstance = null;
if (typeof window.supabase !== 'undefined') {
    dbInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
}

let globalData = {};
let currentActiveFriendKey = ""; 
let selectedSubjectFilter = "All";

const MATHS_CHAPTERS = [
    "1. Rational Numbers", "2. Operations on Rational Numbers", "3. Rational Numbers as Decimals",
    "4. Exponents and Powers", "5. Application of Percentage", "6. Algebraic Expressions",
    "7. Linear Equations in One Variable", "8. Triangle and Its Properties", "9. Congruent Triangles",
    "10. Construction of Triangles", "11. Perimeter and Area", "12. Data Handling",
    "13. Symmetry", "14. Visualising Solids"
];

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);
    fetchStateFromSupabase();
});

async function fetchStateFromSupabase() {
    toggleMainLoader(true, "Synchronizing Social Feed...");
    try {
        const { data, error } = await dbInstance.from('hub_state').select('payload').eq('id', 1).single();
        if (error) throw error;
        
        globalData = data.payload;
        document.getElementById('group-title-label').innerText = globalData.groupName || "The Hub";
        
        // Re-authenticate if session is cached
        const cachedUser = localStorage.getItem('limeduUserKey');
        if (cachedUser && globalData.members[cachedUser]) {
            currentActiveFriendKey = cachedUser;
            bootSocialWorkspace();
        }
        renderSubjectFilters();
    } catch (err) {
        console.error("Critical synchronization breakdown:", err);
    } finally {
        toggleMainLoader(false);
    }
}

function handleLogin() {
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('login-error');

    let matchingKey = null;
    for (const key in globalData.members) {
        if (globalData.members[key].name.toLowerCase() === userInp.toLowerCase()) {
            matchingKey = key;
            break;
        }
    }

    if (matchingKey && globalData.members[matchingKey].password === passInp) {
        currentActiveFriendKey = matchingKey;
        localStorage.setItem('limeduUserKey', matchingKey);
        errorEl.innerText = "";
        bootSocialWorkspace();
    } else {
        errorEl.innerText = "🚨 Account key mismatch or invalid identity credentials.";
    }
}

function bootSocialWorkspace() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    const profile = globalData.members[currentActiveFriendKey];
    document.getElementById('current-user-name').innerText = profile.name;
    document.getElementById('current-user-class').innerText = `Class ${profile.currentClass || '--'}`;
    document.getElementById('current-user-avatar').innerText = profile.name.charAt(0).toUpperCase();
    if(document.getElementById('custom-status-input')) {
        document.getElementById('custom-status-input').value = profile.status || "";
    }

    renderFeedStream();
}

function renderSubjectFilters() {
    const container = document.getElementById('subject-filter-rack');
    if (!container) return;
    
    const subjects = ["All", "Science", "English", "Social Science", "Hindi", "Maths", "Sanskrit", "Other"];
    container.innerHTML = subjects.map(sub => `
        <button class="filter-tag ${selectedSubjectFilter === sub ? 'active' : ''}" onclick="applySubjectFilter('${sub}')">
            <i class="fas ${getSubjectIcon(sub)}"></i> ${sub}
        </button>
    `).join("");
}

function getSubjectIcon(sub) {
    switch(sub) {
        case 'Science': return 'fa-flask';
        case 'English': return 'fa-book';
        case 'Social Science': return 'fa-globe-americas';
        case 'Hindi': return 'fa-language';
        case 'Maths': return 'fa-calculator';
        case 'Sanskrit': return 'fa-scroll';
        default: return 'fa-folder-open';
    }
}

function applySubjectFilter(sub) {
    selectedSubjectFilter = sub;
    renderSubjectFilters();
    renderFeedStream();
}

function renderFeedStream() {
    const stream = document.getElementById('social-feed-stream');
    if (!stream) return;

    let postsPool = [];
    for (const memberKey in globalData.members) {
        const member = globalData.members[memberKey];
        if (member.pdfs) {
            member.pdfs.forEach((item, index) => {
                postsPool.push({ ...item, authorKey: memberKey, authorName: member.name, assetIndex: index });
            });
        }
    }

    // Sort chronologically (newest social updates top)
    postsPool.sort((a, b) => new Date(b.date) - new Date(a.date));

    const searchVal = document.getElementById('global-search-bar').value.toLowerCase();
    
    const elementsHtml = postsPool.filter(post => {
        const matchesSubject = selectedSubjectFilter === "All" || post.subject === selectedSubjectFilter;
        const matchesSearch = post.name.toLowerCase().includes(searchVal) || 
                              post.authorName.toLowerCase().includes(searchVal) ||
                              (post.metaInfo && post.metaInfo.toLowerCase().includes(searchVal));
        return matchesSubject && matchesSearch;
    }).map(post => {
        const isOwner = post.authorKey === currentActiveFriendKey;
        return `
            <div class="post-card animate-fade-in">
                <div class="post-header">
                    <div class="profile-avatar active">${post.authorName.charAt(0)}</div>
                    <div class="post-meta-block">
                        <div class="post-author-line">${post.authorName}</div>
                        <div class="post-timestamp"><i class="far fa-clock"></i> ${post.date}</div>
                    </div>
                    ${isOwner ? `
                    <div class="post-actions-wrapper">
                        <button class="post-actions-trigger-btn" onclick="toggleDropdownMenu(event, '${post.authorKey}', ${post.assetIndex})">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="post-actions-dropdown-menu hidden" id="dropdown-${post.authorKey}-${post.assetIndex}">
                            <button class="menu-action-btn delete" onclick="deleteAssetPipeline('${post.authorKey}', ${post.assetIndex})">
                                <i class="far fa-trash-alt"></i> Remove Post
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <h2 class="post-title">${post.name}</h2>
                <span class="subject-badge">${post.subject}</span>
                ${post.metaInfo ? `<p class="post-desc">${post.metaInfo}</p>` : ''}

                <div class="post-content-preview-canvas">
                    ${post.isImageSet ? `
                        <div class="post-preview-box" onclick="launchTheatreImageCarousel('${post.name}', ${JSON.stringify(post.imagePayloads).replace(/"/g, '&quot;')})">
                            <img src="${post.imagePayloads[0]}" alt="Attachment preview">
                            <div class="preview-counter-overlay"><i class="far fa-images"></i> Stack (${post.imagePayloads.length})</div>
                        </div>
                    ` : `
                        <div class="post-preview-box" onclick="launchTheatreStandalonePDF('${post.path}')">
                            <div class="pdf-preview-canvas-placeholder">
                                <i class="fas fa-file-pdf"></i>
                                <span>Preview Document Interface</span>
                            </div>
                        </div>
                    `}
                </div>

                <div class="post-footer-actions">
                    <a class="download-action-link" href="${post.path}" download target="_blank">
                        <i class="fas fa-download"></i> Get File Reference
                    </a>
                </div>
            </div>
        `;
    }).join("");

    stream.innerHTML = elementsHtml || `<div style="text-align:center; padding: 3rem; color: var(--text-secondary); font-weight:700;"><i class="fas fa-mailbox-bubble" style="font-size:2rem; margin-bottom:1rem; display:block;"></i>No classroom posts match this category query yet.</div>`;
}

function toggleDropdownMenu(e, userKey, idx) {
    e.stopPropagation();
    const targetMenu = document.getElementById(`dropdown-${userKey}-${idx}`);
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(menu => {
        if (menu !== targetMenu) menu.classList.add('hidden');
    });
    if(targetMenu) targetMenu.classList.toggle('hidden');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
});

async function syncCustomStatus() {
    const text = document.getElementById('custom-status-input').value.trim();
    globalData.members[currentActiveFriendKey].status = text;
    
    try {
        await dbInstance.from('hub_state').update({ payload: globalData }).eq('id', 1);
        alert("Status updated live on classroom board! 💬");
    } catch (err) {
        console.error("Status Sync Breakdown:", err);
    }
}

// Lightbox Window management
function launchTheatreImageCarousel(title, payloads) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = title;
    view.innerHTML = payloads.map(p => `<img src="${p}" style="max-width:100%; max-height:75vh; border-radius:12px; margin-bottom:1rem; object-fit:contain;">`).join("");
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function launchTheatreStandalonePDF(url) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = "Shared Document Viewer";
    view.innerHTML = `<iframe src="${url}" style="width:100%; height:75vh; border:none; border-radius:12px;"></iframe>`;
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function closeMediaTheatre() { document.getElementById('theatre-lightbox').classList.add('hidden'); }
function openUploadModal(e) { if(e) e.preventDefault(); document.getElementById('upload-modal').classList.remove('hidden'); }
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); }
function toggleMainLoader(show, label = "") { const loader = document.getElementById('loader-container'); if(loader) { if(show){ loader.classList.remove('hidden'); document.getElementById('loader-text').innerText = label; } else { loader.classList.add('hidden'); } } }
function toggleTheme() { const isDark = document.body.classList.toggle('dark-mode'); localStorage.setItem('hubTheme', isDark ? 'dark-mode' : 'light-mode'); updateThemeToggleButton(isDark ? 'dark-mode' : 'light-mode'); }
function updateThemeToggleButton(theme) { const toggleBtn = document.getElementById('theme-toggle'); if (toggleBtn) toggleBtn.innerHTML = theme === 'dark-mode' ? '<i class="fas fa-sun"></i> Light UI' : '<i class="fas fa-moon"></i> Dark UI'; }
function updateFileLabel() { const inp = document.getElementById('modal-file-input'); if(inp && inp.files.length > 0) document.getElementById('file-chosen-text').innerText = `${inp.files.length} attachment(s) locked`; }