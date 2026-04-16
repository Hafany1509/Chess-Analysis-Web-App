var board = null;
var game = new Chess();
var engine = new Worker('stockfish.js');
var currentMoveIndex = -1;
var currentUser = null;
var isLoginMode = true;
var isEngineOn = false;

engine.postMessage('uci');

function getCurrentFen() {
    if (currentMoveIndex === -1) {
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    var tempGame = new Chess();
    var history = game.history();
    for (var i = 0; i <= currentMoveIndex; i++) {
        tempGame.move(history[i]);
    }
    return tempGame.fen();
}

engine.onmessage = function(event) {
    var line = event.data;
    if (line.indexOf('score cp') !== -1) {
        var parts = line.split(' ');
        var score = parseInt(parts[parts.indexOf('cp') + 1]);
        
        var currentFen = getCurrentFen();
        var turn = currentFen.split(' ')[1];
        
        var displayScore = (turn === 'w') ? score : -score;
        
        var pct = 50 + (displayScore / 15);
        pct = Math.min(Math.max(pct, 5), 95);
        $('#eval-bar').css('height', pct + '%');
        
        var scoreValue = (displayScore / 100).toFixed(1);
        $('#eval-score-v2').text((displayScore > 0 ? '+' : '') + scoreValue);
        $('#eval-text').text('Đánh giá: ' + (displayScore > 0 ? '+' : '') + scoreValue);
    }
    
    if (line.indexOf('bestmove') !== -1 && isEngineOn) {
        var bestMove = line.split(' ')[1];
        if (bestMove !== '(none)' && typeof arrows !== 'undefined') {
            arrows.clearCanvas();
        }
    }
};

function analyzeFen() {
    if (!isEngineOn) return;
    const fen = getCurrentFen(); 
    engine.postMessage('stop'); 
    engine.postMessage('position fen ' + fen);
    engine.postMessage('go depth 13');
}

$('#openLoginBtn').on('click', () => $('#authModal').fadeIn(200));
$(window).on('click', (e) => { if (e.target.id === 'authModal') $('#authModal').hide(); });

$('#toggleAuth').on('click', function(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    $('#authTitle').text(isLoginMode ? 'Đăng Nhập' : 'Đăng Ký');
    $(this).text(isLoginMode ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập');
});

$('#authBtn').on('click', function() {
    const username = $('#username').val();
    const password = $('#password').val();
    if(!username || !password) return alert("Vui lòng nhập đủ thông tin!");
    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) return alert(data.error);
        if (isLoginMode) {
            currentUser = data.user;
            $('#authModal').hide(); $('#openLoginBtn').hide(); $('#userInfo').show();
            $('#displayUser').text(currentUser.username);
            loadMyGames();
        } else {
            alert("Đăng ký thành công!"); $('#toggleAuth').click();
        }
    });
});

function loadMyGames() {
    if (!currentUser) return;
    fetch(`/api/my-games/${currentUser.id}`)
        .then(res => res.json())
        .then(games => {
            let html = '';
            if (games.length === 0) {
                html = '<p style="padding:10px; text-align:center; font-size:12px;">Chưa có ván đấu.</p>';
            } else {
                games.forEach(g => {
                    html += `
                        <div class="game-history-item" style="padding:8px; border-bottom:1px solid #333; cursor:pointer; position: relative;" onclick="loadSavedPgn('${encodeURIComponent(g.pgn_data)}')">
                            <span class="delete-btn" onclick="deleteGame(event, ${g.id})">×</span>
                            <div style="font-weight:bold; color:#fff; font-size:11px;">${g.player_name}</div>
                            <div style="font-size:10px; color:#81b64c;">${new Date(g.created_at).toLocaleDateString('vi-VN')}</div>
                        </div>`;
                });
            }
            $('#my-games-list').html(html);
        });
}

