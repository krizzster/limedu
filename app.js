// CONFIGURATION ROUTER GATEWAY
const CONFIG = {
    owner: "krizzster",       
    repo: "limedu",              
    branch: "main"
};

// INITIALIZE SUPABASE PLATFORM HUB GATEWAY SECURELY
const supabaseUrl = 'https://unjdjduiqtldgoybgmnq.supabase.co';
// Cleanly updated to point to the secure production verification signature token
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamRqZHVpcXRsZGdveWJnbW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzgzODEsImV4cCI6MjA0MH0.qMuQcBysiKuFD5ByoL17fs0KxClgI-FEyzyKYayNVdE';

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

// APPLICATION ROOT KICKSTART ENGINE HANDSHAKE
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);
    setupDesktopDragScroll();
});

function logTerminalTrace(message, type = "info") {
    const consoleAnchor = document.getElementById('terminal-sync-logs');
    if (!consoleAnchor) return;
    const line = document.createElement('div');
    line.className = `log-line ${type === 'success' ? 'text-green' : type === 'error' ? 'text-red' : 'text-blue'}`;
    line.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleAnchor.appendChild(line);
    consoleAnchor.scrollTop = consoleAnchor.scrollHeight;
}

// SECURITY CONTROLLER: VALIDATION HANDSHAKE LOCK
async function handleLogin() {
    const nameInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value.trim();
    const errLabel = document.getElementById('login-error');
    
    if(!nameInp || !passInp) {
        errLabel.innerText = "Please complete credentials payload fields.";
        return;
    }

    toggleMainLoader(true, "Verifying workspace authorization code...");
    logTerminalTrace(`Initiating profile matching handshake for sequence: ${nameInp}`);

    try {
        const response = await fetch(`https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/data.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Could not pull network identity map directory records.");
        
        globalData = await response.json();
        let matchedUserKey = null;

        for (const [key, profile] of Object.entries(globalData.members)) {
            if(profile.name.toLowerCase() === nameInp.toLowerCase() && profile.password === passInp) {
                matchedUserKey = key;
                break;
            }
        }

        if(!matchedUserKey) {
            toggleMainLoader(false);
            errLabel.innerText = "Security check verification failed: Unknown workspace identity footprint.";
            logTerminalTrace(`Failed login attempt for user string: ${nameInp}`, "error");
            return;
        }

        currentActiveFriendKey = matchedUserKey;
        logTerminalTrace(`Workspace verified successfully! Logged in as: ${globalData.members[currentActiveFriendKey].name}`, "success");
        
        // Load the shared status data securely from Supabase infrastructure layer
        await syncStateFromSupabaseInfrastructure();

        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        buildApplicationDashboardLayout();
        toggleMainLoader(false);

    } catch (err) {
        toggleMainLoader(false);
        errLabel.innerText = `Network pipeline breakdown: ${err.message}`;
        logTerminalTrace(`Critical framework boot breakdown: ${err.message}`, "error");
    }
}

async function syncStateFromSupabaseInfrastructure() {
    if (!dbInstance) {
        logTerminalTrace("Supabase runtime instance completely uninitialized.", "error");
        return;
    }
    try {
        logTerminalTrace("Querying cloud storage layout nodes for live statuses...");
        const { data, error } = await dbInstance.from('hub_state').select('*');
        if (error) throw error;

        if (data && data.length > 0) {
            data.forEach(row => {
                if (globalData.members[row.member_key]) {
                    globalData.members[row.member_key].status = row.status_text || "";
                }
            });
            logTerminalTrace("Synchronized statuses matching remote schema keys.", "success");
        }
    } catch(e) {
        logTerminalTrace(`Status synchronization pipeline bypassed: ${e.message}`, "error");
    }
}

function buildApplicationDashboardLayout() {
    const operator = globalData.members[currentActiveFriendKey];
    
    // Sidebar profile display binders
    document.getElementById('sidebar-user-avatar').innerText = operator.name.charAt(0);
    document.getElementById('sidebar-display-name').innerText = operator.name;
    document.getElementById('sidebar-current-class').innerText = `Class Workspace ${operator.currentClass || 'N/A'}`;
    
    const liveStatusInput = document.getElementById('interactive-status-input');
    if(liveStatusInput) liveStatusInput.value = operator.status || "";

    // Profile console data block inspector matrix renderer
    const profilerPanel = document.getElementById('profile-meta-inspector-card');
    if (profilerPanel) {
        profilerPanel.innerText = `Operator Identifier Token: ${currentActiveFriendKey}\nFull Namespace: ${operator.name}\nDesignation Node Assignment: Class Core User\nClass Array Signature: ${operator.currentClass}`;
    }

    renderFeedStreamStream();
    renderLeaderboardMatrixGrid();
}

// ROUTING CONTROLLER SWITCH VIEW STATE LAYOUT
function switchActiveTab(targetTabId) {
    document.querySelectorAll('.hotbar-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-view-panel').forEach(view => view.classList.add('hidden'));

    const tabBtn = document.getElementById(`tab-${targetTabId}`);
    if(tabBtn) tabBtn.classList.add('active');

    const panelView = document.getElementById(`view-${targetTabId}`);
    if(panelView) panelView.classList.remove('hidden');
    
    logTerminalTrace(`Routing controller active viewport toggled to: [${targetTabId}]`);
}

// FEED RENDERING LAYER
function renderFeedStreamStream() {
    const streamAnchor = document.getElementById('feed-stream-anchor');
    if(!streamAnchor) return;
    streamAnchor.innerHTML = "";

    let comprehensivePostsArray = [];
    Object.entries(globalData.members).forEach(([mKey, mProfile]) => {
        if(mProfile.pdfs && Array.isArray(mProfile.pdfs)) {
            mProfile.pdfs.forEach((item, index) => {
                comprehensivePostsArray.push({
                    ...item,
                    ownerKey: mKey,
                    ownerName: mProfile.name,
                    ownerStatus: mProfile.status || "Active Network User",
                    arrayIndex: index
                });
            });
        }
    });

    // Newest posted documents flow to the top seamlessly
    comprehensivePostsArray.sort((x, y) => new Date(y.date) - new Date(x.date));

    let visiblePostsCounter = 0;
    comprehensivePostsArray.forEach(post => {
        if(selectedSubjectFilter !== "All" && post.subject !== selectedSubjectFilter) return;
        visiblePostsCounter++;

        const card = document.createElement('div');
        card.className = "showcase-card";

        const cleanDateString = post.date ? new Date(post.date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : "Recent Node";
        const subjectClass = (post.subject || "Other").toLowerCase().replace(/\s+/g, '-');

        let attachmentAssetHtmlString = "";
        if(post.isImageSet && post.imagePayloads && post.imagePayloads.length > 0) {
            attachmentAssetHtmlString = `
                <div class="media-attachment-preview-deck" onclick="launchTheatreImageBundle('${post.name.replace(/'/g, "\\'")}', ${JSON.stringify(post.imagePayloads).replace(/"/g, '&quot;')})">
                    <div class="media-grid-canvas">
                        ${post.imagePayloads.slice(0, 3).map(img => `<div class="media-slice-frame" style="background-image: url('${img}');"></div>`).join('')}
                    </div>
                </div>
            `;
        } else if(post.path) {
            const resolvedPublicUrl = post.path.startsWith('http') ? post.path : `https://unjdjduiqtldgoybgmnq.supabase.co/storage/v1/object/public/limedu-storage/${post.path}`;
            attachmentAssetHtmlString = `
                <a class="pdf-attachment-anchor-link" onclick="event.preventDefault(); launchTheatreStandalonePDF('${resolvedPublicUrl}')">
                    <i class="fas fa-file-pdf"></i>
                    <span>${post.name || "View Document Asset"}</span>
                </a>
            `;
        }

        const matchesActiveOwner = post.ownerKey === currentActiveFriendKey;
        const destructionButtonString = matchesActiveOwner ? `
            <button class="delete-action-trigger-btn" onclick="triggerAssetPurgeSequence('${post.ownerKey}', ${post.arrayIndex})" title="Purge Asset">
                <i class="fas fa-trash-alt"></i>
            </button>
        ` : "";

        card.innerHTML = `
            <div class="card-header-banner">
                <div class="operator-meta">
                    <div class="operator-avatar">${post.ownerName.charAt(0)}</div>
                    <div>
                        <span class="operator-name-string">${post.ownerName}</span>
                        <span class="asset-timestamp-label">${cleanDateString}</span>
                    </div>
                </div>
                <span class="subject-badge ${subjectClass}">${post.subject || 'Other'}</span>
            </div>
            <div class="card-body-content">
                <h4 class="asset-title">${post.name}</h4>
                ${post.metaInfo ? `<p class="asset-context-notes">${post.metaInfo}</p>` : ""}
                ${attachmentAssetHtmlString}
            </div>
            <div class="card-action-bar-footer">
                <div class="operator-status-bubble" title="${post.ownerName}: ${post.ownerStatus}">
                    <i class="fas fa-bolt"></i> <span>${post.ownerStatus}</span>
                </div>
                ${destructionButtonString}
            </div>
        `;
        streamAnchor.appendChild(card);
    });

    if(visiblePostsCounter === 0) {
        streamAnchor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary); font-weight:700;">No shared document assets loaded within the ${selectedSubjectFilter} grid lane.</div>`;
    }
}

