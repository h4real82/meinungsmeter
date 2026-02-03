// Wechsel zwischen Login und Signup Formularen
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginForm.classList.toggle('active');
    signupForm.classList.toggle('active');
    
    // Nachrichten löschen
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('signupMessage').textContent = '';
}

// Login-Formular absenden
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Login erfolgreich
            localStorage.setItem('user', JSON.stringify(data.user));
            showMessage(messageDiv, data.message, 'success');
            
            // Nach 1.5 Sekunden zum Dashboard wechseln
            setTimeout(() => {
                showDashboard(data.user);
            }, 1500);
        } else {
            // Fehler anzeigen
            showMessage(messageDiv, data.message, 'error');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
});

// Signup-Formular absenden
document.getElementById('signupFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('signupMessage');
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Signup erfolgreich
            showMessage(messageDiv, data.message + '. Sie werden zum Login weitergeleitet...', 'success');
            
            // Formular leeren
            document.getElementById('signupFormElement').reset();
            
            // Nach 2 Sekunden zurück zum Login
            setTimeout(() => {
                toggleForms();
                document.getElementById('loginMessage').textContent = '';
            }, 2000);
        } else {
            // Fehler anzeigen
            showMessage(messageDiv, data.message, 'error');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
});

// Nachricht anzeigen
function showMessage(messageDiv, message, type) {
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
}

// Dashboard anzeigen
function showDashboard(user) {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    
    // Benutzerinformationen anzeigen
    const userInfoDiv = document.getElementById('userInfo');
    userInfoDiv.innerHTML = `
        <h2>Willkommen, ${user.username}!</h2>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Benutzer-ID:</strong> ${user.id}</p>
    `;
}

// Logout-Funktion
function logout() {
    localStorage.removeItem('user');
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
    
    // Formular leeren
    document.getElementById('loginFormElement').reset();
    document.getElementById('signupFormElement').reset();
    document.getElementById('loginMessage').textContent = '';
}

// Beim Laden der Seite prüfen, ob Benutzer eingeloggt ist
window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user');
    if (user) {
        showDashboard(JSON.parse(user));
    }
});
