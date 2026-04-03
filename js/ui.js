/**
 * Damas Brasileiras - Módulo de Interface/UI
 *
 * Renderização do tabuleiro, interação com cliques, animações,
 * log de jogadas e indicadores visuais.
 */

const UI = (() => {
    const {
        EMPTY, BLACK, WHITE, BLACK_KING, WHITE_KING, BOARD_SIZE,
        pieceColor, isKing, belongsTo, getAllLegalMoves, posToNotation, moveToString
    } = GameLogic;

    // Referências DOM
    let boardEl, turnTextEl, playerPiecesEl, aiPiecesEl, statusMessageEl;
    let aiThinkingEl, moveLogEl, btnUndo, btnRestart, difficultySelect, whoStartsSelect;

    // Estado da UI
    let selectedPiece = null;        // {row, col}
    let highlightedMoves = [];       // Movimentos possíveis para peça selecionada
    let lastMoveFrom = null;
    let lastMoveTo = null;
    let onMoveCallback = null;       // Callback quando jogador faz um movimento
    let isInteractive = true;        // Se o tabuleiro aceita interações
    let currentPlayerColor = WHITE;  // Cor que o jogador humano controla
    let boardFlipped = false;        // Se o tabuleiro está invertido

    /**
     * Inicializa referências DOM
     */
    function init(callbacks) {
        boardEl = document.getElementById('board');
        turnTextEl = document.getElementById('turn-text');
        playerPiecesEl = document.getElementById('player-pieces');
        aiPiecesEl = document.getElementById('ai-pieces');
        statusMessageEl = document.getElementById('status-message');
        aiThinkingEl = document.getElementById('ai-thinking');
        moveLogEl = document.getElementById('move-log');
        btnUndo = document.getElementById('btn-undo');
        btnRestart = document.getElementById('btn-restart');
        difficultySelect = document.getElementById('difficulty');
        whoStartsSelect = document.getElementById('who-starts');

        document.getElementById('btn-flip').addEventListener('click', () => {
            boardFlipped = !boardFlipped;
            if (callbacks.onFlip) callbacks.onFlip();
        });

        onMoveCallback = callbacks.onMove;

        btnUndo.addEventListener('click', () => {
            if (callbacks.onUndo) callbacks.onUndo();
        });

        btnRestart.addEventListener('click', () => {
            if (callbacks.onRestart) callbacks.onRestart();
        });

        difficultySelect.addEventListener('change', () => {
            if (callbacks.onDifficultyChange) {
                callbacks.onDifficultyChange(difficultySelect.value);
            }
        });
    }

    /**
     * Renderiza o tabuleiro inteiro
     */
    function renderBoard(board, currentTurn, legalMoves, playerCol) {
        boardEl.innerHTML = '';
        const pColor = playerCol || currentPlayerColor;

        // Determinar peças que devem capturar (para indicação visual)
        const mustCapturePieces = new Set();
        if (currentTurn === pColor && legalMoves && legalMoves.length > 0 && legalMoves[0].isCapture) {
            for (const m of legalMoves) {
                mustCapturePieces.add(`${m.fromRow},${m.fromCol}`);
            }
        }

        for (let ri = 0; ri < BOARD_SIZE; ri++) {
            for (let ci = 0; ci < BOARD_SIZE; ci++) {
                // Se invertido, renderiza de baixo para cima e da direita para esquerda
                const r = boardFlipped ? (BOARD_SIZE - 1 - ri) : ri;
                const c = boardFlipped ? (BOARD_SIZE - 1 - ci) : ci;

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const isDark = (r + c) % 2 === 1;
                cell.classList.add(isDark ? 'cell-dark' : 'cell-light');

                // Destaque do último movimento
                if (lastMoveFrom && lastMoveFrom.row === r && lastMoveFrom.col === c) {
                    cell.classList.add('last-move');
                }
                if (lastMoveTo && lastMoveTo.row === r && lastMoveTo.col === c) {
                    cell.classList.add('last-move');
                }

                // Peça selecionada
                if (selectedPiece && selectedPiece.row === r && selectedPiece.col === c) {
                    cell.classList.add('selected');
                }

                // Destaque de movimentos possíveis
                const highlightMove = highlightedMoves.find(
                    m => m.toRow === r && m.toCol === c
                );
                if (highlightMove) {
                    cell.classList.add(highlightMove.isCapture ? 'highlight-capture' : 'highlight');
                }

                // Peça
                const piece = board[r][c];
                if (piece !== EMPTY) {
                    const pieceEl = createPieceElement(piece, r, c, mustCapturePieces);
                    cell.appendChild(pieceEl);
                }

                // Clique na célula
                if (isDark && isInteractive && currentTurn === pColor) {
                    cell.addEventListener('click', () => handleCellClick(r, c, board, legalMoves, pColor));
                }

                boardEl.appendChild(cell);
            }
        }
    }

    /**
     * Cria elemento visual de peça
     */
    function createPieceElement(piece, r, c, mustCapturePieces) {
        const el = document.createElement('div');
        el.className = 'piece';

        const color = pieceColor(piece);
        el.classList.add(color === BLACK ? 'piece-black' : 'piece-white');

        if (isKing(piece)) {
            el.classList.add('king');
        }

        // Indicação de captura obrigatória
        if (mustCapturePieces && mustCapturePieces.has(`${r},${c}`)) {
            el.classList.add('must-capture');
        }

        return el;
    }

    /**
     * Manipula clique em uma célula
     */
    function handleCellClick(r, c, board, legalMoves, pColor) {
        if (!isInteractive) return;

        const piece = board[r][c];

        // Verificar se clicou em um destino destacado
        if (selectedPiece) {
            const targetMove = highlightedMoves.find(
                m => m.toRow === r && m.toCol === c
            );

            if (targetMove) {
                // Executar o movimento
                selectedPiece = null;
                highlightedMoves = [];
                if (onMoveCallback) onMoveCallback(targetMove);
                return;
            }
        }

        // Selecionar uma peça própria
        if (belongsTo(piece, pColor)) {
            // Verificar se esta peça tem movimentos legais
            const pieceMoves = legalMoves.filter(
                m => m.fromRow === r && m.fromCol === c
            );

            if (pieceMoves.length > 0) {
                selectedPiece = { row: r, col: c };
                highlightedMoves = pieceMoves;
                renderBoard(board, pColor, legalMoves, pColor);
            } else {
                // Peça sem movimentos legais (pode ser que captura é obrigatória com outra peça)
                selectedPiece = null;
                highlightedMoves = [];
                renderBoard(board, pColor, legalMoves, pColor);
                setStatus('Esta peça não tem movimentos válidos.');
            }
        } else {
            // Desselecionar
            selectedPiece = null;
            highlightedMoves = [];
            renderBoard(board, pColor, legalMoves, pColor);
        }
    }

    /**
     * Limpa seleção
     */
    function clearSelection() {
        selectedPiece = null;
        highlightedMoves = [];
    }

    /**
     * Atualiza indicador de turno
     */
    function setTurn(color, playerCol) {
        const indicator = document.getElementById('turn-indicator');
        const pColor = playerCol || currentPlayerColor;
        if (color === pColor) {
            const colorName = pColor === WHITE ? 'Brancas' : 'Pretas';
            turnTextEl.textContent = `Sua vez (${colorName})`;
            indicator.classList.remove('ai-turn');
        } else {
            const colorName = pColor === WHITE ? 'Pretas' : 'Brancas';
            turnTextEl.textContent = `Vez da IA (${colorName})`;
            indicator.classList.add('ai-turn');
        }
    }

    /**
     * Atualiza contagem de peças
     */
    function updatePieceCount(playerCount, aiCount) {
        playerPiecesEl.textContent = playerCount;
        aiPiecesEl.textContent = aiCount;
    }

    /**
     * Mostra/oculta indicador de pensamento da IA
     */
    function showAIThinking(show) {
        aiThinkingEl.classList.toggle('hidden', !show);
    }

    /**
     * Define mensagem de status
     */
    function setStatus(msg) {
        statusMessageEl.textContent = msg;
    }

    /**
     * Habilita/desabilita interatividade
     */
    function setInteractive(interactive) {
        isInteractive = interactive;
    }

    /**
     * Habilita/desabilita botão de undo
     */
    function setUndoEnabled(enabled) {
        btnUndo.disabled = !enabled;
    }

    /**
     * Define o último movimento (para destaque visual)
     */
    function setLastMove(from, to) {
        lastMoveFrom = from ? { row: from.row, col: from.col } : null;
        lastMoveTo = to ? { row: to.row, col: to.col } : null;
    }

    /**
     * Adiciona entrada ao log de jogadas
     */
    function addMoveLog(moveNumber, color, moveStr) {
        const entry = document.createElement('div');
        const isPlayer = color === currentPlayerColor;
        entry.className = 'log-entry ' + (isPlayer ? 'player-move' : 'ai-move');
        const label = isPlayer ? 'Jog' : 'IA';
        entry.textContent = `${moveNumber}. ${label}: ${moveStr}`;
        moveLogEl.appendChild(entry);
        moveLogEl.scrollTop = moveLogEl.scrollHeight;
    }

    /**
     * Limpa log de jogadas
     */
    function clearMoveLog() {
        moveLogEl.innerHTML = '';
    }

    /**
     * Obtém a dificuldade selecionada
     */
    function getDifficulty() {
        return difficultySelect.value;
    }

    /**
     * Obtém quem começa (player ou ai)
     */
    function getWhoStarts() {
        return whoStartsSelect.value;
    }

    /**
     * Define a cor que o jogador controla
     */
    function setPlayerColor(color) {
        currentPlayerColor = color;
    }

    /**
     * Mostra overlay de fim de jogo
     */
    function showGameOver(result) {
        // Remover overlay existente
        const existing = document.getElementById('game-over-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';

        let title, message;
        switch (result) {
            case 'player_wins':
                title = '🎉 Você Venceu!';
                message = 'Parabéns! Você derrotou a IA!';
                break;
            case 'ai_wins':
                title = '😔 IA Venceu';
                message = 'A IA foi superior desta vez. Tente novamente!';
                break;
            case 'draw':
                title = '🤝 Empate';
                message = 'O jogo terminou empatado.';
                break;
            default:
                title = 'Fim de Jogo';
                message = '';
        }

        overlay.innerHTML = `
            <div id="game-over-box">
                <h2>${title}</h2>
                <p>${message}</p>
                <button id="btn-new-game">Nova Partida</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-new-game').addEventListener('click', () => {
            overlay.remove();
            if (btnRestart) btnRestart.click();
        });
    }

    // API pública
    return {
        init,
        renderBoard,
        clearSelection,
        setTurn,
        updatePieceCount,
        showAIThinking,
        setStatus,
        setInteractive,
        setUndoEnabled,
        setLastMove,
        addMoveLog,
        clearMoveLog,
        getDifficulty,
        getWhoStarts,
        setPlayerColor,
        showGameOver
    };
})();
