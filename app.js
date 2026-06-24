let globalData = {};
const LOADING_TIME = 2500; // 2.5 seconds fake load duration

window.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            globalData = data;
            if (data.groupName) {
                document.getElementById('hub-title').innerText = data.groupName;
            }
            
            // Check if user session already exists in browser storage
            const savedSession = localStorage.getItem('hubUserSession');
            if (savedSession === 'authenticated') {
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

    for (let key in globalData.members) {
        let member = globalData.members[key];
        if (member.name.toLowerCase() === userInp.toLowerCase() && member.password === passInp) {
            authenticated = true;
            break;
        }
    }

    if (authenticated) {
        // Save auth data to localStorage so refresh doesn't wipe it
        localStorage.setItem('hubUserSession', 'authenticated');
        runFakeLoadingScreen();
    } else {
        errorEl.innerText = "❌ Invalid name or password. Try again!";
    }
}

function runFakeLoadingScreen() {
    // Hide both main containers and display loader
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('loader-container').classList.remove('hidden');
    document.body.style.alignItems = "center";

    // Wait 2.5 seconds before showing the dashboard layout
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
            pdfItemsHTML = '<p style="margin:0; font-size:0.85rem;">No PDFs uploaded yet.</p>';
        } else {
            friend.pdfs.forEach(pdf => {
                pdfItemsHTML += `
                    <li class="pdf-item">
                        <a class="pdf-link" href="${pdf.path}" target="_blank">
                            <span>📄 ${pdf.name}</span>
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
            <p class="friend-status">"${friend.status}"</p>
            <ul class="pdf-list">
                <strong style="font-size:0.8rem; display:block; margin-bottom:0.6rem; color:var(--text-muted)">RECENT UPLOADS:</strong>
                ${pdfItemsHTML}
            </ul>
        `;
        grid.appendChild(card);
    }
}

function handleLogout() {
    // Clear login storage status and refresh
    localStorage.removeItem('hubUserSession');
    window.location.reload();
}