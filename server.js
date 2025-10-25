import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(cors());

// Load users from file
const USERS_FILE = "users.json";
let users = {};

if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

// ✅ SIGNUP (Create User)
app.post("/api/signup", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ success: false, message: "Missing username or password" });

  if (users[username])
    return res.status(400).json({ success: false, message: "User already exists" });

  users[username] = { password, shards: 0 };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  return res.json({ success: true, message: "User created successfully" });
});

// ✅ LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!users[username] || users[username].password !== password)
    return res.status(400).json({ success: false, message: "Invalid Username or Password" });

  return res.json({
    success: true,
    username,
    shards: users[username].shards || 0
  });
});

// ✅ REDEEM
app.post("/api/redeem", (req, res) => {
  const { username, code } = req.body;
  const redeemCodes = {
    "ZENYXONTOP": 200,
    "MYSTICSHARD": 350,
    "SHARDRAIN": 100
  };

  if (!redeemCodes[code])
    return res.json({ success: false, message: "Invalid Code" });

  users[username].shards += redeemCodes[code];
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  return res.json({
    success: true,
    newShards: users[username].shards,
    message: `Code Redeemed! +${redeemCodes[code]} Shards`
  });
});

// ✅ SERVER LISTEN
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Azyrnyx Backend running on port ${PORT}`));
