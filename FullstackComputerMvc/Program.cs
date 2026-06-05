using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Thêm cấu hình CORS cho phép gọi từ Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Lấy connection string và tự động khởi tạo bảng DON_HANG nếu chưa có
var connectionString = app.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString))
{
    try
    {
        using (var conn = new SqlConnection(connectionString))
        {
            conn.Open();
            var checkSql = @"
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
            ";
            using (var cmd = new SqlCommand(checkSql, conn))
            {
                cmd.ExecuteNonQuery();
            }
        }
        Console.WriteLine("Database checked/initialized successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization failed: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();

// Sử dụng CORS
app.UseCors("AllowAll");

app.UseAuthorization();

app.MapStaticAssets();

// Map các API Controllers (ApiController)
app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
