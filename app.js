// =========================================================================
// CONFIGURATION ENGINE
// =========================================================================
const supabaseUrl = 'https://unjdjduiqtldgoybgmnq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamRqZHVpcXRsZGdveWJnbW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzgzODEsImV4cCI6MjA5MzAxNDM4MX0.qMuQcBysiKuFD5ByoL17fs0KxClgI-FEyzyKYayNVdE';

let dbInstance = null;
if (typeof window.supabase !== 'undefined') {
    dbInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
}

let globalData = {};
let currentActiveFriendKey = ""; 
let selectedSubjectFilter = "All Subjects";

window.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', () => {
        document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    });
    initiateMasterSyncPipeline();
});

// =========================================================================
// TAB NAVIGATION SYSTEM
// =========================================================================
function switchTab(tabId, badgeText, btnElement) {
    // Hide all tabs
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    // Show active tab
    document.getElementById(tabId).classList.remove('hidden');
    // Update header badge
    document.getElementById('page-badge').innerText = badgeText;
    
    // Update active state on nav bar
    if(btnElement) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        btnElement.classList.add('active');
    }
}

// =========================================================================
// CORE DATAPACK PIPELINE & INTEGRATION
// =========================================================================
async function initiateMasterSyncPipeline() {
    toggleMainLoader(true, "Synchronizing workspace grid matrix...");
    await synchronizeDataPipeline();
    toggleMainLoader(false);

    const sessionToken = localStorage.getItem('limedu_session_user');
    if (sessionToken && globalData.members && globalData.members[sessionToken]) {
        currentActiveFriendKey = sessionToken;
        enterWorkspaceDashboardView();
    }
}

async function synchronizeDataPipeline() {
    try {
        if (!dbInstance) return;
        const { data, error } = await dbInstance.from('limedu').select('payload').single();
        if (error) throw error;
        if (data && data.payload) {
            globalData = data.payload;
        }
    } catch (err) { console.error("Sync block exception:", err); }
}

