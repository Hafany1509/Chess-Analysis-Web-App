// ============================================================
// script.js — Bàn cờ, engine, history, điều hướng
// Auth & save xử lý trong auth.js
// ============================================================

var board            = null;
var game             = new Chess();
var engine           = new Worker('stockfish.js');
var currentMoveIndex = -1;
var isEngineOn       = false;
var arrows           = null;

engine.postMessage('uci');

// ── Hiển thị tên + ELO + kết quả từ PGN header ──────────
function updatePlayerDisplay(h) {
    var whiteName  = h.White  || 'White';
    var blackName  = h.Black  || 'Black';
    var whiteElo   = h.WhiteElo   || h.WhiteRating || '';
    var blackElo   = h.BlackElo   || h.BlackRating || '';
    var result     = h.Result || '';

    // Tên + ELO
    var whiteLabel = whiteName + (whiteElo ? ' <span class="player-elo">(' + whiteElo + ')</span>' : '');
    var blackLabel = blackName + (blackElo ? ' <span class="player-elo">(' + blackElo + ')</span>' : '');
    $('#white-name').html(whiteLabel);
    $('#black-name').html(blackLabel);

    // Kết quả ván
    if (result && result !== '*') {
        var parts    = result.split('-');
        var wScore   = parts[0] || '';
        var bScore   = parts[1] || '';
        $('#white-result').text(wScore === '1' ? '1-0' : wScore === '1/2' ? '½' : wScore === '0' ? '0-1' : '');
        $('#black-result').text(bScore === '1' ? '1-0' : bScore === '1/2' ? '½' : bScore === '0' ? '0-1' : '');
    } else {
        $('#white-result').text('');
        $('#black-result').text('');
    }
}



