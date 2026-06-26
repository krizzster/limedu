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
    setupDesktopDragScroll();

    document.addEventListener('click', () => {
        document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    });

    // Start background streaming synchronization cycle
    initiateMasterSyncPipeline();
});

// =========================================================================
// CORE DATAPACK PIPELINE & INTEGRATION
// =========================================================================
async function initiateMasterSyncPipeline() {
    toggleMainLoader(true, "Synchronizing workspace grid matrix...");
    await synchronizeDataPipeline();
    toggleMainLoader(false);

    // Auto-login tracker via localStorage if token session exists
    const sessionToken = localStorage.getItem('limedu_session_user');
    if (sessionToken && globalData.members && globalData.members[sessionToken]) {
        currentActiveFriendKey = sessionToken;
        enterWorkspaceDashboardView();
    }
}

async function synchronizeDataPipeline() {
    try {
        if (!dbInstance) return;
        
        // Target column name correctly aligned with 'payload'
        const { data, error } = await dbInstance
            .from('limedu')
            .select('payload')
            .single();

        if (error) throw error;

        if (data && data.payload) {
            globalData = data.payload;
            console.log("Successfully fetched remote master stream matrix:", globalData);
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
        if (errorLabel) errorLabel.innerText = "Error: Please choose at least one asset file/image to bundle.";
        return;
    }

    toggleMainLoader(true, "Uploading payloads securely to asset array...");

    try {
        let uploadedUrls = [];
        for (let i = 0; i < fileInp.files.length; i++) {
            const file = fileInp.files[i];
            const identityStamp = Date.now() + "-" + Math.random().toString(36).substring(2, 7);
            const path = `public/${identityStamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

            const { data, error } = await dbInstance.storage
                .from('limedu-assets')
                .upload(path, file, { cacheControl: '3600', upsert: false });

            if (error) throw error;

            const { data: publicData } = dbInstance.storage
                .from('limedu-assets')
                .getPublicUrl(path);

            if (publicData?.publicUrl) {
                uploadedUrls.push(publicData.publicUrl);
            }
        }

        if (uploadedUrls.length === 0) throw new Error("File extraction failed.");

        const payloadObj = {
            date: new Date().toISOString().split('T')[0],
            name: fileInp.files[0].name.split('.')[0],
            path: uploadedUrls[0],
            subject: subject,
            metaInfo: meta || "Study materials uploaded by team lead.",
            isImageSet: true,
            imagePayloads: uploadedUrls,
            subCategory: categoryInfo
        };

        if (!globalData.members[currentActiveFriendKey].pdfs) {
            globalData.members[currentActiveFriendKey].pdfs = [];
        }
        globalData.members[currentActiveFriendKey].pdfs.unshift(payloadObj);

        // Update tracking synced to 'payload' column
        const { error: patchErr } = await dbInstance
            .from('limedu')
            .update({ payload: globalData })
            .match({ id: 1 });

        if (patchErr) throw patchErr;

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

async function triggerDeletePipeline(ownerKey, indexPosition) {
    if (!confirm("Are you absolute sure you want to scrub this entry off the shared cloud?")) return;
    toggleMainLoader(true, "Purging card matrix block...");

    try {
        if (globalData.members && globalData.members[ownerKey] && globalData.members[ownerKey].pdfs) {
            globalData.members[ownerKey].pdfs.splice(indexPosition, 1);
            
            // Update tracking synced to 'payload' column
            const { error } = await dbInstance
                .from('limedu')
                .update({ payload: globalData })
                .match({ id: 1 });

            if (error) throw error;

            await synchronizeDataPipeline();
            compileAndRenderFeedStream();
        }
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

    if (!globalData.members) {
        if (errLabel) errLabel.innerText = "Syncing system data. Try again in 2 seconds.";
        return;
    }

    let resolvedKey = null;
    const lowerInputName = nameInp.toLowerCase();

    for (const key in globalData.members) {
        if (globalData.members[key].name && globalData.members[key].name.toLowerCase() === lowerInputName) {
            resolvedKey = key;
            break;
        }
    }

    if (resolvedKey && globalData.members[resolvedKey].password === passInp) {
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

    const currentUserProfile = globalData.members[currentActiveFriendKey];
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
    if (!listWrapper || !globalData.members) return;

    listWrapper.innerHTML = Object.keys(globalData.members).map(key => {
        const mem = globalData.members[key];
        if (!mem.name) return '';
        
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
    if (!streamWrapper || !globalData.members) return;

    let aggregateCards = [];
    Object.keys(globalData.members).forEach(ownerKey => {
        const memberObj = globalData.members[ownerKey];
        if (memberObj.pdfs && Array.isArray(memberObj.pdfs)) {
            memberObj.pdfs.forEach((item, index) => {
                aggregateCards.push({
                    ...item,
                    ownerKey: ownerKey,
                    ownerName: memberObj.name,
                    indexPosition: index
                });
            });
        }
    });

    aggregateCards.sort((a, b) => new Date(b.date) - new Date(a.date));

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
        const payloadImages = item.imagePayloads || [item.path];
        const hasSubcategory = item.subCategory ? `<span class="badge subtopic-badge">${item.subCategory}</span>` : "";
        const isOwner = (item.ownerKey === currentActiveFriendKey);
        
        const postAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.ownerName)}&background=1877f2&color=fff&bold=true`;

        return `
            <div class="feed-card-item">
                <div class="feed-card-header">
                    <div class="avatar-circle-icon">
                        <img src="${postAvatarUrl}" alt="author" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                    </div>
                    <div class="author-details-wrapper">
                        <h4>${item.ownerName}</h4>
                        <span class="timestamp-label">${item.date} &bull; <span class="badge subject-badge">${item.subject}</span> ${hasSubcategory}</span>
                    </div>
                    <div class="action-dropdown-anchor" style="position: relative;">
                        <button class="post-actions-trigger-btn" onclick="toggleActionDropdownConsole(event, '${item.ownerKey}_${item.indexPosition}')">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div id="dropdown-${item.ownerKey}_${item.indexPosition}" class="post-actions-dropdown-menu hidden">
                            <button class="post-action-item" onclick="openMediaTheatre('${item.path}')">
                                <i class="fas fa-expand-arrows-alt"></i> View Full Size
                            </button>
                            ${isOwner ? `
                            <button class="post-action-item scrub-btn" onclick="triggerDeletePipeline('${item.ownerKey}', ${item.indexPosition})">
                                <i class="fas fa-trash-alt"></i> Delete Entry
                            </button>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="feed-card-body">
                    <p class="post-description-text">${item.metaInfo}</p>
                    <div class="mosaic-grid-layout grid-count-${Math.min(payloadImages.length, 4)}" onclick="openMediaTheatre('${item.path}')">
                        ${payloadImages.map((imgUrl, i) => {
                            if (i >= 4) return '';
                            if (i === 3 && payloadImages.length > 4) {
                                return `
                                <div class="mosaic-img-wrapper overflow-wrapper">
                                    <img src="${imgUrl}" alt="preview">
                                    <div class="overlay-count-backdrop"><span>+${payloadImages.length - 3}</span></div>
                                </div>`;
                            }
                            return `<div class="mosaic-img-wrapper"><img src="${imgUrl}" alt="preview"></div>`;
                        }).join("")}
                    </div>
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

// =========================================================================
// LIGHTBOX & STATUS INTEGRATION HANDLERS
// =========================================================================
function openMediaTheatre(url) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = "Shared Document Viewer";
    view.innerHTML = `<iframe src="${url}" style="width:100%; height:75vh; border:none; border-radius:12px;"></iframe>`;
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function openDirectFriendMessageConsole(friendKey) {
    const currentMember = globalData.members[friendKey];
    if (!currentMember) return;
    alert(`Connected to ${currentMember.name}'s workspace.\nStatus: "${currentMember.status || 'Active on limedu'}"`);
}

async function synchronizeStatusUpdate() {
    const inp = document.getElementById('user-status-input');
    if (!inp) return;
    const newStatus = inp.value.trim();

    toggleMainLoader(true, "Updating custom dynamic status...");
    globalData.members[currentActiveFriendKey].status = newStatus;

    try {
        // Sync payload updates cleanly matching column mapping parameters
        const { error } = await dbInstance
            .from('limedu')
            .update({ payload: globalData })
            .match({ id: 1 });

        if (error) throw error;
        alert("Status synced successfully! 🎉");
    } catch (err) {
        console.error("Status synchronization failed:", err);
    } finally {
        toggleMainLoader(false);
    }
}

// =========================================================================
// CORE LAYOUT MISC FUNCTIONALITIES
// =========================================================================
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

// Ensure theme state functions scale elegantly
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