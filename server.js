const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

// メモリ内にデータを保存（簡易的な実装）
let currentStatus = "OFF";
let currentComment = "未設定";

// ミドルウェア設定
app.use(cors());
app.use(bodyParser.json());

// 動静を取得するエンドポイント
app.get("/status", (req, res) => {
    res.json({ status: currentStatus, comment: currentComment });
});

// 動静を保存するエンドポイント
app.post("/status", (req, res) => {
    const { status, comment } = req.body;
    if (status) currentStatus = status;
    if (comment) currentComment = comment;
    res.json({ message: "保存しました", status: currentStatus, comment: currentComment });
});

// サーバーを起動
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});