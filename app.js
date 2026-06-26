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

// =========================================================================
// APPLICATION INITIALIZATION ENTRYPOINT
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);
    setupDesktopDragScroll();

    // Close dropdowns cleanly if clicked outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    });

    synchronizeDataPipeline();
});

// =========================================================================
// CORE DATABASE PIPELINE (SYNCHRONIZE & FLATTEN JSONB)
// =========================================================================
async function synchronizeDataPipeline() {
    toggleMainLoader(true, "Syncing with limedu Feed...");
    try {
        // Fetching the singular workspace record that hosts the JSONB structure
        const { data, error } = await dbInstance
            .from('limedu_hub')
            .select('data_object')
            .single();

        if (error) throw error;

        // Cache the raw workspace layout globally
        globalData = data.data_object || { members: {}, groupName: "The 6B Survivors" };

        // Process and display the unified feed timeline
        compileAndRenderFeedStream();
        renderActiveMembersHotbar();

        // Maintain existing session state post-sync if logged in
        if (currentActiveFriendKey && globalData.members[currentActiveFriendKey]) {
            renderActiveUserIdentityBadge(globalData.members[currentActiveFriendKey]);
        }
    } catch (err) {
        console.error("Critical syncing block exception:", err);
    } finally {
        toggleMainLoader(false);
    }
}

