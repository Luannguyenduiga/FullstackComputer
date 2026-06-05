/**
 * ============================================================
 * auth.js – Module xác thực JWT dùng chung
 * Đặt tại: assets/js/auth.js
 * ============================================================
 * SO SÁNH:
 * ❌ Trước: Không có auth, user_id hardcode = 3
 * ✅ Sau:   JWT token từ localStorage, user info tự động
 * ============================================================
 */

const Auth = (() => {
    const TOKEN_KEY = 'fsc_token';
    const USER_KEY  = 'fsc_user';

    /** Lưu token + user sau khi login thành công */
    function saveSession(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    /** Lấy JWT token */
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /** Decode JWT payload (không verify signature – chỉ dùng client-side) */
    function decodeToken(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }

    /** Kiểm tra token còn hạn không */
    function isTokenValid() {
        const token = getToken();
        if (!token) return false;
        const payload = decodeToken(token);
        if (!payload) return false;
        return payload.exp * 1000 > Date.now();
    }

    /** Lấy thông tin user hiện tại */
    function getCurrentUser() {
        if (!isTokenValid()) return null;
        try {
            return JSON.parse(localStorage.getItem(USER_KEY));
        } catch {
            return null;
        }
    }

    /** Lấy user_id – thay thế hardcode userId = 3 */
    function getUserId() {
        const user = getCurrentUser();
        return user ? user.user_id : null;
    }

    /** Lấy role (admin / user) */
    function getRole() {
        const token = getToken();
        if (!token) return null;
        const payload = decodeToken(token);
        return payload ? payload.role : null;
    }

    /** Headers chuẩn cho mọi fetch request có auth */
    function authHeaders(extra = {}) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            ...extra
        };
    }

    /** Đăng xuất */
    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '//Home/Login';
    }

    /**
     * Bảo vệ trang – redirect nếu chưa đăng nhập
     * Dùng trong đầu mỗi trang cần auth:
     *   Auth.requireLogin();
     */
    function requireLogin() {
        if (!isTokenValid()) {
            window.location.href = '//Home/Login?redirect=' + encodeURIComponent(window.location.href);
        }
    }

    /**
     * Bảo vệ trang admin – redirect nếu không phải admin
     * Dùng trong adminpage.html:
     *   Auth.requireAdmin();
     */
    function requireAdmin() {
        requireLogin();
        if (getRole() !== 'admin') {
            alert('Bạn không có quyền truy cập trang này!');
            window.location.href = '//Home/Index';
        }
    }

    /** Cập nhật UI header (tên user, avatar) */
    function updateHeaderUI() {
        const user = getCurrentUser();
        const userNameEl = document.querySelector('.user-display-name');
        const loginLinkEl = document.querySelector('.login-link');
        const logoutBtnEl = document.querySelector('.logout-btn');

        if (user && userNameEl) {
            userNameEl.textContent = user.full_name || user.username;
        }
        if (loginLinkEl) {
            loginLinkEl.style.display = user ? 'none' : 'block';
        }
        if (logoutBtnEl) {
            logoutBtnEl.style.display = user ? 'block' : 'none';
            logoutBtnEl.addEventListener('click', logout);
        }
    }

    return {
        saveSession,
        getToken,
        isTokenValid,
        getCurrentUser,
        getUserId,
        getRole,
        authHeaders,
        logout,
        requireLogin,
        requireAdmin,
        updateHeaderUI
    };
})();
