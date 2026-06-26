// =========================================================================
// CONFIGURATION ENGINE
// =========================================================================
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

// Global states reconstructed to match structural database rows
let globalFeedData = [];
let localMembersRegistry = {
    "mohit": { name: "Galla Mohit Sai", password: "123", status: "Coding..." },
    "viraj": { name: "Viraj", password: "123", status: "Active on limedu" },
    "neyansh": { name: "Neyansh", password: "123", status: "Studying" },
    "pratyank": { name: "Pratyank", password: "123", status: "Online" },
    "kriz": { name: "Kriz", password: "123", status: "Class Monitor 👑" }
};

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
    setupDesktopDragScroll();

    document.addEventListener('click', () => {
        document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    });

    initiateMasterSyncPipeline();
});

// =========================================================================
// CORE DATAPACK PIPELINE & INTEGRATION
// =========================================================================
async function initiateMasterSyncPipeline() {
    toggleMainLoader(true, "Synchronizing workspace grid matrix...");
    await synchronizeDataPipeline();
    toggleMainLoader(false);

    const sessionToken = localStorage.getItem('limedu_session_user');
    if (sessionToken && localMembersRegistry[sessionToken]) {
        currentActiveFriendKey = sessionToken;
        enterWorkspaceDashboardView();
    }
}

async function synchronizeDataPipeline() {
    try {
        if (!dbInstance) return;
        
        // Fetch rows directly from your structural columns
        const { data, error } = await dbInstance
            .from('limedu')
            .select('id, created_at, name, subject, metaInfo, path, subCategory, status')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            globalFeedData = data;
            
            // Sync up status records dynamically from database entries if available
            data.forEach(row => {
                if (row.name && row.status) {
                    for (let key in localMembersRegistry) {
                        if (localMembersRegistry[key].name === row.name) {
                            localMembersRegistry[key].status = row.status;
                        }
                    }
                }
            });
            console.log("Successfully fetched remote rows:", globalFeedData);
        }
    } catch (err) {
        console.error("Critical syncing block exception:", err);
    }
}

async function triggerSupabaseUploadPipeline() {
    const subject = document.getElementById('modal-file-subject').value;
    let categoryInfo = "";
    if (subject === "Maths") {
        categoryInfo = document.getElementById('modal-maths-chapter-select')?.value || "";
    } else {
        categoryInfo = document.getElementById('modal-generic-topic-input')?.value || "";
    }

    const meta = document.getElementById('modal-file-desc').value;
    const fileInp = document.getElementById('modal-file-input');

    if (!fileInp || fileInp.files.length === 0) {
        const errorLabel = document.getElementById('upload-error');
        if (errorLabel) errorLabel.innerText = "Error: Please choose an asset file/image to bundle.";
        return;
    }

    toggleMainLoader(true, "Uploading payloads securely to asset array...");

    try {
        const file = fileInp.files[0];
        const identityStamp = Date.now() + "-" + Math.random().toString(36).substring(2, 7);
        const path = `public/${identityStamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

        const { data: uploadData, error: uploadErr } = await dbInstance.storage
            .from('limedu-assets')
            .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: publicData } = dbInstance.storage
            .from('limedu-assets')
            .getPublicUrl(path);

        const publicUrl = publicData?.publicUrl || "";
        
        // Safety Fallback Check Added Here to Prevent Undefined Crashes
        const userProfile = localMembersRegistry[currentActiveFriendKey] || { name: "Anonymous", status: "Active" };

        // Insert a new structural row match to your columns
        const { error: insertErr } = await dbInstance
            .from('limedu')
            .insert([
                {
                    name: userProfile.name,
                    subject: subject,
                    metaInfo: meta || "Study materials uploaded by crew lead.",
                    path: publicUrl,
                    subCategory: categoryInfo,
                    status: userProfile.status || ""
                }
            ]);

        if (insertErr) throw insertErr;

        closeUploadModal();
        document.getElementById('modal-file-desc').value = "";
        document.getElementById('modal-file-input').value = "";
        document.getElementById('file-chosen-text').innerText = "Tap to attach files/images";
        
        await synchronizeDataPipeline();
        compileAndRenderFeedStream();

    } catch (err) {
        console.error(err);
        const errorLabel = document.getElementById('upload-error');
        if (errorLabel) errorLabel.innerText = `Upload Fault: ${err.message || err}`;
    } finally {
        toggleMainLoader(false);
    }
}

async function triggerDeletePipeline(rowId) {
    if (!confirm("Are you absolute sure you want to scrub this entry off the shared cloud?")) return;
    toggleMainLoader(true, "Purging card matrix block...");

    try {
        const { error } = await dbInstance
            .from('limedu')
            .delete()
            .match({ id: rowId });

        if (error) throw error;

        await synchronizeDataPipeline();
        compileAndRenderFeedStream();
    } catch (err) {
        console.error("Purge failure protocol activated:", err);
    } finally {
        toggleMainLoader(false);
    }
}

// =========================================================================
// IDENTITY LAYER SYSTEM (UI AVATARS DRIVER)
// =========================================================================
function handleLogin() {
    const nameInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value.trim();
    const errLabel = document.getElementById('login-error');

    let resolvedKey = null;
    const lowerInputName = nameInp.toLowerCase();

    for (const key in localMembersRegistry) {
        if (localMembersRegistry[key].name.toLowerCase() === lowerInputName) {
            resolvedKey = key;
            break;
        }
    }

    if (resolvedKey && localMembersRegistry[resolvedKey].password === passInp) {
        currentActiveFriendKey = resolvedKey;
        localStorage.setItem('limedu_session_user', resolvedKey);
        if (errLabel) errLabel.innerText = "";
        enterWorkspaceDashboardView();
    } else {
        if (errLabel) errLabel.innerText = "Invalid credentials. Please verify assignment spelling or passcode access keys.";
    }
}

function handleLogout() {
    localStorage.removeItem('limedu_session_user');
    currentActiveFriendKey = "";
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
}

function enterWorkspaceDashboardView() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');

    const currentUserProfile = localMembersRegistry[currentActiveFriendKey] || { name: "Guest User", status: "Active" };
    renderActiveUserIdentityBadge(currentUserProfile);
    renderActiveMembersHotbar();
    compileAndRenderFeedStream();
}

function renderActiveUserIdentityBadge(profile) {
    const avatar = document.getElementById('user-avatar-slot');
    const nameLabel = document.getElementById('user-name-label');
    const statusInp = document.getElementById('user-status-input');

    if (avatar) {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=1877f2&color=fff&bold=true`;
        avatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }
    if (nameLabel) nameLabel.innerText = profile.name;
    if (statusInp) statusInp.value = profile.status || "";
}

