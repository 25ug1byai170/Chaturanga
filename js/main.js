// ===== MAIN GAME CONTROLLER =====
// Ties together: Engine, Renderer, Animations, Battle Scenes, UI

class ChaturangaGame {
  constructor() {
    this.engine = new ChessEngine();
    this.renderer = null;
    this.animManager = null;
    this.isAnimating = false;
    this.currentCameraMode = 'white';
    this.moveLogEl = document.getElementById('move-log');
    this.turnTextEl = document.getElementById('turn-text');
    this.turnSubtitleEl = document.getElementById('turn-subtitle');
    this.checkIndicatorEl = document.getElementById('check-indicator');
    this.gameOverEl = document.getElementById('game-over');
    this.winnerTextEl = document.getElementById('winner-text');
    this.winnerSubtextEl = document.getElementById('winner-subtext');
    this.promotionDialogEl = document.getElementById('promotion-dialog');
    this.capWhiteEl = document.getElementById('cap-white-display');
    this.capBlackEl = document.getElementById('cap-black-display');
  }

  async init() {
    this.showLoading(0, 'Awakening the ancient battlefield...');
    await this.delay(300);

    this.showLoading(20, 'Carving the sacred board...');
    await this.delay(200);

    // Init renderer
    const canvas = document.getElementById('chaturanga-canvas');
    this.renderer = new ChaturangaRenderer(canvas);
    this.renderer.init();

    this.showLoading(45, 'Summoning warriors from the ages...');
    await this.delay(200);

    // Init battle scenes
    window.battleScenes = new BattleScenes();

    this.showLoading(60, 'Arranging the army formations...');
    await this.delay(150);

    // Place pieces
    this.renderer.placePieces(this.engine.board);

    this.showLoading(75, 'Lighting the war torches...');
    await this.delay(200);

    // Init animation manager
    this.animManager = new AnimationManager(this.renderer);

    this.showLoading(90, 'The great war is about to begin...');
    await this.delay(300);

    // Start render loop
    this.renderer.startRenderLoop();

    // Setup click handler
    this.setupClickHandler();

    // Setup camera buttons
    this.setupCameraButtons();

    // Setup promotion
    this.setupPromotionDialog();

    this.showLoading(100, 'Let the battle commence!');
    await this.delay(600);

    // Hide loading, show game
    document.getElementById('loading-screen').style.display = 'none';
    const gameContainer = document.getElementById('game-container');
    gameContainer.style.display = 'block';
    gameContainer.style.opacity = '0';
    gameContainer.style.transition = 'opacity 1s ease';
    setTimeout(() => { gameContainer.style.opacity = '1'; }, 50);

    // Initial camera position
    this.renderer.setCameraView('white');
    this.updateUI();
  }

  showLoading(pct, text) {
    const bar = document.getElementById('loading-bar');
    const textEl = document.getElementById('loading-text');
    if (bar) bar.style.width = pct + '%';
    if (textEl) textEl.textContent = text;
  }

  delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  setupClickHandler() {
    const canvas = document.getElementById('chaturanga-canvas');
    canvas.addEventListener('click', (e) => {
      if (this.isAnimating) return;
      if (this.engine.gameState === 'checkmate' || this.engine.gameState === 'stalemate') return;
      if (this.engine.promotionPending) return;

      const sq = this.renderer.getClickedSquare(e.clientX, e.clientY);
      if (!sq) {
        this.renderer.clearHighlights();
        this.engine.selectedSquare = null;
        this.engine.validMoves = [];
        return;
      }

      this.handleSquareClick(sq.row, sq.col);
    });
  }

  handleSquareClick(row, col) {
    const engine = this.engine;
    const renderer = this.renderer;

    const result = engine.selectSquare(row, col);

    if (result.type === 'selected') {
      renderer.clearHighlights();
      renderer.highlightSquare(row, col, 'selected');

      result.validMoves.forEach(([mr, mc, mtype]) => {
        const target = engine.board[mr][mc];
        renderer.highlightSquare(mr, mc, target ? 'capture' : 'valid');
      });

      const pieceInfo = engine.board[row][col];
      if (pieceInfo) {
        const pname = PIECE_NAMES[pieceInfo.type];
        this.turnSubtitleEl.textContent = `${pname.en} (${pname.sa}) selected`;
      }

    } else if (result.type === 'moved') {
      const info = result.moveInfo;
      renderer.clearHighlights();
      renderer.highlightLastMove(info.from, info.to);

      this.isAnimating = true;

      if (info.captured) {
        this.animManager.queueCapture(info, () => {
          this.isAnimating = false;
          this.afterMove(info);
        });
      } else {
        this.animManager.queueMove(info, () => {
          this.isAnimating = false;
          this.afterMove(info);
        });
      }

    } else if (result.type === 'deselected') {
      renderer.clearHighlights();
    }
  }

  afterMove(info) {
    const engine = this.engine;

    // Handle promotion
    if (info.promotion && engine.promotionPending) {
      this.showPromotionDialog();
      return;
    }

    this.updateUI();
    this.addToLog(info);
    this.checkGameState();
  }

