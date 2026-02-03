let adminToken = null;
let currentEditUserId = null;
let currentDeleteUserId = null;
let currentEditOpinionId = null;
let currentDeleteOpinionId = null;

// Utility: basic HTML escape
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>\"]/g, function (s) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'})[s];
    });
}

// Admin Login
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminLoginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = document.getElementById('adminPassword').value;
            const messageDiv = document.getElementById('adminLoginMessage');
            
            if (!password) {
                showMessage(messageDiv, 'Passwort erforderlich', 'error');
                return;
            }
            
            // Speichere Token im Memory (nicht in localStorage für bessere Sicherheit)
            adminToken = password;
            
            // Teste die Verbindung mit einem API-Call
            try {
                const response = await fetch('/api/admin/stats', {
                    method: 'GET',
                    headers: {
                        'x-admin-token': adminToken,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.status === 401) {
                    adminToken = null;
                    showMessage(messageDiv, 'Falsches Admin-Passwort', 'error');
                    document.getElementById('adminPassword').value = '';
                    return;
                }
                
                if (response.ok) {
                    // Erfolgreiches Login
                    document.getElementById('adminLogin').classList.remove('active');
                    document.getElementById('adminDashboard').classList.add('active');
                    showMessage(messageDiv, 'Login erfolgreich', 'success');
                    loadUsers();
                    loadStats();
                    loadOpinions();
                } else {
                    showMessage(messageDiv, 'Fehler beim Login', 'error');
                }
            } catch (error) {
                console.error('Fehler:', error);
                showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
                adminToken = null;
            }
        });
    }
});

// Benutzer laden
async function loadUsers() {
    if (!adminToken) return;
    
    const usersList = document.getElementById('usersList');
    const messageDiv = document.getElementById('usersMessage');
    
    try {
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: {
                'x-admin-token': adminToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const users = data.users || [];
            
            if (users.length === 0) {
                usersList.innerHTML = '<tr><td colspan="8" class="no-data">Keine Benutzer vorhanden</td></tr>';
                return;
            }
            
            usersList.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.age || '-'}</td>
                    <td>${user.state || '-'}</td>
                    <td>${user.profession || '-'}</td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit" onclick="showEditUserModal(${user.id}, '${user.username}', '${user.email}', ${user.age || null}, '${user.state || ''}', '${user.profession || ''}')">Bearbeiten</button>
                            <button class="btn btn-delete" onclick="showDeleteModal(${user.id}, '${user.email}')">Löschen</button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            messageDiv.textContent = '';
        } else {
            showMessage(messageDiv, 'Fehler beim Laden der Benutzer', 'error');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
}

// --- Meinungen laden für Admin ---
async function loadOpinions() {
    if (!adminToken) return;
    const list = document.getElementById('opinionsList');
    const messageDiv = document.getElementById('opinionsMessage');
    try {
        const response = await fetch('/api/admin/opinions', {
            method: 'GET',
            headers: { 'x-admin-token': adminToken }
        });
        if (!response.ok) {
            showMessage(messageDiv, 'Fehler beim Laden der Meinungen', 'error');
            return;
        }
        const data = await response.json();
        const opinions = data.opinions || [];
        if (opinions.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="no-data">Keine Meinungen vorhanden</td></tr>';
            return;
        }

        list.innerHTML = opinions.map(o => `
            <tr>
                <td>${o.id}</td>
                <td style="max-width:400px;">${escapeHtml(o.text)}</td>
                <td>${o.votes_total || 0}</td>
                <td>${o.username || '-'}</td>
                <td>${formatDate(o.created_at)}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-edit" onclick="showEditOpinionModal(${o.id}, ${JSON.stringify(o.text)})">Bearbeiten</button>
                        <button class="btn btn-delete" onclick="showDeleteOpinionModal(${o.id})">Löschen</button>
                    </div>
                </td>
            </tr>
        `).join('');
        showMessage(messageDiv, '', '');
    } catch (error) {
        console.error(error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
}

function showEditOpinionModal(opinionId, text) {
    currentEditOpinionId = opinionId;
    const ta = document.getElementById('modalOpinionText');
    ta.value = text || '';
    document.getElementById('modalOpinionCharCount').textContent = `${ta.value.length} / 256`;
    document.getElementById('opinionModalMessage').textContent = '';
    document.getElementById('opinionModal').classList.add('active');
    ta.focus();
}

function closeOpinionModal() {
    document.getElementById('opinionModal').classList.remove('active');
    currentEditOpinionId = null;
}

window.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('modalOpinionText');
    if (ta) {
        ta.addEventListener('input', () => {
            document.getElementById('modalOpinionCharCount').textContent = `${ta.value.length} / 256`;
        });
    }
});

// Save edited opinion
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('opinionForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentEditOpinionId) return;
            const text = document.getElementById('modalOpinionText').value.trim();
            const messageDiv = document.getElementById('opinionModalMessage');
            if (!text) {
                showMessage(messageDiv, 'Text darf nicht leer sein', 'error');
                return;
            }
            try {
                const response = await fetch(`/api/admin/opinions/${currentEditOpinionId}`, {
                    method: 'PUT',
                    headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage(messageDiv, data.message || 'Gespeichert', 'success');
                    setTimeout(() => { closeOpinionModal(); loadOpinions(); }, 800);
                } else {
                    showMessage(messageDiv, data.message || 'Fehler beim Speichern', 'error');
                }
            } catch (err) {
                console.error(err);
                showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
            }
        });
    }
});

// Delete opinion flow
function showDeleteOpinionModal(opinionId) {
    currentDeleteOpinionId = opinionId;
    document.getElementById('deleteOpinionModal').classList.add('active');
}

