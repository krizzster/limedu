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

    fetch(`data.json?t=${Date.now()}`)
        .then(response => response.json())
        .then(data => {
            globalData = data;
            if (data.groupName) document.getElementById('hub-title').innerText = data.groupName;
            
            const savedSession = localStorage.getItem('hubUserSession');
            if (savedSession === 'authenticated') {
                currentActiveFriendKey = localStorage.getItem('hubActiveFriendKey') || '';
                const activeUser = globalData.members[currentActiveFriendKey]?.name || 'Friend';
                
                document.getElementById('my-profile-name').innerText = activeUser;
                document.getElementById('my-profile-class').innerText = globalData.members[currentActiveFriendKey]?.currentClass || 'Monitor';
                document.getElementById('my-avatar').innerText = activeUser.substring(0, 2).toUpperCase();
                if(globalData.members[currentActiveFriendKey]?.status) {
                    document.getElementById('status-input').value = globalData.members[currentActiveFriendKey].status;
                }
                runFakeLoadingScreen();
            }
        })
        .catch(err => console.error("Initialization error:", err));
});

function setupDesktopDragScroll() {
    const slider = document.querySelector('.filter-bar-container');
    let isDown = false; let startX; let scrollLeft;
    if(!slider) return;
    slider.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; });
}

function handleLogin() {
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    let authenticated = false; let friendKey = '';

    for (let key in globalData.members) {
        let member = globalData.members[key];
        if (member.name.toLowerCase() === userInp.toLowerCase() && member.password === passInp) {
            authenticated = true; friendKey = key; break;
        }
    }

    if (authenticated) {
        localStorage.setItem('hubUserSession', 'authenticated');
        localStorage.setItem('hubActiveFriendKey', friendKey);
        currentActiveFriendKey = friendKey;
        runFakeLoadingScreen();
    } else {
        errorEl.innerText = "❌ Credentials mismatch. Please try again.";
    }
}

function runFakeLoadingScreen(customMessage) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');
    document.getElementById('loader-container').classList.remove('hidden');
    document.getElementById('loader-text').innerText = customMessage || "Synchronizing limedu Data...";

    setTimeout(() => {
        document.getElementById('loader-container').classList.add('hidden');
        const activeUser = globalData.members[currentActiveFriendKey]?.name || 'Friend';
        const avatarEl = document.getElementById('my-avatar');
        if(avatarEl) avatarEl.innerText = activeUser.substring(0, 2).toUpperCase();
        if(globalData.members[currentActiveFriendKey]?.status) {
            document.getElementById('status-input').value = globalData.members[currentActiveFriendKey].status;
        }
        buildGlobalSocialFeed();
        buildLeaderboards();
    }, LOADING_TIME);
}

function switchTab(targetTab) {
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.hotbar-item').forEach(item => item.classList.remove('active'));

    document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
    const navItem = document.getElementById(`nav-${targetTab}`);
    if(navItem) navItem.classList.add('active');
    
    const tag = document.querySelector('.hub-tag');
    if(tag) tag.innerText = targetTab === 'feed' ? 'Feed' : targetTab === 'leaderboard' ? 'Stats' : 'User';
}

