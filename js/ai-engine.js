/**
 * Damas Brasileiras - Motor de IA
 *
 * Minimax com poda Alpha-Beta, tabela de transposição, ordenação de movimentos,
 * iterative deepening e heurística avançada.
 */

const AIEngine = (() => {
    const {
        EMPTY, BLACK, WHITE, BLACK_KING, WHITE_KING, BOARD_SIZE,
        cloneBoard, pieceColor, oppositeColor, isKing, belongsTo,
        getAllLegalMoves, executeMove, countPieces, countKings,
        getGameState, zobristHash
    } = GameLogic;

    // Configurações de dificuldade (profundidade)
    const DIFFICULTY_DEPTH = {
        easy: 4,
        medium: 6,
        hard: 8,
        expert: 10,
        master: 12,
        master2: 14,
        master3: 16,
        master4: 18,
        master5: 20,
        master6: 22,
        master7: 24,
        master8: 26,
        master9: 28,
        master0: 30
    };

    // Tabela de transposição
    let transpositionTable = new Map();
    const TT_MAX_SIZE = 2_000_000;
    const TT_EXACT = 0;
    const TT_ALPHA = 1;
    const TT_BETA = 2;

    // Contadores de performance
    let nodesSearched = 0;
    let ttHits = 0;

    /**
     * Limpa a tabela de transposição
     */
    function clearTT() {
        transpositionTable.clear();
    }

    // =========================================================
    //  FUNÇÃO DE AVALIAÇÃO HEURÍSTICA
    // =========================================================

    /**
     * Avalia o tabuleiro do ponto de vista de WHITE (IA).
     * Retorno positivo = bom para IA, negativo = bom para jogador.
     */
    function evaluate(board) {
        let score = 0;

        let whitePieces = 0, blackPieces = 0;
        let whiteKings = 0, blackKings = 0;
        let whiteMobility = 0, blackMobility = 0;
        let whiteCenter = 0, blackCenter = 0;
        let whiteAdvance = 0, blackAdvance = 0;
        let whiteDefense = 0, blackDefense = 0;
        let whiteEdge = 0, blackEdge = 0;
        let whiteSafe = 0, blackSafe = 0;

        // Contar peças e características posicionais
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const piece = board[r][c];
                if (piece === EMPTY) continue;

                const color = pieceColor(piece);
                const king = isKing(piece);

                if (color === WHITE) {
                    whitePieces++;
                    if (king) whiteKings++;

                    // Controle de centro (casas centrais valem mais)
                    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
                        whiteCenter += king ? 3 : 2;
                    }
                    if (r >= 3 && r <= 4 && c >= 3 && c <= 4) {
                        whiteCenter += 2; // Centro do centro vale mais
                    }

                    // Avanço (proximidade da promoção)
                    if (!king) {
                        whiteAdvance += (BOARD_SIZE - 1 - r); // WHITE avança para cima (row 0)
                    }

                    // Peças na última fileira (defesa)
                    if (r === BOARD_SIZE - 1) {
                        whiteDefense += 2;
                    }

                    // Peças nas bordas laterais (proteção)
                    if (c === 0 || c === BOARD_SIZE - 1) {
                        whiteEdge++;
                    }

                    // Peças seguras (nas bordas ou protegidas)
                    if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) {
                        whiteSafe++;
                    }
                } else {
                    blackPieces++;
                    if (king) blackKings++;

                    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
                        blackCenter += king ? 3 : 2;
                    }
                    if (r >= 3 && r <= 4 && c >= 3 && c <= 4) {
                        blackCenter += 2;
                    }

                    if (!king) {
                        blackAdvance += r; // BLACK avança para baixo (row 7)
                    }

                    if (r === 0) {
                        blackDefense += 2;
                    }

                    if (c === 0 || c === BOARD_SIZE - 1) {
                        blackEdge++;
                    }

                    if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) {
                        blackSafe++;
                    }
                }
            }
        }

        // Verificar vitória/derrota
        if (blackPieces === 0) return 100000;
        if (whitePieces === 0) return -100000;

        // Mobilidade
        const whiteMoves = getAllLegalMoves(board, WHITE);
        const blackMoves = getAllLegalMoves(board, BLACK);
        whiteMobility = whiteMoves.length;
        blackMobility = blackMoves.length;

        if (blackMobility === 0) return 100000;
        if (whiteMobility === 0) return -100000;

        // Potencial de captura
        const whiteCaptures = whiteMoves.filter(m => m.isCapture);
        const blackCaptures = blackMoves.filter(m => m.isCapture);
        const whiteCaptureValue = whiteCaptures.reduce((sum, m) => sum + m.captureCount, 0);
        const blackCaptureValue = blackCaptures.reduce((sum, m) => sum + m.captureCount, 0);

        const totalPieces = whitePieces + blackPieces;
        const isEndgame = totalPieces <= 8;

        // === PESOS ===
        const PIECE_WEIGHT = 1000;
        const KING_WEIGHT = 1600;
        const MOBILITY_WEIGHT = isEndgame ? 15 : 8;
        const CENTER_WEIGHT = isEndgame ? 5 : 12;
        const ADVANCE_WEIGHT = isEndgame ? 20 : 6;
        const DEFENSE_WEIGHT = isEndgame ? 3 : 8;
        const CAPTURE_WEIGHT = 25;
        const SAFE_WEIGHT = 5;
        const EDGE_PENALTY = -2;

        // Material
        const normalDiff = (whitePieces - whiteKings) - (blackPieces - blackKings);
        const kingDiff = whiteKings - blackKings;
        score += normalDiff * PIECE_WEIGHT;
        score += kingDiff * KING_WEIGHT;

        // Mobilidade
        score += (whiteMobility - blackMobility) * MOBILITY_WEIGHT;

        // Centro
        score += (whiteCenter - blackCenter) * CENTER_WEIGHT;

        // Avanço
        score += (whiteAdvance - blackAdvance) * ADVANCE_WEIGHT;

        // Defesa
        score += (whiteDefense - blackDefense) * DEFENSE_WEIGHT;

        // Potencial de captura
        score += (whiteCaptureValue - blackCaptureValue) * CAPTURE_WEIGHT;

        // Segurança
        score += (whiteSafe - blackSafe) * SAFE_WEIGHT;

        // Penalidade por borda (peças nas bordas são menos flexíveis)
        score += (whiteEdge - blackEdge) * EDGE_PENALTY;

        // Bônus por vantagem de formação
        // Peça atrás (back row) preservada dá vantagem defensiva
        if (!isEndgame) {
            let whiteBackRow = 0, blackBackRow = 0;
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[BOARD_SIZE - 1][c] === WHITE) whiteBackRow++;
                if (board[0][c] === BLACK) blackBackRow++;
            }
            score += (whiteBackRow - blackBackRow) * 6;
        }

        // Em endgame, centralizar damas é muito importante
        if (isEndgame && (whiteKings > 0 || blackKings > 0)) {
            let whiteKingCentral = 0, blackKingCentral = 0;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c] === WHITE_KING) {
                        const dist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
                        whiteKingCentral += (7 - dist);
                    }
                    if (board[r][c] === BLACK_KING) {
                        const dist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
                        blackKingCentral += (7 - dist);
                    }
                }
            }
            score += (whiteKingCentral - blackKingCentral) * 8;
        }

        return score;
    }

    // =========================================================
    //  ORDENAÇÃO DE MOVIMENTOS
    // =========================================================

    /**
     * Ordena movimentos para melhorar a poda alpha-beta.
     * Capturas primeiro, depois por valor heurístico.
     */
    function orderMoves(moves, board, color, bestMoveTT) {
        return moves.map(move => {
            let priority = 0;

            // Movimento da TT tem prioridade máxima
            if (bestMoveTT && movesEqual(move, bestMoveTT)) {
                priority += 100000;
            }

            // Capturas têm alta prioridade
            if (move.isCapture) {
                priority += 10000 + move.captureCount * 1000;
            }

            // Promoções
            if (!isKing(board[move.fromRow][move.fromCol])) {
                if ((color === WHITE && move.toRow === 0) ||
                    (color === BLACK && move.toRow === BOARD_SIZE - 1)) {
                    priority += 5000;
                }
            }

            // Centro
            const centerDist = Math.abs(move.toRow - 3.5) + Math.abs(move.toCol - 3.5);
            priority += (7 - centerDist) * 10;

            return { move, priority };
        })
        .sort((a, b) => b.priority - a.priority)
        .map(item => item.move);
    }

    function movesEqual(a, b) {
        return a.fromRow === b.fromRow && a.fromCol === b.fromCol &&
               a.toRow === b.toRow && a.toCol === b.toCol;
    }

    // =========================================================
    //  MINIMAX COM PODA ALPHA-BETA
    // =========================================================

    /**
     * Minimax com Alpha-Beta e tabela de transposição.
     * Retorna o valor da posição.
     * aiColor indica qual cor a IA controla (para orientar a avaliação).
     */
    function alphaBeta(board, depth, alpha, beta, maximizingPlayer, color, aiColor) {
        nodesSearched++;

        // Consulta tabela de transposição
        const hash = zobristHash(board, color);
        const ttEntry = transpositionTable.get(hash);
        if (ttEntry && ttEntry.depth >= depth) {
            ttHits++;
            if (ttEntry.flag === TT_EXACT) return ttEntry.value;
            if (ttEntry.flag === TT_ALPHA && ttEntry.value <= alpha) return alpha;
            if (ttEntry.flag === TT_BETA && ttEntry.value >= beta) return beta;
        }

        // Nó terminal ou profundidade 0
        if (depth === 0) {
            const rawEval = evaluate(board);
            return aiColor === WHITE ? rawEval : -rawEval;
        }

        const moves = getAllLegalMoves(board, color);

        if (moves.length === 0) {
            // Sem movimentos = derrota
            return maximizingPlayer ? -100000 - depth : 100000 + depth;
        }

        // Ordenar movimentos
        const bestMoveTT = ttEntry ? ttEntry.bestMove : null;
        const orderedMoves = orderMoves(moves, board, color, bestMoveTT);

        let bestMove = null;

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of orderedMoves) {
                const newBoard = executeMove(board, move);
                const eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, false, oppositeColor(color), aiColor);
                if (eval_ > maxEval) {
                    maxEval = eval_;
                    bestMove = move;
                }
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break; // Poda
            }

            // Armazena na TT
            storeTT(hash, depth, maxEval, alpha, beta, bestMove);
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of orderedMoves) {
                const newBoard = executeMove(board, move);
                const eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, true, oppositeColor(color), aiColor);
                if (eval_ < minEval) {
                    minEval = eval_;
                    bestMove = move;
                }
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break; // Poda
            }

            storeTT(hash, depth, minEval, alpha, beta, bestMove);
            return minEval;
        }
    }

    function storeTT(hash, depth, value, alpha, beta, bestMove) {
        let flag;
        if (value <= alpha) flag = TT_ALPHA;
        else if (value >= beta) flag = TT_BETA;
        else flag = TT_EXACT;

        // Limitar tamanho da TT
        if (transpositionTable.size >= TT_MAX_SIZE) {
            // Limpar metade da tabela (entries mais antigas)
            const entries = Array.from(transpositionTable.entries());
            transpositionTable.clear();
            const keepCount = Math.floor(entries.length / 2);
            for (let i = entries.length - keepCount; i < entries.length; i++) {
                transpositionTable.set(entries[i][0], entries[i][1]);
            }
        }

        transpositionTable.set(hash, { depth, value, flag, bestMove });
    }

    // =========================================================
    //  ITERATIVE DEEPENING
    // =========================================================

    /**
     * Busca com Iterative Deepening para encontrar o melhor movimento.
     * aiColor indica qual cor a IA controla (WHITE ou BLACK).
     */
    function findBestMove(board, difficulty, timeLimitMs, aiColor) {
        const myColor = aiColor || WHITE;
        const opponentColor = oppositeColor(myColor);
        const maxDepth = DIFFICULTY_DEPTH[difficulty] || 10;
        const timeLimit = timeLimitMs || 15000; // 15s padrão
        const startTime = Date.now();

        nodesSearched = 0;
        ttHits = 0;

        const moves = getAllLegalMoves(board, myColor);

        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0]; // Único movimento possível

        let bestMove = moves[0];
        let bestScore = -Infinity;

        // Iterative deepening
        for (let depth = 2; depth <= maxDepth; depth += 2) {
            const elapsed = Date.now() - startTime;
            if (elapsed > timeLimit * 0.7) break; // Não iniciar nova iteração se pouco tempo

            let currentBest = null;
            let currentBestScore = -Infinity;

            const orderedMoves = orderMoves(moves, board, myColor,
                transpositionTable.get(zobristHash(board, myColor))?.bestMove);

            for (const move of orderedMoves) {
                const newBoard = executeMove(board, move);
                const score = alphaBeta(newBoard, depth - 1, -Infinity, Infinity, false, opponentColor, myColor);

                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBest = move;
                }

                // Verificar tempo
                if (Date.now() - startTime > timeLimit) break;
            }

            if (currentBest) {
                bestMove = currentBest;
                bestScore = currentBestScore;
            }

            // Se encontrou vitória forçada, não precisa aprofundar mais
            if (bestScore >= 90000) break;
        }

        const totalTime = Date.now() - startTime;
        console.log(`IA: ${nodesSearched} nós, ${ttHits} TT hits, ${totalTime}ms, score=${bestScore}`);

        return bestMove;
    }

    /**
     * Wrapper assíncrono para não bloquear a UI
     */
    function findBestMoveAsync(board, difficulty, timeLimitMs, aiColor) {
        return new Promise((resolve) => {
            // Usar setTimeout para liberar a thread de renderização
            setTimeout(() => {
                const move = findBestMove(board, difficulty, timeLimitMs, aiColor);
                resolve(move);
            }, 50);
        });
    }

    // API pública
    return {
        findBestMove,
        findBestMoveAsync,
        evaluate,
        clearTT,
        DIFFICULTY_DEPTH
    };
})();
