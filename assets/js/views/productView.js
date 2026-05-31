window.getApiBase = window.getApiBase || function() {
    return (window.location.origin.includes('127.0.0.1') || window.location.origin.includes('localhost:5500')) ? 'http://localhost:3000' : '';
};

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
        const response = await fetch(`${window.getApiBase()}/products/category/${categoryId}`);
        if (!response.ok) throw new Error('Network response was not ok');

        let products = await response.json();

        // Nếu có yêu cầu giới hạn số lượng 
        if (limit) {
            products = products.slice(0, limit);
        }

        // Render HTML vào Grid
        grid.innerHTML = products.map(product => `
            <div class="product-link" onclick="window.open('../../pages/detailproduct.html?id=${product.product_id}', '_blank')">
                <div class="product-card">
                    <div class="product-image">
                        <img src="${window.getApiBase()}${product.image_url}" alt="${product.image_url}"> 
                    </div>
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p class="price">${Number(product.price).toLocaleString()}₫</p>
                        <button class="btn-buy" 
                        onclick="event.stopPropagation(); addToCart('${product.product_id}', '${product.name}', ${product.price})">
                            Thêm vào giỏ hàng
                        </button>
                    </div>
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
    await fetchAndRender(4, 'headphoneGridPr', 3); // 3 sản phẩm bán chạy nhất của Linh Kiện
    await fetchAndRender(3, 'linhkienGridPr', 3); // 3 sản phẩm bán chạy nhất của Linh Kiện
    await fetchAndRender(2, 'laptopGridPr', 3); // 3 sản phẩm bán chạy nhất của Laptop
    await fetchAndRender(1, 'dienthoaiGridPr', 3); // 3 sản phẩm bán chạy nhất của Điện thoại
    // 2. Render Danh sách Linh Kiện (Category 3)
    await fetchAndRender(3, 'linhkienGrid', 4);
    await fetchAndRender(3, 'linhkienGrid1'); // Hiện ảnh bên trang Product
    // 3. Render Các loại Laptop (Category 2)
    await fetchAndRender(2, 'laptopAigrid', 4);
    await fetchAndRender(2, 'laptopGamingGrid', 4);
    await fetchAndRender(2, 'laptopVPgrid', 4);
    // Hiện ảnh bên trang Product
    await fetchAndRender(2, 'laptopAigrid1');
    await fetchAndRender(2, 'laptopGamingGrid1');
    await fetchAndRender(2, 'laptopVPgrid1');
    // 4. Render Danh sách Điện Thoại (Category 1)
    await fetchAndRender(1, 'dienthoaiGrid');
    await fetchAndRender(1, 'dienthoaiGrid1'); // Hiện ảnh bên trang Product
    // 5. Render Danh sách Headphone (Category 4)
    await fetchAndRender(4, 'headphoneGrid');
    await fetchAndRender(4, 'headphoneGrid1'); // Hiện ảnh bên trang Product
}

//Render sản phẩm chi tiết khi nhấn vào
// Lấy id từ URL
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

async function loadProductDetail() {
    try {
        const res = await fetch(`${window.getApiBase()}/product/${productId}`);
        const product = await res.json();

        const container = document.querySelector(".product.inform");

        if (!product) {
            container.innerHTML = "<p>Không tìm thấy sản phẩm</p>";
            return;
        }

        container.innerHTML = `
            <div class="row">
                <!-- Cột ảnh -->
                <div class="col-6">
                    <div class="product-detail-image">
                        <img src="${window.getApiBase()}${product.image_url}" alt="${product.name}">
                    </div>
                </div>

                <!-- Information Product -->
                <div class="col-6">
                    <div class="product-detail-info">
                        <h1>${product.name}</h1>

                        <p class="price" style="font-size: 28px; color: red;">
                            ${Number(product.price).toLocaleString()}₫
                        </p>

                        <p class="description">
                            ${product.description || "Chưa có mô tả"}
                        </p>
                        <a>Chi tiết sản phẩm</a>
                        <br>
                        <button class="btn-buy-cart" data-id="${product.product_id}">
                            Mua Ngay
                        </button>
                        <button class="btn-add-cart" id="btn-detail-add-cart">
                            Thêm vào giỏ hàng
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Gắn sự kiện "Thêm vào giỏ hàng" một cách an toàn bằng addEventListener
        const btnAddCart = container.querySelector('#btn-detail-add-cart');
        if (btnAddCart) {
            btnAddCart.addEventListener('click', function(e) {
                e.stopPropagation();
                if (typeof window.addToCart === 'function') {
                    window.addToCart(product.product_id, product.name, product.price);
                } else {
                    alert("Lỗi: Không tìm thấy hàm addToCart. Bạn hãy kiểm tra đã chèn file script.js vào detailproduct.html chưa?");
                }
            });
        }
    } catch (err) {
        console.error("Lỗi load detail:", err);
        document.querySelector(".product.inform").innerHTML = "<p>Lỗi tải sản phẩm</p>";
    }
}

