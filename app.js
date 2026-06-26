// CONFIGURATION ENGINE
const CONFIG = {
    owner: "krizzster",       
    repo: "limedu",              
    branch: "main"
};

// INITIALIZE SUPABASE STORAGE & DATABASE ENGINE SECURELY
const supabaseUrl = 'https://unjdjduiqtldgoybgmnq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamRqZHVpcXRsZGdveWJnbW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzgzODEsImV4cCI6MjA5MzAxNDM4MX0.qMuQcBysiKuFD5ByoL17fs0KxClgI-FEyzyKYayNVdE';

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
    fetchStateFromSupabase();
});

async function fetchStateFromSupabase() {
    toggleMainLoader(true, "Synchronizing Social Feed...");
    try {
        const { data, error } = await dbInstance.from('hub_state').select('payload').eq('id', 1).single();
        if (error) throw error;
        
        globalData = data.payload;
        
        const labelEl = document.getElementById('group-title-label');
        if (labelEl) labelEl.innerText = globalData.groupName || "The Hub";
        
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
        if (errorEl) errorEl.innerText = "";
        bootSocialWorkspace();
    } else {
        if (errorEl) errorEl.innerText = "🚨 Account key mismatch or invalid identity credentials.";
    }
}

function bootSocialWorkspace() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    if (loginContainer) loginContainer.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    const profile = globalData.members[currentActiveFriendKey];
    
    const userEl = document.getElementById('sidebar-display-name');
    const classEl = document.getElementById('sidebar-current-class');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const statusInp = document.getElementById('custom-status-input');

    if (userEl) userEl.innerText = profile.name;
    if (classEl) classEl.innerText = `Class ${profile.currentClass || '--'}`;
    if (avatarEl) avatarEl.innerText = profile.name.charAt(0).toUpperCase();
    if (statusInp) statusInp.value = profile.status || "";

    renderFeedStream();
    renderLeaderboardEngine();
    renderWorkspaceMemos();
    renderProfileManagementNode();
}

function switchActiveTab(tabKey) {
    document.querySelectorAll('.tab-view-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.hotbar-tab').forEach(tab => tab.classList.remove('active'));
    
    const targetPanel = document.getElementById(`view-${tabKey}`);
    const targetTab = document.getElementById(`tab-${tabKey}`);
    const badgeMode = document.getElementById('app-badge-mode');
    
    if (targetPanel) targetPanel.classList.remove('hidden');
    if (targetTab) targetTab.classList.add('active');
    
    if (badgeMode) {
        if (tabKey === 'feed') badgeMode.innerText = "FEED";
        if (tabKey === 'leaderboard') badgeMode.innerText = "STATS";
        if (tabKey === 'updates') badgeMode.innerText = "MEMOS";
        if (tabKey === 'profile') badgeMode.innerText = "USER";
    }
}