  checkGameState() {
    const engine = this.engine;
    const state = engine.gameState;

    this.checkIndicatorEl.style.display = 'none';

    if (state === 'check') {
      this.checkIndicatorEl.style.display = 'block';
      const kingPos = engine.getKingPosition(engine.currentPlayer);
      if (kingPos) {
        this.renderer.highlightCheck(kingPos[0], kingPos[1]);
        const kingMesh = this.renderer.getPieceMesh(kingPos[0], kingPos[1]);
        if (kingMesh && this.animManager) this.animManager.animateCheck(kingMesh);
      }
    }

    if (state === 'checkmate') {
      const winner = engine.currentPlayer === 'white' ? 'Kali Sena' : 'Shukla Sena';
      const loser = engine.currentPlayer === 'white' ? 'SHUKLA' : 'KALI';
      this.winnerTextEl.textContent = `${winner.toUpperCase()} WINS!`;
      this.winnerSubtextEl.textContent = `${loser} RAJA has fallen. The battle is over.`;
      setTimeout(() => {
        this.gameOverEl.style.display = 'flex';
      }, 800);

      // Victory animation
      const winnerColor = engine.currentPlayer === 'white' ? 'black' : 'white';
      const kingPos = engine.getKingPosition(winnerColor);
      if (kingPos) {
        const kingMesh = this.renderer.getPieceMesh(kingPos[0], kingPos[1]);
        if (kingMesh && this.animManager) this.animManager.animateVictory(kingMesh);
      }
    }

    if (state === 'stalemate') {
      this.winnerTextEl.textContent = 'STALEMATE!';
      this.winnerSubtextEl.textContent = 'An honorable draw. Both armies rest.';
      setTimeout(() => { this.gameOverEl.style.display = 'flex'; }, 800);
    }
  }

  updateUI() {
    const engine = this.engine;
    const playerNames = { white: 'SHUKLA SENA', black: 'KALI SENA' };

    this.turnTextEl.textContent = `${playerNames[engine.currentPlayer]}'s Turn`;
    this.turnSubtitleEl.textContent = 'Choose your warrior';

    // Update captured pieces display
    const pieceSymbols = {
      white: { pawn: '♙', knight: '♘', bishop: '♗', rook: '♖', queen: '♕', king: '♔' },
      black: { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚' }
    };

    const capByWhite = engine.capturedPieces.white.map(t => pieceSymbols.black[t] || '').join(' ');
    const capByBlack = engine.capturedPieces.black.map(t => pieceSymbols.white[t] || '').join(' ');

    this.capWhiteEl.textContent = capByWhite || '—';
    this.capBlackEl.textContent = capByBlack || '—';
  }

  addToLog(info) {
    if (!info || !info.piece) return;
    const pname = PIECE_NAMES[info.piece.type];
    if (!pname) return;
    const side = info.piece.color === 'white' ? 'Shukla' : 'Kali';
    const cols = ['a','b','c','d','e','f','g','h'];
    const fromSq = cols[info.from[1]] + (8 - info.from[0]);
    const toSq = cols[info.to[1]] + (8 - info.to[0]);

    let text = `${side} ${pname.en} ${fromSq}→${toSq}`;
    let cls = 'log-entry';

    if (info.captured) {
      const capname = PIECE_NAMES[info.captured.type];
      text += ` ✖${capname.en}`;
      cls += ' log-capture';
    }
    if (info.type === 'castle-kingside') text += ' 0-0';
    if (info.type === 'castle-queenside') text += ' 0-0-0';
    if (info.promotion) text += ' ↑';

    const state = this.engine.gameState;
    if (state === 'check') { text += ' ⚠'; cls += ' log-check'; }
    if (state === 'checkmate') { text += ' ♛'; cls += ' log-check'; }

    const entry = document.createElement('div');
    entry.className = cls;
    entry.textContent = text;
    this.moveLogEl.appendChild(entry);
    this.moveLogEl.scrollTop = this.moveLogEl.scrollHeight;
  }

  showPromotionDialog() {
    this.promotionDialogEl.style.display = 'flex';
  }

  setupPromotionDialog() {
    const btns = document.querySelectorAll('.promo-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newType = btn.dataset.piece;
        this.promotionDialogEl.style.display = 'none';

        // Get position from last move BEFORE clearing promotion state
        const lastMove = this.engine.moveHistory[this.engine.moveHistory.length - 1];
        this.engine.promotePawn(newType);

        // Update visual: replace pawn with promoted piece
        if (lastMove) {
          const [row, col] = lastMove.to;
          const color = lastMove.piece.color;
          this.renderer.removePieceMesh(row, col);
          this.renderer.addPieceMesh(newType, color, row, col);

          // Spawn particle burst
          const pos = this.renderer.boardToWorld(row, col);
          this.animManager.spawnDustParticles(pos);
        }

        this.updateUI();
        if (lastMove) this.addToLog(lastMove);
        this.checkGameState();
      });
    });
  }

  setupCameraButtons() {
    const buttons = {
      'btn-top':       'top',
      'btn-white':     'white',
      'btn-black':     'black',
      'btn-cinematic': 'cinematic'
    };

    Object.entries(buttons).forEach(([id, view]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderer.setCameraView(view);
          this.currentCameraMode = view;
        });
      }
    });

    // Set initial active
    document.getElementById('btn-white')?.classList.add('active');
  }

  resetGame() {
    this.engine.reset();
    this.renderer.placePieces(this.engine.board);
    this.renderer.clearHighlights();
    this.moveLogEl.innerHTML = '';
    this.gameOverEl.style.display = 'none';
    this.checkIndicatorEl.style.display = 'none';
    this.isAnimating = false;
    this.updateUI();

    // Camera back to white side
    this.renderer.setCameraView('white');
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-white')?.classList.add('active');
  }
}

// ===== BOOT =====
window.addEventListener('DOMContentLoaded', async () => {
  const game = new ChaturangaGame();
  window.chaturanga = game;
  await game.init();
});