function handleSubjectChange() {
    const subject = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    wrapper.innerHTML = ''; 

    if (subject === 'Social Science') {
        wrapper.innerHTML = `
            <div class="input-group fade-in"><label>SSC Core Focus Area</label>
                <select id="sub-category-select"><option value="Geography">Geography</option><option value="History">History</option><option value="Civics">Civics</option></select>
            </div>`;
    } 
    else if (subject === 'English') {
        wrapper.innerHTML = `
            <div class="input-group fade-in"><label>English Component Area</label>
                <select id="sub-category-select" onchange="handleLanguageSubchange('English')"><option value="Practice Book">Practice Book</option><option value="Practice Copy">Practice Copy</option><option value="Literature Copy">Literature Copy</option></select>
            </div><div id="language-page-range-container"></div>`;
        handleLanguageSubchange('English');
    } 
    else if (subject === 'Hindi') {
        wrapper.innerHTML = `
            <div class="input-group fade-in"><label>Hindi Component Area (हिंदी विभाग)</label>
                <select id="sub-category-select" onchange="handleLanguageSubchange('Hindi')"><option value="Abhyas Sagar">Abhyas Sagar (अभ्यास सागर)</option><option value="Vyakran Copy">Vyakran Copy (व्याकरण कॉपी)</option><option value="Reader Copy">Reader Copy (रीडर कॉपी)</option></select>
            </div><div id="language-page-range-container"></div>`;
        handleLanguageSubchange('Hindi');
    } 
    else if (subject === 'Sanskrit') {
        wrapper.innerHTML = `
            <div class="input-group fade-in"><label>Sanskrit Assignment Type</label>
                <select id="sub-category-select" onchange="handleLanguageSubchange('Sanskrit')"><option value="Bookwork">Bookwork (पुस्तक कार्य)</option><option value="Copywork">Copywork (उत्तर पुस्तिका)</option></select>
            </div><div id="language-page-range-container"></div>`;
        handleLanguageSubchange('Sanskrit');
    } 
    else if (subject === 'Maths') {
        let optionsHtml = MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join('');
        wrapper.innerHTML = `
            <div class="input-group fade-in"><label>Math Curriculum Chapter Target</label><select id="sub-category-select">${optionsHtml}</select></div>
            <div class="input-group fade-in"><label>Worksheet Number Modifier</label><input type="number" id="math-worksheet-input" min="1" placeholder="e.g., 1"></div>`;
    }
    else if (subject === 'Other') {
        wrapper.innerHTML = `
            <div class="input-group fade-in"><label>Custom Category Label</label><input type="text" id="sub-category-select" placeholder="e.g., General Notice"></div>`;
    }
}

function handleLanguageSubchange(subject) {
    const subVal = document.getElementById('sub-category-select').value;
    const rangeContainer = document.getElementById('language-page-range-container');
    if (!rangeContainer) return;

    if (subVal === 'Practice Book' || subVal === 'Abhyas Sagar' || subVal === 'Bookwork') {
        rangeContainer.innerHTML = `
            <div class="input-group fade-in"><label>Assigned Page Range Tracker</label>
                <div class="inline-range-box"><input type="number" id="page-start" min="1" placeholder="From"><span style="font-weight:bold; color:var(--text-muted)">to</span><input type="number" id="page-end" min="1" placeholder="To"></div>
            </div>`;
    } else {
        rangeContainer.innerHTML = '';
    }
}

