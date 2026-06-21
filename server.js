const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://admin:W3twfr5FAHFJJoKp6XGDAk1ST86Bsl9Q@dpg-d8s24fj6sc1c73burdmg-a.oregon-postgres.render.com/securehorizon',
  ssl: { rejectUnauthorized: false }
});

// ============================================
// ✅ TEST ROUTE
// ============================================
app.get('/', (req, res) => {
  res.json({ message: 'Secure Horizon Backend is Running! 🚀' });
});

// ============================================
// ✅ GET ALL USERS (TEMPORARY - TESTING ONLY)
// ============================================
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, created_at FROM users ORDER BY id DESC');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ============================================
// ✅ SIGNUP API
// ============================================
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    res.json({ success: true, message: 'User created successfully!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ success: false, message: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

// ============================================
// ✅ LOGIN API
// ============================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      'mySuperSecretKey12345',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// ✅ CREATE USERS TABLE (if not exists)
// ============================================
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created successfully');
  } catch (err) {
    console.log('⚠️ Table creation error:', err.message);
  }
};

createTable();

// ============================================
// ✅ START SERVER
// ============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});