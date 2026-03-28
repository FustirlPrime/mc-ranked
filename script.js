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
function getCombatTitle(points) {
    const titles = [
        'Combat Apprentice',  // 0-99
        'Combat Novice',      // 100
        'Combat Soldier',     // 200
        'Combat Mercenary',   // 300
        'Combat Warrior',     // 400
        'Combat Veteran',     // 500
        'Combat Knight',      // 600
        'Combat Elite',       // 700
        'Combat Vanguard',    // 800
        'Combat Commander',   // 900
        'Combat General',     // 1000
        'Combat Warlord',     // 1100
        'Combat Master',      // 1200
        'Combat Grandmaster', // 1300
        'Combat Champion',    // 1400
        'Combat Hero',        // 1500
        'Combat Legend',      // 1600
        'Combat Mythic',      // 1700
        'Combat Ascendant',   // 1800
        'Combat Sentinel',    // 1900
        'Combat Paragon',     // 2000
        'Combat Immortal',    // 2100
        'Combat Deity'        // 2200+
    ];
    let index = Math.floor(points / 100);
    if (index >= titles.length) index = titles.length - 1;
    return titles[index];
}
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
        if (cat.id !== 'overall') {
            adminCategorySelect.add(new Option(cat.name, cat.id));
            reqCategorySelect.add(new Option(cat.name, cat.id));
        }
    });
}

// --- Ticket Submissions ---
document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerName = document.getElementById('req-player-name').value.trim();
    const discord = document.getElementById('req-discord').value.trim();
    const category = document.getElementById('req-category').value;
    const errEl = document.getElementById('req-error');
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Sending...';
    
    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser },
            body: JSON.stringify({ playerName, discord, category })
        });
        const data = await res.json();
        if(res.ok) {
            alert('Session Request Successfully Submitted!');
            hideModals();
            e.target.reset(); // clear form
        } else {
            errEl.textContent = data.error;
        }
    } catch (e) {
        errEl.textContent = "Network error.";
    } finally {
        btn.textContent = 'Submit Session Request';
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
                    <h4 style="margin-bottom: 0.25rem;">
                        <img src="https://mc-heads.net/avatar/${encodeURIComponent(t.playerName)}/24" style="border-radius:4px; margin-right: 0.5rem; vertical-align: middle;">
                        ${t.playerName}
                    </h4>
                    <p><strong>Discord:</strong> <span style="color:var(--brand-accent);">${t.discord}</span></p>
                    <p><strong>Submitter:</strong> ${t.username}</p>
                    <p><strong>Fight Type:</strong> ${catName}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Fight player, then add them manually using the Add Player Rank panel.</p>
                </div>
                <div class="ticket-actions">
                    <button class="btn btn-success" onclick="denyTicket('${t.id}', false)">Mark Complete / Dismiss</button>
                </div>
            `;
            ticketListContainer.appendChild(div);
        });
    } catch(e) {
        ticketListContainer.innerHTML = '<p class="error-text">Failed to fetch tickets.</p>';
    }
}

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

function getPlayerCrossCategories(playerName) {
    let cross = [];
    Object.keys(rankingsDB).forEach(catId => {
        if (catId === 'overall') return;
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
        const avatarUrl = `https://mc-heads.net/body/${encodeURIComponent(player.name)}/60`;
        let miniBadgesHtml = '';
        let singularTierHtml = '';
        
        if (categoryId === 'overall') {
            miniBadgesHtml = getPlayerCrossCategories(player.name).map(cross => {
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
        } else {
            const rawTier = player.tier ? player.tier.toString() : 'HT1';
            const tierName = (rawTier.toUpperCase().startsWith('HT') || rawTier.toUpperCase().startsWith('LT')) ? rawTier.toUpperCase() : `HT${rawTier}`;
            const tierLevel = tierName.slice(-1);
            singularTierHtml = `<span class="category-tier t${tierLevel}">${tierName}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="rank-box ${rankClass}">${index + 1}.</div>
            
            <div class="card-avatar">
                <img src="${avatarUrl}" alt="${player.name}" onerror="this.src='https://crafatar.com/renders/body/8667ba71b85a4004af54457a9734eed7?overlay=true'">
            </div>
            
            <div class="card-info">
                <div class="card-name">${player.name}</div>
                <div class="card-title">
                    <img src="assets/${categoryId}.svg" class="title-icon" onerror="this.src='assets/overall.svg'"> ${title} <span class="points-text">(${player.score} points)</span>
                </div>
            </div>
            
            <div class="mini-badges">
                ${miniBadgesHtml}
            </div>

            <div class="card-region">
                ${singularTierHtml}
                <span class="region-badge ${region}">${region}</span>
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
