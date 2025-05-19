const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite in-memory DB
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS status (id INTEGER PRIMARY KEY, current_status TEXT)");
    db.get("SELECT * FROM status WHERE id = 1", (err, row) => {
        if (!row) {
            db.run("INSERT INTO status (id, current_status) VALUES (1, '不在')");
        }
    });
});

// Session Middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Static files（index.html）
app.use(express.static(path.join(__dirname, 'public')));

// JSON & Form パーサー
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ログイン処理
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === 'ADMIN_PASSWORD') {
        req.session.admin = true;
        res.redirect('/');
    } else {
        res.status(401).send('パスワードが違います');
    }
});

// ログアウト
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ステータス取得
app.get('/api/status', (req, res) => {
    db.get("SELECT current_status FROM status WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// ステータス更新
app.post('/api/status', (req, res) => {
    if (!req.session.admin) return res.status(403).send('アクセス拒否');

    const { status } = req.body;
    db.run("UPDATE status SET current_status = ? WHERE id = 1", [status], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: true });
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});