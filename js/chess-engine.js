// ===== CHATURANGA CHESS ENGINE =====
// Full standard chess rules with ancient Indian piece names

class ChessEngine {
  constructor() {
    this.board = this.createInitialBoard();
    this.currentPlayer = 'white';
    this.selectedSquare = null;
    this.validMoves = [];
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.enPassantSquare = null;
    this.castlingRights = {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true }
    };
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.gameState = 'playing'; // playing, check, checkmate, stalemate, draw
    this.promotionPending = null;
  }

  createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    // Black pieces (row 0-1)
    const backRank = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRank[col], color: 'black', moved: false };
      board[1][col] = { type: 'pawn', color: 'black', moved: false };
      board[6][col] = { type: 'pawn', color: 'white', moved: false };
      board[7][col] = { type: backRank[col], color: 'white', moved: false };
    }
    return board;
  }

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return undefined;
    return this.board[row][col];
  }

  isEnemy(piece, color) {
    return piece !== null && piece !== undefined && piece.color !== color;
  }

  isFriendly(piece, color) {
    return piece !== null && piece !== undefined && piece.color === color;
  }

  // Get all pseudo-legal moves for a piece (doesn't check if king is in check)
  getPseudoLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    const moves = [];
    const { type, color } = piece;
    const dir = color === 'white' ? -1 : 1;

    switch (type) {
      case 'pawn':
        // Forward move
        if (!this.getPiece(row + dir, col)) {
          moves.push([row + dir, col, 'move']);
          // Double advance from start
          if (!piece.moved && !this.getPiece(row + 2 * dir, col)) {
            moves.push([row + 2 * dir, col, 'double']);
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const target = this.getPiece(row + dir, col + dc);
          if (target && this.isEnemy(target, color)) {
            moves.push([row + dir, col + dc, 'capture']);
          }
          // En passant
          if (this.enPassantSquare &&
            this.enPassantSquare[0] === row + dir &&
            this.enPassantSquare[1] === col + dc) {
            moves.push([row + dir, col + dc, 'enpassant']);
          }
        }
        break;

      case 'knight':
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!this.isFriendly(this.getPiece(nr, nc), color)) {
              moves.push([nr, nc, this.isEnemy(this.getPiece(nr, nc), color) ? 'capture' : 'move']);
            }
          }
        }
        break;

      case 'bishop':
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
          let nr = row + dr, nc = col + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.getPiece(nr, nc);
            if (this.isFriendly(target, color)) break;
            moves.push([nr, nc, target ? 'capture' : 'move']);
            if (target) break;
            nr += dr; nc += dc;
          }
        }
        break;

      case 'rook':
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          let nr = row + dr, nc = col + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.getPiece(nr, nc);
            if (this.isFriendly(target, color)) break;
            moves.push([nr, nc, target ? 'capture' : 'move']);
            if (target) break;
            nr += dr; nc += dc;
          }
        }
        break;

      case 'queen':
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
          let nr = row + dr, nc = col + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.getPiece(nr, nc);
            if (this.isFriendly(target, color)) break;
            moves.push([nr, nc, target ? 'capture' : 'move']);
            if (target) break;
            nr += dr; nc += dc;
          }
        }
        break;

      case 'king':
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!this.isFriendly(this.getPiece(nr, nc), color)) {
              moves.push([nr, nc, this.isEnemy(this.getPiece(nr, nc), color) ? 'capture' : 'move']);
            }
          }
        }
        // Castling
        if (!piece.moved && !this.isInCheck(color)) {
          const rank = color === 'white' ? 7 : 0;
          // Kingside
          const kRook = this.getPiece(rank, 7);
          if (kRook && kRook.type === 'rook' && !kRook.moved &&
            !this.getPiece(rank, 5) && !this.getPiece(rank, 6) &&
            !this.wouldBeInCheck(row, col, rank, 5, color) &&
            !this.wouldBeInCheck(row, col, rank, 6, color)) {
            moves.push([rank, 6, 'castle-kingside']);
          }
          // Queenside
          const qRook = this.getPiece(rank, 0);
          if (qRook && qRook.type === 'rook' && !qRook.moved &&
            !this.getPiece(rank, 1) && !this.getPiece(rank, 2) && !this.getPiece(rank, 3) &&
            !this.wouldBeInCheck(row, col, rank, 3, color) &&
            !this.wouldBeInCheck(row, col, rank, 2, color)) {
            moves.push([rank, 2, 'castle-queenside']);
          }
        }
        break;
    }
    return moves;
  }

  // Check if a given color's king is in check
  isInCheck(color) {
    let kingRow = -1, kingCol = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'king' && p.color === color) {
          kingRow = r; kingCol = c;
        }
      }
    }
    if (kingRow === -1) return false;
    return this.isSquareAttacked(kingRow, kingCol, color === 'white' ? 'black' : 'white');
  }

  isSquareAttacked(row, col, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === byColor) {
          const moves = this.getPseudoLegalMoves(r, c);
          if (moves.some(([mr, mc]) => mr === row && mc === col)) return true;
        }
      }
    }
    return false;
  }

  wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
    const saved = this.board[toRow][toCol];
    const piece = this.board[fromRow][fromCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    const inCheck = this.isInCheck(color);
    this.board[fromRow][fromCol] = piece;
    this.board[toRow][toCol] = saved;
    return inCheck;
  }

  // Get legal moves (filters out moves that leave king in check)
  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece.color !== this.currentPlayer) return [];
    const pseudo = this.getPseudoLegalMoves(row, col);
    return pseudo.filter(([toRow, toCol, type]) => {
      return !this.wouldBeInCheckAfterMove(row, col, toRow, toCol, type);
    });
  }

  wouldBeInCheckAfterMove(fromRow, fromCol, toRow, toCol, type) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return false;
    const color = piece.color;

    // Save state
    const savedFrom = this.board[fromRow][fromCol];
    const savedTo = this.board[toRow][toCol];
    const savedEnPassant = this.enPassantSquare;

    // Simulate main move
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    // Handle en passant capture square removal
    let epCapRow = null, epSavedPiece = null;
    if (type === 'enpassant') {
      const dir = color === 'white' ? 1 : -1;
      epCapRow = toRow + dir;
      epSavedPiece = this.board[epCapRow][toCol];
      this.board[epCapRow][toCol] = null;
    }

    const inCheck = this.isInCheck(color);

    // Restore
    this.board[fromRow][fromCol] = savedFrom;
    this.board[toRow][toCol] = savedTo;
    if (epCapRow !== null) this.board[epCapRow][toCol] = epSavedPiece;
    this.enPassantSquare = savedEnPassant;

    return inCheck;
  }

  // Execute a move and return move info
  executeMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return null;

    const legalMoves = this.getLegalMoves(fromRow, fromCol);
    const moveEntry = legalMoves.find(([r, c]) => r === toRow && c === toCol);
    if (!moveEntry) return null;

    const [, , type] = moveEntry;
    const capturedPiece = this.board[toRow][toCol];
    let moveInfo = {
      from: [fromRow, fromCol],
      to: [toRow, toCol],
      piece: { ...piece },
      type,
      captured: capturedPiece ? { ...capturedPiece } : null,
      promotion: false,
      enPassantCapture: null,
      castling: null
    };

    // Clear en passant
    this.enPassantSquare = null;

    // Handle special moves
    if (type === 'double') {
      const dir = piece.color === 'white' ? -1 : 1;
      this.enPassantSquare = [fromRow + dir, fromCol];
    }

    if (type === 'enpassant') {
      const capRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
      moveInfo.captured = { ...this.board[capRow][toCol] };
      moveInfo.enPassantCapture = [capRow, toCol];
      this.board[capRow][toCol] = null;
    }

    if (type === 'castle-kingside') {
      const rank = piece.color === 'white' ? 7 : 0;
      this.board[rank][5] = { ...this.board[rank][7], moved: true };
      this.board[rank][7] = null;
      moveInfo.castling = 'kingside';
    }

    if (type === 'castle-queenside') {
      const rank = piece.color === 'white' ? 7 : 0;
      this.board[rank][3] = { ...this.board[rank][0], moved: true };
      this.board[rank][0] = null;
      moveInfo.castling = 'queenside';
    }

    // Execute the main move
    this.board[toRow][toCol] = { ...piece, moved: true };
    this.board[fromRow][fromCol] = null;

    // Update castling rights
    if (piece.type === 'king') {
      this.castlingRights[piece.color].kingside = false;
      this.castlingRights[piece.color].queenside = false;
    }
    if (piece.type === 'rook') {
      const rank = piece.color === 'white' ? 7 : 0;
      if (fromRow === rank && fromCol === 0) this.castlingRights[piece.color].queenside = false;
      if (fromRow === rank && fromCol === 7) this.castlingRights[piece.color].kingside = false;
    }

    // Track captured pieces
    if (moveInfo.captured) {
      this.capturedPieces[piece.color].push(moveInfo.captured.type);
    }

    // Check for pawn promotion
    if (piece.type === 'pawn') {
      if ((piece.color === 'white' && toRow === 0) || (piece.color === 'black' && toRow === 7)) {
        moveInfo.promotion = true;
        this.promotionPending = { row: toRow, col: toCol, color: piece.color };
      }
    }

    // Switch player
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

    // Update half move clock
    if (piece.type === 'pawn' || moveInfo.captured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
    if (this.currentPlayer === 'white') this.fullMoveNumber++;

    // Store move history
    this.moveHistory.push(moveInfo);

    // Check game state
    this.updateGameState();

    return moveInfo;
  }

  promotePawn(pieceType) {
    if (!this.promotionPending) return;
    const { row, col, color } = this.promotionPending;
    this.board[row][col] = { type: pieceType, color, moved: true };
    this.promotionPending = null;
    this.updateGameState();
  }

  updateGameState() {
    const inCheck = this.isInCheck(this.currentPlayer);
    const hasLegal = this.hasLegalMoves(this.currentPlayer);

    if (inCheck && !hasLegal) {
      this.gameState = 'checkmate';
    } else if (!inCheck && !hasLegal) {
      this.gameState = 'stalemate';
    } else if (this.halfMoveClock >= 100) {
      this.gameState = 'draw';
    } else {
      this.gameState = inCheck ? 'check' : 'playing';
    }
  }

  hasLegalMoves(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color) {
          if (this.getLegalMoves(r, c).length > 0) return true;
        }
      }
    }
    return false;
  }

  // Select a square and get valid moves
  selectSquare(row, col) {
    const piece = this.board[row][col];
    if (piece && piece.color === this.currentPlayer) {
      this.selectedSquare = [row, col];
      this.validMoves = this.getLegalMoves(row, col);
      return { type: 'selected', validMoves: this.validMoves };
    } else if (this.selectedSquare) {
      const [sr, sc] = this.selectedSquare;
      const moveResult = this.executeMove(sr, sc, row, col);
      if (moveResult) {
        this.selectedSquare = null;
        this.validMoves = [];
        return { type: 'moved', moveInfo: moveResult };
      } else {
        this.selectedSquare = null;
        this.validMoves = [];
        return { type: 'deselected' };
      }
    }
    return { type: 'none' };
  }

  getKingPosition(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'king' && p.color === color) return [r, c];
      }
    }
    return null;
  }

  getBoardCopy() {
    return this.board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  reset() {
    this.board = this.createInitialBoard();
    this.currentPlayer = 'white';
    this.selectedSquare = null;
    this.validMoves = [];
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.enPassantSquare = null;
    this.castlingRights = {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true }
    };
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.gameState = 'playing';
    this.promotionPending = null;
  }
}

// Piece display names (ancient Indian)
const PIECE_NAMES = {
  king:   { en: 'Raja',   sa: 'राज',   symbol: '♔', desc: 'The King' },
  queen:  { en: 'Mantri', sa: 'मन्त्री', symbol: '♕', desc: 'The Counselor' },
  rook:   { en: 'Ratha',  sa: 'रथ',    symbol: '♖', desc: 'The Chariot' },
  bishop: { en: 'Gaja',   sa: 'गज',    symbol: '♗', desc: 'The Elephant' },
  knight: { en: 'Ashva',  sa: 'अश्व',   symbol: '♘', desc: 'The Horse' },
  pawn:   { en: 'Padati', sa: 'पदाति',  symbol: '♙', desc: 'The Foot Soldier' }
};

window.ChessEngine = ChessEngine;
window.PIECE_NAMES = PIECE_NAMES;
