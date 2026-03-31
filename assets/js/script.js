document.addEventListener('DOMContentLoaded', function() {
    let currentIndex = 0;
    const slides = document.querySelector('.slider');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = document.querySelectorAll('.slide').length;

    // Function to move slides
    window.moveSlide = function(step) { 
        currentIndex = (currentIndex + step + totalSlides) % totalSlides; // Vòng lặp để đảm bảo chỉ số hợp lệ
        updateSlider(); // Cập nhật slider sau khi thay đổi chỉ số
    }

    window.currentSlide = function(index) {
        currentIndex = index;
        updateSlider();
    }

    // Function to update slider position and active dot
    function updateSlider() {
        if(!slides) return; // Phòng lỗi nếu không tìm thấy slider
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

rangeMin.addEventListener('input', handleRange);
rangeMax.addEventListener('input', handleRange);
minInput.addEventListener('input', handleInput);
maxInput.addEventListener('input', handleInput);

// Khởi tạo lần đầu
updateColor();