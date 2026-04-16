const account = [
    {username: "admin", password: "123", role: "admin"},
    {username: "user", password: "123", role: "user"},
    {username: "staff", password: "123", role: "staff"}
];

// Dùng querySelector để lấy ĐÚNG form
const loginForm = document.querySelector(".login");

loginForm.addEventListener("submit", (e) => {
    e.preventDefault(); // CHẶN đứng dấu # và chặn load lại trang
    
    const usernameInp = document.getElementById("username").value.trim();
    const passwordInp = document.getElementById("password").value.trim();

    const checkUser = account.find(user => user.username === usernameInp && user.password === passwordInp);

    if (checkUser) {
        localStorage.setItem("user", JSON.stringify(checkUser)); 

        if (checkUser.role === "admin") {
            window.location.href = "../pages/adminpage.html";
            alert("Chào mừng bạn đến trang Quản trị viên")
        } else if (checkUser.role === "staff") {
            window.location.href = "../pages/post.html";
            alert("Chào mừng bạn đến trang Nhân viên đăng bài")
        } else {
            window.location.href = "../index.html";
        }
    } else {
        alert("Tài khoản hoặc mật khẩu không chính xác!");
    }
});

//CODE CHẶN ACCOUNT USER CLICK VÀO ADMIN PAGE
// const adminLink = document.getElementById("admin-page");
// const checkRole = JSON.parse(localStorage.getItem("user"));

// // Kiểm tra nếu có user và role là "user"
// if (checkRole && checkRole.role === "user") {
    
//     // Cách 1: Ẩn luôn cái link đó đi (User không thấy thì không nhấn được)
//     adminLink.style.display = "none";

//     // Cách 2: Chặn click (Phòng trường hợp user cố tình nhấn)
//     adminLink.addEventListener("click", (e) => {
//         e.preventDefault(); // Chặn user click
//         alert("Bạn không có quyền truy cập vào trang Admin!");
//     });
// }