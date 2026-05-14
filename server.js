require('dotenv').config();
const express    = require('express');
const bodyParser = require('body-parser');

const authRoutes  = require('./server/routes/auth');
const gamesRoutes = require('./server/routes/games');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(bodyParser.json());
app.use(express.static('public'));

// ── Routes ───────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/games', gamesRoutes);

// ── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Lỗi máy chủ không xác định' });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
