// MCRanked - Server-Backed API Client

const CATEGORIES = [
    { id: 'overall', name: 'Overall' },
    { id: 'ltms', name: 'LTMs' },
    { id: 'vanilla', name: 'Vanilla' },
    { id: 'uhc', name: 'UHC' },
    { id: 'pot', name: 'Pot' },
    { id: 'nethop', name: 'NethOP' },
    { id: 'smp', name: 'SMP' },
    { id: 'sword', name: 'Sword' },
    { id: 'axe', name: 'Axe' },
    { id: 'mace', name: 'Mace' }
];

const TITLES = [
    "Combat Apprentice", "Combat Pawn", "Combat Soldier", "Combat Knight",
    "Combat Elite", "Combat Master", "Combat Champion", "Combat Legend", "Combat Deity"
];

const ADMIN_USERNAME = "Randomified";

let currentCategory = 'overall';
let currentUser = sessionStorage.getItem('mcranked_session') || null;
let rankingsDB = {}; 

// Arrays to populate dropdowns easily
const categoryListEl = document.getElementById('category-list');
const rankingListEl = document.getElementById('ranking-list');
const pageTitleEl = document.getElementById('page-title');
const searchInput = document.getElementById('player-search');

const authSection = document.getElementById('auth-section');
const userSection = document.getElementById('user-section');
const userActions = document.getElementById('user-actions');
const adminActions = document.getElementById('admin-actions');

const currentUsernameEl = document.getElementById('current-username');
const btnLoginModal = document.getElementById('btn-login-modal');
const btnRegisterModal = document.getElementById('btn-register-modal');
const btnLogout = document.getElementById('btn-logout');

// Modals
const authModal = document.getElementById('auth-modal');
const requestModal = document.getElementById('request-modal');
const inboxModal = document.getElementById('inbox-modal');

// Close buttons
const closeAuth = document.getElementById('close-auth-modal');
const closeReq = document.getElementById('close-request-modal');
const closeInbox = document.getElementById('close-inbox-modal');

// Buttons to open modals
const btnRequestModal = document.getElementById('btn-request-modal');
const btnInboxModal = document.getElementById('btn-inbox-modal');

const authError = document.getElementById('auth-error');
let authMode = 'login'; 

const adminPanel = document.getElementById('admin-panel');
const adminCategorySelect = document.getElementById('admin-category');
const adminRegionSelect = document.getElementById('admin-region');
const reqCategorySelect = document.getElementById('req-category');

const inboxBadge = document.getElementById('inbox-badge');
const ticketListContainer = document.getElementById('ticket-list-container');
const btnRefreshInbox = document.getElementById('btn-refresh-inbox');


// --- Initialization ---
async function init() {
    renderSidebar();
    populateCategoryDropdowns();
    updateAuthUI();
    await fetchRankings();
    renderTable(currentCategory);
    setupEventListeners();
    
    if(currentUser === ADMIN_USERNAME) {
        checkInboxCount();
    }
}

async function fetchRankings() {
    try {
        const res = await fetch('/api/data');
        rankingsDB = await res.json();
    } catch(e) {
        console.error("Failed to load rankings", e);
    }
}

// --- UI Updates ---
function updateAuthUI() {
    if (currentUser) {
        authSection.style.display = 'none';
        userSection.style.display = 'flex';
        currentUsernameEl.textContent = currentUser;
        
        document.getElementById('current-user-avatar').src = `https://mc-heads.net/avatar/${encodeURIComponent(currentUser)}/40`;
        
        userActions.style.display = 'flex';

        if (currentUser === ADMIN_USERNAME) {
            adminPanel.style.display = 'block';
            adminActions.style.display = 'flex';
            checkInboxCount();
        } else {
            adminPanel.style.display = 'none';
            adminActions.style.display = 'none';
        }
    } else {
        authSection.style.display = 'flex';
        userSection.style.display = 'none';
        userActions.style.display = 'none';
        adminActions.style.display = 'none';
        adminPanel.style.display = 'none';
    }
}

function openAuthModel(mode) {
    authMode = mode;
    document.getElementById('modal-title').textContent = mode === 'login' ? 'Welcome Back' : 'Create an Account';
    authError.textContent = '';
    authModal.style.display = 'flex';
}

function hideModals() {
    authModal.style.display = 'none';
    requestModal.style.display = 'none';
    inboxModal.style.display = 'none';
}

// --- Auth API Interfacing ---
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    
    authError.style.color = 'var(--text-primary)';
    authError.textContent = "Processing...";
    
    try {
        const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (!res.ok) {
            authError.style.color = 'var(--error-color)';
            authError.textContent = data.error || "An error occurred";
            return;
        }

        if (authMode === 'register') {
            authError.style.color = 'var(--tier-4)';
            authError.textContent = "Registration successful! You can now log in.";
            setTimeout(() => openAuthModel('login'), 1500);
        } else {
            currentUser = data.token; 
            sessionStorage.setItem('mcranked_session', currentUser);
            hideModals();
            updateAuthUI();
        }
    } catch(err) {
        authError.style.color = 'var(--error-color)';
        authError.textContent = "Network error. Is the server running?";
    }
});

