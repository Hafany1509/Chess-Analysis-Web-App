// ============================================================
// auth.js — Đăng nhập, đăng ký, lưu/xóa ván cờ
// Load TRƯỚC script.js
// ============================================================

var currentUser    = null;
var authToken      = null;
var currentGameKey = null;
var isLoginMode    = true;

// ── Tự động điền username đã nhớ (không lưu password) ───
$(document).ready(function() {
    // Điền username đã nhớ
    var savedUser = localStorage.getItem('chess_remember_user');
    if (savedUser) {
        $('#username').val(savedUser);
        $('#rememberMe').prop('checked', true);
    }

    // Khôi phục session nếu còn token (tránh đăng nhập lại khi reload)
    var savedToken = sessionStorage.getItem('chess_token');
    var savedCurrentUser  = sessionStorage.getItem('chess_user');
    if (savedToken && savedCurrentUser) {
        try {
            authToken   = savedToken;
            currentUser = JSON.parse(savedCurrentUser);
            $('#openLoginBtn').hide();
            $('#userInfo').css('display','flex');
            $('#displayUser').text(currentUser.username);
            loadMyGames();
        } catch(e) {
            sessionStorage.removeItem('chess_token');
            sessionStorage.removeItem('chess_user');
        }
    }
});

// ── Helper gọi API kèm JWT ────────────────────────────────
function fetchWithAuth(url, options) {
    options = options || {};
    return fetch(url, {
        method:  options.method || 'GET',
        headers: Object.assign({
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + authToken
        }, options.headers || {}),
        body: options.body
    });
}

// ── Hiển thị trạng thái lưu ──────────────────────────────
function showSaveStatus(msg, isError) {
    $('#save-status')
        .text(msg)
        .css('color', isError ? '#ff6b6b' : '#81b64c');
    setTimeout(function() { $('#save-status').text(''); }, 3000);
}

// ── Mở / đóng modal ──────────────────────────────────────
$('#openLoginBtn').on('click', function() { $('#authModal').addClass('open'); });
$(window).on('click', function(e) {
    if (e.target.id === 'authModal') $('#authModal').removeClass('open');
});

// ── Toggle đăng nhập / đăng ký ───────────────────────────
$('#toggleAuth').on('click', function(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    $('#authTitle').text(isLoginMode ? 'Đăng Nhập' : 'Đăng Ký');
    $(this).text(isLoginMode ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập');
    // Ẩn "nhớ mật khẩu" khi đang ở chế độ đăng ký
    $('#rememberRow').toggle(isLoginMode);
});

// ── Xác nhận đăng nhập / đăng ký ─────────────────────────
$('#authBtn').on('click', function() {
    var username   = $('#username').val().trim();
    var password   = $('#password').val();
    var rememberMe = $('#rememberMe').prop('checked');

    if (!username || !password) return alert('Vui lòng nhập đủ thông tin!');

    var endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

    fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username, password: password })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) return alert(data.error);

        if (isLoginMode) {
            // Chỉ lưu username — không lưu password vì lý do bảo mật
            if (rememberMe) {
                localStorage.setItem('chess_remember_user', username);
            } else {
                localStorage.removeItem('chess_remember_user');
            }

            authToken   = data.token;
            currentUser = data.user;
            // Lưu vào sessionStorage — tồn tại đến khi đóng tab
            sessionStorage.setItem('chess_token', authToken);
            sessionStorage.setItem('chess_user',  JSON.stringify(currentUser));
            $('#authModal').removeClass('open');
            $('#openLoginBtn').hide();
            $('#userInfo').css('display','flex');
            $('#displayUser').text(currentUser.username);
            loadMyGames();
        } else {
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            $('#toggleAuth').click();
        }
    })
    .catch(function() { alert('Lỗi kết nối máy chủ'); });
});

// ── Load danh sách ván đấu ────────────────────────────────
function loadMyGames() {
    if (!currentUser || !authToken) return;

    fetchWithAuth('/api/games/my')
    .then(function(res) { return res.json(); })
    .then(function(games) {
        var html = '';
        if (!games || games.error) {
            html = '<p style="padding:10px; color:#ff6b6b; font-size:12px; text-align:center;">Lỗi tải dữ liệu</p>';
        } else if (games.length === 0) {
            html = '<p style="padding:10px; text-align:center; font-size:12px; color:#757575;">Chưa có ván đấu nào.</p>';
        } else {
            games.forEach(function(g) {
                var safePgn  = encodeURIComponent(g.pgn_data);
                var safeName = escapeHtml(g.player_name || 'Không tên');
                var date     = new Date(g.created_at).toLocaleDateString('vi-VN');
                html += '<div class="game-history-item" onclick="loadSavedPgn(\'' + safePgn + '\')">'
                      + '<span class="delete-btn" onclick="deleteGame(event,' + g.id + ')">×</span>'
                      + '<div class="game-item-name">' + safeName + '</div>'
                      + '<div class="game-item-date">' + date + '</div>'
                      + '</div>';
            });
        }
        $('#my-games-list').html(html);
    })
    .catch(function() {
        $('#my-games-list').html('<p style="color:#ff6b6b; font-size:12px; padding:8px; text-align:center;">Lỗi tải dữ liệu</p>');
    });
}

// ── Xóa ván đấu ──────────────────────────────────────────
window.deleteGame = function(e, gameId) {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa ván đấu này?')) return;
    fetchWithAuth('/api/games/' + gameId, { method: 'DELETE' })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) return alert(data.error);
        loadMyGames();
    });
};

// ── Lưu ván đấu (gọi từ script.js) ──────────────────────
function autoSaveGame() {
    if (!currentUser || !authToken) return;
    if (typeof game === 'undefined') return;

    var pgn = game.pgn();
    if (!pgn || pgn.trim() === '') return;

    // Tạo game_key 1 lần — giữ nguyên để UPDATE thay vì INSERT mỗi nước
    if (!currentGameKey) {
        currentGameKey = 'gk_' + currentUser.id + '_' + Date.now();
    }

    var h          = game.header();
    var user       = (currentUser && currentUser.username) ? currentUser.username : null;
    var playerName = (h.White || user || 'White') + ' vs ' + (h.Black || 'Black');

    showSaveStatus('Đang lưu...');

    fetchWithAuth('/api/games/save', {
        method: 'POST',
        body:   JSON.stringify({
            player_name: playerName,
            pgn_data:    pgn,
            game_key:    currentGameKey
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) showSaveStatus('Lỗi lưu ván!', true);
        else {
            showSaveStatus('Đã lưu ✓');
            loadMyGames();
        }
    })
    .catch(function() { showSaveStatus('Lỗi kết nối!', true); });
}

// ── Đăng xuất ────────────────────────────────────────────
$('#logoutBtn').on('click', function() {
    currentUser    = null;
    authToken      = null;
    currentGameKey = null;
    sessionStorage.removeItem('chess_token');
    sessionStorage.removeItem('chess_user');
    $('#userInfo').hide();
    $('#openLoginBtn').show();
    $('#my-games-list').html('<p style="text-align:center; font-size:12px; color:#757575;">Đăng nhập để xem ván đấu.</p>');
});

// ── Escape HTML chống XSS ─────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
