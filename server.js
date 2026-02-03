const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Datenbank initialisieren
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Datenbank-Fehler:', err);
  } else {
    console.log('Verbunden mit SQLite-Datenbank');
    initializeDatabase();
  }
});

// Datenbanktabelle erstellen
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      age INTEGER,
      state TEXT,
      profession TEXT,
      reset_token TEXT,
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle:', err);
    } else {
      console.log('Users-Tabelle erstellt/existiert bereits');
    }
  });
}

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  const { email, username, password, confirmPassword, age, state, profession } = req.body;

  // Validierung - nur Pflichtfelder
  if (!email || !username || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Email, Username und Passwort sind erforderlich' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwörter stimmen nicht überein' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Passwort muss mindestens 6 Zeichen lang sein' });
  }

  try {
    // Passwort verschlüsseln
    const hashedPassword = await bcrypt.hash(password, 10);

    // Benutzer in Datenbank speichern
    db.run(
      'INSERT INTO users (email, username, password, age, state, profession) VALUES (?, ?, ?, ?, ?, ?)',
      [email, username, hashedPassword, age || null, state || null, profession || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ message: 'Email oder Username existiert bereits' });
          }
          console.error('Datenbankfehler:', err);
          return res.status(500).json({ message: 'Fehler beim Erstellen des Kontos' });
        }
        res.status(201).json({ 
          message: 'Konto erfolgreich erstellt',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Validierung
  if (!email || !password) {
    return res.status(400).json({ message: 'Email und Passwort sind erforderlich' });
  }

  try {
    // Benutzer in Datenbank suchen
    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          console.error('Datenbankfehler:', err);
          return res.status(500).json({ message: 'Fehler beim Login' });
        }

        if (!user) {
          return res.status(401).json({ message: 'Email oder Passwort ist falsch' });
        }

        // Passwort überprüfen
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ message: 'Email oder Passwort ist falsch' });
        }

        // Erfolgreiches Login
        res.status(200).json({
          message: 'Login erfolgreich',
          user: {
            id: user.id,
            email: user.email,
            username: user.username
          }
        });
      }
    );
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
});

// Passwort vergessen - Token generieren
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email ist erforderlich' });
  }

  try {
    // Benutzer in Datenbank suchen
    db.get(
      'SELECT id FROM users WHERE email = ?',
      [email],
      (err, user) => {
        if (err) {
          console.error('Datenbankfehler:', err);
          return res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
        }

        if (!user) {
          // Sicherheit: Nicht verraten, ob Email existiert
          return res.status(200).json({ 
            message: 'Wenn diese Email existiert, erhalten Sie einen Reset-Link' 
          });
        }

        // Generiere einen zufälligen Reset-Token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 Stunde

        // Speichere Token in Datenbank
        db.run(
          'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
          [resetToken, expiresAt.toISOString(), user.id],
          (err) => {
            if (err) {
              console.error('Datenbankfehler:', err);
              return res.status(500).json({ message: 'Fehler beim Generieren des Reset-Tokens' });
            }

            // Token zurückgeben (in echter App würde das per Email versendet)
            res.status(200).json({
              message: 'Reset-Token generiert',
              resetToken: resetToken,
              note: 'In einer echten Anwendung würde dieser Token per Email versendet'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
});

// Passwort zurücksetzen mit Token
app.post('/api/reset-password', async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwörter stimmen nicht überein' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Passwort muss mindestens 6 Zeichen lang sein' });
  }

  try {
    // Suche Benutzer mit gültigem Token
    db.get(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime("now")',
      [resetToken],
      async (err, user) => {
        if (err) {
          console.error('Datenbankfehler:', err);
          return res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
        }

        if (!user) {
          return res.status(400).json({ message: 'Token ungültig oder abgelaufen' });
        }

        // Neues Passwort verschlüsseln
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Passwort aktualisieren und Token löschen
        db.run(
          'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
          [hashedPassword, user.id],
          (err) => {
            if (err) {
              console.error('Datenbankfehler:', err);
              return res.status(500).json({ message: 'Fehler beim Zurücksetzen des Passworts' });
            }

            res.status(200).json({ message: 'Passwort erfolgreich zurückgesetzt' });
          }
        );
      }
    );
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
});

// Admin-Authentifizierung (einfacher Token)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function verifyAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Admin: Alle Benutzer abrufen
app.get('/api/admin/users', verifyAdminToken, (req, res) => {
  db.all(
    'SELECT id, email, username, age, state, profession, created_at FROM users ORDER BY created_at DESC',
    (err, users) => {
      if (err) {
        console.error('Datenbankfehler:', err);
        return res.status(500).json({ message: 'Fehler beim Abrufen der Benutzer' });
      }
      res.status(200).json({ users: users || [] });
    }
  );
});

// Admin: Benutzerstatistiken abrufen
app.get('/api/admin/stats', verifyAdminToken, (req, res) => {
  db.get(
    'SELECT COUNT(*) as total_users FROM users',
    (err, row) => {
      if (err) {
        console.error('Datenbankfehler:', err);
        return res.status(500).json({ message: 'Fehler beim Abrufen der Statistiken' });
      }
      res.status(200).json({
        total_users: row.total_users || 0
      });
    }
  );
});

// Admin: Benutzer löschen
app.delete('/api/admin/users/:id', verifyAdminToken, (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: 'Benutzer-ID erforderlich' });
  }

  db.run(
    'DELETE FROM users WHERE id = ?',
    [userId],
    function(err) {
      if (err) {
        console.error('Datenbankfehler:', err);
        return res.status(500).json({ message: 'Fehler beim Löschen des Benutzers' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }

      res.status(200).json({ message: 'Benutzer erfolgreich gelöscht' });
    }
  );
});

// Admin: Benutzer aktualisieren
app.put('/api/admin/users/:id', verifyAdminToken, async (req, res) => {
  const userId = req.params.id;
  const { email, username, password, age, state, profession } = req.body;

  if (!email || !username) {
    return res.status(400).json({ message: 'Email und Username sind erforderlich' });
  }

  try {
    let updateQuery = 'UPDATE users SET email = ?, username = ?, age = ?, state = ?, profession = ?';
    let params = [email, username, age || null, state || null, profession || null];

    // Passwort aktualisieren, falls vorhanden
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET email = ?, username = ?, password = ?, age = ?, state = ?, profession = ?';
      params = [email, username, hashedPassword, age || null, state || null, profession || null];
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    db.run(updateQuery, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Email oder Username existiert bereits' });
        }
        console.error('Datenbankfehler:', err);
        return res.status(500).json({ message: 'Fehler beim Aktualisieren des Benutzers' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }

      res.status(200).json({ message: 'Benutzer erfolgreich aktualisiert' });
    });
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
});

// Admin: Neuen Benutzer erstellen
app.post('/api/admin/users', verifyAdminToken, async (req, res) => {
  const { email, username, password, age, state, profession } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ message: 'Email, Username und Passwort sind erforderlich' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, username, password, age, state, profession) VALUES (?, ?, ?, ?, ?, ?)',
      [email, username, hashedPassword, age || null, state || null, profession || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ message: 'Email oder Username existiert bereits' });
          }
          console.error('Datenbankfehler:', err);
          return res.status(500).json({ message: 'Fehler beim Erstellen des Benutzers' });
        }
        res.status(201).json({
          message: 'Benutzer erfolgreich erstellt',
          userId: this.lastID
        });
      }
    );
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