function renderActiveMembersHotbar() {
    const listWrapper = document.getElementById('friends-status-list');
    if (!listWrapper) return;

    listWrapper.innerHTML = Object.keys(localMembersRegistry).map(key => {
        const mem = localMembersRegistry[key];
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(mem.name)}&background=e7f3ff&color=1877f2&bold=true`;
        
        return `
            <div class="friend-status-card" onclick="openDirectFriendMessageConsole('${key}')">
                <div class="friend-avatar">
                    <img src="${avatarUrl}" alt="${mem.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
                <div class="friend-info">
                    <span class="friend-name">${mem.name}</span>
                    <span class="friend-status-text">${mem.status || "Active on limedu"}</span>
                </div>
            </div>`;
    }).join("");
}

// =========================================================================
// RENDER DRIVER ENGINE
// =========================================================================
function compileAndRenderFeedStream() {
    const streamWrapper = document.getElementById('feed-stream-interactive-container');
    if (!streamWrapper) return;

    let aggregateCards = [...globalFeedData];

    if (selectedSubjectFilter !== "All") {
        aggregateCards = aggregateCards.filter(card => card.subject === selectedSubjectFilter);
    }

    if (aggregateCards.length === 0) {
        streamWrapper.innerHTML = `
            <div style="text-align:center; padding:3rem; color:var(--text-secondary); font-weight:600;">
                <i class="fas fa-folder-open" style="font-size:2.5rem; margin-bottom:12px; display:block; color:var(--social-blue);"></i>
                No configurations published yet for "${selectedSubjectFilter}"
            </div>`;
        return;
    }

    streamWrapper.innerHTML = aggregateCards.map(item => {
        const hasSubcategory = item.subCategory ? `<span class="badge subtopic-badge">${item.subCategory}</span>` : "";
        const currentUserProfile = localMembersRegistry[currentActiveFriendKey];
        const isOwner = (currentUserProfile && item.name === currentUserProfile.name);
        
        const postAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "User")}&background=1877f2&color=fff&bold=true`;
        const postDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : "Recent";

        return `
            <div class="feed-card-item">
                <div class="feed-card-header">
                    <div class="avatar-circle-icon">
                        <img src="${postAvatarUrl}" alt="author" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                    </div>
                    <div class="author-details-wrapper">
                        <h4>${item.name || "Anonymous"}</h4>
                        <span class="timestamp-label">${postDate} &bull; <span class="badge subject-badge">${item.subject || "General"}</span> ${hasSubcategory}</span>
                    </div>
                    <div class="action-dropdown-anchor" style="position: relative;">
                        <button class="post-actions-trigger-btn" onclick="toggleActionDropdownConsole(event, '${item.id}')">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div id="dropdown-${item.id}" class="post-actions-dropdown-menu hidden">
                            ${item.path ? `
                            <button class="post-action-item" onclick="openMediaTheatre('${item.path}')">
                                <i class="fas fa-expand-arrows-alt"></i> View Asset
                            </button>` : ''}
                            ${isOwner ? `
                            <button class="post-action-item scrub-btn" onclick="triggerDeletePipeline(${item.id})">
                                <i class="fas fa-trash-alt"></i> Delete Entry
                            </button>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="feed-card-body">
                    <p class="post-description-text">${item.metaInfo || ""}</p>
                    ${item.path ? `
                    <div class="mosaic-grid-layout grid-count-1" onclick="openMediaTheatre('${item.path}')">
                        <div class="mosaic-img-wrapper"><img src="${item.path}" alt="preview"></div>
                    </div>` : ''}
                </div>
            </div>`;
    }).join("");
}

function handleSubjectFilterSelection(targetElement, subjectValue) {
    document.querySelectorAll('.filter-chip-btn').forEach(btn => btn.classList.remove('active'));
    targetElement.classList.add('active');
    selectedSubjectFilter = subjectValue;
    compileAndRenderFeedStream();
}

// =========================================================================
// LIGHTBOX & MISC ROUTINES
// =========================================================================
function handleSubjectChange() {
    const sub = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    if (!wrapper) return;

    if (sub === "Maths") {
        wrapper.innerHTML = `
            <div class="input-group" style="margin-top:14px;">
                <label>Select Mathematics Chapter Blueprint</label>
                <select id="modal-maths-chapter-select">
                    ${MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join("")}
                </select>
            </div>`;
    } else {
        wrapper.innerHTML = `
            <div class="input-group" style="margin-top:14px;">
                <label>Topic / Assignment Context Heading</label>
                <input type="text" id="modal-generic-topic-input" placeholder="e.g. Chemical Reactions Note sheet" required>
            </div>`;
    }
}

function toggleActionDropdownConsole(event, idKey) {
    event.preventDefault();
    event.stopPropagation();
    const menu = document.getElementById(`dropdown-${idKey}`);
    const alreadyOpen = !menu.classList.contains('hidden');
    
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    if (!alreadyOpen) menu.classList.remove('hidden');
}

function openMediaTheatre(url) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = "Shared Document Viewer";
    
    if (url.toLowerCase().endsWith('.pdf')) {
        view.innerHTML = `<iframe src="${url}" style="width:100%; height:75vh; border:none; border-radius:12px;"></iframe>`;
    } else {
        view.innerHTML = `<img src="${url}" style="max-width:100%; max-height:75vh; border-radius:12px; object-fit:contain;">`;
    }
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function openDirectFriendMessageConsole(friendKey) {
    const currentMember = localMembersRegistry[friendKey];
    if (!currentMember) return;
    alert(`Connected to ${currentMember.name}'s workspace.\nStatus: "${currentMember.status || 'Active on limedu'}"`);
}

async function synchronizeStatusUpdate() {
    const inp = document.getElementById('user-status-input');
    if (!inp) return;
    const newStatus = inp.value.trim();

    if (!currentActiveFriendKey || !localMembersRegistry[currentActiveFriendKey]) return;

    localMembersRegistry[currentActiveFriendKey].status = newStatus;
    renderActiveMembersHotbar();

    try {
        // Updates the status dynamically across entries matching the member's profile identity
        const { error } = await dbInstance
            .from('limedu')
            .update({ status: newStatus })
            .match({ name: localMembersRegistry[currentActiveFriendKey].name });

        if (error) throw error;
        alert("Status updated and synced with cloud! 🎉");
        await synchronizeDataPipeline();
        compileAndRenderFeedStream();
    } catch (err) {
        console.error("Status synchronization mismatch:", err);
        alert("Saved locally, but failed to sync online.");
    }
}

function closeMediaTheatre() { document.getElementById('theatre-lightbox').classList.add('hidden'); }
function openUploadModal(e) { if(e) { e.preventDefault(); e.stopPropagation(); } document.getElementById('upload-modal').classList.remove('hidden'); handleSubjectChange(); }
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); if(document.getElementById('upload-error')) document.getElementById('upload-error').innerText = ''; }

function toggleMainLoader(show, label = "") { 
    const loader = document.getElementById('loader-container'); 
    if(loader) { 
        if(show){ 
            loader.classList.remove('hidden'); 
            document.getElementById('loader-text').innerText = label; 
        } else { 
            loader.classList.add('hidden'); 
        } 
    } 
}

function toggleTheme() { 
    const isDark = document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('hubTheme', isDark ? 'dark-mode' : 'light-mode'); 
    updateThemeToggleButton(isDark ? 'dark-mode' : 'light-mode'); 
}

function updateThemeToggleButton(theme) { 
    const toggleBtn = document.querySelector('#theme-toggle i'); 
    if (toggleBtn) { 
        toggleBtn.className = theme === 'dark-mode' ? 'fas fa-sun' : 'fas fa-moon'; 
    } 
}

function updateFileLabel() { 
    const inp = document.getElementById('modal-file-input'); 
    if(inp && inp.files.length > 0) {
        document.getElementById('file-chosen-text').innerText = `${inp.files.length} element(s) loaded`;
    }
}

function setupDesktopDragScroll() {
    const slider = document.querySelector('.filter-row');
    if (!slider) return;
    let isDown = false; let startX; let scrollLeft;
    slider.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; });
}