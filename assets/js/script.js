document.addEventListener('DOMContentLoaded', function () {
    let currentIndex = 0;
    const slides = document.querySelector('.slider');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = document.querySelectorAll('.slide').length;

    // Function to move slides
    window.moveSlide = function (step) {
        currentIndex = (currentIndex + step + totalSlides) % totalSlides; // Vòng lặp để đảm bảo chỉ số hợp lệ
        updateSlider(); // Cập nhật slider sau khi thay đổi chỉ số
    }

    window.currentSlide = function (index) {
        currentIndex = index;
        updateSlider();
    }

    // Function to update slider position and active dot
    function updateSlider() {
        if (!slides) return; // Phòng lỗi nếu không tìm thấy slider
        slides.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    setInterval(() => moveSlide(1), 3000);
    updateSlider();
});

const rangeMin = document.getElementById('range-min');
const rangeMax = document.getElementById('range-max');
const minInput = document.getElementById('min-price-input');
const maxInput = document.getElementById('max-price-input');
const track = document.querySelector('.slider-track');
const MAX_LIMIT = 100000000;

function formatNumber(value) {
    return Number(value).toLocaleString('vi-VN');
}

function getRawValue(str) {
    return parseInt(str.toString().replace(/\D/g, "")) || 0;
}

// Cập nhật màu sắc cho đoạn nằm giữa 2 đầu kéo
function updateColor() {
    if (!rangeMin || !rangeMax || !track) return;
    let pMin = (rangeMin.value / MAX_LIMIT) * 100;
    let pMax = (rangeMax.value / MAX_LIMIT) * 100;
    track.style.background = `linear-gradient(to right, #ddd ${pMin}%, #3348bb ${pMin}%, #3348bb ${pMax}%, #ddd ${pMax}%)`;
}

// Xử lý khi kéo thanh trượt
function handleRange() {
    let vMin = parseInt(rangeMin.value);
    let vMax = parseInt(rangeMax.value);

    if (vMin > vMax) {
        // Nếu min vượt max thì ép chúng bằng nhau tùy theo cái nào đang bị tác động
        if (this.id === 'range-min') rangeMin.value = vMax;
        else rangeMax.value = vMin;
    }

    minInput.value = formatNumber(rangeMin.value);
    maxInput.value = formatNumber(rangeMax.value);
    updateColor();
}

// Xử lý khi nhập tay (chặn 100tr)
function handleInput(e) {
    let val = getRawValue(e.target.value);
    if (val > MAX_LIMIT) val = MAX_LIMIT;

    e.target.value = formatNumber(val);

    if (e.target.id === 'min-price-input') rangeMin.value = val;
    else rangeMax.value = val;

    updateColor();
}

if (rangeMin && rangeMax && minInput && maxInput) {
    rangeMin.addEventListener('input', handleRange);
    rangeMax.addEventListener('input', handleRange);
    minInput.addEventListener('input', handleInput);
    maxInput.addEventListener('input', handleInput);
}

// Hiện số lượng thông báo trong box
function updateNoticeCount() {
    const noticeBadge = document.querySelector('#notice-count');
    if (!noticeBadge) return;

    // 1. Kiểm tra xem trang này có menu thông báo không (như trang index)
    const notices = document.querySelectorAll('.notice-item');

    if (notices.length > 0) {
        // Nếu có (trang index), đếm rồi lưu vào kho
        const count = notices.length;
        noticeBadge.innerText = count;
        localStorage.setItem('savedNoticeCount', count);
        noticeBadge.style.display = 'flex';
    } else {
        // Nếu không có (trang product), vào kho lấy số đã lưu ra dùng
        const savedCount = localStorage.getItem('savedNoticeCount');
        if (savedCount && savedCount !== "0") {
            noticeBadge.innerText = savedCount;
            noticeBadge.style.display = 'flex';
        } else {
            noticeBadge.style.display = 'none';
        }
    }
}

// Gọi hàm này sau khi trang web đã load xong
document.addEventListener('DOMContentLoaded', () => {
    updateNoticeCount();
});

document.addEventListener('DOMContentLoaded', function () {
    // Chạy hàm updateColor nếu có
    if (typeof updateColor === "function") updateColor();

    const cartDropdown = document.getElementById('cartDropdown');
    const cartContent = document.querySelector('.cart-dropdown-content');

    if (cartDropdown && cartContent) {
        cartDropdown.addEventListener('click', function (e) {
            // Kiểm tra nếu click trúng vào nội dung dropdown thì không làm gì
            if (e.target.closest('.cart-dropdown-content')) return;

            // Ngăn chặn chuyển trang shopping.html khi click vào icon
            e.preventDefault();
            e.stopPropagation();

            cartContent.classList.toggle('show');
        });
    }

    // Đóng giỏ hàng khi click ra ngoài
    window.addEventListener('click', function () {
        if (cartContent && cartContent.classList.contains('show')) {
            cartContent.classList.remove('show');
        }
    });
});

// Đảm bảo hàm này KHÔNG nằm trong một hàm khác (như initApp)
window.addToCart = async function (productId, name, price) {
    const userId = 3;
    console.log("Đang thêm sản phẩm:", productId); // Để debug kiểm tra nút có ăn không

    try {
        const response = await fetch('http://localhost:3000/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                user_id: userId,
                quantity: 1
            })
        });

        const result = await response.json();

        if (result.success) {
            await loadCartToSidebar(); // Cập nhật lại giao diện dropdown
            alert(`Đã thêm ${name} vào giỏ hàng!`);
        }
    } catch (error) {
        console.error("Lỗi khi thêm vào giỏ:", error);
    }
};

// Hàm xóa sản phẩm trong giỏ hàng
window.removeFromCart = async function (event, productId) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const userId = 2;
    
    try {
        // Đường dẫn gốc là /api/cart/remove, sau đó mới nối đuôi ? vào
        const url = `http://localhost:3000/api/cart/remove?product_id=${productId}&user_id=${userId}`;

        const response = await fetch(url, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            console.log("Xóa thành công trên DB");
            await loadCartToSidebar(); // Vẽ lại giao diện
        }
    } catch (error) {
        console.error("Lỗi:", error);
    }
};


// Khởi tạo lần đầu
if (rangeMin) {
    updateColor();
}