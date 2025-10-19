import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

// ============================
// Simple in-memory user database
// ============================
const users = {
  "testaccount": { password: "test1234", shards: 0 }
};

// ============================
// Redeem Codes
// ============================
const redeemCodes = {
  "ZENYXONTOP": 200,
  "MYSTICSHARD": 500
};

// ============================
// Login / Register
// ============================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  // If user doesn't exist, create it
  if (!users[username]) {
    users[username] = { password, shards: 0 };
    return res.json({ success: true, message: "Account created", shards: 0 });
  }

  // If user exists, validate password
  if (users[username].password === password) {
    return res.json({ success: true, message: "Login successful", shards: users[username].shards });
  }

  return res.status(400).json({ success: false, message: "Invalid Username or Password" });
});

// ============================
// Redeem code endpoint
// ============================
app.post("/api/redeem", (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const amount = redeemCodes[code];
  if (!amount) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }

  users[username].shards += amount;
  delete redeemCodes[code]; // One-time use code
  return res.json({ success: true, message: `Redeemed ${amount} shards!`, shards: users[username].shards });
});

// ============================
// Sync Shards (when page reloads)
// ============================
app.post("/api/sync", (req, res) => {
  const { username } = req.body;
  if (!username || !users[username]) {
    return res.status(400).json({ success: false, message: "User not found" });
  }
  return res.json({ success: true, shards: users[username].shards });
});

// ============================
app.listen(PORT, () => {
  console.log(`✅ Azyrnyx Backend running on port ${PORT}`);
});
