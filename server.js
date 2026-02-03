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
  const { email, username, password, confirmPassword } = req.body;

  // Validierung
  if (!email || !username || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
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
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashedPassword],
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
    'SELECT id, email, username, created_at FROM users ORDER BY created_at DESC',
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
  const { email, username, password } = req.body;

  if (!email || !username) {
    return res.status(400).json({ message: 'Email und Username sind erforderlich' });
  }

  try {
    let updateQuery = 'UPDATE users SET email = ?, username = ?';
    let params = [email, username];

    // Passwort aktualisieren, falls vorhanden
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
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
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ message: 'Email, Username und Passwort sind erforderlich' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashedPassword],
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
