const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const JSONBIN_ID = "68204fab8960c979a5972d3e";
const API_KEY = process.env.JSONBIN_API_KEY;
const PASSWORD = process.env.ADMIN_PASSWORD;

// ログイン
app.post("/api/login", (req, res) => {
   if (req.body.password === PASSWORD) {
      res.json({ token: "simple-token" });
   } else {
      res.status(401).json({ error: "パスワードエラー" });
   }
});

// データ取得
app.get("/api/data", (req, res) => {
   if (req.headers.authorization !== "Bearer simple-token") {
      return res.status(401).json({ error: "認証エラー" });
   }
   fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
      headers: { "X-Master-Key": API_KEY },
   })
      .then((response) => response.json())
      .then((data) => res.json(data.record))
      .catch(() => res.status(500).json({ error: "データ取得エラー" }));
});

// データ更新
app.put("/api/data", (req, res) => {
   if (req.headers.authorization !== "Bearer simple-token") {
      return res.status(401).json({ error: "認証エラー" });
   }
   fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
      method: "PUT",
      headers: {
         "Content-Type": "application/json",
         "X-Master-Key": API_KEY,
      },
      body: JSON.stringify(req.body),
   })
      .then((response) => response.json())
      .then((data) => res.json(data.record))
      .catch(() => res.status(500).json({ error: "更新エラー" }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`サーバー起動: ポート${PORT}`));