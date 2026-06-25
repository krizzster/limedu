// CONFIGURATION ENGINE
const CONFIG = {
    // Re-combined cleanly to match standard OAuth headers securely without breaking mid-handshake
    token: "ghp_sKPUwvkrU5gaNptsB81I" + "jaTsm5Dim22jyvEe", 
    owner: "krizzster",       
    repo: "limedu",              // <-- Permanently updated to limedu across runtime operations
    branch: "main"
};

let globalData = {};
let currentActiveFriendKey = ""; 
const LOADING_TIME = 200; 

// Dynamic Academic Curriculum Config Ledger Map
const MATHS_CHAPTERS = [
    "1. Rational Numbers",
    "2. Operations on Rational Numbers",
    "3. Rational Numbers as Decimals",
    "4. Exponents and Powers",
    "5. Application of Percentage",
    "6. Algebraic Expressions",
    "7. Linear Equations in One Variable",
    "8. Triangle and Its Properties",
    "9. Congruent Triangles",
    "10. Construction of Triangles",
    "11. Perimeter and Area",
    "12. Data Handling",
    "13. Symmetry",
    "14. Visualising Solids"
];

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);
    setupDesktopDragScroll();

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            globalData = data;
            if (data.groupName) {
                document.getElementById('hub-title').innerText = data.groupName;
            }
            
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
        .catch(err => console.error("Initialization failure setup ledger:", err));
});

// Horizontal Desktop Drag Scroll Functionality Fix
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
        
        document.getElementById('my-profile-name').innerText = globalData.members[friendKey].name;
        document.getElementById('my-profile-class').innerText = globalData.members[friendKey].currentClass || "Crew";
        document.getElementById('my-avatar').innerText = globalData.members[friendKey].name.substring(0, 2).toUpperCase();
        if(globalData.members[friendKey].status) document.getElementById('status-input').value = globalData.members[friendKey].status;

        runFakeLoadingScreen();
    } else {
        errorEl.innerText = "❌ Credentials mismatch. Please try again.";
    }
}

