// CONFIGURATION ENGINE
const CONFIG = {
    owner: "krizzster",       
    repo: "limedu",              
    branch: "main"
};

// INITIALIZE SUPABASE STORAGE & DATABASE ENGINE SECURELY
const supabaseUrl = 'https://unjdjduiqtldgoybgmnq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamRqZHVpcXRsZGdveWJnbW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzgzODEsImV4cCI6MjA5MzAxNDM4MX0.qMuQcBysiKuFD5ByoL17fs0KxClgI-FEyzyKYayNVdE';

// Solves the double initialization namespace identifier crash safely
let dbInstance = null;
if (typeof window.supabase !== 'undefined') {
    dbInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
}

let globalData = {};
let currentActiveFriendKey = ""; 
const LOADING_TIME = 200; 

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

    synchronizeDataPipeline();
});

function showSpinner(text = "Processing data layer...") {
    const loader = document.getElementById('loader-container');
    const label = document.getElementById('loader-text');
    if (loader && label) {
        label.innerText = text;
        loader.classList.remove('hidden');
    }
}

function hideSpinner() {
    const loader = document.getElementById('loader-container');
    if (loader) loader.classList.add('hidden');
}

// REPLACED GITHUB FETCH WITH INSTANT SUPABASE DATABASE READ
async function synchronizeDataPipeline() {
    showSpinner("Synchronizing limedu Data...");
    try {
        if (!dbInstance) throw new Error("Supabase client is not initialized.");

        const { data, error } = await dbInstance
            .from('hub_state')
            .select('payload')
            .eq('id', 1)
            .single();

        if (error) throw error;
        globalData = data.payload;
        
        const cachedUser = localStorage.getItem('limeduUserKey');
        if (cachedUser && globalData.members && globalData.members[cachedUser]) {
            currentActiveFriendKey = cachedUser;
            bootstrapApplicationWorkspace();
        } else {
            routeToAuthPortal();
        }
    } catch (err) {
        console.error("Critical synchronization breakdown:", err);
        routeToAuthPortal();
    } finally {
        setTimeout(hideSpinner, LOADING_TIME);
    }
}

// REPLACED GITHUB COMMIT PROCESS WITH INSTANT SUPABASE ROW UPDATE
async function commitToSupabaseDatabase() {
    try {
        if (!dbInstance) throw new Error("Supabase client is not initialized.");

        const { error } = await dbInstance
            .from('hub_state')
            .update({ payload: globalData, updated_at: new Date() })
            .eq('id', 1);

        if (error) throw error;
        console.log("Supabase infrastructure synchronized seamlessly.");
    } catch (err) {
        console.error("Database persistence write operation failure:", err);
        alert("Failed to synchronize application state changes securely.");
        throw err;
    }
}

function routeToAuthPortal() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function bootstrapApplicationWorkspace() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    const profile = globalData.members[currentActiveFriendKey];
    document.getElementById('current-user-display').innerText = profile.name;
    document.getElementById('current-user-class').innerText = `Class ${profile.currentClass || '--'}`;
    
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.innerText = profile.name.charAt(0).toUpperCase();

    renderFeedUI();
    renderMembersUI();
}

function handleLogin() {
    const userInp = document.getElementById('username').value.trim().toLowerCase();
    const passInp = document.getElementById('password').value.trim();
    const errEl = document.getElementById('login-error');

    if (!userInp || !passInp) {
        errEl.innerText = "Please complete all fields";
        return;
    }

    let foundKey = "";
    if (globalData.members) {
        for (const key in globalData.members) {
            if (globalData.members[key].name.toLowerCase() === userInp || key === userInp) {
                foundKey = key;
                break;
            }
        }
    }

    if (foundKey && globalData.members[foundKey].password === passInp) {
        errEl.innerText = "";
        currentActiveFriendKey = foundKey;
        localStorage.setItem('limeduUserKey', foundKey);
        bootstrapApplicationWorkspace();
    } else {
        errEl.innerText = "Invalid credentials. Verify configuration rules.";
    }
}