function renderSubjectFilters() {
    const container = document.getElementById('subject-filter-rack');
    if (!container) return;
    
    const subjects = ["All", "Science", "English", "Social Science", "Hindi", "Maths", "Sanskrit", "Other"];
    container.innerHTML = subjects.map(sub => `
        <button class="filter-pill ${selectedSubjectFilter === sub ? 'active' : ''}" onclick="applySubjectFilter('${sub}')">
            ${sub === 'All' ? 'All Subjects' : sub}
        </button>
    `).join("");
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
                postsPool.push({ ...item, authorKey: memberKey, authorName: member.name, authorStatus: member.status || "", assetIndex: index });
            });
        }
    }

    postsPool.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const elementsHtml = postsPool.filter(post => {
        return selectedSubjectFilter === "All" || post.subject === selectedSubjectFilter;
    }).map(post => {
        const isOwner = post.authorKey === currentActiveFriendKey;
        
        let visualPayloadContainer = "";
        if (post.isImageSet && post.imagePayloads && post.imagePayloads.length > 0) {
            visualPayloadContainer = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 12px;">
                    ${post.imagePayloads.map(imgUrl => `
                        <img src="${imgUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 12px; cursor: pointer;" onclick="launchTheatreImageCarousel('${post.name.replace(/'/g, "\\'")}', ['${imgUrl}'])">
                    `).join("")}
                </div>
            `;
        } else {
            visualPayloadContainer = `
                <div class="pdf-attachment-anchor-link" style="margin-top: 12px;" onclick="launchTheatreStandalonePDF('${post.path}')">
                    <i class="fas fa-file-pdf"></i>
                    <div>
                        <span style="display:block; font-weight:700;">${post.name}</span>
                        <span style="font-size:0.75rem; color: var(--text-secondary);">${post.date} &middot; ${post.subject}</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="showcase-card" style="padding: 1.5rem; margin-bottom: 1.25rem; border-radius: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div class="avatar-frame" style="width:40px; height:40px; border-radius:50%; background: var(--social-blue-light); color: var(--social-blue);">
                            ${post.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 style="font-size: 0.95rem; font-weight:800;">${post.authorName}</h4>
                            ${post.authorStatus ? `<span style="font-size:0.75rem; font-style:italic; color: var(--text-secondary);">"${post.authorStatus}"</span>` : ''}
                        </div>
                    </div>
                    ${isOwner ? `
                        <button class="delete-action-trigger-btn" onclick="deleteAssetPipeline('${post.authorKey}', ${post.assetIndex})">
                            <i class="far fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
                
                ${post.metaInfo ? `<p style="margin-top: 12px; font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">${post.metaInfo}</p>` : ''}
                ${visualPayloadContainer}
            </div>
        `;
    }).join("");

    stream.innerHTML = elementsHtml || `<div style="text-align:center; padding: 3rem; color: var(--text-secondary); font-weight:700;">No shared assignments or assets here.</div>`;
}

function renderLeaderboardEngine() {
    const container = document.getElementById('leaderboard-anchor-body');
    if (!container) return;

    let rankingData = [];
    for (const key in globalData.members) {
        const m = globalData.members[key];
        rankingData.push({
            name: m.name,
            count: m.pdfs ? m.pdfs.length : 0
        });
    }

    rankingData.sort((a, b) => b.count - a.count);

    container.innerHTML = rankingData.map((user, idx) => `
        <div style="display:flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius:14px; border: 1px solid var(--border-soft);">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-weight:800; color: var(--social-blue);">#${idx + 1}</span>
                <span style="font-weight:700;">${user.name}</span>
            </div>
            <span class="subject-badge" style="background: var(--social-blue-light); color: var(--social-blue); font-weight:800; border-radius:8px;">${user.count} shares</span>
        </div>
    `).join("");
}

function renderWorkspaceMemos() {
    const target = document.getElementById('workspace-notes-container');
    if (!target) return;
    
    const currentNoticeText = globalData.workspaceNotice || "Welcome to the upgraded workspace. Use the central publish tool to instantly share multi-image configurations or document assignments directly categorized by chapters and book pages.";
    
    target.innerHTML = `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-soft); border-radius:16px; padding: 1.5rem;">
            <h4 style="font-weight:800; font-size:1.1rem; margin-bottom:8px;">Notice Board</h4>
            <p style="font-size:0.9rem; color: var(--text-secondary); line-height:1.5; font-weight:500;">${currentNoticeText}</p>
        </div>
    `;
}

function renderProfileManagementNode() {
    const target = document.getElementById('dynamic-profile-view-target');
    if (!target) return;

    const profile = globalData.members[currentActiveFriendKey];
    if (!profile) return;

    target.innerHTML = `
        <div class="showcase-card shadow-card" style="padding: 2.5rem; text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div class="avatar-frame" style="width: 90px; height: 90px; border-radius: 50%; font-size: 2.5rem; background: #ff5e7e; color: white; margin-bottom: 1rem; box-shadow: 0 8px 20px rgba(255,94,126,0.25);">
                ${profile.name.substring(0, 2).toUpperCase()}
            </div>
            <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">${profile.name}</h2>
            <span class="subject-badge" style="background: rgba(255,255,255,0.08); color: var(--text-secondary); font-weight: 700; padding: 4px 12px; font-size:0.8rem;">${profile.currentClass || '7D'}</span>
            
            <div style="width: 100%; max-width: 400px; text-align: left; margin-top: 2rem; background: rgba(0,0,0,0.02); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--border-soft);">
                <label style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; display:block; margin-bottom: 8px;">Your Current Status:</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="profile-direct-status-input" value="${profile.status || ''}" style="flex:1; padding: 12px; border-radius:10px; border: 1px solid var(--border-soft); background: var(--hub-bg); color: var(--text-primary); font-weight:600;" placeholder="Set personal context status...">
                    <button onclick="syncProfileDirectStatus()" style="background: #ff5e7e; color: white; border: none; padding: 0 16px; border-radius: 10px; cursor: pointer; font-weight:800;"><i class="fas fa-check"></i></button>
                </div>
            </div>

            <button onclick="logOutSession()" style="margin-top: 2rem; width: 100%; max-width: 400px; padding: 14px; border-radius: 12px; border: 1px solid var(--border-soft); background: transparent; color: #ef4444; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-sign-out-alt"></i> Log Out of Hub
            </button>
        </div>
    `;
}

async function syncCustomStatus() {
    const text = document.getElementById('custom-status-input').value.trim();
    globalData.members[currentActiveFriendKey].status = text;
    try {
        await dbInstance.from('hub_state').update({ payload: globalData }).eq('id', 1);
        bootSocialWorkspace();
    } catch (err) {
        console.error("Status Sync Breakdown:", err);
    }
}

async function syncProfileDirectStatus() {
    const input = document.getElementById('profile-direct-status-input');
    if (input) {
        globalData.members[currentActiveFriendKey].status = input.value.trim();
        try {
            await dbInstance.from('hub_state').update({ payload: globalData }).eq('id', 1);
            bootSocialWorkspace();
            alert("Status synced successfully across the framework!");
        } catch (err) {
            console.error(err);
        }
    }
}

function logOutSession() {
    localStorage.removeItem('limeduUserKey');
    currentActiveFriendKey = "";
    location.reload();
}

function handleSubjectChange() {
    const sub = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    if (sub === 'Maths') {
        wrapper.innerHTML = `
            <div class="input-group">
                <label>Chapter Context</label>
                <select id="modal-file-chapter">
                    ${MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join("")}
                </select>
            </div>`;
    } else {
        wrapper.innerHTML = '';
    }
}

async function triggerSupabaseUploadPipeline() {
    const title = document.getElementById('modal-file-title').value.trim();
    const desc = document.getElementById('modal-file-desc').value.trim();
    const subject = document.getElementById('modal-file-subject').value;
    const fileInp = document.getElementById('modal-file-input');
    const errEl = document.getElementById('upload-error');
    
    if (!title || fileInp.files.length === 0) {
        if (errEl) errEl.innerText = "🚨 Asset title and file payload parameters required.";
        return;
    }

    toggleMainLoader(true, "Publishing to Feed Stream...");
    try {
        const files = Array.from(fileInp.files);
        const isImageSet = files.every(f => f.type.startsWith('image/'));
        let pathsArray = [];

        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const { data, error } = await dbInstance.storage.from('limedu-assets').upload(`public/${fileName}`, file);
            if (error) throw error;

            const { data: urlData } = dbInstance.storage.from('limedu-assets').getPublicUrl(`public/${fileName}`);
            pathsArray.push(urlData.publicUrl);
        }

        let chapterVal = "";
        if (subject === 'Maths' && document.getElementById('modal-file-chapter')) {
            chapterVal = document.getElementById('modal-file-chapter').value;
        }

        const newPost = {
            name: title,
            metaInfo: chapterVal ? `${chapterVal} — ${desc}` : desc,
            subject: subject,
            date: new Date().toLocaleDateString('en-CA'),
            path: pathsArray[0],
            isImageSet: isImageSet,
            imagePayloads: isImageSet ? pathsArray : []
        };

        if (!globalData.members[currentActiveFriendKey].pdfs) {
            globalData.members[currentActiveFriendKey].pdfs = [];
        }
        globalData.members[currentActiveFriendKey].pdfs.push(newPost);

        await dbInstance.from('hub_state').update({ payload: globalData }).eq('id', 1);
        
        closeUploadModal();
        document.getElementById('modal-file-title').value = '';
        document.getElementById('modal-file-desc').value = '';
        fileInp.value = '';
        document.getElementById('file-chosen-text').innerText = 'Tap to attach files/images';
        
        bootSocialWorkspace();
    } catch (err) {
        console.error(err);
        if (errEl) errEl.innerText = "🚨 Pipeline fault encountered during storage write.";
    } finally {
        toggleMainLoader(false);
    }
}

async function deleteAssetPipeline(userKey, index) {
    if (!confirm("Are you sure you want to drop this asset post from the feed timeline?")) return;
    
    toggleMainLoader(true, "Removing Post...");
    try {
        globalData.members[userKey].pdfs.splice(index, 1);
        await dbInstance.from('hub_state').update({ payload: globalData }).eq('id', 1);
        bootSocialWorkspace();
    } catch (err) {
        console.error("Deletion Fault:", err);
    } finally {
        toggleMainLoader(false);
    }
}

function launchTheatreImageCarousel(title, payloads) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = title;
    view.innerHTML = payloads.map(p => `<img src="${p}" style="max-width:100%; max-height:75vh; border-radius:12px; object-fit:contain;">`).join("");
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
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); if(document.getElementById('upload-error')) document.getElementById('upload-error').innerText = ''; }
function toggleMainLoader(show, label = "") { const loader = document.getElementById('loader-container'); if(loader) { if(show){ loader.classList.remove('hidden'); document.getElementById('loader-text').innerText = label; } else { loader.classList.add('hidden'); } } }
function toggleTheme() { const isDark = document.body.classList.toggle('dark-mode'); localStorage.setItem('hubTheme', isDark ? 'dark-mode' : 'light-mode'); }
function updateFileLabel() { const inp = document.getElementById('modal-file-input'); if(inp && inp.files.length > 0) document.getElementById('file-chosen-text').innerText = `${inp.files.length} attachment(s) locked`; }