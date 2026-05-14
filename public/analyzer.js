// ============================================================
// analyzer.js — Phân tích blunder / mistake / inaccuracy
// ============================================================

var THRESHOLDS = { BLUNDER: 200, MISTAKE: 100, INACCURACY: 50 };

var analysisEngine  = null;
var isAnalyzing     = false;
var analysisResults = [];
var evalCallback    = null;

// ── Khởi tạo engine (chờ 800ms) ──────────────────────────
function initAnalysisEngine() {
    return new Promise(function(resolveReady) {
        if (analysisEngine) analysisEngine.terminate();
        analysisEngine = new Worker('stockfish.js');
        analysisEngine._lastCp = 0;

        analysisEngine.onmessage = function(e) {
            var line = e.data;
            if (line.indexOf('score cp') !== -1) {
                var parts = line.split(' ');
                var cpIdx = parts.indexOf('cp');
                if (cpIdx !== -1) analysisEngine._lastCp = parseInt(parts[cpIdx + 1]);
            }
            if (line.indexOf('score mate') !== -1) {
                var parts   = line.split(' ');
                var mateIdx = parts.indexOf('mate');
                if (mateIdx !== -1) {
                    var mateIn = parseInt(parts[mateIdx + 1]);
                    analysisEngine._lastCp = mateIn > 0 ? 10000 : -10000;
                }
            }
            if (line.indexOf('bestmove') !== -1 && evalCallback) {
                var cb = evalCallback;
                evalCallback = null;
                cb(analysisEngine._lastCp);
            }
        };
        setTimeout(resolveReady, 800);
    });
}

// ── Lấy eval 1 FEN ───────────────────────────────────────
function getEvalForFen(fen, depth) {
    depth = depth || 10;
    return new Promise(function(resolve) {
        var turn = fen.split(' ')[1];
        evalCallback = function(cp) { resolve(turn === 'w' ? cp : -cp); };
        analysisEngine._lastCp = 0;
        analysisEngine.postMessage('stop');
        analysisEngine.postMessage('position fen ' + fen);
        analysisEngine.postMessage('go depth ' + depth);
    });
}

function classifyMove(cpLoss) {
    if (cpLoss >= THRESHOLDS.BLUNDER)    return 'blunder';
    if (cpLoss >= THRESHOLDS.MISTAKE)    return 'mistake';
    if (cpLoss >= THRESHOLDS.INACCURACY) return 'inaccuracy';
    return 'good';
}

var MOVE_STYLE = {
    blunder:    { icon: '??', color: '#E24B4A', bg: 'rgba(226,75,74,0.15)'   },
    mistake:    { icon: '?',  color: '#EF9F27', bg: 'rgba(239,159,39,0.15)'  },
    inaccuracy: { icon: '?!', color: '#A4C869', bg: 'rgba(164,200,105,0.12)' },
    good:       { icon: '',   color: '',        bg: ''                        }
};

function calcAccuracy(results, color) {
    var moves = results.filter(function(r) { return r.color === color; });
    if (!moves.length) return 100;
    function cpToWinPct(cp) { return 50 + 50 * (2 / (1 + Math.exp(-0.00368 * cp)) - 1); }
    var totalLoss = 0;
    moves.forEach(function(r) {
        totalLoss += Math.max(0, cpToWinPct(r.evalBefore) - cpToWinPct(r.evalAfter));
    });
    var avgLoss  = totalLoss / moves.length;
    return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1669)).toFixed(1);
}

// ── HÀM CHÍNH ────────────────────────────────────────────
async function analyzeFullGame() {
    if (isAnalyzing) return;
    var history = game.history({ verbose: true });
    if (!history.length) { alert('Chưa có ván đấu để phân tích!'); return; }

    isAnalyzing     = true;
    analysisResults = [];
    showAnalysisProgress(0, history.length);
    $('#analyzeBtn').prop('disabled', true).text('Đang phân tích...');

    await initAnalysisEngine();

    var tempGame = new Chess();
    var fens = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'];
    history.forEach(function(move) { tempGame.move(move.san); fens.push(tempGame.fen()); });

    var evals = [];
    for (var i = 0; i < fens.length; i++) {
        var cp = await getEvalForFen(fens[i], 10);
        evals.push(cp);
        showAnalysisProgress(i + 1, fens.length);
        await new Promise(function(res) { setTimeout(res, 10); });
    }

    for (var i = 0; i < history.length; i++) {
        var move    = history[i];
        var isBlack = (move.color === 'b');
        var before  = isBlack ? -evals[i]     : evals[i];
        var after   = isBlack ? -evals[i + 1] : evals[i + 1];
        var cpLoss  = before - after;
        analysisResults.push({
            moveIndex:  i,
            san:        move.san,
            color:      move.color === 'w' ? 'white' : 'black',
            evalBefore: before,
            evalAfter:  after,
            loss:       Math.max(0, cpLoss),
            type:       classifyMove(Math.max(0, cpLoss))
        });
    }

    renderAnalysisResults();
    showAccuracyScores();
    hideAnalysisProgress();
    $('#analyzeBtn').prop('disabled', false).text('⬡ PHÂN TÍCH BLUNDER');
    isAnalyzing = false;
}