function handleLogout() {
    localStorage.removeItem('limeduUserKey');
    currentActiveFriendKey = "";
    routeToAuthPortal();
}

function switchSection(sectName) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sect => sect.classList.add('hidden'));

    if (sectName === 'feed') {
        document.getElementById('section-feed').classList.remove('hidden');
        event.currentTarget.classList.add('active');
    } else if (sectName === 'members') {
        document.getElementById('section-members').classList.remove('hidden');
        event.currentTarget.classList.add('active');
    }
}

let activeSubjectFilter = "All";
function filterSubject(sub) {
    activeSubjectFilter = sub;
    const container = event.currentTarget.parentElement;
    container.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderFeedUI();
}

function filterFeed() {
    renderFeedUI();
}

function renderFeedUI() {
    const container = document.getElementById('feed-container');
    if (!container) return;
    container.innerHTML = "";

    const query = document.getElementById('feed-search').value.toLowerCase().trim();
    let aggregatedItems = [];

    for (const authorKey in globalData.members) {
        const mem = globalData.members[authorKey];
        if (mem.pdfs) {
            mem.pdfs.forEach((item, index) => {
                aggregatedItems.push({ ...item, authorKey, authorName: mem.name, itemIndex: index });
            });
        }
    }

    aggregatedItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    aggregatedItems.forEach(item => {
        if (activeSubjectFilter !== "All" && item.subject !== activeSubjectFilter) return;
        if (query) {
            const matchTitle = item.name.toLowerCase().includes(query);
            const matchAuthor = item.authorName.toLowerCase().includes(query);
            const matchMeta = (item.metaInfo || "").toLowerCase().includes(query);
            if (!matchTitle && !matchAuthor && !matchMeta) return;
        }

        const card = document.createElement('div');
        card.className = "post-card";

        let previewMarkup = "";
        if (item.isImageSet && item.imagePayloads && item.imagePayloads.length > 0) {
            previewMarkup = `
            <div class="post-preview-box" onclick="launchMediaTheatreCarousel(${JSON.stringify(item.imagePayloads).replace(/"/g, '&quot;')}, '${item.name.replace(/'/g, "\\'")}')">
                <img src="${item.imagePayloads[0]}" alt="Asset Preview Frame">
                ${item.imagePayloads.length > 1 ? `<div class="preview-counter-overlay">+${item.imagePayloads.length} Images</div>` : ""}
            </div>`;
        } else {
            const cdnUrl = item.url || `${supabaseUrl}/storage/v1/object/public/limedu-storage/${item.path}`;
            previewMarkup = `
            <div class="post-preview-box" onclick="launchTheatreStandalonePDF('${cdnUrl}')">
                <div class="pdf-preview-canvas-placeholder">
                    <i class="fas fa-file-pdf"></i>
                    <span>View Document Resource</span>
                </div>
            </div>`;
        }

        const isOwner = item.authorKey === currentActiveFriendKey;
        const configurationMenuMarkup = isOwner ? `
        <div class="post-actions-wrapper">
            <button class="post-actions-trigger-btn" onclick="togglePostDropdownMenu(event)">
                <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="post-actions-dropdown-menu hidden">
                <button class="menu-action-btn delete" onclick="triggerDeletePipeline('${item.authorKey}', ${item.itemIndex}, '${item.path}')">
                    <i class="fas fa-trash-alt"></i> Remove Post
                </button>
            </div>
        </div>` : '<div></div>';

        const rawDownloadUrl = item.url || `${supabaseUrl}/storage/v1/object/public/limedu-storage/${item.path}`;
        card.innerHTML = `
            <div class="post-header">
                <div class="post-meta-block">
                    <h3 class="post-title">${item.name}</h3>
                    <span class="post-author-line">Shared by <b>${item.authorName}</b></span>
                </div>
                ${configurationMenuMarkup}
            </div>
            <div>
                <span class="subject-badge">${item.subject}</span>
            </div>
            ${item.metaInfo ? `<p class="post-desc">${item.metaInfo}</p>` : ""}
            ${previewMarkup}
            <div class="post-footer-actions">
                <span class="post-timestamp"><i class="far fa-calendar-alt"></i> ${item.date || 'unknown'}</span>
                <a href="${rawDownloadUrl}" target="_blank" download class="download-action-link" onclick="event.stopPropagation()">
                    <i class="fas fa-arrow-down"></i>
                </a>
            </div>
        `;
        container.appendChild(card);
    });

    if (container.innerHTML === "") {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted); font-weight:700;">No shared files uploaded yet inside this subject query.</div>`;
    }
}

