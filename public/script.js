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
    const age = document.getElementById('signupAge').value;
    const state = document.getElementById('signupState').value;
    const profession = document.getElementById('signupProfession').value;
    const messageDiv = document.getElementById('signupMessage');
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username, 
                email, 
                password, 
                confirmPassword,
                age: age ? parseInt(age) : null,
                state: state || null,
                profession: profession || null
            })
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

// Passwort vergessen Modal anzeigen
function showForgotPasswordModal(e) {
    e.preventDefault();
    document.getElementById('forgotPasswordModal').classList.add('active');
    document.getElementById('forgotEmail').value = '';
    document.getElementById('resetToken').value = '';
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetConfirmPassword').value = '';
    document.getElementById('forgotMessage1').textContent = '';
    document.getElementById('forgotMessage2').textContent = '';
    showForgotStep(1);
}

// Passwort vergessen Modal schließen
function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.remove('active');
    document.getElementById('forgotStep1').classList.remove('active');
    document.getElementById('forgotStep2').classList.remove('active');
}

// Zwischen Steps wechseln
function showForgotStep(step) {
    document.getElementById('forgotStep1').classList.remove('active');
    document.getElementById('forgotStep2').classList.remove('active');
    
    if (step === 1) {
        document.getElementById('forgotStep1').classList.add('active');
    } else {
        document.getElementById('forgotStep2').classList.add('active');
    }
}

// Reset-Token anfordern
async function sendResetToken() {
    const email = document.getElementById('forgotEmail').value;
    const messageDiv = document.getElementById('forgotMessage1');
    
    if (!email) {
        showMessage(messageDiv, 'Email ist erforderlich', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.resetToken) {
            // Token anzeigen und zu Step 2 wechseln
            document.getElementById('resetToken').value = data.resetToken;
            showMessage(messageDiv, 'Token generiert! Geben Sie Ihr neues Passwort ein.', 'success');
            
            setTimeout(() => {
                showForgotStep(2);
            }, 1500);
        } else {
            showMessage(messageDiv, data.message || 'Fehler beim Anfordern des Reset-Links', 'info');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
}

// Passwort zurücksetzen bestätigen
async function confirmResetPassword() {
    const resetToken = document.getElementById('resetToken').value;
    const newPassword = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;
    const messageDiv = document.getElementById('forgotMessage2');
    
    if (!resetToken || !newPassword || !confirmPassword) {
        showMessage(messageDiv, 'Alle Felder sind erforderlich', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage(messageDiv, 'Passwörter stimmen nicht überein', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage(messageDiv, 'Passwort muss mindestens 6 Zeichen lang sein', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                resetToken, 
                newPassword, 
                confirmPassword 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(messageDiv, data.message + '. Sie werden zum Login weitergeleitet...', 'success');
            
            setTimeout(() => {
                closeForgotPasswordModal();
                document.getElementById('loginFormElement').reset();
                document.getElementById('loginMessage').textContent = '';
            }, 2000);
        } else {
            showMessage(messageDiv, data.message, 'error');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
}

// Zurück zum Email-Step
function goBackToEmailReset() {
    showForgotStep(1);
    document.getElementById('forgotMessage2').textContent = '';
}

// Modal schließen bei Klick außerhalb
window.onclick = function(event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (event.target === modal) {
        closeForgotPasswordModal();
    }
}

// Beim Laden der Seite prüfen, ob Benutzer eingeloggt ist
window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user');
    if (user) {
        showDashboard(JSON.parse(user));
    }
});