// ── Render move list ──────────────────────────────────────
function renderAnalysisResults() {
    var history = game.history({ verbose: true });
    var html    = '';
    for (var i = 0; i < history.length; i += 2) {
        var r1 = analysisResults[i];     var s1 = r1 ? MOVE_STYLE[r1.type] : MOVE_STYLE.good;
        var r2 = analysisResults[i + 1]; var s2 = r2 ? MOVE_STYLE[r2.type] : MOVE_STYLE.good;
        html += '<div class="move-num">' + (Math.floor(i / 2) + 1) + '</div>';
        html += '<div class="move-cell" data-index="' + i + '" style="background:' + (s1.bg||'transparent') + ';color:' + (s1.color||'') + '">'
              + history[i].san + (s1.icon ? ' <span class="move-icon">' + s1.icon + '</span>' : '') + '</div>';
        if (history[i + 1]) {
            html += '<div class="move-cell" data-index="' + (i+1) + '" style="background:' + (s2.bg||'transparent') + ';color:' + (s2.color||'') + '">'
                  + history[i+1].san + (s2.icon ? ' <span class="move-icon">' + s2.icon + '</span>' : '') + '</div>';
        } else { html += '<div></div>'; }
    }
    $('#history-list').html(html);
    $('.move-cell').off('click').on('click', function() {
        currentMoveIndex = $(this).data('index');
        goToMove(currentMoveIndex);
    });
    scrollToCurrentMove();
}

// ── Accuracy scores ───────────────────────────────────────
function showAccuracyScores() {
    var whiteAcc    = calcAccuracy(analysisResults, 'white');
    var blackAcc    = calcAccuracy(analysisResults, 'black');
    var whiteCounts = countByType('white');
    var blackCounts = countByType('black');

    // Hiện accuracy cạnh tên người chơi
    $('#white-acc').text(whiteAcc + '%');
    $('#black-acc').text(blackAcc + '%');

    var summaryHtml = '<div id="analysis-summary">'
        + '<div class="summary-title">Tổng kết phân tích</div>'
        + '<div style="color:var(--text-primary);">⚪ White · <b>' + whiteAcc + '%</b></div>'
        + '<div style="color:var(--text-primary);">⚫ Black · <b>' + blackAcc + '%</b></div>'
        + '<div style="color:#c94f4f;">?? Blunder · ' + whiteCounts.blunder + ' / ' + blackCounts.blunder + '</div>'
        + '<div style="color:#d4903a;">? Mistake · ' + whiteCounts.mistake + ' / ' + blackCounts.mistake + '</div>'
        + '<div style="color:var(--text-secondary); grid-column:1/-1;">?! Inaccuracy · ' + whiteCounts.inaccuracy + ' / ' + blackCounts.inaccuracy + '</div>'
        + '<div style="color:var(--text-muted); font-size:10px; grid-column:1/-1;">White / Black</div>'
        + '</div>';

    $('#analysis-summary').remove();
    $('.my-games-box').before(summaryHtml);
}

function countByType(color) {
    var counts = { blunder: 0, mistake: 0, inaccuracy: 0, good: 0 };
    analysisResults.filter(function(r) { return r.color === color; })
                   .forEach(function(r) { counts[r.type]++; });
    return counts;
}

// ── Progress bar ──────────────────────────────────────────
function showAnalysisProgress(current, total) {
    var pct  = Math.round((current / total) * 100);
    var html = '<div id="analysis-progress">'
             + '<div class="progress-text">Đang phân tích ' + current + ' / ' + total + ' vị trí</div>'
             + '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>'
             + '</div>';
    if ($('#analysis-progress').length) $('#analysis-progress').replaceWith(html);
    else $('#save-status').after(html);
}

function hideAnalysisProgress() { $('#analysis-progress').remove(); }

function scrollToCurrentMove() {
    var active = $('.move-active');
    if (active.length) {
        var container = $('#history-list');
        container.scrollTop(active.offset().top - container.offset().top + container.scrollTop() - 40);
    }
}

// ── Reset ─────────────────────────────────────────────────
function resetAnalysis() {
    analysisResults = [];
    isAnalyzing     = false;
    if (analysisEngine) { analysisEngine.terminate(); analysisEngine = null; }
    evalCallback = null;
    $('#analysis-summary').remove();
    $('#white-acc').text('');
    $('#black-acc').text('');
    $('#analyzeBtn').prop('disabled', false).text('⬡ PHÂN TÍCH BLUNDER');
    hideAnalysisProgress();
}
