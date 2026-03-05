var board = null;
var game = new Chess();
// Khởi tạo Engine Stockfish
// Sửa lại dòng này
var engine = new Worker('stockfish.js');

function onDragStart (source, piece) {
    if (game.game_over()) return false;
    // Chỉ cho phép kéo quân của bên đến lượt đi
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) return false;
}

function onDrop (source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    
    updateStatus();
    analyzePosition();
}

function onSnapEnd () { 
    board.position(game.fen()); 
}

function updateStatus () {
    var status = 'Bình thường';
    if (game.in_checkmate()) status = 'Chiếu bí!';
    else if (game.in_draw()) status = 'Hòa cờ.';
    else if (game.in_check()) status = 'Đang bị chiếu!';

    // Cập nhật các thông tin trạng thái vào đúng ID trong HTML
    $('#status').text(status);
    $('#turn').text(game.turn() === 'w' ? 'Trắng' : 'Đen');

    // Hiển thị lịch sử nước đi
    var history = game.history();
    var html = '';
    for (var i = 0; i < history.length; i += 2) {
        html += '<div>' + (Math.floor(i / 2) + 1) + '. ' + history[i] + ' ' + (history[i + 1] || '') + '</div>';
    }
    
    // Kiểm tra nếu thẻ tồn tại trước khi cập nhật và cuộn
    var $historyList = $('#history-list');
    if ($historyList.length) {
        $historyList.html(html);
        $historyList.scrollTop($historyList[0].scrollHeight);
    }
}

function analyzePosition() {
    engine.postMessage('uci');
    engine.postMessage('position fen ' + game.fen());
    engine.postMessage('go depth 13');
}

engine.onmessage = function(event) {
    var line = event.data;
    // Tìm dòng chứa điểm số (centipawns)
    if (line.indexOf('score cp') !== -1) {
        var parts = line.split(' ');
        var score = parseInt(parts[parts.indexOf('cp') + 1]);
        
        // Đảo dấu nếu đang là lượt đen để thanh lực hiển thị đúng ưu thế
        if (game.turn() === 'b') score = -score;

        // Tính toán phần trăm hiển thị cho thanh lực (giới hạn 0-100%)
        var pct = 50 - (score / 15);
        pct = Math.min(Math.max(pct, 0), 100);
        
        // Cập nhật thanh lực và văn bản đánh giá
        $('#eval-bar').css('height', (100 - pct) + '%');
        $('#eval-text').text('Đánh giá: ' + (score / 100).toFixed(1));
    }
};

// Cấu hình bàn cờ Chessboard.js
// Cấu hình bàn cờ Chessboard.js
var config = {
    draggable: true,
    position: 'start',
    // Sử dụng link từ cdnjs - thường ổn định hơn cho các dự án học tập
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};

// Đảm bảo khởi tạo sau khi cấu hình
board = Chessboard('myBoard', config); 
updateStatus();
