const express = require('express');
const path = require('path');
const mysql = require('mysql2'); // Di chuyển lên đầu cho gọn
const app = express();
const PORT = 3000;

// QUAN TRỌNG: Dòng này giúp Server đọc được dữ liệu JSON gửi từ fetch()
app.use(express.json()); 

app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '123456', 
    database: 'chess_analysis'
});

connection.connect(err => {
    if (err) {
        console.error('Lỗi kết nối MySQL: ' + err.stack);
        return;
    }
    console.log('Đã kết nối thành công database: chess_analysis');
});

// THIẾU ĐOẠN NÀY: API nhận dữ liệu lưu ván cờ
app.post('/api/save-game', (req, res) => {
    const { player_name, pgn_data } = req.body;
    const sql = 'INSERT INTO games (player_name, pgn_data) VALUES (?, ?)';
    
    connection.query(sql, [player_name, pgn_data], (err, result) => {
        if (err) {
            console.error("Lỗi MySQL:", err);
            return res.status(500).json({ error: "Không thể lưu vào Database" });
        }
        res.json({ message: "Đã lưu ván cờ thành công!", id: result.insertId });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server đang chay tai: http://localhost:${PORT}`);
});
