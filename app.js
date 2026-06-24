// CONFIGURATION ENGINE
const CONFIG = {
    token: "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", 
    owner: "krizzster",       // <-- Change this to your GitHub username!
    repo: "educ",              // <-- Change this to your repository name if different!
    branch: "main"
};

let globalData = {};
let currentActiveFriendKey = ""; 
const LOADING_TIME = 2500; 

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);

    window.addEventListener('click', () => {
        const dropdown = document.getElementById('profileDropdown');
        const wrapper = document.getElementById('profileWrapper');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
            wrapper.classList.remove('active');
        }
    });

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            globalData = data;
            if (data.groupName) {
                document.getElementById('hub-title').innerText = data.groupName;
            }
            
            const savedSession = localStorage.getItem('hubUserSession');
            if (savedSession === 'authenticated') {
                const activeUser = localStorage.getItem('hubActiveUser') || 'Friend';
                currentActiveFriendKey = localStorage.getItem('hubActiveFriendKey') || '';
                document.getElementById('hoverUsername').innerText = activeUser;
                runFakeLoadingScreen();
            }
        })
        .catch(err => console.error("Error loading data.json:", err));
});

function handleLogin() {
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    let authenticated = false;
    let matchedName = '';
    let friendKey = '';

    for (let key in globalData.members) {
        let member = globalData.members[key];
        if (member.name.toLowerCase() === userInp.toLowerCase() && member.password === passInp) {
            authenticated = true;
            matchedName = member.name;
            friendKey = key;
            break;
        }
    }

    if (authenticated) {
        localStorage.setItem('hubUserSession', 'authenticated');
        localStorage.setItem('hubActiveUser', matchedName);
        localStorage.setItem('hubActiveFriendKey', friendKey);
        currentActiveFriendKey = friendKey;
        document.getElementById('hoverUsername').innerText = matchedName;
        runFakeLoadingScreen();
    } else {
        errorEl.innerText = "❌ Invalid name or password. Try again!";
    }
}

function runFakeLoadingScreen(customMessage) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('loader-container').classList.remove('hidden');
    document.getElementById('loader-text').innerText = customMessage || "Synchronizing Hub Data...";
    document.body.style.alignItems = "center";

    setTimeout(() => {
        document.getElementById('loader-container').classList.add('hidden');
        document.body.style.alignItems = "flex-start";
        document.getElementById('dashboard-container').classList.remove('hidden');
        buildDashboard();
    }, LOADING_TIME);
}

function buildDashboard() {
    const grid = document.getElementById('friends-grid');
    grid.innerHTML = ''; 

    for (let key in globalData.members) {
        let friend = globalData.members[key];
        let pdfItemsHTML = '';
        
        if (!friend.pdfs || friend.pdfs.length === 0) {
            pdfItemsHTML = '<p class="no-files-notice" style="margin:0; font-size:0.85rem; color:var(--text-muted)">No PDFs uploaded yet.</p>';
        } else {
            friend.pdfs.forEach(pdf => {
                if (pdf.path.includes('.gitkeep')) return;
                const subject = pdf.subject || 'Other';
                pdfItemsHTML += `
                    <li class="pdf-item" data-subject="${subject}">
                        <a class="pdf-link" href="${pdf.path}" target="_blank">
                            <span>
                                <i class="fas fa-file-pdf" style="color:var(--accent); margin-right:6px;"></i> 
                                ${pdf.name}
                                <span class="subject-badge badge-${subject.toLowerCase()}">${subject}</span>
                            </span>
                            <span class="pdf-date">${pdf.date}</span>
                        </a>
                    </li>
                `;
            });
        }

        const card = document.createElement('div');
        card.className = 'friend-card fade-in';
        card.innerHTML = `
            <div class="friend-header">
                <span class="friend-name">${friend.name}</span>
                <span class="friend-class">${friend.currentClass}</span>
            </div>
            <p class="friend-status" id="status-display-${key}">"${friend.status}"</p>
            <ul class="pdf-list">
                <strong style="font-size:0.8rem; display:block; margin-bottom:0.6rem; color:var(--text-muted)">RECENT UPLOADS:</strong>
                ${pdfItemsHTML}
            </ul>
        `;
        grid.appendChild(card);
    }
}

