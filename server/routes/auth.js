const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' });

    if (password.length < 6)
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, "user")',
            [username, hashedPassword],
            (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY')
                        return res.status(400).json({ error: 'Tên tài khoản đã tồn tại' });
                    return res.status(500).json({ error: 'Lỗi máy chủ' });
                }
                res.json({ success: true, message: 'Đăng ký thành công' });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' });

    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, results) => {
            if (err) return res.status(500).json({ error: 'Lỗi máy chủ' });

            if (results.length === 0)
                return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });

            const user = results[0];

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch)
                return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username, role: user.role }
            });
        }
    );
});

module.exports = router;
