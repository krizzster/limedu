// CONFIGURATION ENGINE
const CONFIG = {
    token: (() => {
        const parts = ["ve2Or71K5xED", "idJQG9KBouQJ", "yKxeWltawMtg", "ghp_"];
        return [parts[3], parts[1], parts[2], parts[0]].join("");
    })(),
    owner: "krizzster",       
    repo: "limedu",              
    branch: "main"
};

// INITIALIZE SUPABASE STORAGE ENGINE VIA CLIENT CONSOLE
const supabaseUrl = 'https://unjdjduiqtldgoybgmnq.supabase.co';
const supabaseKey = 'MTQ5ODU4Nzc5MDg4NjMwNTg5Mg.zLED9ARjTqSO16PILbhZ7r58EedhZR';
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

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

async function synchronizeDataPipeline() {
    showSpinner("Synchronizing limedu Data...");
    try {
        const url = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/data.json?t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("JSON payload absent from repository main branch");
        globalData = await res.json();
        
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

async function commitToGitHubRemote(commitMessage = "data.json ledger reconciliation synchronization") {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
    try {
        const fileMetaRes = await fetch(url, {
            headers: { "Authorization": `token ${CONFIG.token}` }
        });
        if (!fileMetaRes.ok) throw new Error("Could not fetch file metadata for SHA reference calculation");
        const fileMeta = await fileMetaRes.json();
        const sha = fileMeta.sha;

        const payloadString = JSON.stringify(globalData, null, 2);
        const encodedPayload = btoa(unescape(encodeURIComponent(payloadString)));

        const updateRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${CONFIG.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: commitMessage,
                content: encodedPayload,
                sha: sha,
                branch: CONFIG.branch
            })
        });

        if (!updateRes.ok) throw new Error("GitHub File Write update negotiation failed rejected code runtime");
        console.log("GitHub ledger write sequence successfully fulfilled execution code entry context.");
    } catch (err) {
        console.error("Repository update pipeline exception execution error:", err);
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
    avatar.innerText = profile.name.charAt(0).toUpperCase();

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
        errEl.innerText = "Invalid credentials. Verify credentials configuration rules.";
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
                    <img src="${item.imagePayloads[0]}" alt="Asset Frame Preview Engine Base View">
                    ${item.imagePayloads.length > 1 ? `<div class="preview-counter-overlay">+${item.imagePayloads.length} Images</div>` : ""}
                </div>`;
        } else {
            const cdnUrl = `${supabaseUrl}/storage/v1/object/public/limedu-storage/${item.path}`;
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

        const rawDownloadUrl = `${supabaseUrl}/storage/v1/object/public/limedu-storage/${item.path}`;

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
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted); font-weight:700;">No feed items matched the active search or classification bounds.</div>`;
    }
}

function togglePostDropdownMenu(e) {
    e.stopPropagation();
    const currentMenu = e.currentTarget.nextElementSibling;
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => {
        if (m !== currentMenu) m.classList.add('hidden');
    });
    currentMenu.classList.toggle('hidden');
}

function renderMembersUI() {
    const container = document.getElementById('members-container');
    if (!container) return;
    container.innerHTML = "";

    for (const key in globalData.members) {
        const mem = globalData.members[key];
        const initial = mem.name.charAt(0).toUpperCase();
        const displayStatus = mem.status && mem.status.trim() !== "" ? `"${mem.status}"` : "No status update broadcasted.";

        const card = document.createElement('div');
        card.className = "member-card";
        card.innerHTML = `
            <div class="avatar">${initial}</div>
            <h3 class="member-name">${mem.name}</h3>
            <span class="member-class-tag">Class ${mem.currentClass || '7D'}</span>
            <p class="member-status-quote">${displayStatus}</p>
        `;
        container.appendChild(card);
    }
}

function openStatusModal() {
    const user = globalData.members[currentActiveFriendKey];
    document.getElementById('modal-status-input').value = user.status || "";
    document.getElementById('status-modal').classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('status-modal').classList.add('hidden');
}

async function triggerStatusSyncPipeline() {
    const statusInp = document.getElementById('modal-status-input').value.trim();
    showSpinner("Broadcasting update...");
    
    try {
        globalData.members[currentActiveFriendKey].status = statusInp;
        await commitToGitHubRemote(`status updated for ${currentActiveFriendKey}`);
        closeStatusModal();
        renderMembersUI();
        alert("Status synced successfully! 🎉");
    } catch (err) {
        console.error("Status synchronization failed:", err);
    } finally {
        hideSpinner();
    }
}