function togglePostDropdownMenu(e) {
    e.stopPropagation();
    const menu = e.currentTarget.nextElementSibling;
    const wasHidden = menu.classList.contains('hidden');
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    if (wasHidden) menu.classList.remove('hidden');
}

// INTEGRATED ENHANCED BULK IMAGES & PDF PIPELINE STRAIGHT INTO DATABASE SAVE
async function triggerSupabaseUploadPipeline() {
    const nameInp = document.getElementById('modal-file-name').value.trim();
    const subjectInp = document.getElementById('modal-file-subject').value;
    const notesInp = document.getElementById('modal-file-notes').value.trim();
    const fileInp = document.getElementById('modal-file-input');
    const errEl = document.getElementById('upload-error');

    if (!nameInp || !fileInp.files || fileInp.files.length === 0) {
        errEl.innerText = "Please fill in title and load configurations.";
        return;
    }

    errEl.innerText = "";
    showSpinner("Uploading raw file payloads directly to storage...");

    try {
        if (!dbInstance) throw new Error("Supabase context instance disconnected.");
        const files = Array.from(fileInp.files);
        const isImageBundle = files.every(f => f.type.startsWith('image/')) && files.length > 0;

        let finalPathReference = "";
        let finalCdnUrl = "";
        let packedImagesPayloads = [];

        if (isImageBundle) {
            for (const itemFile of files) {
                const dataUrl = await convertFileToBase64(itemFile);
                packedImagesPayloads.push(dataUrl);
            }
            finalPathReference = `uploads/${currentActiveFriendKey}/${Date.now()}_imgbundle.json`;
        } else {
            const documentFile = files[0];
            finalPathReference = `uploads/${currentActiveFriendKey}/${Date.now()}_${documentFile.name}`;
            
            const { data: uploadData, error: uploadError } = await dbInstance
                .storage
                .from('limedu-storage')
                .upload(finalPathReference, documentFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = dbInstance
                .storage
                .from('limedu-storage')
                .getPublicUrl(finalPathReference);

            finalCdnUrl = publicUrlData.publicUrl;
        }

        const payloadItem = {
            name: nameInp,
            path: finalPathReference,
            url: finalCdnUrl || null,
            subject: subjectInp,
            date: new Date().toISOString().split('T')[0],
            metaInfo: notesInp,
            isImageSet: isImageBundle,
            imagePayloads: packedImagesPayloads
        };

        if (!globalData.members[currentActiveFriendKey].pdfs) {
            globalData.members[currentActiveFriendKey].pdfs = [];
        }

        globalData.members[currentActiveFriendKey].pdfs.unshift(payloadItem);

        // Instantly save state to database
        await commitToSupabaseDatabase();

        closeUploadModal();
        renderFeedUI();
        alert("Published seamlessly to workspace feed! 🎉");
    } catch (err) {
        console.error("Pipeline breakdown:", err);
        errEl.innerText = `Pipeline fault: ${err.message}`;
    } finally {
        hideSpinner();
    }
}

function convertFileToBase64(file) {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = error => rej(error);
        reader.readAsDataURL(file);
    });
}

// INTEGRATED PIPELINE REMOVAL INTO DATABASE
async function triggerDeletePipeline(authorKey, index, pathReference) {
    if (!confirm("Are you sure you want to completely discard this feed post object?")) return;
    showSpinner("Discarding node content registry record...");

    try {
        if (!dbInstance) throw new Error("Supabase infrastructure missing.");
        
        globalData.members[authorKey].pdfs.splice(index, 1);

        const isImageSet = pathReference.includes('_imgbundle.json');
        if (!isImageSet) {
            await dbInstance.storage.from('limedu-storage').remove([pathReference]);
        }

        await commitToSupabaseDatabase();
        renderFeedUI();
        alert("Post cleared successfully from cloud storage rows. ♻️");
    } catch (err) {
        console.error("Removal failure sequence error:", err);
        alert(`Deletion routine errored: ${err.message}`);
    } finally {
        hideSpinner();
    }
}

