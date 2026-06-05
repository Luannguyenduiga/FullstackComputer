import dotenv from 'dotenv';
import sql from 'mssql';   

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER, 
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

let pool; // Biến lưu trữ kết nối pool
// Kết nối SQL Server
async function connectDB() {
    if (pool) 
        return pool; // Trả về pool nếu đã kết nối
    
  try {
    pool = await sql.connect(dbConfig);
    console.log('Connected to SQL Server');
    } catch (err) {
    console.error('Database connection failed:', err);
    }
}

  export { connectDB, sql }; // Xuất hàm connectDB để sử dụng trong server.js