// ── Lấy FEN tại vị trí hiện tại ──────────────────────────
function getCurrentFen() {
    if (currentMoveIndex === -1) {
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    var tempGame = new Chess();
    var history  = game.history();
    for (var i = 0; i <= currentMoveIndex; i++) {
        tempGame.move(history[i]);
    }
    return tempGame.fen();
}

// ── Vẽ mũi tên bestmove trực tiếp lên primary_canvas ─────
// (không dùng arrows.drawArrow vì đó là hàm private)
function drawBestmoveArrow(fromSq, toSq) {
    var canvas = document.getElementById('primary_canvas');
    if (!canvas) return;
    var ctx    = canvas.getContext('2d');
    var size   = canvas.width;   // chessboard-arrows đã scale lên 900 (resFactor=2)
    var sqSize = size / 8;

    // Xét hướng board: 'white' = trắng ở dưới (mặc định), 'black' = đã flip
    var isFlipped = board && board.orientation() === 'black';

    // Quy đổi tên ô cờ ("e2") → tọa độ pixel tâm ô
    function squareToXY(sq) {
        var file = sq.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
        var rank = parseInt(sq[1]) - 1;                  // 0-7
        // Khi flip: đảo cả file lẫn rank
        var col = isFlipped ? (7 - file) : file;
        var row = isFlipped ? rank       : (7 - rank);
        return {
            x: col * sqSize + sqSize / 2,
            y: row * sqSize + sqSize / 2
        };
    }

    var from = squareToXY(fromSq);
    var to   = squareToXY(toSq);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.85)';
    ctx.fillStyle   = 'rgba(255, 170, 0, 0.85)';
    ctx.lineWidth   = sqSize * 0.15;
    ctx.lineCap     = 'round';

    var dx     = to.x - from.x;
    var dy     = to.y - from.y;
    var len    = Math.sqrt(dx * dx + dy * dy);
    var headLen = sqSize * 0.4;
    var shorten = headLen * 0.6; // dừng trước đầu mũi tên

    // Thân mũi tên
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(
        to.x - (dx / len) * shorten,
        to.y - (dy / len) * shorten
    );
    ctx.stroke();

    // Đầu mũi tên (tam giác)
    var angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
        to.x - headLen * Math.cos(angle - Math.PI / 6),
        to.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        to.x - headLen * Math.cos(angle + Math.PI / 6),
        to.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function clearBestmoveArrow() {
    var canvas = document.getElementById('primary_canvas');
    var ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── Xử lý output Stockfish ───────────────────────────────
engine.onmessage = function(event) {
    var line = event.data;

    if (line.indexOf('score cp') !== -1) {
        var parts        = line.split(' ');
        var cpIdx        = parts.indexOf('cp');
        if (cpIdx === -1) return;
        var score        = parseInt(parts[cpIdx + 1]);
        var fen          = getCurrentFen();
        var turn         = fen.split(' ')[1];
        var displayScore = (turn === 'w') ? score : -score;

        var pct = 50 + (displayScore / 15);
        pct = Math.min(Math.max(pct, 5), 95);
        $('#eval-bar').css('height', pct + '%');

        var prefix     = displayScore > 0 ? '+' : '';
        var scoreValue = (displayScore / 100).toFixed(1);
        $('#eval-score-v2').text(prefix + scoreValue);
        $('#eval-text').text('Đánh giá: ' + prefix + scoreValue);
    }

    if (line.indexOf('bestmove') !== -1 && isEngineOn) {
        var parts    = line.split(' ');
        var bestMove = parts[1];
        if (bestMove && bestMove !== '(none)') {
            clearBestmoveArrow();
            drawBestmoveArrow(
                bestMove.substring(0, 2),
                bestMove.substring(2, 4)
            );
        }
    }
};

// ── Gửi FEN cho engine phân tích ─────────────────────────
function analyzeFen() {
    if (!isEngineOn) return;
    engine.postMessage('stop');
    engine.postMessage('position fen ' + getCurrentFen());
    engine.postMessage('go depth 13');
}

// ── Render bảng nước đi ──────────────────────────────────
function renderHistoryTable() {
    var history = game.history({ verbose: true });
    var html    = '';
    for (var i = 0; i < history.length; i += 2) {
        html += '<div class="move-num">' + (Math.floor(i / 2) + 1) + '</div>';
        html += '<div class="move-cell" data-index="' + i + '">' + history[i].san + '</div>';
        if (history[i + 1]) {
            html += '<div class="move-cell" data-index="' + (i + 1) + '">' + history[i + 1].san + '</div>';
        } else {
            html += '<div></div>';
        }
    }
    $('#history-list').html(html);
    $('.move-cell').off('click').on('click', function() {
        currentMoveIndex = $(this).data('index');
        goToMove(currentMoveIndex);
    });
}

// ── Di chuyển đến nước đi theo index ─────────────────────
function goToMove(index) {
    var tempGame = new Chess();
    var history  = game.history();
    for (var i = 0; i <= index; i++) tempGame.move(history[i]);
    board.position(tempGame.fen());
    $('.move-cell').removeClass('move-active');
    $('.move-cell[data-index="' + index + '"]').addClass('move-active');
    clearBestmoveArrow();
    if (isEngineOn) analyzeFen();
}

// ── Reset ván mới ─────────────────────────────────────────
function resetGame() {
    game.reset();
    board.position('start');
    currentMoveIndex = -1;
    currentGameKey   = null;
    $('#white-name').text('White'); $('#white-result').text('');
    $('#black-name').text('Black'); $('#black-result').text('');
    $('#pgnInput').val('');
    $('#eval-bar').css('height', '50%');
    $('#eval-score-v2').text('0.0');
    $('#eval-text').text('Đánh giá Engine: 0.0');
    $('#save-status').text('');
    clearBestmoveArrow();
    engine.postMessage('stop');
    renderHistoryTable();
}

// ── Load ván từ sidebar ───────────────────────────────────
window.loadSavedPgn = function(encodedPgn) {
    var pgn = decodeURIComponent(encodedPgn);
    if (game.load_pgn(pgn)) {
        var h = game.header();
        updatePlayerDisplay(h);
        board.position(game.fen());
        currentMoveIndex = game.history().length - 1;
        currentGameKey   = null;
        clearBestmoveArrow();
        renderHistoryTable();
        if (isEngineOn) analyzeFen();
    } else {
        alert('Không thể tải ván đấu này.');
    }
};

// ── Phím mũi tên điều hướng ──────────────────────────────
$(document).on('keydown', function(e) {
    var histLen = game.history().length;
    if (e.keyCode === 37 && currentMoveIndex > -1) {
        currentMoveIndex--;
        clearBestmoveArrow();
        if (currentMoveIndex === -1) {
            board.position('start');
            $('.move-cell').removeClass('move-active');
            if (isEngineOn) analyzeFen();
        } else {
            goToMove(currentMoveIndex);
        }
    } else if (e.keyCode === 39 && currentMoveIndex < histLen - 1) {
        currentMoveIndex++;
        goToMove(currentMoveIndex);
    }
});

// ── Chỉ cho kéo quân khi đang ở nước cuối ───────────────
function onDragStart(source, piece) {
    if (currentMoveIndex !== game.history().length - 1 && game.history().length > 0) return false;
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) return false;
    // Ẩn canvas khi kéo để quân cờ không bị che
    $('#primary_canvas, #drawing_canvas').css('opacity', '0');
}

// ── Kéo thả quân cờ ──────────────────────────────────────
function onDrop(source, target) {
    // Hiện lại canvas
    $('#primary_canvas, #drawing_canvas').css('opacity', '1');
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    clearBestmoveArrow();
    currentMoveIndex = game.history().length - 1;
    renderHistoryTable();
    if (isEngineOn) setTimeout(analyzeFen, 100);
    if (currentUser) autoSaveGame();
}

// ── Snap về đúng vị trí sau khi thả ──────────────────────
function onSnapEnd() {
    $('#primary_canvas, #drawing_canvas').css('opacity', '1');
    board.position(game.fen(), false);
}

// ── Khởi tạo bàn cờ ──────────────────────────────────────
board = Chessboard('myBoard', {
    draggable:    true,
    position:     'start',
    pieceTheme:   'img/chesspieces/wikipedia/{piece}.png',
    onDragStart:  onDragStart,
    onDrop:       onDrop,
    onSnapEnd:    onSnapEnd,
    snapSpeed:    50,
    moveSpeed:    120,
    snapbackSpeed: 150,
});

// ChessboardArrows: gắn event chuột phải vào #myBoard (không cần canvas nhận event)
try {
    arrows = new ChessboardArrows('myBoard');
} catch(e) {
    console.warn('ChessboardArrows lỗi:', e);
}

// ── Nút ENGINE ON/OFF ─────────────────────────────────────
$('#toggleEngineBtn').on('click', function() {
    isEngineOn = !isEngineOn;
    $(this)
        .text(isEngineOn ? 'ENGINE: ON' : 'ENGINE: OFF')
        .css('color', isEngineOn ? '#81b64c' : '#bababa');
    if (isEngineOn) analyzeFen();
    else {
        engine.postMessage('stop');
        clearBestmoveArrow();
    }
});

// ── Nút XOAY BÀN ─────────────────────────────────────────
$('#flipBoardBtn').on('click', function() { board.flip(); });

// ── Nút VÁN MỚI ──────────────────────────────────────────
$('#newGameBtn').on('click', function() {
    if (game.history().length > 0) {
        if (!confirm('Bắt đầu ván mới? Ván hiện tại sẽ không được lưu thêm.')) return;
    }
    resetGame();
    if (typeof resetAnalysis === 'function') resetAnalysis();
});

// ── Nút PHÂN TÍCH VÁN (analyzer.js) ─────────────────────
$('#analyzeBtn').on('click', function() {
    if (typeof analyzeFullGame === 'function') analyzeFullGame();
});

// ── Nút PHÂN TÍCH PGN ────────────────────────────────────
$('#importPgnBtn').on('click', function() {
    var pgn = $('#pgnInput').val().trim();
    if (!pgn) return alert('Vui lòng dán PGN vào ô trống!');
    if (game.load_pgn(pgn)) {
        var h = game.header();
        $('#white-name').text(h.White || 'White');
        $('#black-name').text(h.Black || 'Black');
        board.position(game.fen());
        currentMoveIndex = game.history().length - 1;
        currentGameKey   = null;
        clearBestmoveArrow();
        renderHistoryTable();
        if (isEngineOn) analyzeFen();
        if (currentUser) autoSaveGame();
    } else {
        alert('PGN không hợp lệ, vui lòng kiểm tra lại!');
    }
});

// ── Render ban đầu ────────────────────────────────────────
renderHistoryTable();
