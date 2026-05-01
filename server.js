const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'typerush_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./typerush.db');

// Create simple tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    wpm INTEGER NOT NULL,
    accuracy INTEGER NOT NULL,
    characters INTEGER NOT NULL,
    difficulty TEXT,
    time_setting INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// === SIMPLE ENDPOINTS ===

// 1. Register user
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'User already exists' });
        }

        const token = jwt.sign(
          { userId: this.lastID, username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Account created successfully!',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Login user
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err || !user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful!',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    }
  );
});

// 3. Save typing score
app.post('/api/scores', authenticate, (req, res) => {
  const { wpm, accuracy, characters, difficulty, timeSetting } = req.body;
  const userId = req.user.userId;

  db.run(
    'INSERT INTO scores (user_id, wpm, accuracy, characters, difficulty, time_setting) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, wpm, accuracy, characters, difficulty, timeSetting],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save score' });
      }

      res.json({ message: 'Score saved successfully!' });
    }
  );
});

// 4. Get user statistics
app.get('/api/my-stats', authenticate, (req, res) => {
  const userId = req.user.userId;

  db.get(
    `SELECT 
      COUNT(*) as tests_taken,
      MAX(wpm) as best_wpm,
      AVG(wpm) as avg_wpm,
      AVG(accuracy) as avg_accuracy
     FROM scores 
     WHERE user_id = ?`,
    [userId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ stats: stats || {} });
    }
  );
});

// 5. Get user's recent scores
app.get('/api/my-scores', authenticate, (req, res) => {
  const userId = req.user.userId;

  db.all(
    `SELECT wpm, accuracy, characters, difficulty, time_setting, created_at 
     FROM scores 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 10`,
    [userId],
    (err, scores) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ scores });
    }
  );
});

// 6. Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const { difficulty } = req.query;

  let query = `
    SELECT u.username, s.wpm, s.accuracy, s.characters, s.difficulty, s.created_at
    FROM scores s
    JOIN users u ON s.user_id = u.id
  `;
  
  let params = [];

  if (difficulty && difficulty !== 'all') {
    query += ' WHERE s.difficulty = ?';
    params.push(difficulty);
  }

  query += ' ORDER BY s.wpm DESC, s.accuracy DESC LIMIT 20';

  db.all(query, params, (err, scores) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ leaders: scores });
  });
});

// 7. Get user count (for admin)
app.get('/api/admin/users', (req, res) => {
  db.get('SELECT COUNT(*) as userCount FROM users', (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ totalUsers: result.userCount });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TypeRush backend running on http://localhost:${PORT}`);
  console.log(`📊 Simple backend with 7 endpoints ready!`);
});