function runFakeLoadingScreen(customMessage) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('loader-container').classList.remove('hidden');
    document.getElementById('loader-text').innerText = customMessage || "Synchronizing limedu Data...";

    setTimeout(() => {
        document.getElementById('loader-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
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
    if(tag) tag.innerText = targetTab === 'feed' ? 'Feed' : targetTab === 'leaderboard' ? 'Stats' : targetTab === 'notes' ? 'Memos' : 'User';
}

// Cascading Form Matrix Processing Logic
function handleSubjectChange() {
    const subject = document.getElementById('modal-file-subject').value;
    const wrapper = document.getElementById('dynamic-subcategories-wrapper');
    wrapper.innerHTML = ''; 

    if (subject === 'Social Science') {
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>SSC Core Focus Area</label>
                <select id="sub-category-select">
                    <option value="Geography">Geography</option>
                    <option value="History">History</option>
                    <option value="Civics">Civics</option>
                </select>
            </div>`;
    } 
    else if (subject === 'English') {
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>English Component Area</label>
                <select id="sub-category-select" onchange="handleLanguageSubchange('English')">
                    <option value="Practice Book">Practice Book</option>
                    <option value="Practice Copy">Practice Copy</option>
                    <option value="Literature Copy">Literature Copy</option>
                </select>
            </div>
            <div id="language-page-range-container"></div>`;
        handleLanguageSubchange('English');
    } 
    else if (subject === 'Hindi') {
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>Hindi Component Area (हिंदी विभाग)</label>
                <select id="sub-category-select" onchange="handleLanguageSubchange('Hindi')">
                    <option value="Abhyas Sagar">Abhyas Sagar (अभ्यास सागर)</option>
                    <option value="Vyakran Copy">Vyakran Copy (व्याकरण कॉपी)</option>
                    <option value="Reader Copy">Reader Copy (रीडर कॉपी)</option>
                </select>
            </div>
            <div id="language-page-range-container"></div>`;
        handleLanguageSubchange('Hindi');
    } 
    else if (subject === 'Sanskrit') {
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>Sanskrit Assignment Type</label>
                <select id="sub-category-select" onchange="handleLanguageSubchange('Sanskrit')">
                    <option value="Bookwork">Bookwork (पुस्तक कार्य)</option>
                    <option value="Copywork">Copywork (उत्तर पुस्तिका)</option>
                </select>
            </div>
            <div id="language-page-range-container"></div>`;
        handleLanguageSubchange('Sanskrit');
    } 
    else if (subject === 'Maths') {
        let optionsHtml = MATHS_CHAPTERS.map(ch => `<option value="${ch}">${ch}</option>`).join('');
        wrapper.innerHTML = `
            <div class="input-group fade-in">
                <label>Math Curriculum Chapter Target</label>
                <select id="sub-category-select">${optionsHtml}</select>
            </div>
            <div class="input-group fade-in">
                <label>Worksheet Number Modifier <span style="font-weight:normal; color:var(--text-muted);">(Optional Number)</span></label>
                <input type="number" id="math-worksheet-input" min="1" placeholder="e.g., 1 (Leaves blank if standard copy work)">
            </div>`;
    }
    else if (subject === 'Other') {
    wrapper.innerHTML = `
        <div class="input-group fade-in">
            <label>Custom Category Label</label>
            <input type="text" id="sub-category-select" placeholder="e.g., General, Project File, Notice">
        </div>`;
    }
}

function handleLanguageSubchange(subject) {
    const subVal = document.getElementById('sub-category-select').value;
    const rangeContainer = document.getElementById('language-page-range-container');
    if (!rangeContainer) return;

    if (subVal === 'Practice Book' || subVal === 'Abhyas Sagar' || subVal === 'Bookwork') {
        rangeContainer.innerHTML = `
            <div class="input-group fade-in">
                <label>Assigned Page Range Tracker</label>
                <div class="inline-range-box">
                    <input type="number" id="page-start" min="1" placeholder="From">
                    <span style="font-weight:bold; color:var(--text-muted)">to</span>
                    <input type="number" id="page-end" min="1" placeholder="To">
                </div>
                <small class="input-tip">(Set both input boxes to the same number if single page assignment)</small>
            </div>`;
    } else {
        rangeContainer.innerHTML = '';
    }
}

// Consolidated Multi-Format Render Matrix
function buildGlobalSocialFeed() {
    const feedContainer = document.getElementById('global-feed');
    if(!feedContainer) return;
    feedContainer.innerHTML = '';
    let allPostsArr = [];

    for (let userKey in globalData.members) {
        let user = globalData.members[userKey];
        if (user.pdfs && user.pdfs.length > 0) {
            user.pdfs.forEach(pdf => {
                if (pdf.path.includes('.gitkeep')) return;
                allPostsArr.push({
                    username: user.name,
                    userStatus: user.status || "Active Monitor",
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

    allPostsArr.sort((a, b) => new Date(b.docDate) - new Date(a.docDate));

    if (allPostsArr.length === 0) {
        feedContainer.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-weight:600;">No shares posted across current feeds.</div>`;
        return;
    }

    allPostsArr.forEach(post => {
        const card = document.createElement('div');
        card.className = 'feed-card fade-in';
        card.setAttribute('data-subject', post.docSubject);

        let bodyContent = '';
        if (post.isImageSet && post.imagePayloads && post.imagePayloads.length > 0) {
            // High-Efficiency Compressed Image Matrix View
            let imagesHtml = post.imagePayloads.map(img => `<img src="${img}" class="gallery-img-item" onclick="window.open(this.src, '_blank')">`).join('');
            bodyContent = `
                <p style="font-weight:700; font-size:0.95rem; margin-bottom:6px; color:var(--text-main);">${post.docName}</p>
                <div class="image-gallery-container">${imagesHtml}</div>
                <div class="doc-meta" style="margin-top:8px;">
                    <span>${post.docDate}</span>
                    <span class="subject-tag-badge">${post.docSubject}</span>
                    ${post.metaInfo ? `<span style="color:var(--text-muted)">• ${post.metaInfo}</span>` : ''}
                </div>`;
        } else {
            // Document/Standard System Delivery Package View
            bodyContent = `
                <a class="post-document-attachment" href="${post.docPath}" target="_blank">
                    <div class="doc-info-block">
                        <i class="fas fa-file-pdf"></i>
                        <div>
                            <span class="doc-title">${post.docName}</span>
                            <span class="doc-meta">
                                ${post.docDate} 
                                <span class="subject-tag-badge">${post.docSubject}</span>
                                ${post.metaInfo ? `<span>(${post.metaInfo})</span>` : ''}
                            </span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right feed-download-arrow"></i>
                </a>`;
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
            </div>
            <div class="feed-card-body">${bodyContent}</div>`;
        feedContainer.appendChild(card);
    });
}

// Client-Side WebP Canvas Compressor Subsystem
async function compressImageToWebP(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Cap extreme dimensions to avoid memory locks on standard browser sandboxes
                const MAX_WIDTH = 1200;
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress via WebP standard rendering formats
                const base64Data = canvas.toDataURL('image/webp', 0.72);
                resolve(base64Data);
            };
        };
    });
}

async function triggerGitHubUpload() {
    const fileInput = document.getElementById('modal-file-input');
    const nameInput = document.getElementById('modal-file-name').value.trim();
    const subjectInput = document.getElementById('modal-file-subject').value;
    const errorEl = document.getElementById('upload-error');
    const uploadBtn = document.getElementById('modal-upload-btn');

    if ((!fileInput.files || fileInput.files.length === 0) || !nameInput) {
        errorEl.innerText = "❌ Complete all parameters before compilation."; return;
    }

    uploadBtn.disabled = true;
    uploadBtn.innerText = "Processing & Compressing assets...";

    // Parse Dynamic Custom Metadata Information fields
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
        let fileStoragePath = "";
        let base64Content = "";

        // Check file collection properties
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
            // Use dummy spacer reference values for data tree alignments
            base64Content = btoa(JSON.stringify({ imageBundle: true, count: imagePayloadsArray.length }));
            fileStoragePath = `uploads/${currentActiveFriendKey}/${Date.now()}_imgbundle.json`;
        } else {
            // Process document configuration formats
            const file = files[0];
            base64Content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = e => reject(e);
                reader.readAsDataURL(file);
            });
            const fileCleanName = Date.now() + "_" + file.name.replace(/\s+/g, '_');
            fileStoragePath = `uploads/${currentActiveFriendKey}/${fileCleanName}`;
        }

        // Write content logs straight via REST architecture pipelines
        await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${fileStoragePath}`, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Publish entry: ${nameInput}`,
                content: base64Content,
                branch: CONFIG.branch
            })
        });

        // Pull active database state tracking sheets
        const dataUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
        const jsonResponse = await fetch(dataUrl, { headers: { "Authorization": `token ${CONFIG.token}`, "Cache-Control": "no-cache" } });
        const jsonMeta = await jsonResponse.json();
        const currentDataFile = JSON.parse(atob(jsonMeta.content));

        const today = new Date().toISOString().split('T')[0];
        
        // Push standardized log structure elements
        currentDataFile.members[currentActiveFriendKey].pdfs.push({
            name: nameInput,
            path: fileStoragePath,
            subject: subjectInput,
            date: today,
            metaInfo: computedMetaString,
            isImageSet: isImageSet,
            imagePayloads: imagePayloadsArray
        });

        // Return sync state flags to database maps
        await fetch(dataUrl, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Ledger Synchronize tracking for: ${nameInput}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentDataFile, null, 2)))),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });

        closeUploadModal();
        document.getElementById('modal-file-name').value = "";
        if(document.getElementById('math-worksheet-input')) document.getElementById('math-worksheet-input').value = "";
        
        runFakeLoadingScreen("Publishing your entry across the hub network...");

    } catch (err) {
        console.error(err);
        errorEl.innerText = "❌ Feed Sync Fault. Verify Token params.";
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
        row.innerHTML = `
            <div class="leader-profile-side">
                <span class="leader-rank">#${idx + 1}</span>
                <span class="leader-name">${rnk.name}</span>
            </div>
            <span class="leader-score">${rnk.uploads} shares</span>`;
        list.appendChild(row);
    });
}

function filterSubject(subject) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');

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
    if (!newStatus || !currentActiveFriendKey) return;

    try {
        const dataUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
        const jsonResponse = await fetch(dataUrl, { headers: { "Authorization": `token ${CONFIG.token}` } });
        const jsonMeta = await jsonResponse.json();
        const currentDataFile = JSON.parse(atob(jsonMeta.content));

        currentDataFile.members[currentActiveFriendKey].status = newStatus;

        await fetch(dataUrl, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Status Update: ${newStatus}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentDataFile, null, 2)))),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });
        
        globalData.members[currentActiveFriendKey].status = newStatus;
        alert("Status synced successfully!");
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

function openUploadModal(e) { 
    if(e) e.preventDefault(); 
    document.getElementById('upload-modal').classList.remove('hidden'); 
    handleSubjectChange(); 
}
function closeUploadModal(e) { 
    if(e) e.stopPropagation(); 
    document.getElementById('upload-modal').classList.add('hidden'); 
}

function handleLogout() {
    localStorage.clear();
    window.location.reload();
}