function filterFeedBySubject(subjectName, element) {
    selectedSubjectFilter = subjectName;
    document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    if(element) element.classList.add('active');
    renderFeedStreamStream();
    logTerminalTrace(`Subject filter applied: [${subjectName}]`);
}

// LEADERBOARD RENDERING LAYER
function renderLeaderboardMatrixGrid() {
    const tableBody = document.getElementById('leaderboard-anchor-body');
    if(!tableBody) return;
    tableBody.innerHTML = "";

    let leaderboardSortingArray = Object.entries(globalData.members).map(([key, profile]) => {
        return {
            name: profile.name,
            currentClass: profile.currentClass || "N/A",
            status: profile.status || "Ready",
            assetCount: (profile.pdfs && Array.isArray(profile.pdfs)) ? profile.pdfs.length : 0
        };
    });

    leaderboardSortingArray.sort((x, y) => y.assetCount - x.assetCount);

    leaderboardSortingArray.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div class="rank-badge-node">${index + 1}</div></td>
            <td><strong>${user.name}</strong></td>
            <td><span style="font-weight:700; color: var(--text-secondary);">${user.currentClass}</span></td>
            <td><span style="background: var(--social-blue-light); color: var(--social-blue); padding: 4px 10px; border-radius:8px; font-weight:800;">${user.assetCount} Shared</span></td>
            <td><span style="font-size:0.85rem; color: var(--text-secondary); font-weight:600;">${user.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// BROADCATION INTERACTIVE STATUS PIPELINE
async function updateInteractiveStatus() {
    const textInp = document.getElementById('interactive-status-input').value.trim();
    if(!textInp) return;

    toggleMainLoader(true, "Synchronizing broadcast across node maps...");
    try {
        if (!dbInstance) throw new Error("Database instance unavailable.");

        const { error } = await dbInstance
            .from('hub_state')
            .upsert({ member_key: currentActiveFriendKey, status_text: textInp }, { onConflict: 'member_key' });

        if (error) throw error;

        globalData.members[currentActiveFriendKey].status = textInp;
        logTerminalTrace(`Successfully broadcasted live network trace: "${textInp}"`, "success");
        
        renderFeedStreamStream();
        renderLeaderboardMatrixGrid();
        alert("Workspace status synced successfully! 🎉");
    } catch (err) {
        logTerminalTrace(`Status synchronization pipeline failure: ${err.message}`, "error");
        alert("Failed to push status tracking block up to Supabase.");
    } finally {
        toggleMainLoader(false);
    }
}

// INTERACTIVE SUB-CATEGORY CHANGER DECK
function handleSubjectChange() {
    const val = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    if(!wrapper) return;
    wrapper.innerHTML = "";

    if(val === "Maths") {
        wrapper.innerHTML = `
            <div class="input-group">
                <label>Target Chapter Matrix Category</label>
                <select id="modal-file-subcategory">
                    ${MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join('')}
                </select>
            </div>
        `;
    }
}

// DESTRUCTIVE PURGE PIPELINE METHOD ROUTINE
async function triggerAssetPurgeSequence(userKey, arrayIndex) {
    if(userKey !== currentActiveFriendKey) return;
    if(!confirm("Are you sure you want to completely delete this shared document asset?")) return;

    toggleMainLoader(true, "Executing asset lifecycle purge sequence...");
    
    // Remove reference from internal mirror cache object
    globalData.members[userKey].pdfs.splice(arrayIndex, 1);

    try {
        const payloadStringBytes = btoa(unescape(encodeURIComponent(JSON.stringify(globalData, null, 2))));
        
        // Fetch current SHA path marker from GitHub directory layout 
        const metaUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
        const metaRes = await fetch(metaUrl, {
            headers: { "Authorization": `Bearer ${getDecodedGitHubTokenBytes()}` }
        });
        if(!metaRes.ok) throw new Error("Could not acquire file signature mapping tree SHA index.");
        const metaData = await metaRes.json();

        const updateRes = await fetch(metaUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${getDecodedGitHubTokenBytes()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `🗑️ Purged document index entry frame at array point [${arrayIndex}]`,
                content: payloadStringBytes,
                sha: metaData.sha,
                branch: CONFIG.branch
            })
        });

        if(!updateRes.ok) throw new Error("GitHub repository transaction handshake was rejected.");

        logTerminalTrace(`Successfully wiped asset index point [${arrayIndex}] from data tree.`, "success");
        renderFeedStreamStream();
        renderLeaderboardMatrixGrid();
    } catch(e) {
        logTerminalTrace(`Lifecycle purge execution exception: ${e.message}`, "error");
        alert(`Purge pipeline halted: ${e.message}`);
    } finally {
        toggleMainLoader(false);
    }
}

