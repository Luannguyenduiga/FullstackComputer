import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import {connectDB, sql} from './configDB.js';

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: true });

// connect DB
await connectDB();

// serve static files
const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);

// public folder image
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../images'),
  prefix: '/images/', // URL sẽ bắt đầu bằng /images/ để truy cập vào thư mục này
});


// route lấy hình ảnh
fastify.get('/hinhanh', async (req, reply) => {
  try {
    const pool = await connectDB(); // Đảm bảo đã kết nối trước khi truy vấn
    const result = await pool.request().query('SELECT * FROM HINHANH_SP');
    reply.send(result.recordset); // Gửi dữ liệu trả về cho client
  } catch (err) {
    reply.status(500).send(err);
  }
});

// route tên và giá lấy sản phẩm
fastify.get('/products', async (req, reply) => {
  try {
    const result = await sql.query`
      SELECT 
        p.name,
        p.price,
        h.image_url
      FROM SANPHAM p
      JOIN HINHANH_SP h 
        ON p.product_id = h.product_id
      WHERE h.is_main = 1
    `;
    reply.send(result.recordset);
  } catch (err) {
    reply.code(500).send(err);
  }
});

fastify.get('/', async (req, reply) => {
  return { status: 'OK', message: 'Fullstack Computer API running' };
});

// start server
fastify.listen({ port: 3000 }, err => {
  if (err) {
    fastify.log.error(err);
    process.exit(1); // tự thoát nếu có lỗi khi khởi động server
  }
  console.log('Server running at http://localhost:3000');
});