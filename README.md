# Meinungsmeter - Login & Signup Webseite

Eine vollständig funktionale Webseite mit Login und Signup-Funktionalität, die Benutzerdaten in einer SQLite-Datenbank speichert.

## Funktionen

✅ **Benutzerregistrierung (Signup)**
- Benutzername und Email Validierung
- Passwort-Verschlüsselung mit bcryptjs
- Duplikat-Prüfung
- Fehlerbehandlung

✅ **Benutzer-Login**
- Email und Passwort Authentifizierung
- Sichere Passwort-Überprüfung
- Benutzer-Sessions im LocalStorage
- Automatisches Anzeigen des Dashboards

✅ **Datenbank**
- SQLite-Datenbank mit Benutzertabelle
- Sichere Passwort-Speicherung
- Eindeutige Email und Username Constraints

✅ **Responsive Design**
- Modernes, ansprechendes UI
- Mobile-freundlich
- Sanfte Übergänge zwischen Login und Signup

## Installation

1. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

2. **Server starten:**
   ```bash
   npm start
   ```
   
   Oder im Entwicklungsmodus mit Auto-Reload:
   ```bash
   npm run dev
   ```

3. **Im Browser öffnen:**
   ```
   http://localhost:3000
   ```

## Projektstruktur

```
meinungsmeter/
├── server.js              # Express Server und API-Endpoints
├── package.json           # Projektabhängigkeiten
├── database.db            # SQLite Datenbank (wird erstellt)
└── public/
    ├── index.html         # Login & Signup Seite
    ├── styles.css         # CSS für Hauptseite
    ├── script.js          # Frontend JavaScript
    ├── admin.html         # Admin Konsole
    ├── admin-styles.css   # CSS für Admin
    └── admin-script.js    # Admin JavaScript
```

## Admin Konsole

Die Admin-Konsole ist unter `/admin.html` verfügbar und bietet folgende Funktionen:

### Funktionen:
✅ **Benutzerübersicht** - Alle registrierten Benutzer anzeigen
✅ **Benutzer erstellen** - Neue Benutzer manuell hinzufügen
✅ **Benutzer bearbeiten** - Email, Benutzername und Passwort ändern
✅ **Benutzer löschen** - Benutzer mit Bestätigung löschen
✅ **Statistiken** - Gesamtanzahl der Benutzer anzeigen

### Admin Login:
1. Gehen Sie zu `http://localhost:3000/admin.html`
2. Geben Sie das Admin-Passwort ein (Standard: `admin123`)
3. Sie haben Zugriff auf alle Admin-Funktionen

### Admin-Passwort ändern:
Zum Ändern des Admin-Passworts setzen Sie die Umgebungsvariable:
```bash
ADMIN_PASSWORD=your_secure_password npm start
```

## API-Endpoints

### Benutzer Authentifizierung

### POST /api/signup
Neuen Benutzer registrieren

**Request:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response (201):**
```json
{
  "message": "Konto erfolgreich erstellt",
  "userId": 1
}
```

### POST /api/login
Benutzer anmelden

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login erfolgreich",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Admin API Endpoints

Alle Admin-Endpoints erfordern den Header: `x-admin-token: admin123`

### GET /api/admin/users
Alle Benutzer abrufen

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "username": "username",
      "created_at": "2026-02-03T10:00:00Z"
    }
  ]
}
```

### GET /api/admin/stats
Statistiken abrufen

**Response:**
```json
{
  "total_users": 5
}
```

### POST /api/admin/users
Neuen Benutzer erstellen (Admin)

**Request:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "password123"
}
```

### PUT /api/admin/users/:id
Benutzer aktualisieren (Admin)

**Request:**
```json
{
  "email": "updated@example.com",
  "username": "updated_username",
  "password": "new_password" (optional)
}
```

### DELETE /api/admin/users/:id
Benutzer löschen (Admin)

## Sicherheitsfeatures

🔒 Passwörter werden mit bcryptjs verschlüsselt und gehasht
🔒 Validierung auf Client- und Server-Seite
🔒 SQL-Injection-Schutz durch prepared statements
🔒 CORS-Schutz aktiviert
🔒 Eindeutige Email und Username Constraints

## Verwendete Technologien

- **Backend:** Node.js, Express.js
- **Datenbank:** SQLite3
- **Sicherheit:** bcryptjs
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **HTTP:** CORS, Body Parser

## Testbenutzer

Nach dem ersten Start können Sie beliebige Benutzer registrieren. Hier ist der Prozess:

1. Klicken Sie auf "Hier registrieren"
2. Geben Sie Benutzerdaten ein
3. Klicken Sie auf "Registrieren"
4. Nach erfolgreicher Registrierung können Sie sich anmelden

## Fehlerbehebung

**Port 3000 wird bereits verwendet:**
```bash
# Prüfen Sie, welcher Prozess läuft:
lsof -i :3000
# und töten Sie ihn oder nutzen Sie einen anderen Port
```

**Datenbank-Fehler:**
- Löschen Sie `database.db` und starten Sie den Server neu
- Die Datenbank wird automatisch erstellt

---

Viel Spaß mit Ihrer Login & Signup Webseite! 🚀