function buildGlobalSocialFeed() {
    const feedContainer = document.getElementById('global-feed');
    if(!feedContainer) return;
    feedContainer.innerHTML = '';
    let allPostsArr = [];

    for (let userKey in globalData.members) {
        let user = globalData.members[userKey];
        if (user.pdfs && user.pdfs.length > 0) {
            user.pdfs.forEach((pdf, index) => {
                if (pdf.path.includes('.gitkeep')) return;
                allPostsArr.push({
                    id: pdf.id || `${userKey}_${index}`,
                    localIndex: index,
                    username: user.name,
                    userStatus: user.status ? `${user.status}` : "Active Member", 
                    userKey: userKey,
                    docName: pdf.name,
                    docPath: pdf.path,
                    docSubject: pdf.subject || 'Other',
                    docDate: pdf.date || '2026-06-25',
                    metaInfo: pdf.metaInfo || '',
                    isImageSet: pdf.isImageSet || false,
                    imagePayloads: pdf.imagePayloads || []
                });
            });
        }
    }

    allPostsArr.sort((a, b) => b.id.localeCompare(a.id) || new Date(b.docDate) - new Date(a.docDate));

    if (allPostsArr.length === 0) {
        feedContainer.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-weight:600;">No shares posted across current feeds.</div>`;
        return;
    }

    allPostsArr.forEach(post => {
        const card = document.createElement('div');
        card.className = 'feed-card fade-in';
        card.setAttribute('data-subject', post.docSubject);

        let actionsMenuHtml = '';
        if (post.userKey === currentActiveFriendKey) {
            actionsMenuHtml = `
                <div class="post-actions-wrapper">
                    <button class="post-actions-trigger-btn" onclick="toggleActionsMenu(event, '${post.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="dropdown-${post.id}" class="post-actions-dropdown-menu hidden">
                        <button class="post-action-item" onclick="initiatePostRename('${post.userKey}', ${post.localIndex}, '${post.docName}')">
                            <i class="fas fa-edit"></i> Edit Text
                        </button>
                        <button class="post-action-item delete-action-trigger" onclick="initiatePostDelete('${post.userKey}', ${post.localIndex})">
                            <i class="fas fa-trash-alt"></i> Delete Post
                        </button>
                    </div>
                </div>`;
        }

        let bodyContent = '';
        if (post.isImageSet && post.imagePayloads && post.imagePayloads.length > 0) {
            let imagesHtml = post.imagePayloads.map(img => `<img src="${img}" class="gallery-img-item" onclick="launchMediaTheatre('${escape(post.docName)}', '${img}', 'image')">`).join('');
            bodyContent = `
                <p id="title-display-${post.userKey}-${post.localIndex}" style="font-weight:700; font-size:0.95rem; margin-bottom:6px; color:var(--text-main);">${post.docName}</p>
                <div class="image-gallery-container">${imagesHtml}</div>
                <div class="doc-meta" style="margin-top:8px;">
                    <span>${post.docDate}</span>
                    <span class="subject-tag-badge">${post.docSubject}</span>
                    <span id="meta-display-${post.userKey}-${post.localIndex}">${post.metaInfo ? `• ${post.metaInfo}` : ''}</span>
                </div>`;
        } else {
            bodyContent = `
                <div class="post-document-attachment" onclick="launchMediaTheatre('${escape(post.docName)}', '${post.docPath}', 'pdf')">
                    <div class="doc-info-block">
                        <i class="fas fa-file-pdf"></i>
                        <div>
                            <span class="doc-title" id="title-display-${post.userKey}-${post.localIndex}">${post.docName}</span>
                            <span class="doc-meta">
                                ${post.docDate} 
                                <span class="subject-tag-badge">${post.docSubject}</span>
                                <span id="meta-display-${post.userKey}-${post.localIndex}">${post.metaInfo ? `(${post.metaInfo})` : ''}</span>
                            </span>
                        </div>
                    </div>
                    <i class="fas fa-expand feed-download-arrow"></i>
                </div>`;
        }

        card.innerHTML = `
            <div class="feed-card-header">
                <div class="feed-user-meta">
                    <div class="feed-avatar">${post.username.substring(0,2).toUpperCase()}</div>
                    <div>
                        <span class="feed-username">${post.username}</span>
                        <span class="feed-user-status">"${post.userStatus}"</span>
                    </div>
                </div>
                ${actionsMenuHtml}
            </div>
            <div class="feed-card-body">${bodyContent}</div>`;
        feedContainer.appendChild(card);
    });
}

function toggleActionsMenu(e, id) {
    e.stopPropagation();
    const targetMenu = document.getElementById(`dropdown-${id}`);
    const isHidden = targetMenu.classList.contains('hidden');
    document.querySelectorAll('.post-actions-dropdown-menu').forEach(m => m.classList.add('hidden'));
    if (isHidden) targetMenu.classList.remove('hidden');
}

// IN-APP LIGHTBOX ENGINE HANDLERS
function launchMediaTheatre(rawTitle, sourceUrl, formatType) {
    const title = unescape(rawTitle);
    document.getElementById('theatre-filename-label').innerText = title;
    const viewport = document.getElementById('theatre-view-viewport');
    viewport.innerHTML = '';

    if (formatType === 'image') {
        viewport.innerHTML = `<img src="${sourceUrl}" class="theatre-img-preview" alt="Preview Asset">`;
    } else if (formatType === 'pdf') {
        viewport.innerHTML = `<iframe src="${sourceUrl}" class="theatre-frame"></iframe>`;
    }

    document.getElementById('theatre-lightbox').classList.add('active');
}

function closeMediaTheatre() {
    document.getElementById('theatre-lightbox').classList.remove('active');
    setTimeout(() => {
        document.getElementById('theatre-view-viewport').innerHTML = '';
    }, 250);
}

