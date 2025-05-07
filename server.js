const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let currentStatus = 'OFF'; // 動静の初期値

// 動静を取得するエンドポイント
app.get('/getStatus', (req, res) => {
    res.json({ status: currentStatus });
});

// 動静を保存するエンドポイント
app.post('/saveStatus', (req, res) => {
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ message: 'ステータスが無効です。' });
    }
    currentStatus = status;
    res.json({ message: '動静が更新されました。', status: currentStatus });
});

app.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました。`);
});