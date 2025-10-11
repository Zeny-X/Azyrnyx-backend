// ================================
// Azyrnyx Backend — server.js
// ================================

import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON & CORS
app.use(express.json());
app.use(cors());

// 🧠 Temporary in-memory storage (1 user = 1 device for now)
const users = {}; // { username: { shards: 0, redeemedCodes: [] } }

// 🎟️ Example redeem codes
const redeemCodes = {
  "ZENYXONTOP": 200,
};

// =====================
// 🧑 Auth - basic login
// =====================
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  if (!users[username]) {
    users[username] = { shards: 0, redeemedCodes: [] };
  }

  res.json({ 
    message: "Login success",
    shards: users[username].shards
  });
});

// =====================
// 💰 Redeem Code
// =====================
app.post("/redeem", (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ error: "Missing fields" });

  const user = users[username];
  if (!user) return res.status(400).json({ error: "Invalid user" });

  const upperCode = code.toUpperCase();

  if (!redeemCodes[upperCode]) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  if (user.redeemedCodes.includes(upperCode)) {
    return res.status(400).json({ error: "Code already redeemed" });
  }

  user.shards += redeemCodes[upperCode];
  user.redeemedCodes.push(upperCode);

  res.json({ 
    message: `Redeemed ${redeemCodes[upperCode]} Aether Shards!`,
    shards: user.shards
  });
});

// =====================
// 🪙 Get Shard Balance
// =====================
app.get("/balance/:username", (req, res) => {
  const { username } = req.params;
  const user = users[username];
  if (!user) return res.status(400).json({ error: "Invalid user" });

  res.json({ shards: user.shards });
});

// =====================
// 🚀 Start server
// =====================
app.listen(PORT, () => {
  console.log(`✅ Azyrnyx Backend running on port ${PORT}`);
});