function closeDeleteOpinionModal() {
    document.getElementById('deleteOpinionModal').classList.remove('active');
    currentDeleteOpinionId = null;
}

window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('confirmDeleteOpinionBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            if (!currentDeleteOpinionId) return;
            try {
                const response = await fetch(`/api/admin/opinions/${currentDeleteOpinionId}`, {
                    method: 'DELETE',
                    headers: { 'x-admin-token': adminToken }
                });
                const data = await response.json();
                if (response.ok) {
                    closeDeleteOpinionModal();
                    loadOpinions();
                    showMessage(document.getElementById('opinionsMessage'), 'Meinung erfolgreich gelöscht', 'success');
                } else {
                    showMessage(document.getElementById('opinionsMessage'), data.message || 'Fehler beim Löschen', 'error');
                }
            } catch (err) {
                console.error(err);
                showMessage(document.getElementById('opinionsMessage'), 'Fehler bei der Verbindung zum Server', 'error');
            }
        });
    }
});

// Statistiken laden
async function loadStats() {
    if (!adminToken) return;
    
    try {
        const response = await fetch('/api/admin/stats', {
            method: 'GET',
            headers: {
                'x-admin-token': adminToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalUsers').textContent = data.total_users;
        }
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
    }
}

// Benutzer-Modal anzeigen (Bearbeitung)
function showEditUserModal(userId, username, email, age, state, profession) {
    currentEditUserId = userId;
    document.getElementById('modalTitle').textContent = 'Benutzer bearbeiten';
    document.getElementById('modalUsername').value = username;
    document.getElementById('modalEmail').value = email;
    document.getElementById('modalAge').value = age || '';
    document.getElementById('modalState').value = state || '';
    document.getElementById('modalProfession').value = profession || '';
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalMessage').textContent = '';
    document.getElementById('userModal').classList.add('active');
}

// Benutzer-Modal anzeigen (Hinzufügen)
function showAddUserModal() {
    currentEditUserId = null;
    document.getElementById('modalTitle').textContent = 'Neuen Benutzer hinzufügen';
    document.getElementById('modalUsername').value = '';
    document.getElementById('modalEmail').value = '';
    document.getElementById('modalAge').value = '';
    document.getElementById('modalState').value = '';
    document.getElementById('modalProfession').value = '';
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalMessage').textContent = '';
    document.getElementById('userModal').classList.add('active');
}

// Benutzer-Modal schließen
function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    currentEditUserId = null;
}

// Benutzer speichern
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('modalUsername').value;
            const email = document.getElementById('modalEmail').value;
            const age = document.getElementById('modalAge').value;
            const state = document.getElementById('modalState').value;
            const profession = document.getElementById('modalProfession').value;
            const password = document.getElementById('modalPassword').value;
            const messageDiv = document.getElementById('modalMessage');
            
            if (!username || !email) {
                showMessage(messageDiv, 'Benutzername und Email sind erforderlich', 'error');
                return;
            }
            
            try {
                let url = '/api/admin/users';
                let method = 'POST';
                let body = { 
                    email, 
                    username,
                    age: age ? parseInt(age) : null,
                    state: state || null,
                    profession: profession || null
                };
                
                if (currentEditUserId) {
                    url += '/' + currentEditUserId;
                    method = 'PUT';
                    if (password) {
                        body.password = password;
                    }
                } else {
                    if (!password) {
                        showMessage(messageDiv, 'Passwort erforderlich für neuen Benutzer', 'error');
                        return;
                    }
                    body.password = password;
                }
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'x-admin-token': adminToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage(messageDiv, data.message, 'success');
                    setTimeout(() => {
                        closeUserModal();
                        loadUsers();
                        loadStats();
                    }, 1500);
                } else {
                    showMessage(messageDiv, data.message, 'error');
                }
            } catch (error) {
                console.error('Fehler:', error);
                showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
            }
        });
    }
});

// Löschen-Modal anzeigen
function showDeleteModal(userId, email) {
    currentDeleteUserId = userId;
    document.getElementById('deleteUserInfo').textContent = 'Email: ' + email;
    document.getElementById('deleteModal').classList.add('active');
}

// Löschen-Modal schließen
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentDeleteUserId = null;
}

// Benutzer löschen bestätigen
async function confirmDelete() {
    if (!currentDeleteUserId || !adminToken) return;
    
    try {
        const response = await fetch(`/api/admin/users/${currentDeleteUserId}`, {
            method: 'DELETE',
            headers: {
                'x-admin-token': adminToken,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeDeleteModal();
            loadUsers();
            loadStats();
            showMessage(document.getElementById('usersMessage'), 'Benutzer erfolgreich gelöscht', 'success');
        } else {
            showMessage(document.getElementById('usersMessage'), data.message, 'error');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(document.getElementById('usersMessage'), 'Fehler beim Löschen des Benutzers', 'error');
    }
}

// Admin Logout
function adminLogout() {
    adminToken = null;
    currentEditUserId = null;
    currentDeleteUserId = null;
    document.getElementById('adminDashboard').classList.remove('active');
    document.getElementById('adminLogin').classList.add('active');
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminLoginMessage').textContent = '';
}

// Nachricht anzeigen
function showMessage(messageDiv, message, type) {
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
}

// Datum formatieren
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Modal schließen bei Klick außerhalb
window.onclick = function(event) {
    const userModal = document.getElementById('userModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (event.target === userModal) {
        userModal.classList.remove('active');
    }
    if (event.target === deleteModal) {
        deleteModal.classList.remove('active');
    }
}
