# ♟ Chess Analysis System

Web app phân tích ván cờ vua — lấy cảm hứng từ chess.com  
**B23DCCN272 · Lê Huy Hải**

## Tính năng
- Phân tích PGN với engine Stockfish
- Phân loại Blunder ?? / Mistake ? / Inaccuracy ?!
- Accuracy score cho cả 2 người chơi
- Lưu / tải lại ván đấu (cần đăng nhập)
- Vẽ mũi tên bestmove + chuột phải vẽ mũi tên tùy ý
- Đăng ký / đăng nhập với JWT + bcrypt

---

## Deploy lên Railway

### Bước 1 — Push code lên GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chess-analysis.git
git push -u origin main
```

### Bước 2 — Tạo project trên Railway
1. Vào [railway.app](https://railway.app) → **New Project**
2. Chọn **Deploy from GitHub repo** → chọn repo vừa push
3. Railway tự detect Node.js và deploy

### Bước 3 — Thêm MySQL
1. Trong project → **New Service** → **Database** → **MySQL**
2. Click vào MySQL service → tab **Variables**
3. Copy các giá trị: `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`

### Bước 4 — Thiết lập Environment Variables
Vào Node.js service → tab **Variables** → thêm:

| Key | Value |
|-----|-------|
| `DB_HOST` | giá trị `MYSQLHOST` từ MySQL service |
| `DB_USER` | giá trị `MYSQLUSER` |
| `DB_PASSWORD` | giá trị `MYSQLPASSWORD` |
| `DB_NAME` | giá trị `MYSQLDATABASE` |
| `DB_PORT` | giá trị `MYSQLPORT` |
| `JWT_SECRET` | chuỗi bí mật bất kỳ dài ≥ 32 ký tự |

### Bước 5 — Chạy Migration
1. Click vào MySQL service → tab **Query**
2. Copy toàn bộ nội dung file `migration_railway.sql` và chạy

### Bước 6 — Lấy link
Vào Node.js service → tab **Settings** → **Domains** → **Generate Domain**  
→ Link dạng `https://chess-analysis-xxx.railway.app`

---

## Chạy local

```bash
# Cài dependencies
npm install

# Tạo file .env (copy từ .env.example, điền thông tin MySQL local)
cp .env.example .env

# Chạy migration local (trong MySQL Workbench)
# Chạy file: migration.sql

# Start server
npm start
# hoặc dev mode (auto reload):
npm run dev
```

Mở trình duyệt: http://localhost:3000

---

## Cấu trúc project
```
chess-app/
├── server.js              ← Entry point
├── package.json
├── railway.json           ← Railway config
├── .env                   ← Local config (không commit)
├── .env.example           ← Template
├── migration.sql          ← Local DB setup
├── migration_railway.sql  ← Railway DB setup
├── server/
│   ├── config/db.js
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js
│       └── games.js
└── public/
    ├── index.html
    ├── style.css
    ├── script.js
    ├── auth.js
    ├── analyzer.js
    ├── stockfish.js
    ├── chessboard-arrows.js
    └── img/
```

## Stack
- **Frontend**: Vanilla JS, chessboard.js, chess.js, Stockfish WASM
- **Backend**: Node.js, Express
- **Database**: MySQL
- **Auth**: JWT + bcrypt
