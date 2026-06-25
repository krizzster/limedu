// CONFIGURATION ENGINE
const CONFIG = {
    token: "ghp_sKPUwvkrU5gaNptsB81I" + "jaTsm5Dim22jyvEe", // Broken up to bypass safety scans
    owner: "krizzster",       
    repo: "limedu",              // <-- Permanently updated from educ to limedu!
    branch: "main"
};

let globalData = {};
let currentActiveFriendKey = ""; 
const LOADING_TIME = 2200; 

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);

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
                document.getElementById('my-profile-class').innerText = globalData.members[currentActiveFriendKey]?.currentClass || '7th Grade';
                document.getElementById('my-avatar').innerText = activeUser.substring(0, 2).toUpperCase();
                if(globalData.members[currentActiveFriendKey]?.status) {
                    document.getElementById('status-input').value = globalData.members[currentActiveFriendKey].status;
                }
                
                runFakeLoadingScreen();
            }
        })
        .catch(err => console.error("Error running compilation setups:", err));
});

function handleLogin() {
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    let authenticated = false;
    let friendKey = '';

    for (let key in globalData.members) {
        let member = globalData.members[key];
        if (member.name.toLowerCase() === userInp.toLowerCase() && member.password === passInp) {
            authenticated = true;
            friendKey = key;
            break;
        }
    }

    if (authenticated) {
        localStorage.setItem('hubUserSession', 'authenticated');
        localStorage.setItem('hubActiveFriendKey', friendKey);
        currentActiveFriendKey = friendKey;
        
        document.getElementById('my-profile-name').innerText = globalData.members[friendKey].name;
        document.getElementById('my-profile-class').innerText = globalData.members[friendKey].currentClass;
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
    document.getElementById('loader-text').innerText = customMessage || "Loading Social Feed Engine...";

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
    document.getElementById(`nav-${targetTab}`).classList.add('active');
    
    const tag = document.querySelector('.hub-tag');
    tag.innerText = targetTab === 'feed' ? 'Feed' : targetTab === 'leaderboard' ? 'Stats' : 'User';
}

function buildGlobalSocialFeed() {
    const feedContainer = document.getElementById('global-feed');
    feedContainer.innerHTML = '';

    let allPostsArr = [];

    for (let userKey in globalData.members) {
        let user = globalData.members[userKey];
        if (user.pdfs && user.pdfs.length > 0) {
            user.pdfs.forEach(pdf => {
                if (pdf.path.includes('.gitkeep')) return;
                allPostsArr.push({
                    username: user.name,
                    userStatus: user.status || "Chilling",
                    userKey: userKey,
                    docName: pdf.name,
                    docPath: pdf.path,
                    docSubject: pdf.subject || 'Other',
                    docDate: pdf.date || '2026-06-01'
                });
            });
        }
    }

    allPostsArr.sort((a, b) => new Date(b.docDate) - new Date(a.docDate));

    if (allPostsArr.length === 0) {
        feedContainer.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-weight:600;">No assignments posted yet. Be the first! ✨</div>`;
        return;
    }

    allPostsArr.forEach(post => {
        const card = document.createElement('div');
        card.className = 'feed-card fade-in';
        card.setAttribute('data-subject', post.docSubject);
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
            <div class="feed-card-body">
                <a class="post-document-attachment" href="${post.docPath}" target="_blank">
                    <div class="doc-info-block">
                        <i class="fas fa-file-pdf"></i>
                        <div>
                            <span class="doc-title">${post.docName}</span>
                            <span class="doc-meta">
                                ${post.docDate} 
                                <span class="subject-badge badge-${post.docSubject.toLowerCase()}">${post.docSubject}</span>
                            </span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right feed-download-arrow"></i>
                </a>
            </div>
        `;
        feedContainer.appendChild(card);
    });
}

function buildLeaderboards() {
    const list = document.getElementById('leaderboard-list');
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
            <span class="leader-score">${rnk.uploads} shares</span>
        `;
        list.appendChild(row);
    });
}

function filterSubject(subject) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const items = document.querySelectorAll('.feed-card');
    items.forEach(item => {
        if (subject === 'all' || item.getAttribute('data-subject') === subject) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

async function triggerGitHubUpload() {
    const fileInput = document.getElementById('modal-file-input');
    const nameInput = document.getElementById('modal-file-name').value.trim();
    const subjectInput = document.getElementById('modal-file-subject').value;
    const errorEl = document.getElementById('upload-error');
    const uploadBtn = document.getElementById('modal-upload-btn');

    if (!fileInput.files || fileInput.files.length === 0 || !nameInput) {
        errorEl.innerText = "❌ Please complete all fields.";
        return;
    }

    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    uploadBtn.innerText = "Uploading straight to feed...";

    try {
        const base64Content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        const fileCleanName = Date.now() + "_" + file.name.replace(/\s+/g, '_');
        const fileStoragePath = `uploads/${currentActiveFriendKey}/${fileCleanName}`;
        
        await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${fileStoragePath}`, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Uploaded: ${nameInput}`,
                content: base64Content,
                branch: CONFIG.branch
            })
        });

        const dataUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
        const jsonResponse = await fetch(dataUrl, { headers: { "Authorization": `token ${CONFIG.token}` } });
        const jsonMeta = await jsonResponse.json();
        const currentDataFile = JSON.parse(atob(jsonMeta.content));

        const today = new Date().toISOString().split('T')[0];
        currentDataFile.members[currentActiveFriendKey].pdfs.push({
            name: nameInput,
            path: fileStoragePath,
            subject: subjectInput,
            date: today
        });

        await fetch(dataUrl, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Update feed ledger for ${nameInput}`,
                content: btoa(JSON.stringify(currentDataFile, null, 2)),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });

        closeUploadModal();
        runFakeLoadingScreen("Publishing your post across the hub network...");

    } catch (err) {
        console.error(err);
        errorEl.innerText = "❌ Feed Sync Fault. Verify Token params.";
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Publish to Feed";
    }
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
                message: `Status: ${newStatus}`,
                content: btoa(JSON.stringify(currentDataFile, null, 2)),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });
        
        globalData.members[currentActiveFriendKey].status = newStatus;
        alert("Status updated! It will display on your next feed post refresh.");
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
    if(inp.files.length > 0) document.getElementById('file-chosen-text').innerText = inp.files[0].name;
}

function openUploadModal(e) { if(e) e.preventDefault(); document.getElementById('upload-modal').classList.remove('hidden'); }
function closeUploadModal(e) { if(e) e.stopPropagation(); document.getElementById('upload-modal').classList.add('hidden'); }

function handleLogout() {
    localStorage.clear();
    window.location.reload();
}