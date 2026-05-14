const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost')
        ? { rejectUnauthorized: false }
        : false
});

db.connect(err => {
    if (err) {
        console.error('❌ Lỗi kết nối MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Kết nối MySQL thành công');
});

module.exports = db;