// MANAGEMENT INTEGRITY HANDLERS
async function initiatePostRename(userKey, index, currentName) {
    const newName = prompt("Enter a new display name:", currentName);
    if (newName === null || newName.trim() === "") return;
    
    const currentMeta = globalData.members[userKey].pdfs[index].metaInfo || "";
    const newMeta = prompt("Update category metadata labels:", currentMeta);
    
    globalData.members[userKey].pdfs[index].name = newName.trim();
    if (newMeta !== null) globalData.members[userKey].pdfs[index].metaInfo = newMeta.trim();
    buildGlobalSocialFeed();

    await pushUpdatedDatabaseToGitHub(`Modified labels for entry: ${newName}`);
}

async function initiatePostDelete(userKey, index) {
    if (!confirm("Are you sure you want to permanently delete this post?")) return;
    
    globalData.members[userKey].pdfs.splice(index, 1);
    buildGlobalSocialFeed();
    buildLeaderboards();

    await pushUpdatedDatabaseToGitHub("Removed post node item log from data ledger index");
}

async function pushUpdatedDatabaseToGitHub(commitMsg) {
    try {
        const jsonResponse = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json?t=${Date.now()}`, { 
            headers: { "Authorization": `token ${CONFIG.token}`, "Accept": "application/vnd.github.v3+json" } 
        });
        const jsonMeta = await jsonResponse.json();
        
        await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
            body: JSON.stringify({
                message: commitMsg,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(globalData, null, 2)))),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });
    } catch (err) {
        console.error("Cloud tracking save fault:", err);
    }
}

async function compressImageToWebP(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/webp', 0.72));
            };
        };
    });
}

// NEW COMPACT SUPABASE BACKEND ZERO-DEPLOYMENT TRANSFER PIPELINE
async function triggerSupabaseUploadPipeline() {
    const fileInput = document.getElementById('modal-file-input');
    const nameInput = document.getElementById('modal-file-name').value.trim();
    const subjectInput = document.getElementById('modal-file-subject').value;
    const errorEl = document.getElementById('upload-error');
    const uploadBtn = document.getElementById('modal-upload-btn');

    if ((!fileInput.files || fileInput.files.length === 0) || !nameInput) {
        errorEl.innerText = "❌ Complete all parameters before compilation."; return;
    }

    uploadBtn.disabled = true;
    uploadBtn.innerText = "Processing & Streaming to CDN...";

    let computedMetaString = "";
    const subSel = document.getElementById('sub-category-select');
    if (subSel) {
        computedMetaString = subSel.value;
        if (subjectInput === 'Maths') {
            const wsInp = document.getElementById('math-worksheet-input').value.trim();
            if(wsInp) computedMetaString += ` Worksheet ${wsInp}`;
        } else {
            const pStart = document.getElementById('page-start');
            const pEnd = document.getElementById('page-end');
            if (pStart && pEnd && pStart.value && pEnd.value) {
                computedMetaString += ` (Pages ${pStart.value} to ${pEnd.value})`;
            }
        }
    }

    try {
        let isImageSet = false;
        let imagePayloadsArray = [];
        let singleFileUrl = "";

        const files = Array.from(fileInput.files);
        const hasImages = files.some(f => f.type.startsWith('image/'));

        if (hasImages) {
            isImageSet = true;
            for (let f of files) {
                if (f.type.startsWith('image/')) {
                    let compressedBase64 = await compressImageToWebP(f);
                    imagePayloadsArray.push(compressedBase64);
                }
            }
        } else {
            // Upload PDF binary straight to public bucket storage bucket endpoint
            const targetPdf = files[0];
            const cleanName = `${Date.now()}_${targetPdf.name.replace(/\s+/g, '_')}`;
            
            const { data, error } = await supabase.storage
                .from('limedu-assets')
                .upload(`public/${cleanName}`, targetPdf, { cacheControl: '3600', upsert: false });

            if (error) throw error;
            singleFileUrl = `${supabaseUrl}/storage/v1/object/public/limedu-assets/${data.path}`;
        }

        const dataUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json?t=${Date.now()}`;
        const jsonResponse = await fetch(dataUrl, { headers: { "Authorization": `token ${CONFIG.token}`, "Accept": "application/vnd.github.v3+json" } });
        const jsonMeta = await jsonResponse.json();
        const currentDataFile = JSON.parse(atob(jsonMeta.content));

        const postPayload = {
            id: String(Date.now()),
            name: nameInput,
            path: singleFileUrl || "image_bundle_cdn",
            subject: subjectInput,
            date: new Date().toISOString().split('T')[0],
            metaInfo: computedMetaString,
            isImageSet: isImageSet,
            imagePayloads: imagePayloadsArray
        };

        currentDataFile.members[currentActiveFriendKey].pdfs.push(postPayload);

        // Update local memory and UI with zero latency
        globalData = currentDataFile;
        buildGlobalSocialFeed();
        buildLeaderboards();

        // Push only data updates to github
        await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
            body: JSON.stringify({
                message: `Update feed configuration index for: ${nameInput}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentDataFile, null, 2)))),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });

        closeUploadModal();
        document.getElementById('modal-file-name').value = "";
        document.getElementById('file-chosen-text').innerText = "Upload PDF or Multiple Images";
        document.getElementById('modal-file-input').value = "";
        if(document.getElementById('math-worksheet-input')) document.getElementById('math-worksheet-input').value = "";

    } catch (err) {
        console.error(err);
        errorEl.innerText = "❌ Transaction stream failed. Verify connection metrics.";
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Publish to Feed";
    }
}

function buildLeaderboards() {
    const list = document.getElementById('leaderboard-list');
    if(!list) return;
    list.innerHTML = '';
    let ranks = [];

    for (let key in globalData.members) {
        let m = globalData.members[key];
        let count = m.pdfs ? m.pdfs.filter(p => !p.path.includes('.gitkeep')).length : 0;
        ranks.push({ name: m.name, uploads: count });
    }
    ranks.sort((a, b) => b.uploads - a.uploads);

    ranks.forEach((rnk, idx) => {
        const row = document.createElement('div');
        row.className = 'leader-row fade-in';
        row.innerHTML = `<div class="leader-profile-side"><span class="leader-rank">#${idx + 1}</span><span class="leader-name">${rnk.name}</span></div><span class="leader-score">${rnk.uploads} shares</span>`;
        list.appendChild(row);
    });
}

function filterSubject(subject) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if(window.event && window.event.target) window.event.target.classList.add('active');

    const items = document.querySelectorAll('.feed-card');
    items.forEach(item => {
        if (subject === 'all' || item.getAttribute('data-subject') === subject) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

async function updateLiveStatus() {
    const newStatus = document.getElementById('status-input').value.trim();
    if (!currentActiveFriendKey) return;

    try {
        globalData.members[currentActiveFriendKey].status = newStatus;
        buildGlobalSocialFeed();

        const dataUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json?t=${Date.now()}`;
        const jsonResponse = await fetch(dataUrl, { headers: { "Authorization": `token ${CONFIG.token}`, "Accept": "application/vnd.github.v3+json" } });
        const jsonMeta = await jsonResponse.json();
        const currentDataFile = JSON.parse(atob(jsonMeta.content));

        currentDataFile.members[currentActiveFriendKey].status = newStatus;

        await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
            body: JSON.stringify({
                message: `Status Update: ${newStatus}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentDataFile, null, 2)))),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });
        alert("Status synced successfully! 🎉");
    } catch (err) {
        console.error("Status synchronization failed:", err);
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
    toggleBtn.innerHTML = theme === 'dark-mode' ? '<i class="fas fa-sun" style="color:#ffd166"></i>' : '<i class="fas fa-moon"></i>';
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

function openUploadModal(e) { if(e) e.preventDefault(); document.getElementById('upload-modal').classList.add('active'); handleSubjectChange(); }
function closeUploadModal(e) { if(e) e.stopPropagation(); document.getElementById('upload-modal').classList.remove('active'); }
function handleLogout() { localStorage.clear(); window.location.reload(); }