function renderMembersUI() {
    const list = document.getElementById('members-list');
    if (!list) return;
    list.innerHTML = "";

    for (const key in globalData.members) {
        const mem = globalData.members[key];
        const initial = mem.name.charAt(0).toUpperCase();
        const activeClass = mem.currentClass ? `Class ${mem.currentClass}` : 'Unassigned Class Structure';

        const row = document.createElement('div');
        row.className = "member-card-row";
        row.innerHTML = `
            <div class="member-profile-block">
                <div class="member-avatar-circle">${initial}</div>
                <div class="member-detail-lines">
                    <h4>${mem.name}</h4>
                    <span>${activeClass}</span>
                </div>
            </div>
            <div class="member-bubble-status-area">
                <p class="status-bubble-text">${mem.status ? `"${mem.status}"` : '<i>No status update listed.</i>'}</p>
            </div>
        `;
        list.appendChild(row);
    }
}

function openStatusModal() {
    const currentStatus = globalData.members[currentActiveFriendKey].status || "";
    document.getElementById('modal-status-input').value = currentStatus;
    document.getElementById('status-modal').classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('status-modal').classList.add('hidden');
}

// STATUS UPDATES LINKED TO DATABASE
async function triggerStatusSyncPipeline() {
    const text = document.getElementById('modal-status-input').value.trim();
    showSpinner("Updating activity status record...");

    try {
        globalData.members[currentActiveFriendKey].status = text;
        await commitToSupabaseDatabase();
        closeStatusModal();
        renderMembersUI();
        alert("Status synced successfully! 🎉");
    } catch (err) {
        console.error("Status synchronization failed:", err);
    } finally {
        hideSpinner();
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const currentMode = isDark ? 'dark-mode' : 'light-mode';
    document.body.classList.remove(isDark ? 'light-mode' : 'dark-mode');
    localStorage.setItem('hubTheme', currentMode);
    updateThemeToggleButton(currentMode);
}

function updateThemeToggleButton(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    toggleBtn.innerHTML = theme === 'dark-mode' ? '<i class=\"fas fa-sun\" style=\"color:#ffd166\"></i>' : '<i class=\"fas fa-moon\"></i>';
}

function updateFileLabel() {
    const inp = document.getElementById('modal-file-input');
    if(!inp) return;
    if(inp.files.length === 1) {
        document.getElementById('file-chosen-text').innerText = inp.files[0].name;
    } else if(inp.files.length > 1) {
        document.getElementById('file-chosen-text').innerText = `📊 Packed Configuration (${inp.files.length} Images Loaded)`;
    }
}

function openUploadModal(e) { if(e) e.preventDefault(); document.getElementById('upload-modal').classList.remove('hidden'); }
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); }

function handleSubjectChange() { /* Keeping fallback structure intact if you want logic adjustments */ }
function launchMediaTheatreCarousel(payloads, title) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = title;
    view.innerHTML = payloads.map(p => `<img src="${p}" style="max-width:100%; max-height:75vh; border-radius:12px; margin-bottom:1rem; object-fit:contain;">`).join("");
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}
function launchTheatreStandalonePDF(url) {
    const view = document.getElementById('theatre-view-viewport');
    document.getElementById('theatre-filename-label').innerText = "Shared Document Interface";
    view.innerHTML = `<iframe src="${url}" style="width:100%; height:75vh; border:none; border-radius:12px;"></iframe>`;
    document.getElementById('theatre-lightbox').classList.remove('hidden');
}
function closeMediaTheatre() { document.getElementById('theatre-lightbox').classList.add('hidden'); }

function setupDesktopDragScroll() {
    const slider = document.querySelector('.filter-row');
    if (!slider) return;
    let isDown = false; let startX; let scrollLeft;
    slider.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; });
}