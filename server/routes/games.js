const express        = require('express');
const router         = express.Router();
const db             = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Tất cả route trong file này đều yêu cầu đăng nhập
router.use(authMiddleware);

// POST /api/games/save
router.post('/save', (req, res) => {
    const { player_name, pgn_data, game_key } = req.body;
    const user_id = req.user.id; // Lấy từ JWT, không tin client

    if (!pgn_data)
        return res.status(400).json({ error: 'Thiếu dữ liệu ván đấu' });

    db.query(
        `INSERT INTO games (user_id, player_name, pgn_data, game_key)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           player_name = VALUES(player_name),
           pgn_data    = VALUES(pgn_data),
           updated_at  = NOW()`,
        [user_id, player_name || req.user.username, pgn_data, game_key || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Lỗi lưu ván đấu' });
            res.json({ success: true, id: result.insertId || null });
        }
    );
});

// GET /api/games/my
router.get('/my', (req, res) => {
    db.query(
        'SELECT id, player_name, pgn_data, created_at FROM games WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Lỗi tải dữ liệu' });
            res.json(results);
        }
    );
});

// DELETE /api/games/:id  — chỉ xóa được ván của chính mình
router.delete('/:id', (req, res) => {
    db.query(
        'DELETE FROM games WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Lỗi xóa ván đấu' });
            if (result.affectedRows === 0)
                return res.status(403).json({ error: 'Không có quyền xóa ván đấu này' });
            res.json({ success: true });
        }
    );
});

module.exports = router;
