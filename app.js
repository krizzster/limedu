let globalData = {};

// Load data when the website loads
window.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            globalData = data;
            if (data.groupName) {
                document.getElementById('hub-title').innerText = data.groupName;
            }
        })
        .catch(err => console.error("Error loading data.json:", err));
});

function handleLogin() {
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    let authenticated = false;

    // Search inside the members object for a match
    for (let key in globalData.members) {
        let member = globalData.members[key];
        if (member.name.toLowerCase() === userInp.toLowerCase() && member.password === passInp) {
            authenticated = true;
            break;
        }
    }

    if (authenticated) {
        // Hide login and show dashboard layout
        document.getElementById('login-container').classList.add('hidden');
        document.body.style.alignItems = "flex-start"; // readjust alignment
        document.getElementById('dashboard-container').classList.remove('hidden');
        
        buildDashboard();
    } else {
        errorEl.innerText = "❌ Invalid name or password. Try again!";
    }
}

function buildDashboard() {
    const grid = document.getElementById('friends-grid');
    grid.innerHTML = ''; // Clear out any placeholder text

    for (let key in globalData.members) {
        let friend = globalData.members[key];

        // Generate PDF items HTML string
        let pdfItemsHTML = '';
        if (friend.pdfs.length === 0) {
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

        // Create the individual grid card
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.innerHTML = `
            <div class="friend-header">
                <span class="friend-name">${friend.name}</span>
                <span class="friend-class">${friend.currentClass}</span>
            </div>
            <p class="friend-status">"${friend.status}"</p>
            <ul class="pdf-list">
                <strong style="font-size:0.8rem; display:block; margin-bottom:0.5rem; color:var(--text-muted)">RECENT UPLOADS:</strong>
                ${pdfItemsHTML}
            </ul>
        `;
        grid.appendChild(card);
    }
}

function handleLogout() {
    window.location.reload(); // Simple reload reset to bring back login screen
}