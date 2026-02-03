const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('DB open error:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  const username = 'tester';
  const email = 'tester@example.com';
  const plain = 'password';
  const hashed = bcrypt.hashSync(plain, 10);

  db.run(
    'INSERT OR IGNORE INTO users (email, username, password) VALUES (?, ?, ?)',
    [email, username, hashed],
    function (err) {
      if (err) return console.error('Insert user error:', err);
      console.log('User ensured (may be existing):', username);

      // get user id
      db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return console.error('Get user id error:', err);
        const userId = row ? row.id : null;

        const samples = [
          { text: 'Testmeinung: Remote Work sollte Standard sein.', for: 3, neutral: 1, against: 0 },
          { text: 'Testmeinung: Öffentlicher Nahverkehr sollte günstiger sein.', for: 2, neutral: 2, against: 1 },
          { text: 'Testmeinung: Schulen brauchen mehr Projektarbeit.', for: 1, neutral: 0, against: 0 }
        ];

        let remaining = samples.length;
        samples.forEach(s => {
          const total = (s.for || 0) + (s.neutral || 0) + (s.against || 0);
          db.run(
            'INSERT INTO opinions (text, votes_for, votes_neutral, votes_against, votes_total, user_id, username) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [s.text, s.for || 0, s.neutral || 0, s.against || 0, total, userId, username],
            function (err) {
              if (err) return console.error('Insert opinion error:', err);
              console.log('Inserted opinion id:', this.lastID);
              remaining -= 1;
              if (remaining === 0) {
                // close DB after last insert
                db.close((err) => {
                  if (err) console.error('DB close error:', err);
                  else console.log('Seed script finished.');
                });
              }
            }
          );
        });
      });
    }
  );
});

// Note: DB is closed after inserts complete
