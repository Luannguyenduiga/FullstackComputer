/**
 * Hàm render sản phẩm theo danh mục
 * @param {number} categoryId - ID của danh mục trong Database
 * @param {string} elementId - ID của thẻ div chứa grid trên HTML
 * @param {number} limit - Số lượng sản phẩm muốn hiển thị (mặc định là tất cả)
 */
async function fetchAndRender(categoryId, elementId, limit = null) {
    const grid = document.getElementById(elementId);
    if (!grid) return; // Nếu không tìm thấy ID trên trang thì bỏ qua

    try {
        // Gọi đến API Fastify bạn vừa viết
        const response = await fetch(`http://localhost:3000/products/category/${categoryId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        let products = await response.json();

        // Nếu có yêu cầu giới hạn số lượng 
        if (limit) {
            products = products.slice(0, limit);
        }

        // Render HTML vào Grid
        grid.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="http://localhost:3000${product.image_url}" alt="${product.image_url}"> 
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="price">${Number(product.price).toLocaleString()}₫</p>
                    <button class="btn-buy" data-id="${product.id}">
                        Thêm vào giỏ hàng
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error(`Lỗi khi load Grid [${elementId}]:`, error);
        grid.innerHTML = `<p class="error-msg">Không thể tải dữ liệu cho danh mục này.</p>`;
    }
}

// Hàm khởi chạy chính khi trang web load xong
async function initApp() {
    console.log("Đang khởi tạo dữ liệu sản phẩm...");

    // 1. Render Top 3 Bán chạy (Giả định Category 3 là Linh kiện, 2 là Laptop)
    await fetchAndRender(3, 'linhkienGridPr', 3); // 3 sản phẩm bán chạy nhất của Linh Kiện
    await fetchAndRender(2, 'laptopGridPr', 3); // 3 sản phẩm bán chạy nhất của Laptop
    await fetchAndRender(1, 'dienthoaiGridPr', 3); // 3 sản phẩm bán chạy nhất của Điện thoại
    // 2. Render Danh sách Linh Kiện (Category 3)
    await fetchAndRender(3, 'linhkienGrid',4);
    await fetchAndRender(3, 'linhkienGrid1'); // Hiện ảnh bên trang Product
    // 3. Render Các loại Laptop (Category 2)
    await fetchAndRender(2, 'laptopAigrid',4);
    await fetchAndRender(2, 'laptopGamingGrid',4);
    await fetchAndRender(2, 'laptopVPgrid',4);
    // Hiện ảnh bên trang Product
    await fetchAndRender(2, 'laptopAigrid1');
    await fetchAndRender(2, 'laptopGamingGrid1');
    await fetchAndRender(2, 'laptopVPgrid1');
    // 4. Render Danh sách Điện Thoại (Category 1)
    await fetchAndRender(1, 'dienthoaiGrid');
    await fetchAndRender(1, 'dienthoaiGrid1'); // Hiện ảnh bên trang Product
}

// 1. Tạo biến lưu trữ giỏ hàng (State)
let cart = []; 

// 2. Chọn phần tử hiển thị số lượng (Cái badge màu đỏ của bạn)
const cartBadge = document.querySelector("#shopping-cart");

// 3. Hàm cập nhật giao diện số lượng
function updateCartBadge() {
    // Tính tổng số lượng item trong giỏ
    cartBadge.innerText = cart.length; 
    
   // hiệu ứng
    cartBadge.classList.add("bump");
    setTimeout(() => cartBadge.classList.remove("bump"), 300);
}

// 4. Lắng nghe sự kiện (Dùng Event Delegation để tối ưu hiệu năng)
document.addEventListener("click", function(e) {
    if (e.target && e.target.classList.contains("btn-buy")) {
        const productId = e.target.getAttribute("data-id");
        
        // Thêm sản phẩm vào mảng (tạm thời thêm ID)
        cart.push(productId);
        
        // Gọi hàm cập nhật số
        updateCartBadge();
        
        console.log("Giỏ hàng hiện tại:", cart);
    }
});

// Chạy hàm khởi tạo
document.addEventListener('DOMContentLoaded', initApp);