window.deleteGame = function(e, gameId) {
    e.stopPropagation(); 
    if (!confirm("Bạn có chắc muốn xóa ván đấu này?")) return;
    fetch(`/api/delete-game/${gameId}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
        if (data.success) loadMyGames();
    });
};

function autoSaveGame() {
    if (!currentUser) return;
    const headers = game.header();
    const playerName = `${headers.White || "White"} vs ${headers.Black || "Black"}`;
    fetch('/api/save-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_name: playerName,
            pgn_data: game.pgn(),
            user_id: currentUser.id
        })
    }).then(() => loadMyGames());
}

window.loadSavedPgn = function(encodedPgn) {
    const pgn = decodeURIComponent(encodedPgn);
    if (game.load_pgn(pgn)) {
        const h = game.header();
        $('#white-name').text(h.White || "White");
        $('#black-name').text(h.Black || "Black");
        board.position(game.fen());
        currentMoveIndex = game.history().length - 1;
        renderHistoryTable();
        if (isEngineOn) analyzeFen();
        alert("Đã nạp ván đấu!");
    }
};

function renderHistoryTable() {
    var history = game.history({ verbose: true });
    var html = '';
    for (var i = 0; i < history.length; i += 2) {
        html += `<div class="move-num">${Math.floor(i / 2) + 1}</div>`;
        html += `<div class="move-cell" data-index="${i}">${history[i].san}</div>`;
        if (history[i + 1]) html += `<div class="move-cell" data-index="${i + 1}">${history[i + 1].san}</div>`;
        else html += '<div></div>';
    }
    $('#history-list').html(html);

    $('.move-cell').off('click').on('click', function() {
        currentMoveIndex = $(this).data('index');
        goToMove(currentMoveIndex);
    });
}

function goToMove(index) {
    var tempGame = new Chess();
    var history = game.history();
    for (var i = 0; i <= index; i++) tempGame.move(history[i]);
    board.position(tempGame.fen());
    $('.move-cell').removeClass('move-active');
    $(`.move-cell[data-index="${index}"]`).addClass('move-active');
    if (isEngineOn) analyzeFen();
}

$(document).on('keydown', function(e) {
    if (e.keyCode === 37 && currentMoveIndex > -1) {
        currentMoveIndex--;
        if (currentMoveIndex === -1) {
            board.position('start');
            $('.move-cell').removeClass('move-active');
            if (isEngineOn) analyzeFen();
        } else goToMove(currentMoveIndex);
    } else if (e.keyCode === 39 && currentMoveIndex < game.history().length - 1) {
        currentMoveIndex++;
        goToMove(currentMoveIndex);
    }
});

function onDrop(source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    renderHistoryTable();
    currentMoveIndex = game.history().length - 1;
    if (isEngineOn) setTimeout(analyzeFen, 100);
    if (currentUser) autoSaveGame();
}

board = Chessboard('myBoard', {
    draggable: true,
    position: 'start',
    pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen())
});

try {
    var arrows = new ChessboardArrows('myBoard');
} catch(e) {}

$('#toggleEngineBtn').on('click', function() {
    isEngineOn = !isEngineOn;
    $(this).text(isEngineOn ? "ENGINE: ON" : "ENGINE: OFF").css('color', isEngineOn ? '#81b64c' : '#bababa');
    if (isEngineOn) analyzeFen();
    else engine.postMessage('stop');
});

$('#flipBoardBtn').on('click', () => board.flip());

$('#importPgnBtn').on('click', function() {
    const pgn = $('#pgnInput').val().trim();
    if (game.load_pgn(pgn)) {
        const h = game.header();
        $('#white-name').text(h.White || "White");
        $('#black-name').text(h.Black || "Black");
        board.position(game.fen());
        currentMoveIndex = game.history().length - 1;
        renderHistoryTable();
        if (isEngineOn) analyzeFen();
        if (currentUser) autoSaveGame();
    }
});

$('#logoutBtn').on('click', function() {
    currentUser = null;
    $('#userInfo').hide(); $('#openLoginBtn').show();
    $('#my-games-list').html('<p style="text-align:center; font-size:12px; color:#757575;">Đăng nhập để xem ván đấu.</p>');
});

renderHistoryTable();
