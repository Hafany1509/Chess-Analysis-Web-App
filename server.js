const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456', 
    database: 'chess_db'
});

db.connect(err => {
    if (err) throw err;
    console.log("Connected to MySQL Database");
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.query('INSERT INTO users (username, password, role) VALUES (?, ?, "user")', [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: "Tài khoản đã tồn tại hoặc lỗi CSDL" });
        res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        res.json({ success: true, user: { id: results[0].id, username: results[0].username, role: results[0].role } });
    });
});

app.post('/api/save-game', (req, res) => {
    const { player_name, pgn_data, user_id } = req.body;
    db.query('INSERT INTO games (player_name, pgn_data, user_id) VALUES (?, ?, ?)', [player_name, pgn_data, user_id], (err) => {
        if (err) return res.status(500).json({ error: "Lỗi lưu ván đấu" });
        res.json({ success: true });
    });
});

app.get('/api/my-games/:userId', (req, res) => {
    db.query('SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Lỗi tải dữ liệu" });
        res.json(results);
    });
});

app.delete('/api/delete-game/:id', (req, res) => {
    db.query('DELETE FROM games WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