btnLogout.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('mcranked_session');
    updateAuthUI();
});

// --- Category Helpers ---
function populateCategoryDropdowns() {
    adminCategorySelect.innerHTML = '';
    reqCategorySelect.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const op = `<option value="${cat.id}">${cat.name}</option>`;
        adminCategorySelect.innerHTML += op;
        reqCategorySelect.innerHTML += op;
    });
}

// --- Ticket Submissions ---
document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerName = document.getElementById('req-player-name').value.trim();
    const category = document.getElementById('req-category').value;
    const tier = document.getElementById('req-tier').value;
    const score = document.getElementById('req-score').value;
    const proof = document.getElementById('req-proof').value;
    const errEl = document.getElementById('req-error');
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Sending...';
    
    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser },
            body: JSON.stringify({ playerName, category, tier, score, proof })
        });
        const data = await res.json();
        if(res.ok) {
            alert('Ticket Successfully Submitted!');
            hideModals();
            e.target.reset(); // clear form
        } else {
            errEl.textContent = data.error;
        }
    } catch (e) {
        errEl.textContent = "Network error.";
    } finally {
        btn.textContent = 'Submit Ticket to Admins';
    }
});

// --- Inbox Logic ---
async function checkInboxCount() {
    if(currentUser !== ADMIN_USERNAME) return;
    try {
        const res = await fetch('/api/tickets', { headers: { 'Authorization': currentUser }});
        const data = await res.json();
        inboxBadge.textContent = data.length || 0;
    } catch(e) {}
}

async function fetchAndRenderInbox() {
    if(currentUser !== ADMIN_USERNAME) return;
    ticketListContainer.innerHTML = '<p style="color: var(--text-muted);">Loading tickets...</p>';
    
    try {
        const res = await fetch('/api/tickets', { headers: { 'Authorization': currentUser }});
        const data = await res.json();
        inboxBadge.textContent = data.length || 0;
        
        ticketListContainer.innerHTML = '';
        if(data.length === 0) {
            ticketListContainer.innerHTML = '<p style="color: var(--text-muted);">No pending tickets. Inbox is empty!</p>';
            return;
        }
        
        data.forEach(t => {
            const catName = CATEGORIES.find(c => c.id === t.category)?.name || t.category;
            const div = document.createElement('div');
            div.className = 'ticket-card';
            div.innerHTML = `
                <div class="ticket-info">
                    <h4>
                        <img src="https://mc-heads.net/avatar/${encodeURIComponent(t.playerName)}/24" style="border-radius:4px;">
                        ${t.playerName}
                    </h4>
                    <p><strong>Submitter:</strong> ${t.username}</p>
                    <p><strong>Category:</strong> ${catName} — <strong>Proposed HT${t.tier}</strong> [${t.score}]</p>
                    ${t.proof ? `<p><strong>Proof:</strong> <a href="${t.proof}" target="_blank" style="color:var(--brand-accent-hover)">Link</a></p>` : ''}
                </div>
                <div class="ticket-actions">
                    <button class="btn btn-success" onclick="approveTicket('${t.id}', '${t.playerName}', '${t.category}', ${t.tier}, ${t.score})">Approve</button>
                    <button class="btn btn-danger" onclick="denyTicket('${t.id}')">Deny / Delete</button>
                </div>
            `;
            ticketListContainer.appendChild(div);
        });
    } catch(e) {
        ticketListContainer.innerHTML = '<p class="error-text">Failed to fetch tickets.</p>';
    }
}

// Attach these to global window so innerHTML onclick string can hit them
window.approveTicket = async (id, playerName, category, tier, score) => {
    if(!confirm(`Approve ${playerName} into ${category} at Tier ${tier}?`)) return;
    try {
        // First inject rank
        const res = await fetch('/api/rankings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser },
            body: JSON.stringify({ playerName, category, tier, score })
        });
        if(res.ok) {
            rankingsDB = (await res.json()).rankings;
            renderTable(currentCategory);
            // Then delete ticket
            await denyTicket(id, true);
            alert(`${playerName} was successfully approved and added to leaderboards!`);
        } else alert("Failed to add rank manually.");
    } catch(e) { alert("Network error"); }
};