// Transform the highly nested JSONB tree into a flat sequence layout sorted by date
function compileAndRenderFeedStream() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    if (!globalData || !globalData.members) {
        feedContainer.innerHTML = `<div class="empty-feed-state">No dynamic workspace metadata active.</div>`;
        return;
    }

    let flatTimeline = [];

    // Extract records by cycling through nested member dictionaries safely
    Object.keys(globalData.members).forEach(memberKey => {
        const member = globalData.members[memberKey];
        if (member && Array.isArray(member.pdfs)) {
            member.pdfs.forEach((postItem, postIndex) => {
                flatTimeline.push({
                    ownerKey: memberKey,
                    ownerName: member.name,
                    ownerClass: member.currentClass || "7D",
                    ownerStatus: member.status || "Limedu Member",
                    postIndex: postIndex,
                    // Feed Item Assets
                    date: postItem.date,
                    name: postItem.name,
                    path: postItem.path,
                    subject: postItem.subject,
                    metaInfo: postItem.metaInfo || "",
                    isImageSet: postItem.isImageSet || false,
                    imagePayloads: postItem.imagePayloads || []
                });
            });
        }
    });

    // Apply categorical filters if active
    if (selectedSubjectFilter !== "All") {
        flatTimeline = flatTimeline.filter(p => p.subject === selectedSubjectFilter);
    }

    // Sort by Date (Newest first)
    flatTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render logic
    if (flatTimeline.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-feed-state">
                <i class="fas fa-folder-open"></i>
                <p>No study updates shared under "${selectedSubjectFilter}" yet.</p>
            </div>`;
        return;
    }

    feedContainer.innerHTML = flatTimeline.map(item => {
        const isOwner = item.ownerKey === currentActiveFriendKey;
        
        // Asset type handling
        let visualAttachmentHtml = "";
        if (item.isImageSet && item.imagePayloads.length > 0) {
            visualAttachmentHtml = `
                <div class="post-media-gallery" onclick="launchTheatreGallery('${item.name.replace(/'/g, "\\'")}', ${JSON.stringify(item.imagePayloads).replace(/"/g, '&quot;')})">
                    <img src="${item.imagePayloads[0]}" class="gallery-cover-preview" alt="Preview Grid">
                    ${item.imagePayloads.length > 1 ? `<div class="gallery-badge-overlay"><i class="fas fa-images"></i> +${item.imagePayloads.length - 1} More</div>` : ''}
                </div>`;
        } else if (item.path) {
            visualAttachmentHtml = `
                <div class="pdf-attachment-card" onclick="launchTheatreStandalonePDF('${item.path}')">
                    <div class="pdf-icon-frame"><i class="fas fa-file-pdf"></i></div>
                    <div class="pdf-meta-details">
                        <span class="pdf-title-string">${item.name}</span>
                        <span class="pdf-action-prompt">Click to open document viewer</span>
                    </div>
                </div>`;
        }

        return `
            <div class="feed-post-card fade-in">
                <div class="post-header-row">
                    <div class="author-avatar-combo">
                        <div class="avatar-circle-icon">${item.ownerName.charAt(0)}</div>
                        <div class="author-identity-column">
                            <span class="author-name-text">${item.ownerName} <small class="class-tag-bubble">${item.ownerClass}</small></span>
                            <span class="post-timestamp-text"><i class="fas fa-clock"></i> ${item.date} • <b style="color:var(--social-blue); font-weight:700;">${item.subject}</b></span>
                        </div>
                    </div>
                    
                    <div class="post-control-node" style="position: relative;">
                        <button class="post-actions-trigger-btn" onclick="togglePostDropdown(event, '${item.ownerKey}-${item.postIndex}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="dropdown-${item.ownerKey}-${item.postIndex}" class="post-actions-dropdown-menu hidden">
                            <button class="post-action-item" onclick="launchTheatreGallery('${item.name.replace(/'/g, "\\'")}', ${JSON.stringify(item.imagePayloads || [item.path]).replace(/"/g, '&quot;')})">
                                <i class="fas fa-expand-arrows-alt"></i> Immersion Fullscreen
                            </button>
                            ${isOwner ? `
                            <button class="post-action-item delete-action-trigger" onclick="triggerDeletePipeline('${item.ownerKey}', ${item.postIndex})">
                                <i class="fas fa-trash-alt"></i> Delete Entry
                            </button>` : ''}
                        </div>
                    </div>
                </div>

                ${item.metaInfo ? `<p class="post-textual-description">${item.metaInfo}</p>` : ''}
                ${visualAttachmentHtml}
            </div>`;
    }).join("");
}

// =========================================================================
// AUTHENTICATION PROTOCOLS
// =========================================================================
function handleLogin() {
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('login-error');

    if (!userInp || !passInp) {
        errorEl.innerText = "Please complete credentials fields.";
        return;
    }

    if (!globalData || !globalData.members) {
        errorEl.innerText = "Local cache connection failure. Refresh and retry.";
        return;
    }

    let foundKey = "";
    Object.keys(globalData.members).forEach(key => {
        if (globalData.members[key].name.toLowerCase() === userInp.toLowerCase()) {
            foundKey = key;
        }
    });

    if (!foundKey) {
        errorEl.innerText = "Profile mismatch. Check spelling format.";
        return;
    }

    const matchedProfile = globalData.members[foundKey];
    if (matchedProfile.password === passInp) {
        currentActiveFriendKey = foundKey;
        
        // Transition views cleanly
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');

        // Prime client headers
        renderActiveUserIdentityBadge(matchedProfile);
        compileAndRenderFeedStream();
    } else {
        errorEl.innerText = "Incorrect workspace passcode security key.";
    }
}

function renderActiveUserIdentityBadge(profile) {
    const avatar = document.getElementById('user-avatar-slot');
    const nameLabel = document.getElementById('user-name-label');
    const statusInp = document.getElementById('user-status-input');

    if (avatar) avatar.innerText = profile.name.charAt(0);
    if (nameLabel) nameLabel.innerText = profile.name;
    if (statusInp) statusInp.value = profile.status || "";
}

function renderActiveMembersHotbar() {
    const listWrapper = document.getElementById('friends-status-list');
    if (!listWrapper || !globalData.members) return;

    listWrapper.innerHTML = Object.keys(globalData.members).map(key => {
        const mem = globalData.members[key];
        return `
            <div class="friend-status-card">
                <div class="friend-avatar">${mem.name.charAt(0)}</div>
                <div class="friend-info">
                    <span class="friend-name">${mem.name}</span>
                    <span class="friend-status-text">${mem.status || "Active on limedu"}</span>
                </div>
            </div>`;
    }).join("");
}

// =========================================================================
// INTERFACE CONTROLS & EVENT FILTER CORES
// =========================================================================
function handleSubjectFilterChange(subjectValue, clickedElement) {
    selectedSubjectFilter = subjectValue;
    
    document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    if (clickedElement) clickedElement.classList.add('active');

    compileAndRenderFeedStream();
}

function handleSubjectChange() {
    const selectedSub = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    if (!wrapper) return;

    if (selectedSub === "Maths") {
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>Select Mathematics Chapter Index</label>
                <select id="modal-file-subcategory">
                    ${MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join("")}
                </select>
            </div>`;
    } else {
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>Topic Title Context / Reference Label</label>
                <input type="text" id="modal-file-subcategory" placeholder="e.g. Chemical Reactions, Project Log Note">
            </div>`;
    }
}

function togglePostDropdown(event, compositeKey) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const targetDropdown = document.getElementById(`dropdown-${compositeKey}`);
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => {
        if (m !== targetDropdown) m.classList.add('hidden');
    });
    if (targetDropdown) targetDropdown.classList.toggle('hidden');
}

// =========================================================================
// ASSET MEDIA CONTROLLERS (THEATRE MODE)
// =========================================================================
function launchTheatreGallery(title, payloads) {
    if (typeof payloads === 'string') payloads = [payloads];
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = title;
    
    view.innerHTML = payloads.map(url => `
        <img src="${url}" style="max-width:100%; max-height:72vh; border-radius:12px; margin-bottom:1rem; object-fit:contain;">
    `).join("");
    
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function launchTheatreStandalonePDF(url) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = "Shared Document Interface";
    view.innerHTML = `<iframe src="${url}" style="width:100%; height:72vh; border:none; border-radius:12px;"></iframe>`;
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function closeMediaTheatre() { 
    document.getElementById('theatre-lightbox').classList.add('hidden'); 
}

// =========================================================================
// UPLOAD CRADLE (ATTACHMENT STORAGE PIPELINE)
// =========================================================================
async function triggerSupabaseUploadPipeline() {
    const fileInput = document.getElementById('modal-file-input');
    const subject = document.getElementById('modal-file-subject').value;
    const subCatEl = document.getElementById('modal-file-subcategory');
    const customDesc = document.getElementById('modal-file-desc')?.value.trim() || "";
    const errorEl = document.getElementById('upload-error');

    if (!currentActiveFriendKey) {
        alert("Session verification lost. Re-login immediately.");
        return;
    }

    const subcategory = subCatEl ? subCatEl.value : "";
    if (!subcategory) {
        errorEl.innerText = "Please specify a structural chapter index or topic header.";
        return;
    }

    if (!fileInput || fileInput.files.length === 0) {
        errorEl.innerText = "Please attach at least one valid study reference file or image asset.";
        return;
    }

    errorEl.innerText = "";
    toggleMainLoader(true, "Uploading assets to Storage...");

    try {
        const files = Array.from(fileInput.files);
        const uploadedUrls = [];
        let isPdfDetected = false;

        for (const file of files) {
            if (file.type === "application/pdf") isPdfDetected = true;

            const sanitizedName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            const storagePath = `public/${sanitizedName}`;

            const { data: storageData, error: storageErr } = await dbInstance.storage
                .from('limedu-assets')
                .upload(storagePath, file);

            if (storageErr) throw storageErr;

            const { data: publicUrlObj } = dbInstance.storage
                .from('limedu-assets')
                .getPublicUrl(storagePath);

            uploadedUrls.push(publicUrlObj.publicUrl);
        }

        // Construct Post Record Scheme
        const finalTitle = `${subcategory}`;
        const newPostItem = {
            date: new Date().toISOString().split('T')[0],
            name: finalTitle,
            path: uploadedUrls[0],
            subject: subject,
            metaInfo: customDesc,
            isImageSet: !isPdfDetected,
            imagePayloads: !isPdfDetected ? uploadedUrls : []
        };

        toggleMainLoader(true, "Updating database logs...");

        // Push locally into globalData reference tree structure cleanly
        if (!globalData.members[currentActiveFriendKey].pdfs) {
            globalData.members[currentActiveFriendKey].pdfs = [];
        }
        globalData.members[currentActiveFriendKey].pdfs.push(newPostItem);

        // Push updated data object payload safely back up into row field record
        const { error: dbUpdateErr } = await dbInstance
            .from('limedu_hub')
            .update({ data_object: globalData })
            .match({ id: 1 }); // Replace with your exact primary row target identifier matching pattern

        if (dbUpdateErr) throw dbUpdateErr;

        // Reset elements, collapse workspace, and sync views
        fileInput.value = "";
        if(document.getElementById('modal-file-desc')) document.getElementById('modal-file-desc').value = "";
        document.getElementById('file-chosen-text').innerText = "Tap to attach files/images";
        closeUploadModal();
        
        await synchronizeDataPipeline();
        alert("Study updates published cleanly to your cluster channel! 🚀");
    } catch (err) {
        console.error("Pipeline failure sequence:", err);
        errorEl.innerText = `Pipeline Error: ${err.message || "Upload step failure"}`;
    } finally {
        toggleMainLoader(false);
    }
}

// =========================================================================
// DELETION SEQUENCE LOGICS
// =========================================================================
async function triggerDeletePipeline(ownerKey, itemIndex) {
    if (!confirm("Are you sure you want to delete this study entry? This cannot be undone.")) return;

    toggleMainLoader(true, "Deleting record entries...");
    try {
        if (globalData.members[ownerKey] && Array.isArray(globalData.members[ownerKey].pdfs)) {
            // Drop target element via array splices
            globalData.members[ownerKey].pdfs.splice(itemIndex, 1);

            // Re-sync back to single entry row on DB
            const { error } = await dbInstance
                .from('limedu_hub')
                .update({ data_object: globalData })
                .match({ id: 1 }); // Confirm target identifier mapping constraints

            if (error) throw error;

            await synchronizeDataPipeline();
        }
    } catch (err) {
        console.error("Drop exception tracking:", err);
        alert("Failed to drop post entry. Check permission rights.");
    } finally {
        toggleMainLoader(false);
    }
}

// =========================================================================
// REALTIME PROFILE BIO STATUS MONITOR OVERRIDES
// =========================================================================
async function synchronizeStatusUpdate() {
    const newStatusValue = document.getElementById('user-status-input').value.trim();
    if (!currentActiveFriendKey || !globalData.members[currentActiveFriendKey]) return;

    try {
        // Apply modifications locally
        globalData.members[currentActiveFriendKey].status = newStatusValue;

        const { error } = await dbInstance
            .from('limedu_hub')
            .update({ data_object: globalData })
            .match({ id: 1 }); // Matches structure key targeting definitions

        if (error) throw error;

        renderActiveMembersHotbar();
        alert("Status synced successfully! 🎉");
    } catch (err) {
        console.error("Status synchronization failed:", err);
    }
}

// =========================================================================
// CORE LAYOUT FRAMEWORK ANIMATIONS & RESIZERS
// =========================================================================
function openUploadModal(e) { 
    if(e) e.preventDefault(); 
    document.getElementById('upload-modal').classList.remove('hidden'); 
    handleSubjectChange(); 
}

function closeUploadModal() { 
    document.getElementById('upload-modal').classList.add('hidden'); 
    if(document.getElementById('upload-error')) document.getElementById('upload-error').innerText = ''; 
}

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