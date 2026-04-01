import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { sql } from '../configDB.js';

const pump = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_ROOT = path.join(__dirname, '../../images');

// Export function ra ngoài để đăng ký vào Fastify
export default async function productController(fastify, options) {

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(IMAGE_ROOT)) fs.mkdirSync(IMAGE_ROOT, { recursive: true });

    // GET products
    fastify.get('/products', async (req, reply) => {
        try {
            const result = await sql.query`
                SELECT 
                    p.product_id, p.name, p.price,
                    CASE 
                        WHEN h.image_url IS NOT NULL THEN CONCAT('/images/', h.image_url)
                        ELSE '/images/default-placeholder.png' 
                    END AS image_url
                FROM SANPHAM p
                LEFT JOIN HINHANH_SP h ON p.product_id = h.product_id AND h.is_main = 1
                WHERE p.status='active'
                ORDER BY p.product_id DESC`;
            reply.send(result.recordset);
        } catch (err) {
            req.log.error(err);
            reply.code(500).send({ error: 'Lỗi lấy dữ liệu hiển thị' });
        }
    });

    // GET product with Category 
    // GET product with Category 
    fastify.get('/products/category/:id', async (req, reply) => {
        try {
            const id = parseInt(req.params.id); // Lấy ID từ URL

            // Sử dụng LTRIM và RTRIM (hoặc TRIM với SQL Server đời mới) để dọn dẹp chuỗi
            const result = await sql.query`
            SELECT 
                p.product_id,
                p.name,
                p.price,
                CASE 
                    WHEN h.image_url IS NOT NULL 
                    THEN CONCAT('/images/', LTRIM(RTRIM(h.image_url)))
                    ELSE '/images/default-placeholder.png' 
                END AS image_url
            FROM SANPHAM p
            LEFT JOIN HINHANH_SP h ON p.product_id = h.product_id AND h.is_main = 1
            WHERE p.category_id = ${id} AND p.status = 'active'
            ORDER BY p.product_id DESC
        `;

            // Trả về dữ liệu đã được làm sạch
            reply.send(result.recordset);
        } catch (err) {
            req.log.error(err);
            reply.code(500).send({ error: 'Lỗi lấy dữ liệu hiển thị' });
        }
    });

    // POST products
    fastify.post('/products', async (req, reply) => {
        try {
            if (!req.isMultipart()) {
                return reply.code(400).send({ error: "Dữ liệu không đúng định dạng Form" });
            }

            const data = await req.file();
            if (!data) return reply.code(400).send({ error: "Không tìm thấy file ảnh" });

            const name = data.fields.name?.value;
            const price = parseInt(data.fields.price?.value);
            const category_id = parseInt(data.fields.category_id?.value);
            const brand_id = parseInt(data.fields.brand_id?.value);
            const description = data.fields.description?.value || '';

            if (!name || isNaN(price)) {
                return reply.code(400).send({ error: "Tên hoặc Giá không hợp lệ" });
            }

            const result = await sql.query`
                INSERT INTO SANPHAM(name, price, category_id, brand_id, description, status)
                OUTPUT INSERTED.product_id
            VALUES(${name}, ${price}, ${category_id}, ${brand_id}, ${description}, 'active')`;

            const productId = result.recordset[0].product_id;
            const folderName = 'linhkien';
            const fileName = `${Date.now()}-${data.filename.replace(/\s+/g, '-')}`;
            const dbPath = `${folderName}/${fileName}`;
            const targetDir = path.join(IMAGE_ROOT, folderName);

            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            await pump(data.file, fs.createWriteStream(path.join(targetDir, fileName)));

            await sql.query`
                INSERT INTO HINHANH_SP (product_id, image_url, is_main)
                VALUES (${productId}, ${dbPath}, 1)`;

            return reply.send({ success: true, productId });
        } catch (err) {
            console.error("Lỗi:", err.message);
            return reply.code(500).send({ error: 'Lỗi server', message: err.message });
        }
    });

    // GET admin products
    fastify.get('/admin/products', async (req, reply) => {
        try {
            const result = await sql.query`
                SELECT 
                    p.product_id, p.name AS product_name, p.price, p.status,
                    p.description, p.discount_price, d.name AS category_name, h.name AS brand_name 
                FROM SANPHAM p
                LEFT JOIN DANHMUC d ON p.category_id = d.category_id
                LEFT JOIN HANG h ON p.brand_id = h.brand_id
                ORDER BY p.product_id DESC`;
            return result.recordset;
        } catch (err) {
            return reply.code(500).send({ error: "Lỗi SQL", detail: err.message });
        }
    });
}