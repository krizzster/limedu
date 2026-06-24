let globalData = {};
const LOADING_TIME = 2500; 

window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Preferred Color Theme
    const savedTheme = localStorage.getItem('hubTheme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeToggleButton(savedTheme);

    // 2. Close active UI overlay components when clicking elsewhere on the page
    window.addEventListener('click', () => {
        const dropdown = document.getElementById('profileDropdown');
        const wrapper = document.getElementById('profileWrapper');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
            wrapper.classList.remove('active');
        }
    });

    // 3. Fetch Master Workspace Data JSON
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            globalData = data;
            if (data.groupName) {
                document.getElementById('hub-title').innerText = data.groupName;
            }
            
            const savedSession = localStorage.getItem('hubUserSession');
            if (savedSession === 'authenticated') {
                // Populate active username to hover slide interface element
                const activeUser = localStorage.getItem('hubActiveUser') || 'Friend';
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

    for (let key in globalData.members) {
        let member = globalData.members[key];
        if (member.name.toLowerCase() === userInp.toLowerCase() && member.password === passInp) {
            authenticated = true;
            matchedName = member.name;
            break;
        }
    }

    if (authenticated) {
        localStorage.setItem('hubUserSession', 'authenticated');
        localStorage.setItem('hubActiveUser', matchedName);
        document.getElementById('hoverUsername').innerText = matchedName;
        runFakeLoadingScreen();
    } else {
        errorEl.innerText = "❌ Invalid name or password. Try again!";
    }
}

function runFakeLoadingScreen() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('loader-container').classList.remove('hidden');
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
            pdfItemsHTML = '<p style="margin:0; font-size:0.85rem; color:var(--text-muted)">No PDFs uploaded yet.</p>';
        } else {
            friend.pdfs.forEach(pdf => {
                // Filter out fallback placeholder path from visible cards if it's there
                if (pdf.path.includes('.gitkeep')) return;
                pdfItemsHTML += `
                    <li class="pdf-item">
                        <a class="pdf-link" href="${pdf.path}" target="_blank">
                            <span><i class="fas fa-file-pdf" style="color:var(--accent); margin-right:6px;"></i> ${pdf.name}</span>
                            <span class="pdf-date">${pdf.date}</span>
                        </a>
                    </li>
                `;
            });
            if(pdfItemsHTML === '') {
                pdfItemsHTML = '<p style="margin:0; font-size:0.85rem; color:var(--text-muted)">No PDFs uploaded yet.</p>';
            }
        }

        const card = document.createElement('div');
        card.className = 'friend-card fade-in';
        card.innerHTML = `
            <div class="friend-header">
                <span class="friend-name">${friend.name}</span>
                <span class="friend-class">${friend.currentClass}</span>
            </div>
            <p class="friend-status">"${friend.status}"</p>
            <ul class="pdf-list">
                <strong style="font-size:0.8rem; display:block; margin-bottom:0.6rem; color:var(--text-muted)">RECENT UPLOADS:</strong>
                ${pdfItemsHTML}
            </ul>
        `;
        grid.appendChild(card);
    }
}

/* Interactive Dropdown Controls */
function toggleDropdown(event) {
    event.stopPropagation(); // Stops main page click event from instantly closing it
    const dropdown = document.getElementById('profileDropdown');
    const wrapper = document.getElementById('profileWrapper');
    
    dropdown.classList.toggle('hidden');
    wrapper.classList.toggle('active'); // Toggles sliding username state open
}

/* Light & Dark Theme Toggling Logic */
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
    if (theme === 'dark-mode') {
        toggleBtn.innerHTML = '<i class="fas fa-sun" style="color:#ffd166"></i>';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

/* Upload Popup Trigger Handlers */
function openUploadModal(event) {
    if(event) event.preventDefault();
    document.getElementById('upload-modal').classList.remove('hidden');
}

function closeUploadModal(event) {
    if(event) event.stopPropagation();
    document.getElementById('upload-modal').classList.add('hidden');
}

function handleLogout() {
    localStorage.removeItem('hubUserSession');
    localStorage.removeItem('hubActiveUser');
    window.location.reload();
}