window.denyTicket = async (id, silent=false) => {
    if(!silent) {
        if(!confirm("Are you sure you want to dismiss this request?")) return;
    }
    try {
        await fetch(`/api/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': currentUser }
        });
        await fetchAndRenderInbox();
    } catch(e) { alert("Network error deleting ticket."); }
};


// --- Admin Direct Rank Action ---
document.getElementById('add-rank-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUser !== ADMIN_USERNAME) return; 
    
    const playerName = document.getElementById('admin-player-name').value.trim();
    const catId = adminCategorySelect.value;
    const tier = document.getElementById('admin-tier').value;
    const score = parseInt(document.getElementById('admin-score').value);
    const region = adminRegionSelect.value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Saving...';
    
    try {
        const res = await fetch('/api/rankings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser },
            body: JSON.stringify({ category: catId, playerName, tier, score, region })
        });
        const data = await res.json();
        if (res.ok) {
            rankingsDB = data.rankings;
            document.getElementById('admin-player-name').value = '';
            document.getElementById('admin-score').value = '';
            
            if (currentCategory === catId) renderTable(currentCategory);
        } else alert("Failed: " + data.error);
    } catch(err) {
        alert("Network error talking to backend server.");
    } finally {
        submitBtn.textContent = 'Add/Update Player';
    }
});

// --- Table & Rendering Logic ---
function renderSidebar() {
    categoryListEl.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const li = document.createElement('li');
        li.className = `nav-item ${cat.id === currentCategory ? 'active' : ''}`;
        li.innerHTML = `<img src="assets/${cat.id}.svg" style="width: 24px; height: 24px; object-fit: contain; margin-right: 0.75rem; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.6));" onerror="this.style.display='none'"> <span style="flex:1;">${cat.name}</span>`;
        li.dataset.id = cat.id;
        li.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            currentCategory = cat.id;
            pageTitleEl.textContent = `${cat.name} Rankings`;
            if (currentUser === ADMIN_USERNAME) adminCategorySelect.value = currentCategory;
            renderTable(currentCategory);
        });
        categoryListEl.appendChild(li);
    });
}

function getCombatTitle(score) {
    const idx = Math.min(Math.floor(score / 50), TITLES.length - 1);
    return TITLES[idx] || "Unranked";
}

function getPlayerCrossCategories(playerName) {
    let cross = [];
    Object.keys(rankingsDB).forEach(catId => {
        const p = rankingsDB[catId].find(x => x.name.toLowerCase() === playerName.toLowerCase());
        if (p) {
            cross.push({ category: catId, tier: p.tier });
        }
    });
    return cross;
}

function renderTable(categoryId, searchTerm = '') {
    rankingListEl.innerHTML = '';
    let players = rankingsDB[categoryId] || [];
    
    if (searchTerm) players = players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (players.length === 0) {
        rankingListEl.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted); background: rgba(0,0,0,0.4); border-radius: 12px;">No players found in this category.</div>`;
        return;
    }
    
    players.forEach((player, index) => {
        const title = getCombatTitle(player.score);
        const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-other';
        const region = player.region || 'NA';
        
        let miniBadgesHtml = getPlayerCrossCategories(player.name).map(cross => {
            const rawTier = cross.tier ? cross.tier.toString() : 'HT1';
            const tierName = (rawTier.toUpperCase().startsWith('HT') || rawTier.toUpperCase().startsWith('LT')) ? rawTier : `HT${rawTier}`;
            const tierLevel = tierName.slice(-1);
            return `
            <div class="mini-badge">
                <img src="assets/${cross.category}.svg" title="${CATEGORIES.find(c => c.id===cross.category)?.name || cross.category}">
                <span class="mini-tier t${tierLevel}">${tierName}</span>
            </div>
            `;
        }).join('');

        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="rank-box ${rankClass}">${index + 1}.</div>
            <div class="card-avatar">
                <img src="https://mc-heads.net/body/${encodeURIComponent(player.name)}/60" onerror="this.src='https://mc-heads.net/avatar/Steve/60'">
            </div>
            <div class="card-info">
                <div class="card-name">${player.name}</div>
                <div class="card-title">
                    <img src="assets/overall.svg" class="title-icon"> ${title} <span class="points-text">(${player.score} points)</span>
                </div>
            </div>
            <div class="region-badge ${region}">${region}</div>
            <div class="mini-badges">
                ${miniBadgesHtml}
            </div>
        `;
        rankingListEl.appendChild(card);
    });
}

// --- Listeners Binding ---
function setupEventListeners() {
    btnLoginModal.addEventListener('click', () => openAuthModel('login'));
    btnRegisterModal.addEventListener('click', () => openAuthModel('register'));
    
    btnRequestModal.addEventListener('click', () => {
        document.getElementById('req-error').textContent = '';
        requestModal.style.display = 'flex';
    });
    
    btnInboxModal.addEventListener('click', () => {
        inboxModal.style.display = 'flex';
        fetchAndRenderInbox();
    });
    
    btnRefreshInbox.addEventListener('click', fetchAndRenderInbox);

    closeAuth.addEventListener('click', hideModals);
    closeReq.addEventListener('click', hideModals);
    closeInbox.addEventListener('click', hideModals);
    
    searchInput.addEventListener('input', (e) => {
        renderTable(currentCategory, e.target.value);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) hideModals();
    });
}

document.addEventListener('DOMContentLoaded', init);
