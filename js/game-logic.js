/**
 * Damas Brasileiras - Módulo de Lógica do Jogo
 *
 * Constantes:
 *   EMPTY = 0, BLACK = 1, WHITE = 2, BLACK_KING = 3, WHITE_KING = 4
 *   BLACK joga de cima para baixo (linhas 0-2 iniciais)
 *   WHITE joga de baixo para cima (linhas 5-7 iniciais)
 *   Jogador humano = BLACK, IA = WHITE
 */

const GameLogic = (() => {
    // Constantes de peças
    const EMPTY = 0;
    const BLACK = 1;       // Jogador
    const WHITE = 2;       // IA
    const BLACK_KING = 3;
    const WHITE_KING = 4;
    const BOARD_SIZE = 8;

    // Direções diagonais
    const DIRECTIONS = [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 }
    ];

    /**
     * Cria um tabuleiro inicial
     */
    function createInitialBoard() {
        const board = Array.from({ length: BOARD_SIZE }, () =>
            Array(BOARD_SIZE).fill(EMPTY)
        );

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if ((r + c) % 2 === 1) {
                    if (r < 3) board[r][c] = BLACK;
                    else if (r > 4) board[r][c] = WHITE;
                }
            }
        }
        return board;
    }

    /**
     * Clona profundamente um tabuleiro
     */
    function cloneBoard(board) {
        return board.map(row => row.slice());
    }

    /**
     * Verifica se a posição está dentro do tabuleiro
     */
    function inBounds(r, c) {
        return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    }

    /**
     * Retorna a cor da peça (BLACK ou WHITE)
     */
    function pieceColor(piece) {
        if (piece === BLACK || piece === BLACK_KING) return BLACK;
        if (piece === WHITE || piece === WHITE_KING) return WHITE;
        return EMPTY;
    }

    /**
     * Retorna a cor oposta
     */
    function oppositeColor(color) {
        return color === BLACK ? WHITE : BLACK;
    }

    /**
     * Verifica se uma peça é dama
     */
    function isKing(piece) {
        return piece === BLACK_KING || piece === WHITE_KING;
    }

    /**
     * Verifica se uma peça pertence a uma cor
     */
    function belongsTo(piece, color) {
        return pieceColor(piece) === color;
    }

    /**
     * Promove peça se atingiu a última fileira
     */
    function promoteIfNeeded(board, r, c) {
        const piece = board[r][c];
        if (piece === BLACK && r === BOARD_SIZE - 1) {
            board[r][c] = BLACK_KING;
            return true;
        }
        if (piece === WHITE && r === 0) {
            board[r][c] = WHITE_KING;
            return true;
        }
        return false;
    }

    // =========================================================
    //  GERAÇÃO DE MOVIMENTOS
    // =========================================================

    /**
     * Obtém todas as sequências de captura para uma peça em (r, c).
     * Retorna array de sequências, cada uma sendo um array de {from, to, captured}.
     * Damas podem capturar à distância (estilo brasileiro).
     */
    function getCaptureSequences(board, r, c, color) {
        const piece = board[r][c];
        const sequences = [];

        function dfs(bd, row, col, currentPiece, seq) {
            const captures = getSingleCaptures(bd, row, col, currentPiece, color);
            if (captures.length === 0) {
                if (seq.length > 0) {
                    sequences.push([...seq]);
                }
                return;
            }
            for (const cap of captures) {
                const newBoard = cloneBoard(bd);
                newBoard[row][col] = EMPTY;
                newBoard[cap.capturedRow][cap.capturedCol] = EMPTY;
                // Durante captura múltipla a peça NÃO promove ao passar pela
                // última linha — ela continua como peça normal. A promoção só
                // acontece se a peça TERMINAR sua sequência na linha de promoção.
                newBoard[cap.toRow][cap.toCol] = currentPiece;

                seq.push({
                    fromRow: row, fromCol: col,
                    toRow: cap.toRow, toCol: cap.toCol,
                    capturedRow: cap.capturedRow, capturedCol: cap.capturedCol
                });

                dfs(newBoard, cap.toRow, cap.toCol, currentPiece, seq);
                seq.pop();
            }
        }

        dfs(board, r, c, piece, []);
        return sequences;
    }

    /**
     * Obtém capturas simples (um passo) a partir de (r, c).
     * Damas capturam à distância.
     */
    function getSingleCaptures(board, r, c, piece, color) {
        const captures = [];
        const enemy = oppositeColor(color);

        if (isKing(piece)) {
            // Dama: pode capturar à distância
            for (const dir of DIRECTIONS) {
                let dr = dir.dr, dc = dir.dc;
                let cr = r + dr, cc = c + dc;
                // Percorre diagonal até encontrar peça
                while (inBounds(cr, cc) && board[cr][cc] === EMPTY) {
                    cr += dr;
                    cc += dc;
                }
                // Encontrou peça inimiga?
                if (inBounds(cr, cc) && belongsTo(board[cr][cc], enemy)) {
                    const capturedR = cr, capturedC = cc;
                    // Casa(s) após a peça capturada devem ser livres
                    cr += dr;
                    cc += dc;
                    while (inBounds(cr, cc) && board[cr][cc] === EMPTY) {
                        captures.push({
                            toRow: cr, toCol: cc,
                            capturedRow: capturedR, capturedCol: capturedC
                        });
                        cr += dr;
                        cc += dc;
                    }
                }
            }
        } else {
            // Peça normal: captura em todas as 4 direções diagonais (1 casa)
            for (const dir of DIRECTIONS) {
                const mr = r + dir.dr, mc = c + dir.dc;
                const jr = r + 2 * dir.dr, jc = c + 2 * dir.dc;
                if (inBounds(jr, jc) &&
                    belongsTo(board[mr][mc], enemy) &&
                    board[jr][jc] === EMPTY) {
                    captures.push({
                        toRow: jr, toCol: jc,
                        capturedRow: mr, capturedCol: mc
                    });
                }
            }
        }
        return captures;
    }

    /**
     * Obtém movimentos simples (sem captura) para uma peça em (r, c).
     */
    function getSimpleMoves(board, r, c, color) {
        const piece = board[r][c];
        const moves = [];

        if (isKing(piece)) {
            // Dama: move múltiplas casas na diagonal
            for (const dir of DIRECTIONS) {
                let cr = r + dir.dr, cc = c + dir.dc;
                while (inBounds(cr, cc) && board[cr][cc] === EMPTY) {
                    moves.push({ fromRow: r, fromCol: c, toRow: cr, toCol: cc });
                    cr += dir.dr;
                    cc += dir.dc;
                }
            }
        } else {
            // Peça normal: move 1 casa na diagonal para frente
            const forwardDirs = color === BLACK
                ? [{ dr: 1, dc: -1 }, { dr: 1, dc: 1 }]
                : [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }];

            for (const dir of forwardDirs) {
                const nr = r + dir.dr, nc = c + dir.dc;
                if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
                    moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
                }
            }
        }
        return moves;
    }

    /**
     * Obtém todos os movimentos legais para uma cor.
     * Aplica regra de captura obrigatória e regra da maioria.
     *
     * Retorna array de objetos Move:
     * {
     *   fromRow, fromCol, toRow, toCol,
     *   captures: [{capturedRow, capturedCol}],
     *   isCapture: boolean,
     *   steps: [{fromRow, fromCol, toRow, toCol}]  // para capturas múltiplas
     * }
     */
    function getAllLegalMoves(board, color) {
        const allCaptures = [];
        const allSimple = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (!belongsTo(board[r][c], color)) continue;

                // Capturas
                const sequences = getCaptureSequences(board, r, c, color);
                for (const seq of sequences) {
                    if (seq.length > 0) {
                        allCaptures.push({
                            fromRow: seq[0].fromRow,
                            fromCol: seq[0].fromCol,
                            toRow: seq[seq.length - 1].toRow,
                            toCol: seq[seq.length - 1].toCol,
                            captures: seq.map(s => ({ capturedRow: s.capturedRow, capturedCol: s.capturedCol })),
                            isCapture: true,
                            captureCount: seq.length,
                            steps: seq.map(s => ({ fromRow: s.fromRow, fromCol: s.fromCol, toRow: s.toRow, toCol: s.toCol }))
                        });
                    }
                }

                // Movimentos simples
                const simple = getSimpleMoves(board, r, c, color);
                for (const m of simple) {
                    allSimple.push({
                        ...m,
                        captures: [],
                        isCapture: false,
                        captureCount: 0,
                        steps: [{ fromRow: m.fromRow, fromCol: m.fromCol, toRow: m.toRow, toCol: m.toCol }]
                    });
                }
            }
        }

        // Captura obrigatória
        if (allCaptures.length > 0) {
            // Regra da maioria: escolher sequências com maior número de capturas
            const maxCaptures = Math.max(...allCaptures.map(c => c.captureCount));
            return allCaptures.filter(c => c.captureCount === maxCaptures);
        }

        return allSimple;
    }

    /**
     * Executa um movimento no tabuleiro. Retorna novo tabuleiro.
     */
    function executeMove(board, move) {
        const newBoard = cloneBoard(board);

        if (move.isCapture) {
            // Executar passo a passo
            let piece = newBoard[move.fromRow][move.fromCol];
            newBoard[move.fromRow][move.fromCol] = EMPTY;

            for (const step of move.steps) {
                // Remove peça capturada
                const cap = move.captures[move.steps.indexOf(step)];
                newBoard[cap.capturedRow][cap.capturedCol] = EMPTY;
            }

            // Coloca peça na posição final
            newBoard[move.toRow][move.toCol] = piece;

            // Promoção
            promoteIfNeeded(newBoard, move.toRow, move.toCol);
        } else {
            const piece = newBoard[move.fromRow][move.fromCol];
            newBoard[move.fromRow][move.fromCol] = EMPTY;
            newBoard[move.toRow][move.toCol] = piece;
            promoteIfNeeded(newBoard, move.toRow, move.toCol);
        }

        return newBoard;
    }

    /**
     * Conta peças de uma cor
     */
    function countPieces(board, color) {
        let count = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (belongsTo(board[r][c], color)) count++;
            }
        }
        return count;
    }

    /**
     * Conta damas de uma cor
     */
    function countKings(board, color) {
        let count = 0;
        const king = color === BLACK ? BLACK_KING : WHITE_KING;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === king) count++;
            }
        }
        return count;
    }

    /**
     * Verifica estado do jogo
     * Retorna: 'playing', 'black_wins', 'white_wins', 'draw'
     */
    function getGameState(board, currentTurn, movesSinceCapture) {
        const blackMoves = getAllLegalMoves(board, BLACK);
        const whiteMoves = getAllLegalMoves(board, WHITE);
        const blackCount = countPieces(board, BLACK);
        const whiteCount = countPieces(board, WHITE);

        if (blackCount === 0 || (currentTurn === BLACK && blackMoves.length === 0)) {
            return 'white_wins';
        }
        if (whiteCount === 0 || (currentTurn === WHITE && whiteMoves.length === 0)) {
            return 'black_wins';
        }

        // Empate por ausência de progresso (40 movimentos sem captura)
        if (movesSinceCapture >= 40) {
            return 'draw';
        }

        return 'playing';
    }

    /**
     * Converte posição para notação (ex: 0,1 -> "a8")
     */
    function posToNotation(r, c) {
        const col = String.fromCharCode(97 + c); // a-h
        const row = BOARD_SIZE - r;
        return `${col}${row}`;
    }

    /**
     * Converte movimento para string legível
     */
    function moveToString(move) {
        const from = posToNotation(move.fromRow, move.fromCol);
        const to = posToNotation(move.toRow, move.toCol);
        if (move.isCapture) {
            return `${from}x${to} (${move.captureCount}x)`;
        }
        return `${from}-${to}`;
    }

    /**
     * Gera uma chave hash simples do tabuleiro para tabela de transposição
     */
    function boardHash(board, color) {
        let hash = color === BLACK ? 0 : 1;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if ((r + c) % 2 === 1) {
                    hash = ((hash * 5) + board[r][c]) | 0;
                }
            }
        }
        return hash;
    }

    // Zobrist hashing para tabela de transposição (mais robusto)
    const ZOBRIST = (() => {
        const table = [];
        // Usar PRNG determinístico para reprodutibilidade
        let seed = 123456789;
        function rand() {
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            return (seed >>> 0);
        }
        for (let r = 0; r < BOARD_SIZE; r++) {
            table[r] = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                table[r][c] = [];
                for (let p = 0; p <= 4; p++) {
                    table[r][c][p] = rand() ^ (rand() << 16);
                }
            }
        }
        const turnKey = rand() ^ (rand() << 16);
        return { table, turnKey };
    })();

    function zobristHash(board, color) {
        let h = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const p = board[r][c];
                if (p !== EMPTY) {
                    h ^= ZOBRIST.table[r][c][p];
                }
            }
        }
        if (color === WHITE) h ^= ZOBRIST.turnKey;
        return h;
    }

    // API pública
    return {
        EMPTY, BLACK, WHITE, BLACK_KING, WHITE_KING, BOARD_SIZE, DIRECTIONS,
        createInitialBoard,
        cloneBoard,
        inBounds,
        pieceColor,
        oppositeColor,
        isKing,
        belongsTo,
        promoteIfNeeded,
        getCaptureSequences,
        getSimpleMoves,
        getAllLegalMoves,
        executeMove,
        countPieces,
        countKings,
        getGameState,
        posToNotation,
        moveToString,
        boardHash,
        zobristHash
    };
})();