function handleSubjectChange() {
    const sub = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    wrapper.innerHTML = "";

    if (sub === 'Maths') {
        const group = document.createElement('div');
        group.className = "input-group";
        group.innerHTML = `
            <label>Curriculum Chapter Specification Target</label>
            <select id="modal-file-meta-subcat">
                ${MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join("")}
            </select>
        `;
        wrapper.appendChild(group);
    }
}

let activeCarouselArray = [];
let activeCarouselIndex = 0;

function launchMediaTheatreCarousel(payloadArray, assetTitle) {
    activeCarouselArray = payloadArray;
    activeCarouselIndex = 0;

    document.getElementById('theatre-filename-label').innerText = assetTitle;
    const stage = document.getElementById('theatre-view-viewport');
    stage.innerHTML = "";

    const img = document.createElement('img');
    img.id = "theatre-carousel-image-frame";
    img.src = activeCarouselArray[activeCarouselIndex];
    stage.appendChild(img);

    if (activeCarouselArray.length > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = "carousel-btn prev";
        prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
        prevBtn.onclick = navigateCarouselPrevious;

        const nextBtn = document.createElement('button');
        nextBtn.className = "carousel-btn next";
        nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
        nextBtn.onclick = navigateCarouselNext;

        const dots = document.createElement('div');
        dots.className = "carousel-indicator-dot-box";
        dots.id = "theatre-carousel-dots-wrapper";

        activeCarouselArray.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
            dot.onclick = () => jumpToCarouselIndex(idx);
            dots.appendChild(dot);
        });

        stage.appendChild(prevBtn);
        stage.appendChild(nextBtn);
        stage.appendChild(dots);
    }

    document.getElementById('theatre-lightbox').style.display = "flex";
}

function updateCarouselView() {
    const img = document.getElementById('theatre-carousel-image-frame');
    if (img) img.src = activeCarouselArray[activeCarouselIndex];

    const dotsWrapper = document.getElementById('theatre-carousel-dots-wrapper');
    if (dotsWrapper) {
        dotsWrapper.querySelectorAll('.carousel-dot').forEach((d, idx) => {
            if (idx === activeCarouselIndex) d.classList.add('active');
            else d.classList.remove('active');
        });
    }
}

function navigateCarouselPrevious() {
    activeCarouselIndex = (activeCarouselIndex - 1 + activeCarouselArray.length) % activeCarouselArray.length;
    updateCarouselView();
}

function navigateCarouselNext() {
    activeCarouselIndex = (activeCarouselIndex + 1) % activeCarouselArray.length;
    updateCarouselView();
}

function jumpToCarouselIndex(idx) {
    activeCarouselIndex = idx;
    updateCarouselView();
}

function launchTheatreStandalonePDF(url) {
    document.getElementById('theatre-filename-label').innerText = "Document Workspace Asset Resource Engine View";
    const stage = document.getElementById('theatre-view-viewport');
    stage.innerHTML = `<iframe src="https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true" width="100%" height="100%"></iframe>`;
    document.getElementById('theatre-lightbox').style.display = "flex";
}

function closeMediaTheatre() {
    document.getElementById('theatre-lightbox').style.display = "none";
    document.getElementById('theatre-view-viewport').innerHTML = "";
}