loadProductDetail();

function updateCartBadgeCount(count) {
    // Tìm badge của giỏ hàng (trong shopping-wrapper)
    const cartBadge = document.querySelector('.shopping-wrapper .cart-badge') || document.querySelector('.cart-icon-container .cart-badge:not(#notice-count)');
    if (!cartBadge) return;
    
    if (count > 0) {
        cartBadge.innerText = count;
        cartBadge.style.display = 'flex';
        cartBadge.classList.add("bump");
        setTimeout(() => cartBadge.classList.remove("bump"), 300);
    } else {
        cartBadge.style.display = 'none';
        cartBadge.innerText = 0;
    }
}

async function loadCartToSidebar() {
    const cartDiv = document.querySelector('.product-shopping');
    const cartEmpty = document.querySelector('.cart-empty');

    // Giả sử bạn thêm 1 cái p để hiện thông báo trống
    const emptyMsg = cartEmpty.querySelector('p');
    const emptyImg = cartEmpty.querySelector('img');

    const userId = 3;
    const res = await fetch(`${window.getApiBase()}/api/cart/${userId}`);
    const cartItems = await res.json();

    let totalQty = 0;

    if (cartItems.length > 0) {
        cartItems.forEach(item => {
            totalQty += item.quantity;
        });

        // Có hàng: Ẩn hình ảnh & chữ trống trải
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (emptyImg) emptyImg.style.display = 'none';

        cartDiv.innerHTML = cartItems.map(item => `
            <div class="cart-item">
                <img src="${window.getApiBase()}/${item.image_url}" alt="${item.product_name}">
                <div class="cart-item-info">
                    <p class="name">${item.product_name}</p>
                    <p class="price">${Number(item.price).toLocaleString()}₫ x ${item.quantity}</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(event,'${item.product_id}')">×</button>
            </div>
        `).join('');
    } else {
        // Trống: Hiện lại thông báo
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (emptyImg) emptyImg.style.display = 'block';
        if (cartDiv) cartDiv.innerHTML = "";
    }

    // Cập nhật số lượng trên giỏ hàng
    updateCartBadgeCount(totalQty);


}


// Chạy hàm khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadCartToSidebar();
});

// Sự kiện cho nút "Mua Ngay"
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('btn-buy-cart')) {
        const productId = e.target.getAttribute('data-id');
        showPaymentModal(productId);
    }
});

async function showPaymentModal(productId) {
    try {
        const res = await fetch(`${window.getApiBase()}/product/${productId}`);
        const product = await res.json();
        
        let modal = document.getElementById('payment-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'payment-modal';
            document.body.appendChild(modal);
        }
        
        // Tạo mã QR VietQR (Dùng thông tin tài khoản MB Bank mẫu)
        const qrUrl = `https://img.vietqr.io/image/mbbank-0933475753-compact2.jpg?amount=${product.price}&addInfo=Thanh toan don hang SP${productId}&accountName=LUAN NGUYEN`;
        
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content-pay">
                <button class="close-modal">&times;</button>
                <div class="pay-header">
                    <i class="fa-solid fa-circle-check" style="color: #4CAF50; font-size: 40px;"></i>
                    <h2>Hóa Đơn Thanh Toán</h2>
                </div>
                <div class="bill-details">
                    <div class="bill-row">
                        <span>Sản phẩm:</span>
                        <strong>${product.name}</strong>
                    </div>
                    <div class="bill-row">
                        <span>Số lượng:</span>
                        <strong>1</strong>
                    </div>
                    <div class="bill-row total-row">
                        <span>Tổng tiền:</span>
                        <strong class="total-price">${Number(product.price).toLocaleString()}₫</strong>
                    </div>
                </div>
                <div class="qr-section">
                    <p>Quét mã QR bằng ứng dụng ngân hàng</p>
                    <div class="qr-box">
                        <img id="bill-qr-code" src="${qrUrl}" alt="Mã QR Thanh Toán" />
                    </div>
                    <p class="qr-hint">Hệ thống sẽ tự động xác nhận sau khi nhận được thanh toán.</p>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Close event
        modal.querySelector('.close-modal').onclick = () => modal.classList.remove('active');
        modal.querySelector('.modal-overlay').onclick = () => modal.classList.remove('active');
    } catch(err) {
        console.error("Lỗi show bill:", err);
        alert("Lỗi không thể tải thông tin thanh toán!");
    }
}