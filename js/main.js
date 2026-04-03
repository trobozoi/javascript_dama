/**
 * Damas Brasileiras - Arquivo Principal
 *
 * Controla o fluxo do jogo, conecta lógica, IA e UI.
 */

const Game = (() => {
    const {
        BLACK, WHITE, BOARD_SIZE,
        createInitialBoard, cloneBoard, getAllLegalMoves, executeMove,
        countPieces, countKings, getGameState, moveToString, oppositeColor
    } = GameLogic;

    // Estado do jogo
    let board = null;
    let currentTurn = WHITE;       // Brancas sempre começam (regra oficial)
    let playerColor = WHITE;       // Cor do jogador humano
    let aiColor = BLACK;           // Cor da IA
    let difficulty = 'expert';
    let moveHistory = [];          // Para undo: [{board, turn, movesSinceCapture}]
    let moveNumber = 0;
    let movesSinceCapture = 0;     // Para regra de empate
    let gameOver = false;
    let aiIsThinking = false;

    /**
     * Inicializa o jogo
     */
    function init() {
        UI.init({
            onMove: handlePlayerMove,
            onUndo: handleUndo,
            onRestart: restartGame,
            onDifficultyChange: (diff) => { difficulty = diff; },
            onStartChange: () => {},  // Reinício é feito pelo botão
            onFlip: () => { updateUI(); }
        });

        restartGame();
    }

    /**
     * Reinicia o jogo
     */
    function restartGame() {
        board = createInitialBoard();
        currentTurn = WHITE; // Brancas sempre começam

        // Determinar cores com base na seleção
        const whoStarts = UI.getWhoStarts();
        if (whoStarts === 'player') {
            playerColor = WHITE;
            aiColor = BLACK;
        } else {
            playerColor = BLACK;
            aiColor = WHITE;
        }

        moveHistory = [];
        moveNumber = 0;
        movesSinceCapture = 0;
        gameOver = false;
        aiIsThinking = false;

        AIEngine.clearTT();
        UI.clearMoveLog();
        UI.clearSelection();
        UI.setLastMove(null, null);
        UI.setStatus('');
        UI.showAIThinking(false);
        UI.setInteractive(true);
        UI.setPlayerColor(playerColor);

        difficulty = UI.getDifficulty();

        updateUI();

        // Se a IA começa (IA é branca), disparar jogada da IA
        if (aiColor === WHITE) {
            currentTurn = WHITE;
            updateUI();
            triggerAIMove();
        }
    }

    /**
     * Atualiza toda a interface
     */
    function updateUI() {
        const legalMoves = getAllLegalMoves(board, currentTurn);

        UI.setTurn(currentTurn, playerColor);
        UI.updatePieceCount(countPieces(board, playerColor), countPieces(board, aiColor));
        UI.setUndoEnabled(moveHistory.length >= 2 && !aiIsThinking && !gameOver);
        UI.renderBoard(board, currentTurn, legalMoves, playerColor);

        // Verificar captura obrigatória (só mostrar no turno do jogador)
        if (currentTurn === playerColor && legalMoves.length > 0 && legalMoves[0].isCapture) {
            UI.setStatus(`Captura obrigatória! (${legalMoves[0].captureCount}x)`);
        }
    }

    /**
     * Manipula o movimento do jogador humano
     */
    function handlePlayerMove(move) {
        if (gameOver || aiIsThinking || currentTurn !== playerColor) return;

        // Salvar estado para undo
        saveState();

        // Executar movimento
        board = executeMove(board, move);
        moveNumber++;
        movesSinceCapture = move.isCapture ? 0 : movesSinceCapture + 1;

        // Log
        UI.addMoveLog(moveNumber, playerColor, moveToString(move));
        UI.setLastMove(
            { row: move.fromRow, col: move.fromCol },
            { row: move.toRow, col: move.toCol }
        );
        UI.clearSelection();
        UI.setStatus('');

        // Verificar fim de jogo
        const state = getGameState(board, aiColor, movesSinceCapture);
        if (state !== 'playing') {
            endGame(state);
            return;
        }

        // Turno da IA
        currentTurn = aiColor;
        updateUI();
        triggerAIMove();
    }

    /**
     * Dispara o movimento da IA
     */
    async function triggerAIMove() {
        if (gameOver) return;

        aiIsThinking = true;
        UI.setInteractive(false);
        UI.showAIThinking(true);
        UI.setUndoEnabled(false);

        try {
            const move = await AIEngine.findBestMoveAsync(board, difficulty, 15000, aiColor);

            if (!move || gameOver) {
                aiIsThinking = false;
                UI.showAIThinking(false);
                UI.setInteractive(true);
                return;
            }

            // Salvar estado para undo
            saveState();

            // Executar movimento
            board = executeMove(board, move);
            moveNumber++;
            movesSinceCapture = move.isCapture ? 0 : movesSinceCapture + 1;

            // Log
            UI.addMoveLog(moveNumber, aiColor, moveToString(move));
            UI.setLastMove(
                { row: move.fromRow, col: move.fromCol },
                { row: move.toRow, col: move.toCol }
            );
        } finally {
            aiIsThinking = false;
            UI.showAIThinking(false);
            UI.setInteractive(true);
        }

        // Verificar fim de jogo
        const state = getGameState(board, playerColor, movesSinceCapture);
        if (state !== 'playing') {
            endGame(state);
            return;
        }

        currentTurn = playerColor;
        updateUI();
    }

    /**
     * Salva estado para undo
     */
    function saveState() {
        moveHistory.push({
            board: cloneBoard(board),
            turn: currentTurn,
            moveNumber,
            movesSinceCapture
        });
    }

    /**
     * Desfaz a última jogada (volta jogada do jogador + IA)
     */
    function handleUndo() {
        if (moveHistory.length < 2 || aiIsThinking || gameOver) return;

        // Volta 2 estados (jogada da IA + jogada do jogador)
        moveHistory.pop(); // Remove o estado pós-jogada do jogador (que originou a jogada da IA)
        const prevState = moveHistory.pop();

        board = prevState.board;
        currentTurn = prevState.turn;
        moveNumber = prevState.moveNumber;
        movesSinceCapture = prevState.movesSinceCapture;

        UI.clearSelection();
        UI.setLastMove(null, null);
        UI.setStatus('Jogada desfeita.');

        updateUI();
    }

    /**
     * Finaliza o jogo
     */
    function endGame(result) {
        gameOver = true;
        UI.setInteractive(false);
        UI.renderBoard(board, currentTurn, [], playerColor);

        // Determinar resultado do ponto de vista do jogador
        const playerWins = (playerColor === BLACK && result === 'black_wins') ||
                           (playerColor === WHITE && result === 'white_wins');
        const aiWins = (aiColor === BLACK && result === 'black_wins') ||
                       (aiColor === WHITE && result === 'white_wins');

        let statusText;
        let gameOverResult;
        if (playerWins) {
            statusText = 'Você venceu! 🎉';
            gameOverResult = 'player_wins';
        } else if (aiWins) {
            statusText = 'IA venceu! 😔';
            gameOverResult = 'ai_wins';
        } else {
            statusText = 'Empate! 🤝';
            gameOverResult = 'draw';
        }
        UI.setStatus(statusText);
        UI.showGameOver(gameOverResult);
    }

    // API pública
    return { init, restartGame };
})();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
