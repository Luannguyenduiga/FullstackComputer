using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace FullstackComputerMvc.Controllers
{
    [ApiController]
    public class ApiController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public ApiController(IConfiguration configuration, IWebHostEnvironment webHostEnvironment)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
            _webHostEnvironment = webHostEnvironment;
        }

        #region Helpers for Database Access

        private async Task<List<Dictionary<string, object>>> QueryAsync(string sql, params SqlParameter[] parameters)
        {
            var list = new List<Dictionary<string, object>>();
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand(sql, conn))
                {
                    if (parameters != null)
                    {
                        cmd.Parameters.AddRange(parameters);
                    }
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            var row = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                var name = reader.GetName(i);
                                var val = reader.GetValue(i);
                                row[name] = val == DBNull.Value ? null! : val;
                            }
                            list.Add(row);
                        }
                    }
                }
            }
            return list;
        }

        private async Task<int> ExecuteAsync(string sql, params SqlParameter[] parameters)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand(sql, conn))
                {
                    if (parameters != null)
                    {
                        cmd.Parameters.AddRange(parameters);
                    }
                    return await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        private async Task<object?> ExecuteScalarAsync(string sql, params SqlParameter[] parameters)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand(sql, conn))
                {
                    if (parameters != null)
                    {
                        cmd.Parameters.AddRange(parameters);
                    }
                    var result = await cmd.ExecuteScalarAsync();
                    return result == DBNull.Value ? null : result;
                }
            }
        }

        #endregion

        // 1. GET /products
        [HttpGet("/products")]
        public async Task<IActionResult> GetProducts()
        {
            try
            {
                var sql = @"
                    SELECT 
                        p.product_id, p.name, p.price,
                        CASE 
                            WHEN h.image_url IS NOT NULL THEN CONCAT('/images/', h.image_url)
                            ELSE '/images/default-placeholder.png' 
                        END AS image_url
                    FROM SANPHAM p
                    LEFT JOIN HINHANH_SP h ON p.product_id = h.product_id AND h.is_main = 1
                    WHERE p.status='active'
                    ORDER BY p.product_id DESC";

                var results = await QueryAsync(sql);
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi lấy dữ liệu hiển thị", detail = ex.Message });
            }
        }

        // 2. GET /products/category/{id}
        [HttpGet("/products/category/{id}")]
        public async Task<IActionResult> GetProductsByCategory(int id)
        {
            try
            {
                var sql = @"
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
                    WHERE p.category_id = @id AND p.status = 'active'
                    ORDER BY p.product_id DESC";

                var results = await QueryAsync(sql, new SqlParameter("@id", id));
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi lấy dữ liệu hiển thị", detail = ex.Message });
            }
        }

        // 3. GET /edit/product/{id}
        [HttpGet("/edit/product/{id}")]
        public async Task<IActionResult> GetEditProduct(int id)
        {
            try
            {
                var sql = @"
                    SELECT 
                        p.product_id,
                        p.name,
                        p.price,
                        p.description,
                        h.image_url
                    FROM SANPHAM p
                    JOIN HINHANH_SP h ON p.product_id = h.product_id
                    WHERE p.product_id = @id";

                var results = await QueryAsync(sql, new SqlParameter("@id", id));
                if (results.Count == 0)
                {
                    return NotFound(new { error = "Không tìm thấy sản phẩm" });
                }
                return Ok(results[0]);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi lấy dữ liệu sản phẩm", detail = ex.Message });
            }
        }

        // 4. PUT /update/product/{id} (Supports JSON & Form-Data)
        [HttpPut("/update/product/{id}")]
        public async Task<IActionResult> UpdateProduct(int id)
        {
            try
            {
                string name = "";
                decimal price = 0;
                string description = "";

                if (Request.HasFormContentType)
                {
                    var form = await Request.ReadFormAsync();
                    name = form["name"].ToString();
                    _ = decimal.TryParse(form["price"].ToString(), out price);
                    description = form["description"].ToString() ?? "";
                }
                else
                {
                    using var reader = new StreamReader(Request.Body);
                    var body = await reader.ReadToEndAsync();
                    if (!string.IsNullOrEmpty(body))
                    {
                        var json = JsonDocument.Parse(body);
                        if (json.RootElement.TryGetProperty("name", out var nameProp)) name = nameProp.GetString() ?? "";
                        if (json.RootElement.TryGetProperty("price", out var priceProp))
                        {
                            if (priceProp.ValueKind == JsonValueKind.Number) price = priceProp.GetDecimal();
                            else decimal.TryParse(priceProp.GetString(), out price);
                        }
                        if (json.RootElement.TryGetProperty("description", out var descProp)) description = descProp.GetString() ?? "";
                    }
                }

                await ExecuteAsync(@"
                    UPDATE SANPHAM
                    SET name = @name, 
                        price = @price, 
                        description = @description
                    WHERE product_id = @id",
                    new SqlParameter("@name", name),
                    new SqlParameter("@price", price),
                    new SqlParameter("@description", description),
                    new SqlParameter("@id", id));

                return Ok(new { success = true, message = "Cập nhật thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi server khi cập nhật", detail = ex.Message });
            }
        }

        // 5. DELETE /api/product/{id}
        [HttpDelete("/api/product/{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            try
            {
                // Lấy danh sách ảnh trước khi xóa để xóa file vật lý
                var images = await QueryAsync("SELECT image_url FROM HINHANH_SP WHERE product_id = @id", new SqlParameter("@id", id));

                // 1. Xóa sản phẩm khỏi giỏ hàng
                await ExecuteAsync("DELETE FROM GIOHANG WHERE product_id = @id", new SqlParameter("@id", id));
                
                // 2. Xóa các hình ảnh liên kết
                await ExecuteAsync("DELETE FROM HINHANH_SP WHERE product_id = @id", new SqlParameter("@id", id));
                
                // 3. Xóa sản phẩm
                await ExecuteAsync("DELETE FROM SANPHAM WHERE product_id = @id", new SqlParameter("@id", id));

                // Xóa file vật lý
                foreach (var img in images)
                {
                    if (img.TryGetValue("image_url", out var imgUrlObj) && imgUrlObj is string imgUrl)
                    {
                        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "images", imgUrl);
                        if (System.IO.File.Exists(filePath))
                        {
                            try { System.IO.File.Delete(filePath); } catch { /* Ignore file delete error */ }
                        }
                    }
                }

                return Ok(new { success = true, message = "Xóa sản phẩm thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Lỗi server khi xóa sản phẩm", detail = ex.Message });
            }
        }

        // 6. POST /products
        [HttpPost("/products")]
        public async Task<IActionResult> CreateProduct()
        {
            try
            {
                if (!Request.HasFormContentType)
                {
                    return BadRequest(new { error = "Dữ liệu không đúng định dạng Form" });
                }

                var form = await Request.ReadFormAsync();
                var file = form.Files.GetFile("image") ?? (form.Files.Count > 0 ? form.Files[0] : null);
                if (file == null)
                {
                    return BadRequest(new { error = "Không tìm thấy file ảnh" });
                }

                var name = form["name"].ToString();
                _ = decimal.TryParse(form["price"].ToString(), out var price);
                _ = int.TryParse(form["category_id"].ToString(), out var categoryId);
                _ = int.TryParse(form["brand_id"].ToString(), out var brandId);
                var description = form["description"].ToString() ?? "";

                if (string.IsNullOrEmpty(name) || price <= 0)
                {
                    return BadRequest(new { error = "Tên hoặc Giá không hợp lệ" });
                }

                var productIdObj = await ExecuteScalarAsync(@"
                    INSERT INTO SANPHAM(name, price, category_id, brand_id, description, status)
                    OUTPUT INSERTED.product_id
                    VALUES(@name, @price, @categoryId, @brandId, @description, 'active')",
                    new SqlParameter("@name", name),
                    new SqlParameter("@price", price),
                    new SqlParameter("@categoryId", categoryId),
                    new SqlParameter("@brandId", brandId),
                    new SqlParameter("@description", description));

                if (productIdObj == null)
                {
                    return StatusCode(500, new { error = "Lỗi chèn sản phẩm vào CSDL" });
                }

                var productId = Convert.ToInt32(productIdObj);
                var folderName = "linhkien";
                var cleanFileName = file.FileName.Replace(" ", "-");
                var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{cleanFileName}";
                var dbPath = $"{folderName}/{fileName}";
                var targetDir = Path.Combine(_webHostEnvironment.WebRootPath, "images", folderName);

                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                }

                var filePath = Path.Combine(targetDir, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                await ExecuteAsync(@"
                    INSERT INTO HINHANH_SP (product_id, image_url, is_main)
                    VALUES (@productId, @imageUrl, 1)",
                    new SqlParameter("@productId", productId),
                    new SqlParameter("@imageUrl", dbPath));

                return Ok(new { success = true, productId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi server", message = ex.Message });
            }
        }

        // 7. GET /admin/products
        [HttpGet("/admin/products")]
        public async Task<IActionResult> GetAdminProducts()
        {
            try
            {
                var sql = @"
                    SELECT 
                        p.product_id, p.name AS product_name, p.price, p.status,
                        p.description, p.discount_price, d.name AS category_name, h.name AS brand_name 
                    FROM SANPHAM p
                    LEFT JOIN DANHMUC d ON p.category_id = d.category_id
                    LEFT JOIN HANG h ON p.brand_id = h.brand_id
                    ORDER BY p.product_id DESC";

                var results = await QueryAsync(sql);
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi SQL", detail = ex.Message });
            }
        }

        // 8. GET /product/{id}
        [HttpGet("/product/{id}")]
        public async Task<IActionResult> GetProductDetail(int id)
        {
            try
            {
                var sql = @"
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
                    LEFT JOIN HINHANH_SP h ON p.product_id = h.product_id AND h.is_main = 1
                    WHERE p.product_id = @id AND p.status='active'";

                var results = await QueryAsync(sql, new SqlParameter("@id", id));
                if (results.Count == 0)
                {
                    return NotFound(new { error = "Không tìm thấy sản phẩm" });
                }
                return Ok(results[0]);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi lấy dữ liệu hiển thị", detail = ex.Message });
            }
        }

        // 9. POST /api/cart/add
        [HttpPost("/api/cart/add")]
        public async Task<IActionResult> AddToCart([FromBody] CartRequest request)
        {
            try
            {
                var checkResult = await QueryAsync(@"
                    SELECT quantity FROM GIOHANG 
                    WHERE user_id = @userId AND product_id = @productId",
                    new SqlParameter("@userId", request.user_id),
                    new SqlParameter("@productId", request.product_id));

                if (checkResult.Count > 0)
                {
                    var currentQty = Convert.ToInt32(checkResult[0]["quantity"]);
                    var addQty = request.quantity ?? 1;
                    await ExecuteAsync(@"
                        UPDATE GIOHANG 
                        SET quantity = quantity + @addQty 
                        WHERE user_id = @userId AND product_id = @productId",
                        new SqlParameter("@addQty", addQty),
                        new SqlParameter("@userId", request.user_id),
                        new SqlParameter("@productId", request.product_id));
                }
                else
                {
                    var addQty = request.quantity ?? 1;
                    await ExecuteAsync(@"
                        INSERT INTO GIOHANG (user_id, product_id, quantity) 
                        VALUES (@userId, @productId, @addQty)",
                        new SqlParameter("@userId", request.user_id),
                        new SqlParameter("@productId", request.product_id),
                        new SqlParameter("@addQty", addQty));
                }

                return Ok(new { success = true, message = "Đã cập nhật giỏ hàng" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi server", message = ex.Message });
            }
        }

        // 10. GET /api/cart/{userId}
        [HttpGet("/api/cart/{userId}")]
        public async Task<IActionResult> GetCart(int userId)
        {
            try
            {
                var sql = @"
                    SELECT 
                        g.product_id, 
                        g.quantity, 
                        p.name AS product_name, 
                        p.price, 
                        h.image_url
                    FROM GIOHANG g
                    JOIN SANPHAM p ON g.product_id = p.product_id
                    LEFT JOIN HINHANH_SP h ON p.product_id = h.product_id AND h.is_main = 1
                    WHERE g.user_id = @userId";

                var results = await QueryAsync(sql, new SqlParameter("@userId", userId));
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi SQL", detail = ex.Message });
            }
        }

        // 11. DELETE /api/cart/remove
        [HttpDelete("/api/cart/remove")]
        public async Task<IActionResult> RemoveFromCart([FromQuery] int product_id, [FromQuery] int user_id)
        {
            try
            {
                await ExecuteAsync(@"
                    DELETE FROM GIOHANG 
                    WHERE user_id = @userId AND product_id = @productId",
                    new SqlParameter("@userId", user_id),
                    new SqlParameter("@productId", product_id));

                return Ok(new { success = true, message = "Đã xóa xong" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // 12. POST /api/order
        [HttpPost("/api/order")]
        public async Task<IActionResult> CreateOrder([FromBody] OrderRequest request)
        {
            try
            {
                if (request.product_id <= 0 || string.IsNullOrEmpty(request.payment_method) || 
                    string.IsNullOrEmpty(request.status) || request.total_amount <= 0)
                {
                    return BadRequest(new { error = "Thiếu dữ liệu đơn hàng" });
                }

                var userId = request.user_id ?? 3;
                var quantity = request.quantity ?? 1;
                var fullName = request.full_name ?? "Khách hàng FullstackComputer";
                var phone = request.phone ?? "";
                var address = request.address ?? "";
                var note = request.note ?? "";

                var orderIdObj = await ExecuteScalarAsync(@"
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
                        @userId,
                        @productId,
                        @quantity,
                        @fullName,
                        @phone,
                        @address,
                        @note,
                        @paymentMethod,
                        @status,
                        @totalAmount
                    )",
                    new SqlParameter("@userId", userId),
                    new SqlParameter("@productId", request.product_id),
                    new SqlParameter("@quantity", quantity),
                    new SqlParameter("@fullName", fullName),
                    new SqlParameter("@phone", phone),
                    new SqlParameter("@address", address),
                    new SqlParameter("@note", note),
                    new SqlParameter("@paymentMethod", request.payment_method),
                    new SqlParameter("@status", request.status),
                    new SqlParameter("@totalAmount", request.total_amount));

                if (orderIdObj == null)
                {
                    return StatusCode(500, new { error = "Lỗi lưu đơn hàng" });
                }

                return Ok(new { success = true, message = "Đã lưu đơn hàng", order_id = Convert.ToInt32(orderIdObj) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi server khi lưu đơn hàng", detail = ex.Message });
            }
        }

        // 13. GET /api/orders
        [HttpGet("/api/orders")]
        public async Task<IActionResult> GetOrders([FromQuery] string? status)
        {
            try
            {
                string sql;
                List<Dictionary<string, object>> results;

                if (!string.IsNullOrEmpty(status))
                {
                    sql = @"
                        SELECT o.*, p.name AS product_name, u.full_name AS customer_name, u.email AS customer_email
                        FROM DON_HANG o
                        LEFT JOIN SANPHAM p ON o.product_id = p.product_id
                        LEFT JOIN NGUOIDUNG u ON o.user_id = u.user_id
                        WHERE o.status = @status
                        ORDER BY o.created_at DESC";
                    results = await QueryAsync(sql, new SqlParameter("@status", status));
                }
                else
                {
                    sql = @"
                        SELECT o.*, p.name AS product_name, u.full_name AS customer_name, u.email AS customer_email
                        FROM DON_HANG o
                        LEFT JOIN SANPHAM p ON o.product_id = p.product_id
                        LEFT JOIN NGUOIDUNG u ON o.user_id = u.user_id
                        ORDER BY o.created_at DESC";
                    results = await QueryAsync(sql);
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi SQL", detail = ex.Message });
            }
        }

        // 14. PUT /api/order/{id}/status
        [HttpPut("/api/order/{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] OrderStatusRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.status))
                {
                    return BadRequest(new { error = "Dữ liệu cập nhật không hợp lệ" });
                }

                await ExecuteAsync(@"
                    UPDATE DON_HANG
                    SET status = @status
                    WHERE order_id = @orderId",
                    new SqlParameter("@status", request.status),
                    new SqlParameter("@orderId", id));

                return Ok(new { success = true, message = "Cập nhật trạng thái đơn hàng thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi server khi cập nhật trạng thái", detail = ex.Message });
            }
        }

        // 15. POST /auth/login
        [HttpPost("/auth/login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.username) || string.IsNullOrEmpty(request.password))
                {
                    return BadRequest(new { message = "Vui lòng nhập tài khoản và mật khẩu" });
                }

                var sql = @"
                    SELECT user_id, username, password AS db_password, full_name, role 
                    FROM NGUOIDUNG 
                    WHERE username = @username AND status = 'active'";

                var results = await QueryAsync(sql, new SqlParameter("@username", request.username));
                if (results.Count == 0)
                {
                    return Unauthorized(new { message = "Tài khoản không tồn tại" });
                }

                var user = results[0];
                var dbPassword = user["db_password"]?.ToString() ?? "";

                if (request.password != dbPassword.Trim())
                {
                    return Unauthorized(new { message = "Mật khẩu không chính xác" });
                }

                // Ký Token tương thích client decode payload bằng JWT
                var jwtSecret = "fullstack-computer-secret-2026";
                var key = Encoding.UTF8.GetBytes(jwtSecret.PadRight(32, '\0'));
                var credentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature);
                var header = new JwtHeader(credentials);
                
                var payload = new JwtPayload
                {
                    { "user_id", Convert.ToInt32(user["user_id"]) },
                    { "role", user["role"]?.ToString() ?? "" },
                    { "exp", (int)(DateTime.UtcNow.AddDays(7) - new DateTime(1970, 1, 1)).TotalSeconds }
                };

                var secToken = new JwtSecurityToken(header, payload);
                var token = new JwtSecurityTokenHandler().WriteToken(secToken);

                return Ok(new
                {
                    token,
                    user = new
                    {
                        username = user["username"]?.ToString(),
                        full_name = user["full_name"]?.ToString(),
                        role = user["role"]?.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", detail = ex.Message });
            }
        }
    }

    #region Data Transfer Objects (DTOs)

    public class CartRequest
    {
        public int product_id { get; set; }
        public int user_id { get; set; }
        public int? quantity { get; set; }
    }

    public class OrderRequest
    {
        public int? user_id { get; set; }
        public int product_id { get; set; }
        public int? quantity { get; set; }
        public string? full_name { get; set; }
        public string? phone { get; set; }
        public string? address { get; set; }
        public string? note { get; set; }
        public string? payment_method { get; set; }
        public string? status { get; set; }
        public decimal total_amount { get; set; }
    }

    public class OrderStatusRequest
    {
        public string status { get; set; } = "";
    }

    public class LoginRequest
    {
        public string username { get; set; } = "";
        public string password { get; set; } = "";
    }

    #endregion
}