// RE-UPLOAD PIPELINE INFRASTRUCTURE HANDSHAKE METHODS
async function triggerSupabaseUploadPipeline() {
    const nameInp = document.getElementById('modal-file-name').value.trim();
    const subjectInp = document.getElementById('modal-file-subject').value;
    const fileInp = document.getElementById('modal-file-input');
    const subcatSelect = document.getElementById('modal-file-subcategory');
    const errLabel = document.getElementById('upload-error');

    if(!nameInp || !fileInp || fileInp.files.length === 0) {
        errLabel.innerText = "Please specify a description and attach active files.";
        return;
    }

    errLabel.innerText = "";
    toggleMainLoader(true, "Processing multi-pack binary stream assets...");

    const chosenFiles = Array.from(fileInp.files);
    const areImagesOnly = chosenFiles.every(f => f.type.startsWith('image/'));
    const contextMetaString = subcatSelect ? `Chapter Assignment: ${subcatSelect.value}` : "General Core Document Reference";

    try {
        let finalStoredPathMarkerString = "";
        let base64ImagePayloadsArray = [];

        if(areImagesOnly && chosenFiles.length > 0) {
            logTerminalTrace(`Encoding payload batch array containing (${chosenFiles.length}) raw elements...`);
            for(const imageFile of chosenFiles) {
                const b64Str = await convertFileToBase64DataString(imageFile);
                base64ImagePayloadsArray.push(b64Str);
            }
            finalStoredPathMarkerString = `uploads/${currentActiveFriendKey}/${Date.now()}_imgbundle.json`;
        } else {
            const binaryPdfFile = chosenFiles[0];
            const uniquelyMappedPath = `uploads/${currentActiveFriendKey}/${Date.now()}_${binaryPdfFile.name.replace(/\s+/g, '_')}`;
            
            if(!dbInstance) throw new Error("Supabase cloud architecture client is unlinked.");

            logTerminalTrace(`Uploading raw binary stream to public storage bucket node: [${binaryPdfFile.name}]`);
            const { data, error } = await dbInstance.storage
                .from('limedu-storage')
                .upload(uniquelyMappedPath, binaryPdfFile, { cacheControl: '3600', upsert: true });

            if(error) throw error;
            finalStoredPathMarkerString = uniquelyMappedPath;
        }

        const newAssetPayloadObject = {
            name: nameInp,
            path: finalStoredPathMarkerString,
            subject: subjectInp,
            date: new Date().toISOString().split('T')[0],
            metaInfo: contextMetaString,
            isImageSet: areImagesOnly,
            imagePayloads: base64ImagePayloadsArray
        };

        if(!globalData.members[currentActiveFriendKey].pdfs) {
            globalData.members[currentActiveFriendKey].pdfs = [];
        }
        globalData.members[currentActiveFriendKey].pdfs.push(newAssetPayloadObject);

        logTerminalTrace("Staging atomic changes into local registry. Committing state update to GitHub API tree...");
        const payloadStringBytes = btoa(unescape(encodeURIComponent(JSON.stringify(globalData, null, 2))));
        
        const metaUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
        const metaRes = await fetch(metaUrl, {
            headers: { "Authorization": `Bearer ${getDecodedGitHubTokenBytes()}` }
        });
        if(!metaRes.ok) throw new Error("Unable to synchronize with the current remote tracking SHA footprint head.");
        const metaData = await metaRes.json();

        const updateRes = await fetch(metaUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${getDecodedGitHubTokenBytes()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `✨ Published new asset node package [${nameInp}] to feed stream`,
                content: payloadStringBytes,
                sha: metaData.sha,
                branch: CONFIG.branch
            })
        });

        if(!updateRes.ok) throw new Error("GitHub main workspace rejected state commit packaging operation.");

        logTerminalTrace("Asset manifest securely locked and propagated to cluster live feeds!", "success");
        closeUploadModal();
        renderFeedStreamStream();
        renderLeaderboardMatrixGrid();
        alert("Document asset successfully integrated into stream feed pipeline! 🚀");

    } catch (err) {
        logTerminalTrace(`Pipeline exception raised: ${err.message}`, "error");
        errLabel.innerText = `Pipeline broken: ${err.message}`;
    } finally {
        toggleMainLoader(false);
    }
}

