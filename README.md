# Chess Analysis App v2

## Cấu trúc thư mục
```
chess-app-v2/
├── server.js                  ← Entry point
├── package.json
├── .env                       ← Cấu hình DB + JWT (không commit lên git)
├── .gitignore
├── migration.sql              ← Chạy 1 lần để cập nhật DB
├── server/
│   ├── config/
│   │   └── db.js              ← Kết nối MySQL
│   ├── middleware/
│   │   └── auth.js            ← Kiểm tra JWT token
│   └── routes/
│       ├── auth.js            ← POST /api/auth/login, /register
│       └── games.js           ← GET/POST/DELETE /api/games/...
└── public/
    ├── index.html
    ├── style.css
    ├── auth.js                ← Auth + save game (tách từ script.js)
    ├── script.js              ← Logic bàn cờ + engine
    ├── chessboard-arrows.js   ← Copy từ dự án cũ
    ├── stockfish.js           ← Copy từ dự án cũ
    └── img/                   ← Copy từ dự án cũ
```

## Cài đặt

### 1. Cài thư viện
```bash
npm install
```

### 2. Cấu hình .env
Mở file `.env` và điền đúng thông tin:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mật_khẩu_mysql_của_bạn
DB_NAME=chess_db
JWT_SECRET=bất_kỳ_chuỗi_bí_mật_nào
```

### 3. Chạy migration SQL
```bash
mysql -u root -p chess_db < migration.sql
```
Hoặc mở file `migration.sql` trong MySQL Workbench và chạy.

### 4. Copy file từ dự án cũ
Copy các file sau vào thư mục `public/`:
- `chessboard-arrows.js`
- `stockfish.js`
- `img/` (toàn bộ thư mục ảnh quân cờ)

### 5. Chạy server
```bash
npm start
# hoặc để tự reload khi sửa code:
npm run dev
```

Mở trình duyệt tại: http://localhost:3000

## Thay đổi so với v1
| Vấn đề cũ | Đã sửa |
|---|---|
| Password lưu plain text | bcrypt hash |
| Ai cũng xóa được game người khác | JWT kiểm tra ownership |
| userId giả mạo từ client | Lấy từ JWT token |
| Credentials hardcode | File .env |
| autoSave tạo bản ghi mới mỗi nước | ON DUPLICATE KEY UPDATE |
| XSS trong tên ván cờ | escapeHtml() |
| bestmove không hiển thị | Vẽ mũi tên lên canvas |
