-- ============================================================
-- Chạy file này 1 lần trong MySQL Workbench hoặc terminal
-- mysql -u root -p chess_db < migration.sql
-- ============================================================

-- 1. Đảm bảo cột password đủ dài chứa bcrypt hash
ALTER TABLE users MODIFY COLUMN password VARCHAR(255);

-- 2. Thêm unique key cho username (nếu chưa có)
ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uq_username (username);

-- 3. Thêm các cột mới cho bảng games
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS game_key  VARCHAR(64)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME    DEFAULT NULL ON UPDATE NOW();

-- 4. Thêm unique key cho game_key (để ON DUPLICATE KEY UPDATE hoạt động)
ALTER TABLE games ADD UNIQUE KEY IF NOT EXISTS uq_game_key (game_key);

-- 5. Xóa mật khẩu cũ (plain text) — user cần đăng ký lại
UPDATE users SET password = NULL WHERE password IS NOT NULL AND LENGTH(password) < 40;

SELECT 'Migration hoàn tất ✅' AS status;
