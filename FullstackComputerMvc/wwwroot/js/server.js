import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, sql } from './configDB.js';
import productController from './controllers/productController.js'; // Path to controller file

const fastify = Fastify({ logger: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGE_ROOT = path.join(__dirname, '../images');
const FRONTEND_ROOT = path.join(__dirname,'../'); // Đường dẫn đến file /Home/Index của bạn
const start = async () => {
  try {
    // 1. Kết nối DB trước
    await connectDB();

    // Tự động tạo bảng đơn hàng nếu chưa tồn tại
    await sql.query(`
        IF OBJECT_ID('DON_HANG', 'U') IS NULL
        CREATE TABLE DON_HANG (
            order_id INT PRIMARY KEY IDENTITY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            full_name NVARCHAR(200),
            phone VARCHAR(50),
            address VARCHAR(255),
            note NVARCHAR(MAX),
            payment_method VARCHAR(50),
            status VARCHAR(50),
            total_amount DECIMAL(12,0),
            created_at DATETIME DEFAULT GETDATE(),
            FOREIGN KEY (user_id) REFERENCES NGUOIDUNG(user_id),
            FOREIGN KEY (product_id) REFERENCES SANPHAM(product_id)
        );
    `);

    // 2. Đăng ký các Plugins hệ thống
    await fastify.register(fastifyCors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    });

    await fastify.register(fastifyMultipart, {
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
      }
    });

    await fastify.register(fastifyStatic, {
      root: IMAGE_ROOT,
      prefix: '/images/',
      list: false
    });

    await fastify.register(fastifyStatic, {
      root: FRONTEND_ROOT,
      prefix: '/', // Để trống để vào link là thấy web luôn
      index: `/Home/Index`,
      decorateReply: false // Quan trọng: Fastify chỉ cho phép 1 cái decorate reply mặc định
    });

    // 3. Đăng ký Controller (Phải đăng ký TRƯỚC KHI listen)
    await fastify.register(productController);

    // 4. Mở cổng
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log("Server chạy tại http://localhost:3000");

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