async function triggerSupabaseUploadPipeline() {
    const subject = document.getElementById('modal-file-subject').value;
    const meta = document.getElementById('modal-file-desc').value;
    const fileInp = document.getElementById('modal-file-input');

    if (!fileInp || fileInp.files.length === 0) {
        document.getElementById('upload-error').innerText = "Attach files/images first.";
        return;
    }

    toggleMainLoader(true, "Uploading payloads securely...");
    try {
        let uploadedUrls = [];
        for (let i = 0; i < fileInp.files.length; i++) {
            const file = fileInp.files[i];
            const identityStamp = Date.now() + "-" + Math.random().toString(36).substring(2, 7);
            const path = `public/${identityStamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

            const { error } = await dbInstance.storage.from('limedu-assets').upload(path, file);
            if (error) throw error;

            const { data: publicData } = dbInstance.storage.from('limedu-assets').getPublicUrl(path);
            if (publicData?.publicUrl) uploadedUrls.push(publicData.publicUrl);
        }

        const isImage = uploadedUrls[0].match(/\.(jpeg|jpg|gif|png)$/) != null;

        const payloadObj = {
            date: new Date().toISOString().split('T')[0],
            name: meta || fileInp.files[0].name.split('.')[0],
            path: uploadedUrls[0],
            subject: subject,
            metaInfo: meta,
            isImageSet: isImage,
            imagePayloads: uploadedUrls
        };

        if (!globalData.members[currentActiveFriendKey].pdfs) globalData.members[currentActiveFriendKey].pdfs = [];
        globalData.members[currentActiveFriendKey].pdfs.unshift(payloadObj);

        await dbInstance.from('limedu').update({ payload: globalData }).match({ id: 1 });

        closeUploadModal();
        document.getElementById('modal-file-desc').value = "";
        document.getElementById('modal-file-input').value = "";
        
        await synchronizeDataPipeline();
        compileAndRenderFeedStream();
        compileAndRenderStats();

    } catch (err) {
        document.getElementById('upload-error').innerText = `Upload Fault: ${err.message}`;
    } finally {
        toggleMainLoader(false);
    }
}

async function triggerDeletePipeline(ownerKey, indexPosition) {
    if (!confirm("Are you sure you want to scrub this entry?")) return;
    toggleMainLoader(true, "Purging entry...");
    try {
        globalData.members[ownerKey].pdfs.splice(indexPosition, 1);
        await dbInstance.from('limedu').update({ payload: globalData }).match({ id: 1 });
        await synchronizeDataPipeline();
        compileAndRenderFeedStream();
        compileAndRenderStats();
    } catch (err) { console.error(err); } 
    finally { toggleMainLoader(false); }
}

// =========================================================================
// IDENTITY LAYER SYSTEM
// =========================================================================
function handleLogin() {
    const nameInp = document.getElementById('username').value.trim().toLowerCase();
    const passInp = document.getElementById('password').value.trim();
    
    if (!globalData.members) return;

    let resolvedKey = null;
    for (const key in globalData.members) {
        if (globalData.members[key].name.toLowerCase() === nameInp) {
            resolvedKey = key;
            break;
        }
    }

    if (resolvedKey && globalData.members[resolvedKey].password === passInp) {
        currentActiveFriendKey = resolvedKey;
        localStorage.setItem('limedu_session_user', resolvedKey);
        enterWorkspaceDashboardView();
    } else {
        document.getElementById('login-error').innerText = "Invalid credentials.";
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
    
    populateProfileTab();
    compileAndRenderFeedStream();
    compileAndRenderStats();
}

// =========================================================================
// RENDER DRIVERS (FEED, STATS, PROFILE)
// =========================================================================
function getInitials(name) {
    let parts = name.split(' ');
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return parts[0].substring(0, 2).toUpperCase();
}

function populateProfileTab() {
    const profile = globalData.members[currentActiveFriendKey];
    
    // Setting up the specific big Avatar matching screenshot layout
    const initials = getInitials(profile.name);
    document.getElementById('profile-avatar-slot').innerHTML = `<span>${initials}</span>`;
    
    document.getElementById('profile-name').innerText = profile.name;
    document.getElementById('profile-class').innerText = profile.currentClass || "6B";
    document.getElementById('profile-status-input').value = profile.status || "";
}

function compileAndRenderFeedStream() {
    const streamWrapper = document.getElementById('feed-stream-interactive-container');
    let aggregateCards = [];

    Object.keys(globalData.members).forEach(ownerKey => {
        const mem = globalData.members[ownerKey];
        if (mem.pdfs) {
            mem.pdfs.forEach((item, index) => {
                aggregateCards.push({ ...item, ownerKey, ownerName: mem.name, status: mem.status, indexPosition: index });
            });
        }
    });

    aggregateCards.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (selectedSubjectFilter !== "All Subjects") {
        aggregateCards = aggregateCards.filter(card => card.subject === selectedSubjectFilter || (card.subject === "OTHER" && selectedSubjectFilter === "Other"));
    }

    streamWrapper.innerHTML = aggregateCards.map(item => {
        const isOwner = (item.ownerKey === currentActiveFriendKey);
        const initials = getInitials(item.ownerName);
        let avatarColor = "#1877f2";
        if(item.ownerName.includes("Neyansh")) avatarColor = "#00e5ff"; // Color for Neyansh
        else if(item.ownerName.includes("Viraj")) avatarColor = "#6200ea";
        else if(item.ownerName.includes("Mohit")) avatarColor = "#00c853";

        // Distinguish exactly how PDFs and Images are rendered based on screenshots
        let contentHTML = "";
        
        if (item.isImageSet) {
            const images = item.imagePayloads || [item.path];
            let gridClass = "grid-count-" + Math.min(images.length, 4);
            if(images.length === 3) gridClass = "grid-count-3"; // Layout rule for 3 items

            contentHTML = `
                <p class="post-description-text">${item.name || item.metaInfo}</p>
                <div class="mosaic-grid-layout ${gridClass}" onclick="openMediaTheatre('${item.path}')">
                    ${images.slice(0,4).map((imgUrl, i) => {
                        if (i === 3 && images.length > 4) {
                            return `<div class="mosaic-img-wrapper"><img src="${imgUrl}"><div class="overlay-count-backdrop">+${images.length - 3}</div></div>`;
                        }
                        return `<div class="mosaic-img-wrapper"><img src="${imgUrl}"></div>`;
                    }).join("")}
                </div>`;
        } else {
            // PDF Custom Render Block
            let subTag = item.subject.toUpperCase();
            contentHTML = `
                <div class="pdf-attachment-block" onclick="openMediaTheatre('${item.path}')">
                    <div class="pdf-left-section">
                        <i class="fas fa-file-pdf pdf-icon"></i>
                        <div class="pdf-info">
                            <h4>${item.metaInfo || item.name}</h4>
                            <span>${item.date} <span class="badge pdf-badge">${subTag}</span> (${item.name})</span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>`;
        }

        return `
            <div class="feed-card-item">
                <div class="feed-card-header">
                    <div class="header-left">
                        <div class="avatar-circle-icon" style="background: ${avatarColor}; color: ${avatarColor === '#00e5ff' ? '#000' : '#fff'};">
                            <span>${initials}</span>
                        </div>
                        <div class="author-details-wrapper">
                            <h4>${item.ownerName}</h4>
                            <span class="status-text">"${item.status || 'active'}"</span>
                        </div>
                    </div>
                    
                    <div style="position: relative;">
                        <button class="post-actions-trigger-btn" onclick="toggleActionDropdownConsole(event, '${item.ownerKey}_${item.indexPosition}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="dropdown-${item.ownerKey}_${item.indexPosition}" class="post-actions-dropdown-menu hidden">
                            <button class="post-action-item" onclick="openMediaTheatre('${item.path}')"><i class="fas fa-expand"></i> View</button>
                            ${isOwner ? `<button class="post-action-item scrub-btn" onclick="triggerDeletePipeline('${item.ownerKey}', ${item.indexPosition})"><i class="fas fa-trash-alt"></i> Delete</button>` : ''}
                        </div>
                    </div>
                </div>
                <div class="feed-card-body">
                    ${contentHTML}
                </div>
            </div>`;
    }).join("");
}

function compileAndRenderStats() {
    const list = document.getElementById('leaderboard-container');
    let arr = Object.keys(globalData.members).map(k => {
        return { name: globalData.members[k].name, count: (globalData.members[k].pdfs || []).length };
    });
    
    arr.sort((a, b) => b.count - a.count);
    
    list.innerHTML = arr.map((u, i) => `
        <div class="lb-item">
            <div class="lb-left">
                <span class="lb-rank">#${i + 1}</span>
                <span>${u.name}</span>
            </div>
            <span class="lb-shares">${u.count} shares</span>
        </div>
    `).join("");
}

function handleSubjectFilterSelection(targetElement, subjectValue) {
    document.querySelectorAll('.filter-chip-btn').forEach(btn => btn.classList.remove('active'));
    targetElement.classList.add('active');
    selectedSubjectFilter = subjectValue;
    compileAndRenderFeedStream();
}

function toggleActionDropdownConsole(event, idKey) {
    event.preventDefault(); event.stopPropagation();
    const menu = document.getElementById(`dropdown-${idKey}`);
    const alreadyOpen = !menu.classList.contains('hidden');
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    if (!alreadyOpen) menu.classList.remove('hidden');
}

// =========================================================================
// MISC & UTILITIES
// =========================================================================
async function synchronizeStatusUpdate() {
    const newStatus = document.getElementById('profile-status-input').value.trim();
    toggleMainLoader(true, "Updating custom dynamic status...");
    globalData.members[currentActiveFriendKey].status = newStatus;
    try {
        await dbInstance.from('limedu').update({ payload: globalData }).match({ id: 1 });
        populateProfileTab();
        compileAndRenderFeedStream();
    } catch (err) { console.error(err); }
    finally { toggleMainLoader(false); }
}

function openMediaTheatre(url) {
    document.getElementById('theatre-view-viewport').innerHTML = `<iframe src="${url}" style="width:100%; height:80vh; border:none; border-radius:12px;"></iframe>`;
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function closeMediaTheatre() { document.getElementById('theatre-lightbox').classList.add('hidden'); }
function openUploadModal() { document.getElementById('upload-modal').classList.remove('hidden'); }
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); }
function updateFileLabel() { 
    const inp = document.getElementById('modal-file-input'); 
    if(inp.files.length > 0) document.getElementById('file-chosen-text').innerText = `${inp.files.length} element(s) loaded`;
}
function toggleMainLoader(show, label = "") { 
    const loader = document.getElementById('loader-container'); 
    if(show){ loader.classList.remove('hidden'); document.getElementById('loader-text').innerText = label; } 
    else { loader.classList.add('hidden'); } 
}