// ===== FUNCTION DEFINITIONS (MUST BE FIRST) =====

// Nachricht anzeigen
function showMessage(messageDiv, message, type) {
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
}

// Dashboard anzeigen
function showDashboard(user) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const dashboard = document.getElementById('dashboard');
    
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (dashboard) dashboard.classList.add('active');

    document.body.classList.add('dashboard-view');

    const avatar = document.getElementById('userAvatar');
    const displayName = document.getElementById('userDisplayName');
    if (avatar && displayName) {
        const initial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
        avatar.textContent = initial;
        displayName.textContent = user.username ? user.username : 'User';
    }
    
    // Load opinions for dashboard (wait for DOM to be ready)
    setTimeout(() => {
        loadOpinions().catch(err => console.error('Error loading opinions:', err));
    }, 100);
}

// Logout-Funktion
function logout() {
    localStorage.removeItem('user');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (dashboard) dashboard.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    
    document.body.classList.remove('dashboard-view');
    
    // Formular leeren
    const loginFormEl = document.getElementById('loginFormElement');
    const signupFormEl = document.getElementById('signupFormElement');
    const loginMsg = document.getElementById('loginMessage');
    
    if (loginFormEl) loginFormEl.reset();
    if (signupFormEl) signupFormEl.reset();
    if (loginMsg) loginMsg.textContent = '';
}

// Utility: basic HTML escape
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>\"]/g, function (s) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[s];
    });
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// --- New Opinion dialog logic ---
function openNewOpinionModal() {
    const modal = document.getElementById('newOpinionModal');
    const opinionText = document.getElementById('opinionText');
    const charCount = document.getElementById('opinionCharCount');
    const msg = document.getElementById('opinionMessage');
    
    if (opinionText) opinionText.value = '';
    if (charCount) charCount.textContent = '0 / 256';
    if (msg) msg.textContent = '';
    if (modal) modal.classList.add('active');
    if (opinionText) opinionText.focus();
}

function closeNewOpinionModal() {
    const modal = document.getElementById('newOpinionModal');
    if (modal) modal.classList.remove('active');
}

function updateOpinionCharCount() {
    const txt = document.getElementById('opinionText');
    const count = document.getElementById('opinionCharCount');
    if (txt && count) {
        count.textContent = `${txt.value.length} / 256`;
    }
}

async function sendOpinion() {
    const messageDiv = document.getElementById('opinionMessage');
    const opinionText = document.getElementById('opinionText');
    const text = opinionText ? opinionText.value.trim() : '';
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!user) {
        showMessage(messageDiv, 'Bitte zuerst einloggen', 'error');
        return;
    }

    if (!text || text.length === 0) {
        showMessage(messageDiv, 'Text darf nicht leer sein', 'error');
        return;
    }
    if (text.length > 256) {
        showMessage(messageDiv, 'Text darf maximal 256 Zeichen haben', 'error');
        return;
    }

    try {
        const response = await fetch('/api/opinions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, userId: user.id, username: user.username })
        });

        const data = await response.json();
        if (response.ok) {
            showMessage(messageDiv, data.message || 'Erstellt', 'success');
            setTimeout(() => {
                    closeNewOpinionModal();
                    // Refresh dashboard opinions and user history
                    loadOpinions();
                    loadUserHistory();
            }, 800);
        } else {
            showMessage(messageDiv, data.message || 'Fehler beim Erstellen', 'error');
        }
    } catch (err) {
        console.error(err);
        showMessage(messageDiv, 'Fehler bei der Verbindung zum Server', 'error');
    }
}

// --- History ---
function openHistoryModal() {
    const list = document.getElementById('historyList');
    const modal = document.getElementById('historyModal');
    
    if (list) list.innerHTML = '<p class="no-data">Lade...</p>';
    if (modal) modal.classList.add('active');
    
    loadUserHistory();
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.classList.remove('active');
}

