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
let activeEditingPostId = null;

// Github Directory Array List Mapping representing repository structure profilepics folder resources
const PRESET_PROFILE_PICTURES = [
    "placeholdername.png",
    "mohit_avatar.png",
    "viraj_hero.png",
    "neyansh_spec.png",
    "pratyank_alpha.png",
    "monitor_blue.png"
];

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

    // Contextual multi-dropdown outside window click closer safety guard loop
    document.addEventListener('click', () => {
        document.querySelectorAll('.post-actions-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    });
});

// LOGIN AUTHENTICATION ROUTING GATEWAY
async function handleLogin() {
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorLabel = document.getElementById('login-error');

    if (!usernameInput || !passwordInput) {
        errorLabel.innerText = "Please complete credentials fields.";
        return;
    }

    toggleMainLoader(true, "Authenticating user node access...");

    try {
        const { data: profile, error } = await dbInstance
            .from('profiles')
            .select('*')
            .eq('full_name', usernameInput)
            .eq('secure_key', passwordInput)
            .single();

        if (error || !profile) {
            errorLabel.innerText = "Invalid full name handle or secure key.";
            toggleMainLoader(false);
            return;
        }

        globalData.currentSessionUser = profile;
        
        // Hydrate initial Profile Settings Panel Input controls data fields dynamically
        document.getElementById('profile-display-name').innerText = profile.full_name;
        document.getElementById('profile-display-status').innerText = profile.status_quote || "⚡ No status statement configured.";
        document.getElementById('profile-display-class').innerText = profile.class_section || "7D";
        document.getElementById('profile-display-avatar').src = profile.avatar_url || "profilepics/placeholdername.png";

        document.getElementById('input-settings-status').value = profile.status_quote || "";
        document.getElementById('input-settings-class').value = profile.class_section || "7D";
        document.getElementById('input-settings-username').value = profile.full_name;

        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');

        await synchronizeLimeduFeedStream();
        await renderStatsLeaderboardView();

    } catch (err) {
        console.error("Login verification loop crashed down workflow streams:", err);
        errorLabel.innerText = "Network Gateway error occurred.";
    } finally {
        toggleMainLoader(false);
    }
}

// MULTI-VIEW ROUTING TAB CONTROL SWITCHER ENGINE
function switchActiveViewport(panelKey, navigationItemBtn) {
    document.querySelectorAll('.view-panel-container').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.hotbar-item').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${panelKey}-panel-view`).classList.remove('hidden');
    if (navigationItemBtn) navigationItemBtn.classList.add('active');

    if (panelKey === 'feed') synchronizeLimeduFeedStream();
    if (panelKey === 'stats') renderStatsLeaderboardView();
}

// TIMELINE RENDERING SYSTEM - FEEDS INJECTION LOOP WITH DYNAMIC DROPDOWNS & DATE METRICS
async function synchronizeLimeduFeedStream() {
    const targetStreamContainer = document.getElementById('dynamic-feed-stream-target');
    if (!targetStreamContainer) return;

    try {
        let fetchQuery = dbInstance.from('posts').select('*').order('created_at', { ascending: false });
        if (selectedSubjectFilter !== "All") {
            fetchQuery = fetchQuery.eq('subject', selectedSubjectFilter);
        }

        const { data: posts, error } = await fetchQuery;
        if (error) throw error;

        if (!posts || posts.length === 0) {
            targetStreamContainer.innerHTML = `
                <div class="card item-empty-card" style="text-align:center; padding:40px; color:var(--text-secondary);">
                    <i class="fas fa-folder-open" style="font-size:2.5rem; margin-bottom:12px; opacity:0.4;"></i>
                    <p>No active workspace records filed under category "${selectedSubjectFilter}".</p>
                </div>
            `;
            return;
        }

        targetStreamContainer.innerHTML = posts.map(post => {
            const isOwner = post.author_id === globalData.currentSessionUser.id;
            const formattedDate = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) : 'Just now';

            let mediaActionHtml = '';
            if (post.payloads && post.payloads.length > 0) {
                mediaActionHtml = `
                    <button class="post-download-all-btn" onclick="downloadAllPostAssets(event, '${post.id}', ${JSON.stringify(post.payloads)})">
                        <i class="fas fa-cloud-download-alt"></i> Download Assets (${post.payloads.length})
                    </button>
                `;
            }

            return `
                <div class="feed-card-item" id="post-card-${post.id}">
                    <div class="post-card-header">
                        <div class="post-author-meta">
                            <img src="${post.author_avatar || 'profilepics/placeholdername.png'}" class="post-author-pfp" alt="Avatar">
                            <div>
                                <h4 class="author-profile-name">${post.author_name}</h4>
                                <span class="post-timestamp-lbl"><i class="far fa-clock"></i> ${formattedDate}</span>
                            </div>
                        </div>
                        
                        <div class="post-actions-dropdown-wrapper">
                            <button class="post-actions-trigger-btn" onclick="togglePostDropdown(event, '${post.id}')">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                            <div id="dropdown-${post.id}" class="post-actions-dropdown-menu hidden" onclick="event.stopPropagation()">
                                <button onclick="triggerPostEditPipeline('${post.id}', '${escapeHtml(post.title)}', '${escapeHtml(post.description)}')">
                                    <i class="fas fa-pen"></i> Edit Text
                                </button>
                                ${isOwner ? `<button class="delete-danger-action" onclick="deletePostPipeline('${post.id}')"><i class="fas fa-trash-alt"></i> Delete</button>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="post-card-body" onclick="launchTheatreStandalone('${escapeHtml(post.title)}', ${JSON.stringify(post.payloads || [])})">
                        <span class="post-subject-tag">${post.subject}</span>
                        <h3 class="post-title-text">${post.title}</h3>
                        <p class="post-desc-text">${post.description}</p>
                    </div>
                    
                    <div class="post-card-footer-actions">
                        ${mediaActionHtml}
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Critical timeline sync breakdown triggered:", err);
    }
}

// DROPDOWN ACCESSIBILITY HANDLERS
function togglePostDropdown(e, postId) {
    e.preventDefault();
    e.stopPropagation();
    const targetMenu = document.getElementById(`dropdown-${postId}`);
    const isAlreadyOpen = !targetMenu.classList.contains('hidden');
    
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    if (!isAlreadyOpen) {
        targetMenu.classList.remove('hidden');
    }
}

// POST EDIT & UPDATE PIPELINE
function triggerPostEditPipeline(postId, title, desc) {
    activeEditingPostId = postId;
    document.getElementById('edit-modal-title').value = title;
    document.getElementById('edit-modal-desc').value = desc;
    document.getElementById('edit-post-modal').classList.remove('hidden');
    
    document.getElementById('modal-save-edit-btn').onclick = async () => {
        const updatedTitle = document.getElementById('edit-modal-title').value.trim();
        const updatedDesc = document.getElementById('edit-modal-desc').value.trim();
        
        if (!updatedTitle || !updatedDesc) return;

        toggleMainLoader(true, "Updating workspace post element...");
        try {
            const { error } = await dbInstance
                .from('posts')
                .update({ title: updatedTitle, description: updatedDesc })
                .eq('id', activeEditingPostId);
                
            if (error) throw error;
            closeEditPostModal();
            await synchronizeLimeduFeedStream();
        } catch (err) {
            console.error("Failed executing text database revision payload updates: ", err);
        } finally {
            toggleMainLoader(false);
        }
    };
}

function closeEditPostModal() {
    document.getElementById('edit-post-modal').classList.add('hidden');
}

// DELETION SYSTEM OPERATOR BLOCK
async function deletePostPipeline(postId) {
    if (!confirm("Are you sure you want to delete this resource post?")) return;
    toggleMainLoader(true, "Purging resource asset reference...");
    try {
        const { error } = await dbInstance.from('posts').delete().eq('id', postId);
        if (error) throw error;
        await synchronizeLimeduFeedStream();
    } catch (err) {
        console.error("Purge failure loop crashed transmission down network fields:", err);
    } finally {
        toggleMainLoader(false);
    }
}

// DYNAMIC CATEGORY FILTERS RUNTIMES
function applySubjectFilter(subjectKey, chipButtonElement) {
    selectedSubjectFilter = subjectKey;
    document.querySelectorAll('.filter-chip-btn').forEach(btn => btn.classList.remove('active'));
    if (chipButtonElement) chipButtonElement.classList.add('active');
    synchronizeLimeduFeedStream();
}

// MULTI-ASSET COMPACT BULK DOWNLOAD ENGINE
async function downloadAllPostAssets(e, postId, payloadUrls) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!payloadUrls || payloadUrls.length === 0) return;
    
    for (let i = 0; i < payloadUrls.length; i++) {
        try {
            const url = payloadUrls[i];
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = downloadUrl;
            
            const fileExtension = url.split('.').pop().split('?')[0] || 'png';
            downloadAnchor.download = `limedu-asset-${postId}-${i + 1}.${fileExtension}`;
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Download processing sequence crash:", error);
        }
    }
}

