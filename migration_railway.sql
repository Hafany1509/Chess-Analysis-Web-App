-- ============================================================
-- Chạy file này 1 lần sau khi tạo MySQL service trên Railway
-- Dùng Railway's MySQL console hoặc kết nối qua DBeaver/TablePlus
-- ============================================================

-- Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    password   VARCHAR(255),
    role       VARCHAR(10)  DEFAULT 'user',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng games
CREATE TABLE IF NOT EXISTS games (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT,
    player_name VARCHAR(255),
    pgn_data    TEXT,
    game_key    VARCHAR(64)  DEFAULT NULL UNIQUE,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT NULL
);

SELECT 'Migration Railway hoàn tất ✅' AS status;