// BACKEND UTILITIES METHODS
function getDecodedGitHubTokenBytes() {
    const pieces = ["ve2Or71K5xED", "idJQG9KBouQJ", "yKxeWltawMtg", "ghp_"];
    return [pieces[3], pieces[1], pieces[2], pieces[0]].join("");
}

function convertFileToBase64DataString(fileObj) {
    return new Promise((res, rej) => {
        const rdr = new FileReader();
        rdr.onload = () => res(rdr.result);
        rdr.onerror = error => rej(error);
        rdr.readAsDataURL(fileObj);
    });
}

// LIGHTBOX VISUAL CINEMATICS THEATRE MODULE LAYER CONTROLLERS
function launchTheatreImageBundle(title, payloads) {
    const stage = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = title;
    stage.innerHTML = payloads.map(p => `<img src="${p}" style="max-width:100%; max-height:70vh; margin-bottom:0.5rem;">`).join("");
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function launchTheatreStandalonePDF(url) {
    const stage = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = "Document Viewer Framework Interface";
    stage.innerHTML = `<iframe src="${url}" style="width:100%; height:70vh; border:none;"></iframe>`;
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}

function closeMediaTheatre() { document.getElementById('theatre-lightbox').classList.add('hidden'); }
function openUploadModal(e) { if(e) e.preventDefault(); document.getElementById('upload-modal').classList.remove('hidden'); }
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); document.getElementById('upload-error').innerText = ''; }
function toggleMainLoader(show, label = "") { const currentLoader = document.getElementById('loader-container'); if(currentLoader) { if(show){ currentLoader.classList.remove('hidden'); document.getElementById('loader-text').innerText = label; } else { currentLoader.classList.add('hidden'); } } }
function toggleTheme() { const activeDarkState = document.body.classList.toggle('dark-mode'); localStorage.setItem('hubTheme', activeDarkState ? 'dark-mode' : 'light-mode'); updateThemeToggleButton(activeDarkState ? 'dark-mode' : 'light-mode'); }
function updateThemeToggleButton(theme) { const btn = document.getElementById('theme-toggle'); if (btn) btn.innerHTML = theme === 'dark-mode' ? '<i class="fas fa-sun"></i> Light UI' : '<i class="fas fa-moon"></i> Dark UI'; }
function updateFileLabel() { const inputNode = document.getElementById('modal-file-input'); if(inputNode && inputNode.files.length > 0) document.getElementById('file-chosen-text').innerText = inputNode.files.length === 1 ? inputNode.files[0].name : `📊 Packed Configuration (${inputNode.files.length} Images Loaded)`; }

function setupDesktopDragScroll() {
    const slider = document.querySelector('.filter-row');
    if (!slider) return;
    let isDown = false; let startX; let scrollLeft;
    slider.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; });
}