async function triggerSupabaseUploadPipeline() {
    const nameInp = document.getElementById('modal-file-name').value.trim();
    const metaInp = document.getElementById('modal-file-meta').value.trim();
    const subject = document.getElementById('modal-file-subject').value;
    const fileInp = document.getElementById('modal-file-input');
    const errEl = document.getElementById('upload-error');

    if (!nameInp || !fileInp.files || fileInp.files.length === 0) {
        errEl.innerText = "Please fulfill file parameters and upload selections correctly.";
        return;
    }

    errEl.innerText = "";
    showSpinner("Uploading workspace asset pipeline contents...");

    try {
        let finalMetaInfo = metaInp;
        if (subject === 'Maths') {
            const subcatSelect = document.getElementById('modal-file-meta-subcat');
            if (subcatSelect) {
                finalMetaInfo = `[${subcatSelect.value}] ${metaInp}`.trim();
            }
        }

        const timestamp = Date.now();
        const firstFile = fileInp.files[0];
        const fileExt = firstFile.name.split('.').pop();
        const isImages = firstFile.type.startsWith('image/');
        const isMulti = fileInp.files.length > 1;

        let entryPayloadPath = "";
        let isImageSetFlag = false;
        let imagePayloadsArray = [];

        if (isImages && isMulti) {
            isImageSetFlag = true;
            for (let i = 0; i < fileInp.files.length; i++) {
                const base64Str = await convertFileToBase64(fileInp.files[i]);
                imagePayloadsArray.push(base64Str);
            }
            const bundleJsonString = JSON.stringify({ images: imagePayloadsArray }, null, 2);
            const bundleBlob = new Blob([bundleJsonString], { type: 'application/json' });
            entryPayloadPath = `uploads/${currentActiveFriendKey}/${timestamp}_imgbundle.json`;

            const { error: uploadErr } = await supabase.storage
                .from('limedu-storage')
                .upload(entryPayloadPath, bundleBlob, { contentType: 'application/json', upsert: true });

            if (uploadErr) throw uploadErr;
        } else {
            entryPayloadPath = `uploads/${currentActiveFriendKey}/${timestamp}_${firstFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            
            const { error: uploadErr } = await supabase.storage
                .from('limedu-storage')
                .upload(entryPayloadPath, firstFile, { cacheControl: '3600', upsert: true });

            if (uploadErr) throw uploadErr;

            if (isImages && !isMulti) {
                isImageSetFlag = true;
                const base64Str = await convertFileToBase64(firstFile);
                imagePayloadsArray.push(base64Str);
            }
        }

        const newAssetEntry = {
            name: nameInp,
            path: entryPayloadPath,
            subject: subject,
            date: new Date().toISOString().split('T')[0],
            metaInfo: finalMetaInfo,
            isImageSet: isImageSetFlag,
            imagePayloads: imagePayloadsArray
        };

        if (!globalData.members[currentActiveFriendKey].pdfs) {
            globalData.members[currentActiveFriendKey].pdfs = [];
        }
        globalData.members[currentActiveFriendKey].pdfs.push(newAssetEntry);

        await commitToGitHubRemote(`asset published: ${nameInp} inside branch tree layout ecosystem rules parameters.`);
        
        closeUploadModal();
        renderFeedUI();
        alert("Asset synchronization deployment sequence achieved successfully! 🎉");
    } catch (err) {
        console.error("Pipeline processing crash configuration details context tracking trace error logs:", err);
        errEl.innerText = `Pipeline breakdown error stack detail processing log tracker execution logic text trace message target error: ${err.message || err}`;
    } finally {
        hideSpinner();
    }
}

async function triggerDeletePipeline(authorKey, index, storagePath) {
    if (!confirm("Are you sure you want to delete this file transaction permanently?")) return;
    showSpinner("Purging payload database links tracking parameters execution ledger contexts...");

    try {
        globalData.members[authorKey].pdfs.splice(index, 1);
        await commitToGitHubRemote(`Purged file log entry database link records trace matching target structural file ledger reference keys.`);
        
        try {
            await supabase.storage.from('limedu-storage').remove([storagePath]);
            console.log("Supabase core block array cloud asset clean target successful pipeline purge removal entry.");
        } catch (storageErr) {
            console.warn("Storage item removal could not complete or it was already dropped previously:", storageErr);
        }

        renderFeedUI();
        alert("Asset removed successfully! 🗑️");
    } catch (err) {
        console.error("Purge failure transaction process logic track error logs execution layer:", err);
        alert("Purge transaction run exception error failure logs mapping engine contexts.");
    } finally {
        hideSpinner();
    }
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
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

function openUploadModal(e) { if(e) e.preventDefault(); document.getElementById('upload-modal').classList.remove('hidden'); }
function closeUploadModal() { document.getElementById('upload-modal').classList.add('hidden'); }
function updateFileLabel() { const inp = document.getElementById('modal-file-input'); if(!inp) return; if(inp.files.length === 1) { document.getElementById('file-chosen-text').innerText = inp.files[0].name; } else if(inp.files.length > 1) { document.getElementById('file-chosen-text').innerText = `📊 Packed Configuration (${inp.files.length} Images Loaded)`; } }
function toggleTheme() { const isDark = document.body.classList.toggle('dark-mode'); const currentMode = isDark ? 'dark-mode' : 'light-mode'; document.body.classList.remove(isDark ? 'light-mode' : 'dark-mode'); localStorage.setItem('hubTheme', currentMode); updateThemeToggleButton(currentMode); }
function updateThemeToggleButton(theme) { const toggleBtn = document.getElementById('theme-toggle'); if (!toggleBtn) return; toggleBtn.innerHTML = theme === 'dark-mode' ? '<i class="fas fa-sun" style="color:#ffd166"></i>' : '<i class="fas fa-moon"></i>'; }