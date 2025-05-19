const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const path = require('path');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// DOMPurify準備
const window = new JSDOM('').window;
const clean = DOMPurify(window);

// Express初期化
const app = express();
const PORT = process.env.PORT || 3000;

// SQLite DB（ファイルベース）
const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS status (id INTEGER PRIMARY KEY, current_status TEXT)");
    db.get("SELECT * FROM status WHERE id = 1", (err, row) => {
        if (!row) {
            db.run("INSERT INTO status (id, current_status) VALUES (1, '不在')");
        }
    });
});

// Redis Store（Render推奨）
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisClient = redis.createClient({
    url: process.env.REDIS_URL // Renderの環境変数で設定
});
redisClient.connect().catch(console.error);

// Rate Limiter：ログイン試行制限
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 5,
    message: 'ログイン試行回数が上限に達しました'
});

// Session Middleware（セキュア設定）
app.use(session({
    store: new RedisStore({ client: redisClient }), // Redisを使用して永続化
    secret: process.env.SESSION_SECRET || 'strong-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPSのみ送信
        sameSite: 'strict', // CSRF防止
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7日間
    }
}));

// CSRF Protection（POST保護）
const csrfProtection = csrf({ cookie: false });

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

// リクエストパーサー
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 管理者パスワード（環境変数 or デフォルト）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'u6yn38hm';

// CSRFミドルウェア（GETリクエスト時にトークン生成）
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    next();
});

// ログイン処理（Rate Limit付き + サニタイズ）
app.post('/login', loginLimiter, (req, res) => {
    const { password } = req.body;
    const safePassword = clean.sanitize(password);

    console.log('Received password:', safePassword);             // デバッグ用ログ
    console.log('Expected password:', ADMIN_PASSWORD);           // 環境変数確認

    if (safePassword === ADMIN_PASSWORD) {
        req.session.admin = true;
        return res.redirect('/');
    }

    res.status(401).send('パスワードが違います');
});

// ログアウト
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ステータス取得
app.get('/api/status', (req, res) => {
    db.get("SELECT current_status FROM status WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: 'ステータス取得中にエラーが発生しました' });
        res.json(row);
    });
});

// ステータス更新（CSRF保護＋サニタイズ＋認証）
app.post('/api/status', csrfProtection, (req, res) => {
    if (!req.session.admin) return res.status(403).send('アクセス拒否');

    const { status } = req.body;
    const safeStatus = clean.sanitize(status);

    db.run("UPDATE status SET current_status = ? WHERE id = 1", [safeStatus], function (err) {
        if (err) return res.status(500).json({ error: 'ステータス更新中にエラーが発生しました' });
        res.json({ updated: true });
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});