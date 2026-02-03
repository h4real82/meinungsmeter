let adminToken = null;
let currentEditUserId = null;
let currentDeleteUserId = null;

// Admin Login
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
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
        } else {
            showMessage(messageDiv, 'Fehler beim Login', 'error');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
        adminToken = null;
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
document.getElementById('userForm').addEventListener('submit', async (e) => {
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