/* SUBJECT FILTER MATRIX */
function filterSubject(subject) {
    // Update active filter button color style
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const items = document.querySelectorAll('.pdf-item');
    items.forEach(item => {
        if (subject === 'all' || item.getAttribute('data-subject') === subject) {
            item.classList.remove('hidden-by-filter');
        } else {
            item.classList.add('hidden-by-filter');
        }
    });
}

/* AUTOMATED GITHUB API CORE PIPELINE */
async function triggerGitHubUpload() {
    const fileInput = document.getElementById('modal-file-input');
    const nameInput = document.getElementById('modal-file-name').value.trim();
    const subjectInput = document.getElementById('modal-file-subject').value;
    const errorEl = document.getElementById('upload-error');
    const uploadBtn = document.getElementById('modal-upload-btn');

    if (!fileInput.files || fileInput.files.length === 0 || !nameInput) {
        errorEl.innerText = "❌ Please provide a file name and select a file.";
        return;
    }

    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    uploadBtn.innerText = "Uploading to Repositories...";

    try {
        // Step 1: Read the file stream locally and turn it into base64 text
        const base64Content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        // Step 2: Upload the actual binary file straight into their folder layout
        const fileCleanName = Date.now() + "_" + file.name.replace(/\s+/g, '_');
        const fileStoragePath = `uploads/${currentActiveFriendKey}/${fileCleanName}`;
        
        await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${fileStoragePath}`, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Uploaded new asset: ${nameInput}`,
                content: base64Content,
                branch: CONFIG.branch
            })
        });

        // Step 3: Fetch structural config file data.json to attach metadata list record
        const dataUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data.json`;
        const jsonResponse = await fetch(dataUrl, { headers: { "Authorization": `token ${CONFIG.token}` } });
        const jsonMeta = await jsonResponse.json();
        const currentDataFile = JSON.parse(atob(jsonMeta.content));

        // Step 4: Inject the metadata directly into the correct user block arrays
        const today = new Date().toISOString().split('T')[0];
        currentDataFile.members[currentActiveFriendKey].pdfs.push({
            name: nameInput,
            path: fileStoragePath,
            subject: subjectInput,
            date: today
        });

        // Step 5: Repush updated configuration file right back to GitHub to trigger Vercel build
        await fetch(dataUrl, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Metadata tracking injection for ${nameInput}`,
                content: btoa(JSON.stringify(currentDataFile, null, 2)),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });

        closeUploadModal();
        runFakeLoadingScreen("Re-indexing complete! Re-building site structures...");

    } catch (err) {
        console.error(err);
        errorEl.innerText = "❌ Critical GitHub sync fault. Verify token parameters.";
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Push Live to Hub";
    }
}

/* LIVE STATUS AUTOMATED WRITER */
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
                message: `Status update: ${newStatus}`,
                content: btoa(JSON.stringify(currentDataFile, null, 2)),
                sha: jsonMeta.sha,
                branch: CONFIG.branch
            })
        });

        document.getElementById('status-display-' + currentActiveFriendKey).innerText = `"${newStatus}"`;
        document.getElementById('status-input').value = "";
    } catch (err) {
        console.error("Status update sync fault:", err);
    }
}

/* UI UTILITIES */
function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    const wrapper = document.getElementById('profileWrapper');
    dropdown.classList.toggle('hidden');
    wrapper.classList.toggle('active');
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
    localStorage.removeItem('hubUserSession');
    localStorage.removeItem('hubActiveUser');
    localStorage.removeItem('hubActiveFriendKey');
    window.location.reload();
}