// ON-SITE LIGHTBOX THEATRE IMMERSIVE ASSET VIEWER
function launchTheatreStandalone(title, assetUrls) {
    const stage = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = title || "Shared Asset View";
    
    if (!assetUrls || assetUrls.length === 0) {
        stage.innerHTML = `<p style="color:#fff; opacity:0.6;">No attached media payloads linked to this resource card.</p>`;
    } else {
        stage.innerHTML = assetUrls.map(url => {
            if (url.toLowerCase().includes('.pdf')) {
                return `<iframe src="${url}" style="width:100%; height:70vh; border:none; border-radius:12px;"></iframe>`;
            }
            return `<img src="${url}" style="max-width:100%; max-height:70vh; border-radius:12px; object-fit:contain; margin-bottom:12px;">`;
        }).join("");
    }
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function closeMediaTheatre() {
    document.getElementById('theatre-lightbox').classList.add('hidden');
    document.getElementById('theatre-view-viewport').innerHTML = '';
}

// STATS ROW GENERATION ENGINE (TROPHY DESIGN LOGIC)
async function renderStatsLeaderboardView() {
    const listContainer = document.getElementById('leaderboard-list-target');
    if (!listContainer) return;

    try {
        const { data: users, error } = await dbInstance.from('profiles').select('*').order('shares_count', { ascending: false });
        if (error) throw error;

        listContainer.innerHTML = users.map((user, idx) => {
            let trophyIconHtml = '';
            const totalShares = user.shares_count || 0;

            if (totalShares === 0) {
                trophyIconHtml = `<i class="fas fa-trophy" style="color:#7f8c8d; opacity:0.4; font-size:1.35rem;" title="No Shared Artifacts Yet"></i>`;
            } else if (idx === 0) {
                trophyIconHtml = `<i class="fas fa-trophy" style="color:#ffd700; filter:drop-shadow(0 0 6px rgba(255,215,0,0.5)); font-size:1.5rem;" title="1st Place Contributor"></i>`;
            } else if (idx === 1) {
                trophyIconHtml = `<i class="fas fa-trophy" style="color:#e2e8f0; filter:drop-shadow(0 0 6px rgba(226,232,240,0.6)); font-size:1.45rem;" title="2nd Place Contributor"></i>`;
            } else if (idx === 2) {
                trophyIconHtml = `<i class="fas fa-trophy" style="color:#cd7f32; font-size:1.35rem;" title="3rd Place Contributor"></i>`;
            } else {
                trophyIconHtml = `<span class="rank-numerical-badge">${idx + 1}</span>`;
            }

            return `
                <div class="leaderboard-row-item">
                    <div class="leaderboard-left-rank">
                        ${trophyIconHtml}
                        <img src="${user.avatar_url || 'profilepics/placeholdername.png'}" class="leaderboard-pfp">
                        <span class="leaderboard-user-title">${user.full_name}</span>
                    </div>
                    <div class="leaderboard-right-score">
                        <strong>${totalShares}</strong> shared resources
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error("Leaderboard loading system sequence crash:", err);
    }
}

// DYNAMIC GUIDED USER PROFILE MODAL SELECTION ENGINE
function openPfpSelectionConsole() {
    document.getElementById('pfp-picker-modal').classList.remove('hidden');
    const galleryView = document.getElementById('pfp-preset-gallery-view');
    galleryView.innerHTML = '';
    
    PRESET_PROFILE_PICTURES.forEach(fileName => {
        const displayLabel = fileName.split('.')[0];
        const wrapper = document.createElement('div');
        wrapper.className = 'pfp-gallery-thumb-wrapper';
        wrapper.style = 'text-align:center; cursor:pointer; transition:transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);';
        wrapper.onclick = () => savePresetProfilePicture(fileName);
        
        wrapper.innerHTML = `
            <img src="profilepics/${fileName}" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid var(--border-soft);">
            <p style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px; font-weight:700; text-transform:capitalize;">${displayLabel}</p>
        `;
        
        wrapper.onmouseenter = () => wrapper.style.transform = 'scale(1.12)';
        wrapper.onmouseleave = () => wrapper.style.transform = 'scale(1)';
        
        galleryView.appendChild(wrapper);
    });
}

function closePfpSelectionConsole() {
    document.getElementById('pfp-picker-modal').classList.add('hidden');
}

async function savePresetProfilePicture(fileName) {
    const targetUrl = `profilepics/${fileName}`;
    document.getElementById('profile-display-avatar').src = targetUrl;
    closePfpSelectionConsole();
    await updateAvatarDatabaseUrlReference(targetUrl);
}

async function processCustomPfpDirectUpload(inputElement) {
    if (!inputElement.files || inputElement.files.length === 0) return;
    const customImgFile = inputElement.files[0];
    
    toggleMainLoader(true, "Uploading profile avatar asset payload...");
    try {
        const uniqueBucketPath = `avatars/user-${Date.now()}-${customImgFile.name}`;
        const { error: uploadError } = await dbInstance.storage
            .from('limedu-assets')
            .upload(uniqueBucketPath, customImgFile, { cacheControl: '3600', upsert: true });
            
        if (uploadError) throw uploadError;
        
        const { data: linkData } = dbInstance.storage.from('limedu-assets').getPublicUrl(uniqueBucketPath);
        const externalPublicUrl = linkData.publicUrl;
        
        document.getElementById('profile-display-avatar').src = externalPublicUrl;
        closePfpSelectionConsole();
        await updateAvatarDatabaseUrlReference(externalPublicUrl);
    } catch (err) {
        console.error("Custom avatar bucket transmission error: ", err);
    } finally {
        toggleMainLoader(false);
    }
}

async function updateAvatarDatabaseUrlReference(avatarUrlPath) {
    try {
        await dbInstance
            .from('profiles')
            .update({ avatar_url: avatarUrlPath })
            .eq('id', globalData.currentSessionUser.id);
            
        globalData.currentSessionUser.avatar_url = avatarUrlPath;
    } catch (err) {
        console.error("Failed executing database backup update synchronization pipeline reference:", err);
    }
}

async function saveProfileSettingsPipeline() {
    const updatedStatusPhrase = document.getElementById('input-settings-status').value.trim();
    const updatedClassSection = document.getElementById('input-settings-class').value.trim();
    const updatedUsernameHandle = document.getElementById('input-settings-username').value.trim();
    const updatedPasscodeKey = document.getElementById('input-settings-password').value.trim();

    if (!updatedUsernameHandle) {
        alert("Username handle field parameters must remain populated.");
        return;
    }

    toggleMainLoader(true, "Synchronizing custom profile metrics configurations...");
    try {
        const profileUpdatePayload = {
            full_name: updatedUsernameHandle,
            status_quote: updatedStatusPhrase,
            class_section: updatedClassSection
        };
        if (updatedPasscodeKey) {
            profileUpdatePayload.secure_key = updatedPasscodeKey;
        }

        const { error } = await dbInstance
            .from('profiles')
            .update(profileUpdatePayload)
            .eq('id', globalData.currentSessionUser.id);

        if (error) throw error;

        document.getElementById('profile-display-name').innerText = updatedUsernameHandle;
        document.getElementById('profile-display-status').innerText = updatedStatusPhrase || "⚡ No status configured.";
        document.getElementById('profile-display-class').innerText = updatedClassSection || "7D";

        // Update active program memory records reference variables states
        globalData.currentSessionUser.full_name = updatedUsernameHandle;
        globalData.currentSessionUser.status_quote = updatedStatusPhrase;
        globalData.currentSessionUser.class_section = updatedClassSection;
        if (updatedPasscodeKey) globalData.currentSessionUser.secure_key = updatedPasscodeKey;

        alert("Profile workspace synchronized successfully! 🎉");
    } catch (err) {
        console.error("Profile credentials transmission failed down network loops:", err);
        alert("Synchronization pipeline experienced connection parameters fault failures.");
    } finally {
        toggleMainLoader(false);
    }
}

// MULTI-RESOURCE ATTRIBUTES DROPDOWNS MANAGEMENT
function handleSubjectChange() {
    const subjectSelectionBox = document.getElementById('modal-file-subject');
    const dynamicWrapperElement = document.getElementById('dynamic-subcategories-wrapper');
    if (!subjectSelectionBox || !dynamicWrapperElement) return;

    const value = subjectSelectionBox.value;
    dynamicWrapperElement.innerHTML = '';

    if (value === 'Maths') {
        dynamicWrapperElement.innerHTML = `
            <div class="input-group animated-fade-in-slide">
                <label>Chapter Focus Module</label>
                <select id="modal-file-subcategory">
                    ${MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join("")}
                </select>
            </div>
        `;
    }
}

// UPLOAD DATA PIPELINE TO STORAGE BUCKETS & TIMELINE REFERENCE POOLS
async function triggerSupabaseUploadPipeline() {
    const fileTitleInput = document.getElementById('modal-file-title').value.trim();
    const fileDescriptionInput = document.getElementById('modal-file-desc').value.trim();
    const fileSubjectInput = document.getElementById('modal-file-subject').value;
    const fileInputDomElement = document.getElementById('modal-file-input');
    const errorMessageLabel = document.getElementById('upload-error');

    let subCategoryValue = "General Notes Element";
    const subCategorySelectField = document.getElementById('modal-file-subcategory');
    if (subCategorySelectField) {
        subCategoryValue = subCategorySelectField.value;
    }

    if (!fileTitleInput || !fileDescriptionInput) {
        errorMessageLabel.innerText = "Please complete title and context summaries text fields.";
        return;
    }

    errorMessageLabel.innerText = '';
    toggleMainLoader(true, "Publishing classroom resource assets payload...");

    try {
        let arrayPayloadsUrlsCollection = [];

        if (fileInputDomElement && fileInputDomElement.files.length > 0) {
            for (let i = 0; i < fileInputDomElement.files.length; i++) {
                const attachmentFileObject = fileInputDomElement.files[i];
                const sanitizedUniquePath = `shares/post-${Date.now()}-${attachmentFileObject.name}`;
                
                const { error: uploadStorageErr } = await dbInstance.storage
                    .from('limedu-assets')
                    .upload(sanitizedUniquePath, attachmentFileObject, { cacheControl: '3600', upsert: true });
                    
                if (uploadStorageErr) throw uploadStorageErr;

                const { data: publicAccessUrlData } = dbInstance.storage
                    .from('limedu-assets')
                    .getPublicUrl(sanitizedUniquePath);
                    
                arrayPayloadsUrlsCollection.push(publicAccessUrlData.publicUrl);
            }
        }

        const databasePostObjectRowPayload = {
            author_id: globalData.currentSessionUser.id,
            author_name: globalData.currentSessionUser.full_name,
            author_avatar: globalData.currentSessionUser.avatar_url || "profilepics/placeholdername.png",
            title: fileTitleInput,
            description: fileDescriptionInput,
            subject: fileSubjectInput,
            subcategory: subCategoryValue,
            payloads: arrayPayloadsUrlsCollection
        };

        const { error: dbInsertError } = await dbInstance
            .from('posts')
            .insert([databasePostObjectRowPayload]);

        if (dbInsertError) throw dbInsertError;

        // Increment local share tracking score values parameters stats fields
        const dynamicSharesUpdatedScoreCount = (globalData.currentSessionUser.shares_count || 0) + 1;
        await dbInstance
            .from('profiles')
            .update({ shares_count: dynamicSharesUpdatedScoreCount })
            .eq('id', globalData.currentSessionUser.id);
            
        globalData.currentSessionUser.shares_count = dynamicSharesUpdatedScoreCount;

        // Reset inputs and close out upload interfaces safely
        document.getElementById('modal-file-title').value = '';
        document.getElementById('modal-file-desc').value = '';
        fileInputDomElement.value = '';
        document.getElementById('file-chosen-text').innerText = "Tap to attach files/images";

        closeUploadModal();
        await synchronizeLimeduFeedStream();

    } catch (err) {
        console.error("Supplied publish operational process streams crashed down:", err);
        errorMessageLabel.innerText = "Execution crash occurred during bucket data upload streams sequences.";
    } finally {
        toggleMainLoader(false);
    }
}

// GLOBAL APP FRAME WORKFLOW UTILITIES
function openUploadModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('upload-modal').classList.remove('hidden');
    handleSubjectChange();
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    if (document.getElementById('upload-error')) {
        document.getElementById('upload-error').innerText = '';
    }
}

function toggleMainLoader(show, labelText = "") {
    const targetLoaderElement = document.getElementById('loader-container');
    if (!targetLoaderElement) return;
    if (show) {
        targetLoaderElement.classList.remove('hidden');
        document.getElementById('loader-text').innerText = labelText;
    } else {
        targetLoaderElement.classList.add('hidden');
    }
}

function toggleTheme() {
    const isCurrentlyDark = document.body.classList.toggle('dark-mode');
    const computedModeKeyString = isCurrentlyDark ? 'dark-mode' : 'light-mode';
    document.body.className = computedModeKeyString;
    localStorage.setItem('hubTheme', computedModeKeyString);
    updateThemeToggleButton(computedModeKeyString);
}

function updateThemeToggleButton(themeKeyString) {
    const iconInnerNode = document.querySelector('#theme-toggle i');
    if (iconInnerNode) {
        iconInnerNode.className = themeKeyString === 'dark-mode' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function updateFileLabel() {
    const elementInputElementNode = document.getElementById('modal-file-input');
    if (elementInputElementNode && elementInputElementNode.files.length > 0) {
        document.getElementById('file-chosen-text').innerText = `${elementInputElementNode.files.length} element(s) loaded cleanly`;
    }
}

function setupDesktopDragScroll() {
    const targetSliderTrackElement = document.querySelector('.filter-row-slider');
    if (!targetSliderTrackElement) return;
    let trackMousedownStateIsDown = false;
    let startHorizontalCoordinateX;
    let initialScrollPositionLeftOffset;

    targetSliderTrackElement.addEventListener('mousedown', (e) => {
        trackMousedownStateIsDown = true;
        startHorizontalCoordinateX = e.pageX - targetSliderTrackElement.offsetLeft;
        initialScrollPositionLeftOffset = targetSliderTrackElement.scrollLeft;
    });
    targetSliderTrackElement.addEventListener('mouseleave', () => { trackMousedownStateIsDown = false; });
    targetSliderTrackElement.addEventListener('mouseup', () => { trackMousedownStateIsDown = false; });
    targetSliderTrackElement.addEventListener('mousemove', (e) => {
        if (!trackMousedownStateIsDown) return;
        e.preventDefault();
        const currentPositionX = e.pageX - targetSliderTrackElement.offsetLeft;
        const speedDeltaScrollWalkMultiplier = (currentPositionX - startHorizontalCoordinateX) * 2;
        targetSliderTrackElement.scrollLeft = initialScrollPositionLeftOffset - speedDeltaScrollWalkMultiplier;
    });
}

function escapeHtml(textString) {
    if (!textString) return '';
    return textString
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}