// server.js
// Azyrnyx backend - persistent users, tokens, shards, redeem codes, daily quest claim
// Node.js + Express

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// DB file path
const DB_FILE = path.join(__dirname, 'users.json');

// Load DB or create if not exists
let users = {};
if (fs.existsSync(DB_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('Failed to parse users.json, starting empty', e);
    users = {};
  }
} else {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// Example redeem codes (editable)
let redeemCodes = {
  "ZENYXONTOP": 200,   // admin/test code (remove later)
  "MYSTICSHARD": 50
};

// ========== Helpers ==========
function generateToken() {
  return crypto.randomBytes(18).toString('hex');
}

function authCheck(username, token) {
  if (!username || !token) return false;
  const u = users[username];
  if (!u) return false;
  return u.token === token;
}

// ========== Routes ==========

// Health
app.get('/', (req, res) => res.json({ ok: true, service: 'Azyrnyx backend' }));

// Signup (optional)
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  if (users[username]) return res.status(400).json({ error: 'Username exists' });
  const hashed = await bcrypt.hash(password, 10);
  const token = generateToken();
  users[username] = {
    password: hashed,
    token,
    shards: 0,
    redeemedCodes: [],
    quests: {} // questId: timestamp
  };
  saveDB();
  res.json({ success: true, message: 'Signup successful', token, shards: 0 });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  const user = users[username];
  if (!user) {
    // Return generic message to avoid leaking info
    return res.status(400).json({ error: 'Invalid username or password' });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid username or password' });
  const token = generateToken();
  user.token = token;
  saveDB();
  res.json({ success: true, message: 'Login successful', token, shards: user.shards });
});

// Get balance (requires username+token)
app.post('/api/balance', (req, res) => {
  const { username, token } = req.body || {};
  if (!authCheck(username, token)) return res.status(403).json({ error: 'Invalid auth' });
  const user = users[username];
  res.json({ success: true, shards: user.shards });
});

// Redeem code (username + token + code)
app.post('/api/redeem', (req, res) => {
  const { username, token, code } = req.body || {};
  if (!authCheck(username, token)) return res.status(403).json({ error: 'Invalid auth' });
  if (!code) return res.status(400).json({ error: 'Code missing' });

  const u = users[username];
  const c = code.toUpperCase();

  // Check code exists
  if (!redeemCodes[c]) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  // Has user already redeemed it?
  if (u.redeemedCodes && u.redeemedCodes.includes(c)) {
    return res.status(400).json({ error: 'Code already used by this account' });
  }

  // Grant reward
  const amount = redeemCodes[c];
  u.shards = (u.shards || 0) + amount;
  u.redeemedCodes = u.redeemedCodes || [];
  u.redeemedCodes.push(c);

  saveDB();

  // If you want codes to be single-use across all accounts, uncomment the next line:
  // delete redeemCodes[c];

  res.json({ success: true, message: `Redeemed ${amount} Aether Shards`, shards: u.shards });
});

// Claim quest
// body: { username, token, questId, reward }
app.post('/api/claim-quest', (req, res) => {
  const { username, token, questId, reward } = req.body || {};
  if (!authCheck(username, token)) return res.status(403).json({ error: 'Invalid auth' });
  if (!questId || typeof reward !== 'number') return res.status(400).json({ error: 'Missing questId or reward' });

  const u = users[username];
  u.quests = u.quests || {};
  const now = Date.now();
  const lastClaimed = u.quests[questId] || 0;

  // if claimed within 12 hours (12*60*60*1000 ms), block
  const twelveH = 12 * 60 * 60 * 1000;
  if (lastClaimed && (now - lastClaimed) < twelveH) {
    return res.status(400).json({ error: 'Quest already claimed or not ready yet' });
  }

  // award
  u.shards = (u.shards || 0) + reward;
  u.quests[questId] = now;
  saveDB();
  res.json({ success: true, message: `Claimed ${reward} Aether Shards`, shards: u.shards });
});

// Admin: add code endpoint (optional) - protected by a simple admin secret env var (optional)
app.post('/api/admin/add-code', (req, res) => {
  const { secret, code, amount } = req.body || {};
  // set ADMIN_SECRET as env var if using
  if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!code || typeof amount !== 'number') return res.status(400).json({ error: 'Missing code or amount' });
  redeemCodes[code.toUpperCase()] = amount;
  res.json({ success: true, message: `Code ${code.toUpperCase()} added` });
});

// For debugging: list users (not recommended in production) - protected by ADMIN_SECRET
app.get('/api/admin/users', (req, res) => {
  if (!process.env.ADMIN_SECRET || req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // don't return passwords
  const safe = {};
  Object.keys(users).forEach(k => {
    safe[k] = {
      shards: users[k].shards,
      redeemedCodes: users[k].redeemedCodes || [],
      quests: users[k].quests || {}
    };
  });
  res.json({ success: true, users: safe });
});

// Start server
app.listen(PORT, () => {
  console.log(`Azyrnyx backend listening on port ${PORT}`);
});
