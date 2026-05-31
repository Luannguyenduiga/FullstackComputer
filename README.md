<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Fastify_logo.svg" width="150" alt="Fastify Logo" />
</p>
<p align="center">Hệ thống thương mại điện tử bán linh kiện máy tính hiệu năng cao, xây dựng trên nền tảng Fastify với kiến trúc MVC.</p>

<p align="center">
  <a href="https://nodejs.org" target="_blank"><img src="https://img.shields.io/badge/node->=%2018.0.0-green.svg" alt="Node Version" /></a>
  <a href="https://www.fastify.io/" target="_blank"><img src="https://img.shields.io/badge/framework-Fastify%20v4-orange.svg" alt="Framework" /></a>
  <a href="https://github.com/hoangPhuc6/fullstack-computer/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Package License" /></a>
  <a href="https://github.com/hoangPhuc6/fullstack-computer/actions" target="_blank"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status" /></a>
</p>

## Giới thiệu dự án

**Fullstack Computer** là giải pháp web thương mại điện tử chuyên biệt dành cho doanh nghiệp kinh doanh máy tính, linh kiện (CPU, RAM, VGA) và thiết bị ngoại vi. 

Dự án sử dụng **Fastify** — một trong những framework Node.js nhanh nhất hiện nay với mức tiêu hao tài nguyên cực thấp, kết hợp cùng mô hình kiến trúc **MVC (Model - View - Controller)** truyền thống giúp phân tách mã nguồn rõ ràng, dễ bảo trì và mở rộng.

---

## Kiến trúc thư mục (Mô hình MVC)

Dự án tuân thủ nghiêm ngặt mô hình MVC để quản lý luồng dữ liệu và giao diện một cách tối ưu:

```text
fullstack-computer/
├── src/
│   ├── config/             # Cấu hình kết nối Cơ sở dữ liệu (SQL Server, MongoDB)
│   ├── models/             # [Model] Định nghĩa cấu trúc dữ liệu & tương tác DB
│   ├── views/              # [View] Giao diện hiển thị (EJS / Handlebars hoặc API Responses)
│   ├── controllers/        # [Controller] Xử lý Logic nghiệp vụ chính
│   ├── routes/             # Định nghĩa định tuyến API & điều hướng request
│   ├── public/             # File tĩnh (CSS, JS client, Hình ảnh sản phẩm)
│   └── app.js              # Điểm khởi chạy ứng dụng (Bootstrap Fastify)
├── .env.example            # File cấu hình mẫu môi trường
├── package.json            # Quản lý thư viện phụ thuộc
└── README.md


M (Model) & Hệ quản trị cơ sở dữ liệu
SQL Server: Lưu trữ thông tin có cấu trúc chặt chẽ như: Người dùng, Đơn hàng, Hóa đơn chi tiết nhằm đảm bảo tính toàn vẹn dữ liệu giao dịch.

MongoDB: Lưu trữ bộ sưu tập Sản phẩm (Products) với các thông số kỹ thuật đa dạng không cố định của từng linh kiện (ví dụ: CPU cần số nhân/luồng, RAM cần thông số Bus, Dung lượng).

V (View) - Giao diện
Render giao diện phía Server (Server-Side Rendering) mượt mà, tối ưu SEO vượt trội cho trang bán hàng.

Trang Admin Dashboard trực quan để theo dõi doanh thu và trạng thái đơn hàng.

C (Controller) - Xử lý Logic
Quản lý giỏ hàng, áp dụng mã giảm giá và tính toán hóa đơn tự động.

Xử lý xác thực người dùng (Authentication) an toàn với JWT và mã hóa mật khẩu bằng bcrypt
