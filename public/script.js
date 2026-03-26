var board = null;
var game = new Chess();
var engine = new Worker('stockfish.js');
var currentMoveIndex = -1;

// --- Stockfish Logic ---
engine.onmessage = function(event) {
    var line = event.data;
    if (line.indexOf('score cp') !== -1) {
        var parts = line.split(' ');
        var score = parseInt(parts[parts.indexOf('cp') + 1]);
        var displayScore = (game.turn() === 'b') ? -score : score;
        
        var pct = 50 + (displayScore / 15);
        pct = Math.min(Math.max(pct, 5), 95);
        $('#eval-bar').css('height', pct + '%');
        
        var scoreValue = (displayScore / 100).toFixed(1);
        $('#eval-score-v2').text(Math.abs(scoreValue));
        $('#eval-text').text('Đánh giá: ' + (displayScore > 0 ? '+' : '') + scoreValue);
    }
};

function analyzeFen(fen) {
    engine.postMessage('uci');
    engine.postMessage('position fen ' + fen);
    engine.postMessage('go depth 13');
}

// --- Highlight Logic ---
function removeHighlights() {
    $('#myBoard .square-55d63').removeClass('highlight-move');
}

function addHighlights(source, target) {
    $('#myBoard .square-' + source).addClass('highlight-move');
    $('#myBoard .square-' + target).addClass('highlight-move');
}

// --- Logic Bàn cờ ---
function onDragStart (source, piece) {
    if (game.game_over()) return false;
    if (currentMoveIndex !== game.history().length - 1 && currentMoveIndex !== -1) return false;
}

function onDrop (source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    removeHighlights();
    addHighlights(source, target);
    
    currentMoveIndex = game.history().length - 1;
    renderHistoryTable();
    analyzeFen(game.fen());
}

function renderHistoryTable() {
    var history = game.history({ verbose: true });
    var html = '';
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
    highlightMove(currentMoveIndex);

    $('.move-cell').on('click', function() {
        currentMoveIndex = parseInt($(this).data('index'));
        renderPositionAtMove(currentMoveIndex);
    });
}

function renderPositionAtMove(index) {
    var history = game.history({ verbose: true });
    var tempGame = new Chess();
    removeHighlights();
    
    for (var i = 0; i <= index; i++) {
        var m = tempGame.move(history[i]);
        if (i === index) addHighlights(m.from, m.to);
    }
    
    board.position(index === -1 ? 'start' : tempGame.fen());
    highlightMove(index);
    analyzeFen(tempGame.fen());
}

function highlightMove(index) {
    $('.move-cell').removeClass('move-active');
    if (index !== -1) $('.move-cell[data-index="' + index + '"]').addClass('move-active');
}

// --- Event Handlers ---
$('#importPgnBtn').on('click', function() {
    const pgn = $('#pgnInput').val().trim();
    if (game.load_pgn(pgn)) {
        var h = game.header();
        $('#white-name').text(h.White || "White");
        $('#white-elo').text(h.WhiteElo ? `(${h.WhiteElo})` : "");
        $('#black-name').text(h.Black || "Black");
        $('#black-elo').text(h.BlackElo ? `(${h.BlackElo})` : "");
        $('#player-info').fadeIn();
        
        board.position(game.fen());
        currentMoveIndex = game.history().length - 1;
        renderHistoryTable();
        analyzeFen(game.fen());
        
        // Highlight nước cuối cùng của PGN
        var history = game.history({verbose: true});
        if(history.length > 0) {
            var last = history[history.length - 1];
            removeHighlights();
            addHighlights(last.from, last.to);
        }
    } else { alert("PGN không hợp lệ!"); }
});

$('#flipBoardBtn').on('click', () => board.flip());

$(document).keydown(function(e) {
    var len = game.history().length;
    if (e.keyCode == 37 && currentMoveIndex > -1) { currentMoveIndex--; renderPositionAtMove(currentMoveIndex); }
    else if (e.keyCode == 39 && currentMoveIndex < len - 1) { currentMoveIndex++; renderPositionAtMove(currentMoveIndex); }
});

var config = {
    draggable: true,
    position: 'start',
    pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen())
};
board = Chessboard('myBoard', config);
renderHistoryTable();
