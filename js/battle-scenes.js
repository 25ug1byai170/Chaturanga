// ===== BATTLE SCENES =====
// Cinematic 2D/3D canvas battle animations for captures

class BattleScenes {
  constructor() {
    this.overlay = document.getElementById('battle-overlay');
    this.canvas = document.getElementById('battle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.titleEl = document.getElementById('battle-title');
    this.subtitleEl = document.getElementById('battle-subtitle');
    this.resultEl = document.getElementById('battle-result');
    this.skipEl = document.getElementById('battle-skip');
    this.animFrame = null;
    this.battleDone = false;
    this.onSkip = null;
    this.skipBound = this.skip.bind(this);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  skip() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.battleDone = true;
    this.hide();
    if (this.onSkip) this.onSkip();
  }

  hide() {
    this.overlay.style.display = 'none';
    this.overlay.removeEventListener('click', this.skipBound);
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
  }

  show() {
    this.overlay.style.display = 'flex';
    this.overlay.addEventListener('click', this.skipBound);
    this.battleDone = false;
    this.resultEl.style.opacity = '0';
  }

  // Main entry: show battle based on attacker vs defender types
  showBattle(attacker, defender, onComplete) {
    if (!attacker || !defender) { if (onComplete) onComplete(); return; }
    this.onSkip = onComplete;
    this.show();

    const attackerName = PIECE_NAMES[attacker.type];
    const defenderName = PIECE_NAMES[defender.type];

    const aSide = attacker.color === 'white' ? 'Shukla' : 'Kali';
    const dSide = defender.color === 'white' ? 'Shukla' : 'Kali';
    const aColor = attacker.color === 'white' ? '#F5DEB3' : '#8B4513';
    const dColor = defender.color === 'white' ? '#F5DEB3' : '#8B4513';

    this.titleEl.textContent = '⚔ YUDDHA ⚔';
    this.subtitleEl.textContent = `${aSide} ${attackerName.en} vs ${dSide} ${defenderName.en}`;

    // Choose battle scene
    const key = `${attacker.type}_vs_${defender.type}`;
    this.runBattle(attacker, defender, aColor, dColor, attackerName, defenderName, onComplete);
  }

  runBattle(attacker, defender, aColor, dColor, aName, dName, onComplete) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    let frame = 0;
    const totalFrames = 180; // ~3s at 60fps
    const resultFrame = 140;

    // Particle system
    const particles = [];
    const addParticle = (x, y, vx, vy, color, size, life) => {
      particles.push({ x, y, vx, vy, color, size, life, maxLife: life, alpha: 1 });
    };

    // Sparks burst
    const burst = (x, y, count, colors) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 2 + Math.random() * 4, 30 + Math.random() * 30);
      }
    };

    // Smoke
    const smoke = (x, y) => {
      for (let i = 0; i < 5; i++) {
        addParticle(x + (Math.random() - 0.5) * 40, y, (Math.random() - 0.5) * 0.5, -1 - Math.random() * 2, '#888', 10 + Math.random() * 20, 60 + Math.random() * 40);
      }
    };

    // Blood/dust
    const bloodBurst = (x, y, color) => {
      for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const speed = 3 + Math.random() * 10;
        addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3 + Math.random() * 5, 40 + Math.random() * 20);
      }
    };

    const aX = W * 0.28;
    const dX = W * 0.72;
    const groundY = H * 0.72;
    let clashFrame = 55; // when collision happens
    let clashed = false;
    let defenderDead = false;
    let defenderDeadFrame = 0;

    const drawBackground = (f) => {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1a0a00');
      sky.addColorStop(0.4, '#3d1a00');
      sky.addColorStop(0.7, '#6b2c00');
      sky.addColorStop(1, '#8b4513');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Sun/fire in background
      const sunX = W / 2;
      const sunY = H * 0.3;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 180);
      sunGrad.addColorStop(0, 'rgba(255,200,0,0.6)');
      sunGrad.addColorStop(0.3, 'rgba(255,100,0,0.3)');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, W, H);

      // Distant hills/mountains
      ctx.fillStyle = '#2a1000';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.58);
      for (let x = 0; x < W; x += 50) {
        const y = H * 0.58 - Math.sin(x * 0.02 + 1) * 60 - Math.sin(x * 0.007) * 80;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H * 0.58);
      ctx.lineTo(W, H); ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Ground
      const ground = ctx.createLinearGradient(0, groundY, 0, H);
      ground.addColorStop(0, '#5c3317');
      ground.addColorStop(1, '#2a1500');
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Dust on ground
      ctx.fillStyle = 'rgba(200,150,80,0.15)';
      for (let i = 0; i < 8; i++) {
        const cx = (i / 8) * W;
        const cy = groundY + 10 + Math.sin(f * 0.05 + i) * 5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60 + Math.sin(f * 0.03 + i) * 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Battle flags
      drawFlag(ctx, W * 0.12, groundY - 120, aColor, f);
      drawFlag(ctx, W * 0.88, groundY - 120, dColor, f);
    };

    const drawShadow = (x, y) => {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, groundY + 5, 40, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const anim = () => {
      if (this.battleDone) return;
      ctx.clearRect(0, 0, W, H);
      drawBackground(frame);

      // Motion blur effect for fast movement
      const progress = Math.min(frame / clashFrame, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Attacker position (moves toward center)
      let ax = aX + easeOut * (W * 0.48 - aX);
      let ay = groundY - 80;

      // Defender position (holds ground then steps back)
      let dx = dX - (frame > clashFrame ? Math.min((frame - clashFrame) * 2, 60) : 0);
      let dy = groundY - 80;

      // CLASH!
      if (frame === clashFrame && !clashed) {
        clashed = true;
        burst(W / 2, ay, 60, ['#FFD700', '#FF6B00', '#FFF', '#FF0000', '#FF8C00']);
        smoke(W / 2, ay);
        bloodBurst(dx, dy, '#8B0000');
      }

      // After clash: defender falls
      if (frame > clashFrame + 10) {
        if (!defenderDead) { defenderDead = true; defenderDeadFrame = frame; }
        const t = (frame - defenderDeadFrame) / 40;
        dy = groundY - 80 + Math.min(t * 80, 80);
        dx = dX + Math.min(t * 30, 30) - (frame > clashFrame ? Math.min((frame - clashFrame) * 2, 60) : 0);
      }

      // Screen shake after clash
      let shakeX = 0, shakeY = 0;
      if (frame > clashFrame && frame < clashFrame + 20) {
        const s = (clashFrame + 20 - frame) * 0.8;
        shakeX = (Math.random() - 0.5) * s;
        shakeY = (Math.random() - 0.5) * s;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Draw shadows
      drawShadow(ax, ay);
      if (!defenderDead || frame < defenderDeadFrame + 30) drawShadow(dx, dy);

      // Draw attacker
      drawWarrior(ctx, attacker.type, attacker.color, ax, ay, frame, false, false);

      // Draw defender (fading out after death)
      if (!defenderDead) {
        drawWarrior(ctx, defender.type, defender.color, dx, dy, frame, true, false);
      } else {
        const deadT = (frame - defenderDeadFrame) / 50;
        ctx.globalAlpha = Math.max(0, 1 - deadT);
        drawWarrior(ctx, defender.type, defender.color, dx, dy + deadT * 60, frame, true, true);
        ctx.globalAlpha = 1;
      }

      // Clash flash
      if (frame >= clashFrame && frame < clashFrame + 8) {
        const flashAlpha = (clashFrame + 8 - frame) / 8;
        ctx.fillStyle = `rgba(255,200,50,${flashAlpha * 0.7})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x + shakeX, p.y + shakeY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw battle text
      drawBattleText(ctx, attacker.type, defender.type, aName, dName, frame, clashFrame, W, H);

      // Result text
      if (frame >= resultFrame) {
        const rt = (frame - resultFrame) / 20;
        this.resultEl.style.opacity = Math.min(rt, 1).toString();
        this.resultEl.textContent = `${aName.en.toUpperCase()} VICTORIOUS!`;
      }

      frame++;
      if (frame > totalFrames) {
        this.hide();
        if (onComplete) onComplete();
        return;
      }
      this.animFrame = requestAnimationFrame(anim);
    };
    this.animFrame = requestAnimationFrame(anim);
  }
}

// ===== HELPER DRAW FUNCTIONS =====

function drawFlag(ctx, x, y, color, frame) {
  // Pole
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 120);
  ctx.lineTo(x, y);
  ctx.stroke();

  // Waving flag
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= 20; i++) {
    const px = x + (i / 20) * 50;
    const py = y + Math.sin(i * 0.5 + frame * 0.1) * 8 + (i / 20) * 20;
    ctx.lineTo(px, py);
  }
  for (let i = 20; i >= 0; i--) {
    const px = x + (i / 20) * 50;
    const py = y + 22 + Math.sin(i * 0.5 + frame * 0.1 + 0.5) * 8 + (i / 20) * 18;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawWarrior(ctx, type, color, x, y, frame, facing_left, dead) {
  const isWhite = color === 'white';
  const bodyColor = isWhite ? '#F5DEB3' : '#8B4513';
  const armorColor = isWhite ? '#D4AF37' : '#8B0000';
  const skinColor = isWhite ? '#DEB887' : '#A0522D';
  const dir = facing_left ? -1 : 1;

  ctx.save();
  ctx.translate(x, y);
  if (facing_left) ctx.scale(-1, 1);
  if (dead) {
    ctx.rotate(Math.PI / 2);
    ctx.translate(-30, -20);
  } else {
    // Walking animation
    const bob = Math.sin(frame * 0.15) * 3;
    ctx.translate(0, bob);
  }

  switch (type) {
    case 'pawn':
      drawSoldier(ctx, bodyColor, armorColor, skinColor, frame, dead);
      break;
    case 'knight':
      drawHorseman(ctx, bodyColor, armorColor, skinColor, frame, dead);
      break;
    case 'bishop':
      drawElephantWarrior(ctx, bodyColor, armorColor, skinColor, frame, dead);
      break;
    case 'rook':
      drawChariot(ctx, bodyColor, armorColor, skinColor, frame, dead);
      break;
    case 'queen':
      drawCommander(ctx, bodyColor, armorColor, skinColor, frame, dead, true);
      break;
    case 'king':
      drawCommander(ctx, bodyColor, armorColor, skinColor, frame, dead, false);
      break;
    default:
      drawSoldier(ctx, bodyColor, armorColor, skinColor, frame, dead);
  }

  ctx.restore();
}

function drawSoldier(ctx, bodyColor, armorColor, skinColor, frame, dead) {
  const walk = dead ? 0 : Math.sin(frame * 0.15) * 8;

  // Legs
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-8, 20, 7, 28 + (dead ? 0 : Math.sin(frame * 0.15) * 5));
  ctx.fillRect(2, 20, 7, 28 - (dead ? 0 : Math.sin(frame * 0.15) * 5));

  // Body
  ctx.fillStyle = armorColor;
  ctx.fillRect(-15, -10, 30, 32);

  // Armor details
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-15, -10, 30, 32);
  ctx.beginPath();
  ctx.moveTo(-15, 5); ctx.lineTo(15, 5);
  ctx.stroke();

  // Arms
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-22, -8, 8, 22);
  ctx.fillRect(14, -8, 8, 22);

  // Head
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.arc(0, -22, 16, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(4, -20, 9, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(7, -21, 2, 0, Math.PI * 2);
  ctx.fill();

  // Helmet crest
  ctx.fillStyle = '#FF6600';
  ctx.beginPath();
  ctx.moveTo(-6, -36);
  ctx.lineTo(0, -50);
  ctx.lineTo(6, -36);
  ctx.fill();

  // Spear
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, -40 + walk);
  ctx.lineTo(20, 40 + walk);
  ctx.stroke();
  // Spear tip
  ctx.fillStyle = '#C0C0C0';
  ctx.beginPath();
  ctx.moveTo(15, -40 + walk);
  ctx.lineTo(20, -55 + walk);
  ctx.lineTo(25, -40 + walk);
  ctx.fill();

  // Shield
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.ellipse(-22, 5, 12, 18, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHorseman(ctx, bodyColor, armorColor, skinColor, frame, dead) {
  const gallop = dead ? 0 : Math.sin(frame * 0.2) * 10;

  // Horse body
  ctx.fillStyle = dead ? '#6B4423' : '#8B6914';
  ctx.beginPath();
  ctx.ellipse(0, 20, 50, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horse legs
  ctx.strokeStyle = dead ? '#6B4423' : '#8B6914';
  ctx.lineWidth = 8;
  const legPositions = [-30, -15, 15, 30];
  legPositions.forEach((lx, i) => {
    ctx.beginPath();
    const legBob = Math.sin(frame * 0.2 + i * 1.5) * (dead ? 0 : 12);
    ctx.moveTo(lx, 40);
    ctx.lineTo(lx + legBob, 75);
    ctx.stroke();
  });

  // Horse head
  ctx.fillStyle = dead ? '#6B4423' : '#8B6914';
  ctx.beginPath();
  ctx.ellipse(55, 0, 22, 16, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Horse eye
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(65, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Mane
  ctx.fillStyle = '#4A3000';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 8, -15 + gallop);
    ctx.lineTo(5 + i * 8, -5 + gallop);
    ctx.lineTo(15 + i * 8, -5 + gallop);
    ctx.closePath();
    ctx.fill();
  }

  // Rider body
  ctx.fillStyle = armorColor;
  ctx.fillRect(-12, -40, 24, 35);

  // Rider head
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.arc(0, -52, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(4, -50, 8, 0, Math.PI * 2);
  ctx.fill();

  // Sword raised
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(18, -38);
  ctx.lineTo(40, -75 + gallop);
  ctx.stroke();
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(14, -42, 8, 6);
}

function drawElephantWarrior(ctx, bodyColor, armorColor, skinColor, frame, dead) {
  const sway = dead ? 0 : Math.sin(frame * 0.08) * 5;

  // Elephant body
  ctx.fillStyle = '#696969';
  ctx.beginPath();
  ctx.ellipse(0, 20, 55, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Elephant legs
  ctx.fillStyle = '#555';
  ctx.lineWidth = 12;
  [-32, -12, 12, 32].forEach((lx, i) => {
    const legH = dead ? 0 : Math.sin(frame * 0.1 + i * 1.5) * 6;
    ctx.fillRect(lx - 6, 55, 12, 22 + legH);
  });

  // Elephant head
  ctx.fillStyle = '#696969';
  ctx.beginPath();
  ctx.ellipse(50, -10, 30, 28, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(72, 0);
  const trunkSway = Math.sin(frame * 0.08 + 1) * 20;
  ctx.bezierCurveTo(90, 20, 85 + trunkSway, 50, 70 + trunkSway, 65);
  ctx.stroke();

  // Tusks
  ctx.strokeStyle = '#FFFFF0';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(68, 5);
  ctx.quadraticCurveTo(90, 15, 85, 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(68, 15);
  ctx.quadraticCurveTo(90, 22, 82, 35);
  ctx.stroke();

  // Howdah (seat)
  ctx.fillStyle = armorColor;
  ctx.fillRect(-30, -35, 55, 18);
  ctx.fillRect(-28, -52, 50, 18);

  // Warrior in howdah
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-10, -70, 18, 20);
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.arc(0, -78, 12, 0, Math.PI * 2);
  ctx.fill();

  // Ornamental cloth
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.moveTo(-55, 10);
  ctx.lineTo(-55, 45);
  for (let i = 0; i < 6; i++) {
    ctx.lineTo(-55 + i * 10, 55 + Math.sin(i + frame * 0.05) * 5);
  }
  ctx.lineTo(5, 45);
  ctx.lineTo(5, 10);
  ctx.closePath();
  ctx.fill();

  // Elephant eye
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(60, -16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(61, -17, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawChariot(ctx, bodyColor, armorColor, skinColor, frame, dead) {
  const roll = dead ? 0 : frame * 0.12;

  // Wheels
  const drawWheel = (wx, wy) => {
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(wx, wy, 30, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + roll;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * 28, wy + Math.sin(a) * 28);
      ctx.stroke();
    }
    // Hub
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(wx, wy, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  drawWheel(-35, 40);
  drawWheel(35, 40);

  // Axle
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-35, 40); ctx.lineTo(35, 40);
  ctx.stroke();

  // Chariot box
  ctx.fillStyle = armorColor;
  ctx.fillRect(-42, -20, 84, 62);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-38, -16, 76, 55);

  // Decorative frame
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(-42, -20, 84, 62);

  // Battlements
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = armorColor;
    ctx.fillRect(-40 + i * 18, -38, 12, 20);
  }

  // Horses
  ctx.fillStyle = '#8B6914';
  [-25, 25].forEach(hx => {
    ctx.beginPath();
    ctx.ellipse(hx + 55, 15, 25, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Horse head
    ctx.beginPath();
    ctx.ellipse(hx + 85, 0, 14, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 6;
    [-14, -4, 6, 16].forEach((lx, i) => {
      ctx.beginPath();
      const lb = Math.sin(frame * 0.2 + i * 1.5) * (dead ? 0 : 8);
      ctx.moveTo(hx + 50 + lx, 28);
      ctx.lineTo(hx + 50 + lx + lb, 50);
      ctx.stroke();
    });
  });

  // Rider
  ctx.fillStyle = armorColor;
  ctx.fillRect(-12, -58, 22, 40);
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.arc(2, -68, 14, 0, Math.PI * 2);
  ctx.fill();

  // Bow
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(20, -60, 22, -Math.PI * 0.7, Math.PI * 0.3);
  ctx.stroke();
  // Arrow
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -72);
  ctx.lineTo(42, -52);
  ctx.stroke();
}

function drawCommander(ctx, bodyColor, armorColor, skinColor, frame, dead, isQueen) {
  const bob = dead ? 0 : Math.sin(frame * 0.1) * 4;

  // Elaborate base
  ctx.fillStyle = armorColor;
  ctx.fillRect(-18, 20, 36, 30 + bob);

  // Skirt/lower garment
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(-20, 15);
  for (let i = 0; i <= 8; i++) {
    const sx = -20 + i * 5;
    const sy = 15 + Math.sin(i + frame * 0.05) * 4;
    ctx.lineTo(sx, sy);
  }
  ctx.lineTo(20, 50);
  ctx.lineTo(-20, 50);
  ctx.closePath();
  ctx.fill();

  // Body/torso
  ctx.fillStyle = armorColor;
  ctx.fillRect(-16, -25, 32, 42);

  // Decorative armor
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -8, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Arms
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-25, -22, 10, 30);
  ctx.fillRect(15, -22, 10, 30);

  // Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(-6, -35, 12, 12);

  // Head
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -48, 16, 0, Math.PI * 2);
  ctx.fill();

  // Face features
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(5, -50, 2.5, 0, Math.PI * 2); ctx.fill();
  // Eyebrow
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(1, -55); ctx.lineTo(10, -53);
  ctx.stroke();

  // Crown / headdress
  if (isQueen) {
    // Queen crown
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-18, -68, 36, 10);
    // Crown points
    for (let i = 0; i < 5; i++) {
      const cx = -16 + i * 8;
      ctx.beginPath();
      ctx.moveTo(cx, -68);
      ctx.lineTo(cx + 4, -82);
      ctx.lineTo(cx + 8, -68);
      ctx.fill();
    }
    // Gems on crown
    ctx.fillStyle = '#FF0080';
    ctx.beginPath(); ctx.arc(0, -74, 5, 0, Math.PI * 2); ctx.fill();
  } else {
    // King turban
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.arc(0, -58, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-20, -62, 40, 6);
    // Turban jewel
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -72, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(0, -72, 4, 0, Math.PI * 2);
    ctx.fill();
    // Plume
    ctx.strokeStyle = '#FF9933';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.bezierCurveTo(10, -95, 20, -100, 15, -115 + bob * 2);
    ctx.stroke();
  }

  // Weapon
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 4;
  const weaponBob = dead ? 0 : Math.sin(frame * 0.15) * 10;
  ctx.beginPath();
  ctx.moveTo(22, -15 + weaponBob);
  ctx.lineTo(50, -55 + weaponBob);
  ctx.stroke();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(42, -60 + weaponBob);
  ctx.lineTo(50, -55 + weaponBob);
  ctx.lineTo(45, -48 + weaponBob);
  ctx.fill();
}

function drawBattleText(ctx, attackerType, defenderType, aName, dName, frame, clashFrame, W, H) {
  // VS text
  if (frame < clashFrame) {
    ctx.save();
    ctx.font = 'bold 28px Cinzel, serif';
    ctx.fillStyle = '#D4AF37';
    ctx.shadowColor = '#FF9933';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText('VS', W / 2, H * 0.72 - 100);
    ctx.restore();
  }

  // Name labels
  ctx.save();
  ctx.font = '16px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#D4AF37';
  ctx.shadowColor = '#FF9933';
  ctx.shadowBlur = 8;
  ctx.fillText(aName.sa, W * 0.28, H * 0.72 + 30);
  ctx.fillText(`(${aName.en})`, W * 0.28, H * 0.72 + 50);
  ctx.fillText(dName.sa, W * 0.72, H * 0.72 + 30);
  ctx.fillText(`(${dName.en})`, W * 0.72, H * 0.72 + 50);
  ctx.restore();

  // CLASH! text
  if (frame >= clashFrame && frame < clashFrame + 30) {
    const alpha = Math.min(1, (frame - clashFrame) / 8) * Math.max(0, (clashFrame + 30 - frame) / 30);
    ctx.save();
    ctx.globalAlpha = alpha;
    const scale = 1 + (frame - clashFrame) * 0.05;
    ctx.font = `bold ${Math.floor(48 * scale)}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillText('⚔ YUDDHA! ⚔', W / 2, H / 2);
    ctx.restore();
  }
}

window.BattleScenes = BattleScenes;