async function loadUserHistory() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const list = document.getElementById('historyList');
    
    if (!list) return;
    
    if (!user) {
        list.innerHTML = '<p class="no-data">Nicht eingeloggt.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/opinions/user/${user.id}`);
        if (!response.ok) {
            list.innerHTML = '<p class="no-data">Fehler beim Laden.</p>';
            return;
        }
        const data = await response.json();
        const opinions = data.opinions || [];
        if (opinions.length === 0) {
            list.innerHTML = '<p class="no-data">Keine Einträge.</p>';
            return;
        }

        list.innerHTML = opinions.map(o => `
            <div class="history-item">
                <p class="opinion-text">${escapeHtml(o.text)}</p>
                <p class="meta">Gesamt: ${o.votes_total || 0} · Erstellt: ${formatDate(o.created_at)}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="no-data">Fehler bei der Verbindung.</p>';
    }
}

// --- Load and render opinions on dashboard ---
async function loadOpinions() {
    const gallery = document.querySelector('.gallery');
    if (!gallery) return;

    try {
        const resp = await fetch('/api/opinions');
        if (!resp.ok) return;
        const data = await resp.json();
        const opinions = data.opinions || [];

        // Keep add-card first
        const addCardHtml = `
            <div class="opinion-card add-card">
                <button class="add-button" type="button">
                    <span class="add-icon">+</span>
                    <span class="add-text">Meinung anlegen</span>
                </button>
            </div>`;

        const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');

        const itemsHtml = opinions.map(o => {
            const hasVoted = userVotes[o.id];
            const total = o.votes_total || 0;
            let buttonsOrBar = '';
            if (hasVoted) {
                const forPct = total > 0 ? (o.votes_for / total) * 100 : 0;
                const neutralPct = total > 0 ? (o.votes_neutral / total) * 100 : 0;
                const againstPct = total > 0 ? (o.votes_against / total) * 100 : 0;
                
                // Calculate arrow position based on weighted average of votes
                // Formula: (votes_for * 0 + votes_neutral * 0.5 + votes_against * 1) / total * 100
                // This puts the arrow from 0% (all "Dafür") to 100% (all "Dagegen")
                let arrowPct = 0;
                if (total > 0) {
                    arrowPct = (o.votes_for * 0 + o.votes_neutral * 0.5 + o.votes_against * 1) / total * 100;
                }
                
                buttonsOrBar = `
                    <div class="stats-bar-container">
                        <div class="stats-bar">
                            <div class="bar-section bar-for" style="width:${forPct}%"></div>
                            <div class="bar-section bar-neutral" style="width:${neutralPct}%"></div>
                            <div class="bar-section bar-against" style="width:${againstPct}%"></div>
                            <div class="vote-indicator" style="left:${arrowPct}%"></div>
                        </div>
                    </div>
                    <div class="stats-votes">Votes: ${total}</div>`;
            } else {
                buttonsOrBar = `
                    <div class="rating-buttons">
                        <button type="button" data-vote="for">Dafür</button>
                        <button type="button" data-vote="neutral">Egal</button>
                        <button type="button" data-vote="against">Dagegen</button>
                    </div>`;
            }
            return `
            <div class="opinion-card" data-id="${o.id}" data-username="${escapeHtml(o.username||'')}">
                <p class="opinion-text">${escapeHtml(o.text)}</p>
                ${buttonsOrBar}
                <p class="meta" style="font-size:12px;color:#666;margin-top:8px;">Gesamt: <span class="votes-total">${o.votes_total || 0}</span> · von ${escapeHtml(o.username || '–')}</p>
                <svg class="sparkline" viewBox="0 0 120 40" preserveAspectRatio="none">
                    <polyline points="0,30 20,22 40,26 60,18 80,16 100,12 120,10" fill="none" stroke="currentColor" stroke-width="3"/>
                </svg>
            </div>
        `}).join('');

        gallery.innerHTML = addCardHtml + itemsHtml;
    } catch (err) {
        console.error('Fehler beim Laden der Meinungen', err);
    }
}

// Passwort vergessen Modal anzeigen
function showForgotPasswordModal(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('forgotPasswordModal');
    const email = document.getElementById('forgotEmail');
    const resetToken = document.getElementById('resetToken');
    const newPass = document.getElementById('resetNewPassword');
    const confirmPass = document.getElementById('resetConfirmPassword');
    const msg1 = document.getElementById('forgotMessage1');
    const msg2 = document.getElementById('forgotMessage2');
    
    if (email) email.value = '';
    if (resetToken) resetToken.value = '';
    if (newPass) newPass.value = '';
    if (confirmPass) confirmPass.value = '';
    if (msg1) msg1.textContent = '';
    if (msg2) msg2.textContent = '';
    if (modal) modal.classList.add('active');
    
    showForgotStep(1);
}

// Passwort vergessen Modal schließen
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    
    if (modal) modal.classList.remove('active');
    if (step1) step1.classList.remove('active');
    if (step2) step2.classList.remove('active');
}

// Zwischen Steps wechseln
function showForgotStep(step) {
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    
    if (step1) step1.classList.remove('active');
    if (step2) step2.classList.remove('active');
    
    if (step === 1) {
        if (step1) step1.classList.add('active');
    } else {
        if (step2) step2.classList.add('active');
    }
}

// Reset-Token anfordern
async function sendResetToken() {
    const emailEl = document.getElementById('forgotEmail');
    const messageDiv = document.getElementById('forgotMessage1');
    const email = emailEl ? emailEl.value : '';
    
    if (!email) {
        showMessage(messageDiv, 'Email ist erforderlich', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.resetToken) {
            // Token anzeigen und zu Step 2 wechseln
            const tokenEl = document.getElementById('resetToken');
            if (tokenEl) tokenEl.value = data.resetToken;
            
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
    const resetTokenEl = document.getElementById('resetToken');
    const newPassEl = document.getElementById('resetNewPassword');
    const confirmPassEl = document.getElementById('resetConfirmPassword');
    const messageDiv = document.getElementById('forgotMessage2');
    
    const resetToken = resetTokenEl ? resetTokenEl.value : '';
    const newPassword = newPassEl ? newPassEl.value : '';
    const confirmPassword = confirmPassEl ? confirmPassEl.value : '';
    
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
            headers: { 'Content-Type': 'application/json' },
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
                const loginFormEl = document.getElementById('loginFormElement');
                const loginMsg = document.getElementById('loginMessage');
                
                if (loginFormEl) loginFormEl.reset();
                if (loginMsg) loginMsg.textContent = '';
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
    const msg2 = document.getElementById('forgotMessage2');
    if (msg2) msg2.textContent = '';
}

// Wechsel zwischen Login und Signup Formularen
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) loginForm.classList.toggle('active');
    if (signupForm) signupForm.classList.toggle('active');
    
    // Nachrichten löschen
    const loginMsg = document.getElementById('loginMessage');
    const signupMsg = document.getElementById('signupMessage');
    if (loginMsg) loginMsg.textContent = '';
    if (signupMsg) signupMsg.textContent = '';
}

// ===== END OF FUNCTION DEFINITIONS =====

// Beim Laden der Seite prüfen, ob Benutzer eingeloggt ist
window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user');
    if (user) {
        showDashboard(JSON.parse(user));
    }
});

// Login-Formular absenden
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginFormElement');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const messageDiv = document.getElementById('loginMessage');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
    }
});

// Signup-Formular absenden
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signupFormElement');
    if (form) {
        form.addEventListener('submit', async (e) => {
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
                    headers: { 'Content-Type': 'application/json' },
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
                    const signupForm = document.getElementById('signupFormElement');
                    if (signupForm) signupForm.reset();
                    
                    // Nach 2 Sekunden zurück zum Login
                    setTimeout(() => {
                        toggleForms();
                        const loginMsg = document.getElementById('loginMessage');
                        if (loginMsg) loginMsg.textContent = '';
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
    }
});

// Dropdown im User-Menü
window.addEventListener('DOMContentLoaded', () => {
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', () => {
            const isOpen = userDropdown.classList.toggle('active');
            userMenuButton.setAttribute('aria-expanded', String(isOpen));
            userDropdown.setAttribute('aria-hidden', String(!isOpen));
        });

        document.addEventListener('click', (event) => {
            if (!userDropdown.contains(event.target) && !userMenuButton.contains(event.target)) {
                userDropdown.classList.remove('active');
                userMenuButton.setAttribute('aria-expanded', 'false');
                userDropdown.setAttribute('aria-hidden', 'true');
            }
        });
    }
});

// Wire add-button click
window.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-button')) {
            openNewOpinionModal();
        }
    });
});

// Update char count on input
window.addEventListener('DOMContentLoaded', () => {
    const opinionTextEl = document.getElementById('opinionText');
    if (opinionTextEl) {
        opinionTextEl.addEventListener('input', updateOpinionCharCount);
    }
});

// Hook history button
window.addEventListener('DOMContentLoaded', () => {
    const historyBtn = document.getElementById('historyButton');
    if (historyBtn) historyBtn.addEventListener('click', openHistoryModal);
});

// Vote handling (event delegation on gallery)
window.addEventListener('DOMContentLoaded', () => {
    const galleryEl = document.querySelector('.gallery');
    if (galleryEl) {
        galleryEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('.rating-buttons button');
            if (!btn) return;
            const card = btn.closest('.opinion-card');
            if (!card) return;
            const opinionId = card.getAttribute('data-id');
            const voteType = btn.getAttribute('data-vote');

            if (!opinionId || !voteType) return;

            // Disable buttons temporarily
            const btns = card.querySelectorAll('.rating-buttons button');
            btns.forEach(b => b.disabled = true);

            try {
                const resp = await fetch(`/api/opinions/${opinionId}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: voteType })
                });

                const data = await resp.json();
                if (resp.ok && data.opinion) {
                    const newTotal = data.opinion.votes_total || 0;
                    const totalSpan = card.querySelector('.votes-total');
                    if (totalSpan) totalSpan.textContent = newTotal;
                    
                    // Store vote in localStorage and reload to show stats bar
                    const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
                    userVotes[opinionId] = voteType;
                    localStorage.setItem('userVotes', JSON.stringify(userVotes));
                    
                    // Reload opinions to show stats bar instead of buttons
                    setTimeout(() => loadOpinions(), 500);
                } else {
                    console.warn('Vote failed', data);
                }
            } catch (err) {
                console.error('Fehler beim Abstimmen', err);
            } finally {
                btns.forEach(b => b.disabled = false);
            }
        });
    }
});

// Modal schließen bei Klick außerhalb
window.addEventListener('click', (event) => {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal && event.target === modal) {
        closeForgotPasswordModal();
    }
});
