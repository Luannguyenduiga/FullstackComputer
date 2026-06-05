import path from "path";
import fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { sql } from "../configDB.js";
import jwt from "jsonwebtoken"; // Thêm import jsonwebtoken
import bcrypt from "bcrypt"; // Thêm import bcrypt

const pump = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_ROOT = path.join(__dirname, "../../images");
const JWT_SECRET = "fullstack-computer-secret-2026"; // Thêm biến JWT_SECRET để lưu trữ secret key cho JWT(Json Web Token là một chuẩn mở dựa trên JSON để truyền thông tin an toàn giữa các bên dưới dạng đối tượng JSON. Thông tin này có thể được xác minh và tin cậy vì nó được ký điện tử.)

// Export function ra ngoài để đăng ký vào Fastify
export default async function productController(fastify, options) {
  // Đảm bảo thư mục tồn tại
  if (!fs.existsSync(IMAGE_ROOT)) fs.mkdirSync(IMAGE_ROOT, { recursive: true });

  // GET products
  fastify.get("/products", async (req, reply) => {
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
      reply.code(500).send({ error: "Lỗi lấy dữ liệu hiển thị" });
    }
  });

  // GET product with Category
  fastify.get("/products/category/:id", async (req, reply) => {
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
      reply.code(500).send({ error: "Lỗi lấy dữ liệu hiển thị" });
    }
  });

  fastify.get("/edit/product/:id", async (req, reply) => {
    try {
      const id = parseInt(req.params.id);
      const result = await sql.query`
            SELECT 
            p.product_id,
            p.name,
            p.price,
	        p.description,
            h.image_url
        FROM SANPHAM p
        JOIN HINHANH_SP h 
        ON p.product_id = h.product_id
        WHERE p.product_id = ${id} `;
      reply.send(result.recordset[0]);
    } catch (error) {
      req.log.error(err);
      reply.code(500).send({ error: "Lỗi lấy dữ liệu sản phẩm" });
    }
  });

  fastify.put("/update/product/:id", async (req, reply) => {
    try {
      const id = parseInt(req.params.id);
      let name, price, description;

      // KIỂM TRA: Nếu request gửi lên có kèm file (multipart là dạng form-data )
      if (req.isMultipart()) {
        const data = await req.file();
        // Lấy giá trị từ các fields của FormData
        name = data.fields.name?.value;
        price = parseInt(data.fields.price?.value);
        description = data.fields.description?.value || "";
      } else {
        // Nếu KHÔNG có file (gửi dạng JSON bình thường)
        name = req.body.name;
        price = parseInt(req.body.price);
        description = req.body.description || "";
      }

      // Thực hiện Update
      await sql.query`
            UPDATE SANPHAM
            SET name = ${name}, 
                price = ${price}, 
                description = ${description}
            WHERE product_id = ${id}
        `;

      reply.send({ success: true, message: "Cập nhật thành công!" });
    } catch (err) {
      req.log.error(err);
      reply.code(500).send({ error: "Lỗi server khi cập nhật" });
    }
  });

  // DELETE product
  fastify.delete("/api/product/:id", async (req, reply) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return reply.code(400).send({ success: false, error: "ID sản phẩm không hợp lệ" });
      }

      // Lấy danh sách ảnh trước khi xóa để xóa file vật lý
      const images = await sql.query`SELECT image_url FROM HINHANH_SP WHERE product_id = ${id}`;

      // 1. Xóa sản phẩm khỏi giỏ hàng (nếu có) để tránh lỗi khóa ngoại
      await sql.query`DELETE FROM GIOHANG WHERE product_id = ${id}`;
      
      // 2. Xóa các hình ảnh liên kết với sản phẩm
      await sql.query`DELETE FROM HINHANH_SP WHERE product_id = ${id}`;
      
      // 3. Cuối cùng mới xóa sản phẩm ở bảng chính
      await sql.query`DELETE FROM SANPHAM WHERE product_id = ${id}`;

      // Xóa file ảnh vật lý trên server
      images.recordset.forEach(img => {
        if (img.image_url) {
          const filePath = path.join(IMAGE_ROOT, img.image_url);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      });

      return reply.send({ success: true, message: "Xóa sản phẩm thành công" });
    } catch (err) {
      console.error("Lỗi xóa sản phẩm admin:", err);
      return reply.code(500).send({ success: false, error: "Lỗi server khi xóa sản phẩm", detail: err.message });
    }
  });

  // POST products
  fastify.post("/products", async (req, reply) => {
    try {
      if (!req.isMultipart()) {
        return reply
          .code(400)
          .send({ error: "Dữ liệu không đúng định dạng Form" });
      }

      const data = await req.file();
      if (!data)
        return reply.code(400).send({ error: "Không tìm thấy file ảnh" });

      const name = data.fields.name?.value;
      const price = parseInt(data.fields.price?.value);
      const category_id = parseInt(data.fields.category_id?.value);
      const brand_id = parseInt(data.fields.brand_id?.value);
      const description = data.fields.description?.value || "";

      if (!name || isNaN(price)) {
        return reply.code(400).send({ error: "Tên hoặc Giá không hợp lệ" });
      }

      const result = await sql.query`
                INSERT INTO SANPHAM(name, price, category_id, brand_id, description, status)
                OUTPUT INSERTED.product_id
        VALUES(${name}, ${price}, ${category_id}, ${brand_id}, ${description}, 'active')`;

      const productId = result.recordset[0].product_id;
      const folderName = "linhkien";
      const fileName = `${Date.now()}-${data.filename.replace(/\s+/g, "-")}`;
      const dbPath = `${folderName}/${fileName}`;
      const targetDir = path.join(IMAGE_ROOT, folderName);

      if (!fs.existsSync(targetDir))
        fs.mkdirSync(targetDir, { recursive: true });
      await pump(
        data.file,
        fs.createWriteStream(path.join(targetDir, fileName)),
      );

      await sql.query`
                INSERT INTO HINHANH_SP (product_id, image_url, is_main)
                VALUES (${productId}, ${dbPath}, 1)`;

      return reply.send({ success: true, productId });
    } catch (err) {
      console.error("Lỗi:", err.message);
      return reply
        .code(500)
        .send({ error: "Lỗi server", message: err.message });
    }
  });

  // GET admin products
  fastify.get("/admin/products", async (req, reply) => {
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

  //GET product detail
  fastify.get("/product/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await sql.query`
            SELECT
            p.product_id, 
                p.name, 
                p.price,
                p.description,
                CASE 
                    WHEN h.image_url IS NOT NULL 
                    THEN CONCAT('/images/', h.image_url)
                    ELSE '/images/default-placeholder.png' 
                END AS image_url
            FROM SANPHAM p
            LEFT JOIN HINHANH_SP h 
                ON p.product_id = h.product_id AND h.is_main = 1
            WHERE p.product_id = ${id} AND p.status='active'
        `;
      res.send(result.recordset[0]); //The array contains the data rows that the query returns. This is return value begin
    } catch (err) {
      console.error(err);
      res.code(500).send({ error: "Lỗi lấy dữ liệu hiển thị" });
    }
  });

  // POST: Thêm hoặc cập nhật số lượng trong giỏ hàng
  fastify.post("/api/cart/add", async (req, reply) => {
    try {
      const { product_id, user_id, quantity } = req.body;

      // 1. Kiểm tra sản phẩm đã tồn tại trong giỏ hàng của User này chưa
      const checkResult = await sql.query`
            SELECT quantity FROM GIOHANG 
            WHERE user_id = ${user_id} AND product_id = ${product_id}`;

      if (checkResult.recordset.length > 0) {
        // 2. Nếu đã có, tiến hành UPDATE cộng dồn số lượng
        await sql.query`
                UPDATE GIOHANG 
                SET quantity = quantity + ${quantity || 1} 
                WHERE user_id = ${user_id} AND product_id = ${product_id}`;
      } else {
        // 3. Nếu chưa có, tiến hành INSERT mới
        await sql.query`
                INSERT INTO GIOHANG (user_id, product_id, quantity) 
                VALUES (${user_id}, ${product_id}, ${quantity || 1})`;
      }

      return { success: true, message: "Đã cập nhật giỏ hàng" };
    } catch (err) {
      console.error("Lỗi API Cart POST:", err.message);
      return reply
        .code(500)
        .send({ error: "Lỗi server", message: err.message });
    }
  });

  // GET: Lấy danh sách sản phẩm trong giỏ hàng theo UserID
  fastify.get("/api/cart/:user_id", async (req, reply) => {
    try {
      const { user_id } = req.params;

      const result = await sql.query`
            SELECT 
                g.product_id, 
                g.quantity, 
                p.name AS product_name, 
                p.price, 
                h.image_url
            FROM GIOHANG g
            JOIN SANPHAM p ON g.product_id = p.product_id
            LEFT JOIN HINHANH_SP h ON p.product_id = h.product_id AND h.is_main = 1
            WHERE g.user_id = ${user_id}`;

      return result.recordset;
    } catch (err) {
      console.error("Lỗi API Cart GET:", err.message);
      return reply.code(500).send({ error: "Lỗi SQL", detail: err.message });
    }
  });

  // DELETE: Xóa sản phẩm khỏi giỏ hàng
  // Sửa dòng này:
  fastify.delete("/api/cart/remove", async (req, reply) => {
    try {
      // Fastify tự bóc tách ?product_id=5&user_id=3 vào req.query
      const { product_id, user_id } = req.query;
      const pId = parseInt(product_id);
      const uId = parseInt(user_id);

      if (isNaN(pId) || isNaN(uId)) {
        return reply.code(400).send({ success: false, error: "ID không hợp lệ" });
      }

      console.log("Đang xóa SP:", pId, "của User:", uId);

      await sql.query`
            DELETE FROM GIOHANG 
            WHERE user_id = ${uId} AND product_id = ${pId}`;

      return { success: true, message: "Đã xóa xong" };
    } catch (err) {
      console.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });

  // POST: Lưu đơn hàng mua ngay
  fastify.post("/api/order", async (req, reply) => {
    try {
      let {
        user_id,
        product_id,
        quantity,
        full_name,
        phone,
        address,
        note,
        payment_method,
        status,
        total_amount,
      } = req.body;

      if (!product_id || !payment_method || !status || !total_amount) {
        return reply.code(400).send({ error: "Thiếu dữ liệu đơn hàng" });
      }

      user_id = user_id || 3;
      quantity = quantity || 1;
      full_name = full_name || "Khách hàng FullstackComputer";
      phone = phone || "";
      address = address || "";
      note = note || "";

      const result = await sql.query`
            INSERT INTO DON_HANG (
                user_id,
                product_id,
                quantity,
                full_name,
                phone,
                address,
                note,
                payment_method,
                status,
                total_amount
            )
            OUTPUT INSERTED.order_id
            VALUES (
                ${user_id},
                ${product_id},
                ${quantity},
                ${full_name},
                ${phone},
                ${address},
                ${note},
                ${payment_method},
                ${status},
                ${total_amount}
            )`;

      return { success: true, message: "Đã lưu đơn hàng", order_id: result.recordset[0].order_id };
    } catch (err) {
      console.error("Lỗi lưu đơn hàng:", err);
      return reply.code(500).send({ error: "Lỗi server khi lưu đơn hàng", detail: err.message });
    }
  });

  // GET: Lấy đơn hàng theo trạng thái (cho admin kiểm tra)
  fastify.get("/api/orders", async (req, reply) => {
    try {
      const { status } = req.query;
      let result;

      if (status) {
        result = await sql.query`
            SELECT o.*, p.name AS product_name, u.full_name AS customer_name, u.email AS customer_email
            FROM DON_HANG o
            LEFT JOIN SANPHAM p ON o.product_id = p.product_id
            LEFT JOIN NGUOIDUNG u ON o.user_id = u.user_id
            WHERE o.status = ${status}
            ORDER BY o.created_at DESC`;
      } else {
        result = await sql.query`
            SELECT o.*, p.name AS product_name, u.full_name AS customer_name, u.email AS customer_email
            FROM DON_HANG o
            LEFT JOIN SANPHAM p ON o.product_id = p.product_id
            LEFT JOIN NGUOIDUNG u ON o.user_id = u.user_id
            ORDER BY o.created_at DESC`;
      }

      return result.recordset;
    } catch (err) {
      console.error("Lỗi lấy đơn hàng:", err);
      return reply.code(500).send({ error: "Lỗi SQL", detail: err.message });
    }
  });

  // PUT: Cập nhật trạng thái đơn hàng
  fastify.put("/api/order/:id/status", async (req, reply) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(orderId) || !status) {
        return reply.code(400).send({ error: "Dữ liệu cập nhật không hợp lệ" });
      }

      await sql.query`
            UPDATE DON_HANG
            SET status = ${status}
            WHERE order_id = ${orderId}`;

      return { success: true, message: "Cập nhật trạng thái đơn hàng thành công" };
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái đơn hàng:", err);
      return reply.code(500).send({ error: "Lỗi server khi cập nhật trạng thái", detail: err.message });
    }
  });

  // Route Đăng nhập
  fastify.post("/auth/login", async (request, reply) => {
    try {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply
          .code(400)
          .send({ message: "Vui lòng nhập tài khoản và mật khẩu" });
      }

      const result = await sql.query`
            SELECT user_id, username, password AS db_password, full_name, role 
            FROM NGUOIDUNG 
            WHERE username = ${username} AND status = 'active'
        `;

      if (result.recordset.length === 0) {
        return reply.code(401).send({ message: "Tài khoản không tồn tại" });
      }

      const user = result.recordset[0];

      // --- SO SÁNH TRỰC TIẾP (KHÔNG DÙNG HASH) ---
      // LTRIM().RTRIM() để tránh lỗi khoảng trắng thừa từ SQL Server
      if (password !== user.db_password.trim()) {
        return reply.code(401).send({ message: "Mật khẩu không chính xác" });
      }

      // Ký Token vẫn giữ nguyên để chạy hệ thống
      const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      return {
        token,
        user: {
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      };
    } catch (err) {
      return reply
        .code(500)
        .send({ message: "Lỗi hệ thống", detail: err.message });
    }
  });
}

