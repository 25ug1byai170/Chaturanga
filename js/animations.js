// ===== MOVEMENT ANIMATIONS =====
// Handles 3D piece movement animations with cinematic camera

class AnimationManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.queue = [];
    this.running = false;
    this.cameraAnimating = false;
  }

  // Queue a movement animation
  queueMove(moveInfo, onComplete) {
    this.queue.push({ type: 'move', moveInfo, onComplete });
    if (!this.running) this.processNext();
  }

  queueCapture(moveInfo, onComplete) {
    this.queue.push({ type: 'capture', moveInfo, onComplete });
    if (!this.running) this.processNext();
  }

  processNext() {
    if (this.queue.length === 0) { this.running = false; return; }
    this.running = true;
    const item = this.queue.shift();
    if (item.type === 'move') this.animateMove(item.moveInfo, item.onComplete);
    else if (item.type === 'capture') this.animateCapture(item.moveInfo, item.onComplete);
  }

  // ===== PIECE MOVEMENT ANIMATION =====
  animateMove(moveInfo, onComplete) {
    const { from, to, piece, type, castling } = moveInfo;
    const renderer = this.renderer;
    const pieceMesh = renderer.getPieceMesh(from[0], from[1]);
    if (!pieceMesh) { if (onComplete) onComplete(); this.processNext(); return; }

    const fromWorld = renderer.boardToWorld(from[0], from[1]);
    const toWorld = renderer.boardToWorld(to[0], to[1]);

    // Cinematic camera move before the piece moves
    this.doCinematicCamera(from, to, piece, () => {
      this.doMoveAnimation(pieceMesh, fromWorld, toWorld, piece.type, castling, () => {
        // Update renderer piece tracking
        renderer.movePieceMesh(from[0], from[1], to[0], to[1]);
        if (castling) renderer.doCastlingVisual(to, castling, piece.color);
        if (onComplete) onComplete();
        this.processNext();
      });
    });
  }

  animateCapture(moveInfo, onComplete) {
    const { from, to, piece, captured, enPassantCapture } = moveInfo;
    const renderer = this.renderer;
    const pieceMesh = renderer.getPieceMesh(from[0], from[1]);
    const capRow = enPassantCapture ? enPassantCapture[0] : to[0];
    const capCol = enPassantCapture ? enPassantCapture[1] : to[1];
    const capturedMesh = renderer.getPieceMesh(capRow, capCol);

    const fromWorld = renderer.boardToWorld(from[0], from[1]);
    const toWorld = renderer.boardToWorld(to[0], to[1]);

    // Show battle animation
    window.battleScenes.showBattle(piece, captured, () => {
      if (!pieceMesh) { if (onComplete) onComplete(); this.processNext(); return; }

      // Camera cinematic
      this.doCinematicCamera(from, to, piece, () => {
        // Remove captured piece with death animation
        if (capturedMesh) {
          this.deathAnimation(capturedMesh, () => {
            renderer.removePieceMesh(capRow, capCol);
          });
        }

        // Move attacking piece
        this.doMoveAnimation(pieceMesh, fromWorld, toWorld, piece.type, null, () => {
          renderer.movePieceMesh(from[0], from[1], to[0], to[1]);
          if (enPassantCapture) renderer.removePieceMesh(enPassantCapture[0], enPassantCapture[1]);
          if (onComplete) onComplete();
          this.processNext();
        });
      });
    });
  }

  // ===== CINEMATIC CAMERA =====
  doCinematicCamera(from, to, piece, onComplete) {
    const camera = this.renderer.camera;
    const controls = this.renderer.controls;

    // Save original camera
    const origPos = camera.position.clone();
    const origTarget = this.renderer.cameraTarget ? this.renderer.cameraTarget.clone() : new THREE.Vector3(0, 0, 0);

    // Calculate midpoint of move
    const fromW = this.renderer.boardToWorld(from[0], from[1]);
    const toW = this.renderer.boardToWorld(to[0], to[1]);
    const midX = (fromW.x + toW.x) / 2;
    const midZ = (fromW.z + toW.z) / 2;

    // Choose camera angle based on piece type
    const cinematicCameras = {
      rook: [
        { x: midX + 4, y: 2.5, z: midZ + 4, tx: midX, ty: 0, tz: midZ },
        { x: midX - 5, y: 3, z: midZ, tx: midX, ty: 0, tz: midZ }
      ],
      bishop: [
        { x: midX + 3, y: 4, z: midZ - 3, tx: midX, ty: 0, tz: midZ }
      ],
      knight: [
        { x: fromW.x + 2, y: 3, z: fromW.z - 3, tx: midX, ty: 0, tz: midZ }
      ],
      queen: [
        { x: midX, y: 6, z: midZ + 4, tx: midX, ty: 0, tz: midZ }
      ],
      king: [
        { x: midX, y: 5, z: midZ + 3, tx: midX, ty: 0, tz: midZ }
      ],
      pawn: [
        { x: fromW.x + 2, y: 2, z: fromW.z + 2, tx: midX, ty: 0, tz: midZ }
      ]
    };

    const cams = cinematicCameras[piece.type] || cinematicCameras.pawn;
    const cam = cams[Math.floor(Math.random() * cams.length)];

    // Animate camera to cinematic position
    const duration = 0.5;
    const startTime = performance.now();
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };

    const animCam = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      camera.position.x = startPos.x + (cam.x - startPos.x) * ease;
      camera.position.y = startPos.y + (cam.y - startPos.y) * ease;
      camera.position.z = startPos.z + (cam.z - startPos.z) * ease;
      camera.lookAt(cam.tx, cam.ty, cam.tz);

      if (t < 1) {
        requestAnimationFrame(animCam);
      } else {
        if (onComplete) onComplete();
        // Return camera after move
        setTimeout(() => this.returnCamera(origPos, cam, origTarget), 600);
      }
    };
    requestAnimationFrame(animCam);
  }

  returnCamera(originalPos, currentPos, target) {
    const camera = this.renderer.camera;
    const duration = 0.8;
    const startTime = performance.now();
    const startP = { x: camera.position.x, y: camera.position.y, z: camera.position.z };

    const animReturn = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.x = startP.x + (originalPos.x - startP.x) * ease;
      camera.position.y = startP.y + (originalPos.y - startP.y) * ease;
      camera.position.z = startP.z + (originalPos.z - startP.z) * ease;
      camera.lookAt(target.x, target.y, target.z);

      if (t < 1) requestAnimationFrame(animReturn);
    };
    requestAnimationFrame(animReturn);
  }

  // ===== PIECE MOVEMENT ANIMATION =====
  doMoveAnimation(pieceMesh, fromPos, toPos, pieceType, castling, onComplete) {
    const duration = pieceType === 'knight' ? 0.7 : 0.5;
    const startTime = performance.now();
    const startPos = pieceMesh.position.clone();

    // Height of arc based on piece
    const arcHeight = pieceType === 'knight' ? 2.5 : (pieceType === 'rook' ? 0.4 : 0.8);

    // Dust particles
    this.spawnDustParticles(fromPos);

    const anim = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      pieceMesh.position.x = startPos.x + (toPos.x - startPos.x) * ease;
      pieceMesh.position.z = startPos.z + (toPos.z - startPos.z) * ease;
      // Arc
      pieceMesh.position.y = startPos.y + Math.sin(t * Math.PI) * arcHeight;

      // Tilt the piece in direction of movement for knight
      if (pieceType === 'knight') {
        pieceMesh.rotation.z = Math.sin(t * Math.PI) * 0.3;
      }

      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        pieceMesh.position.set(toPos.x, toPos.y, toPos.z);
        pieceMesh.rotation.z = 0;
        this.spawnDustParticles(toPos);
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(anim);
  }

  // ===== DEATH ANIMATION =====
  deathAnimation(mesh, onComplete) {
    const duration = 0.6;
    const startTime = performance.now();
    const startPos = mesh.position.clone();
    const startRot = mesh.rotation.clone();

    const anim = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);

      // Fall and fade
      mesh.position.y = startPos.y - t * 0.5;
      mesh.rotation.x = startRot.x + t * Math.PI / 2;
      mesh.rotation.z = startRot.z + t * 0.8;

      // Scale down
      const s = 1 - t * 0.7;
      mesh.scale.set(s, s, s);

      if (mesh.material) {
        mesh.traverse(child => {
          if (child.material) child.material.opacity = 1 - t;
          if (child.material) child.material.transparent = true;
        });
      }

      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(anim);
  }

  // ===== DUST PARTICLES =====
  spawnDustParticles(pos) {
    const scene = this.renderer.scene;
    const T = THREE;
    const count = 12;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const geo = new T.SphereGeometry(0.04 + Math.random() * 0.06, 4, 4);
      const mat = new T.MeshBasicMaterial({
        color: new T.Color(0.8 + Math.random() * 0.2, 0.6 + Math.random() * 0.2, 0.3),
        transparent: true,
        opacity: 0.6
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.5,
        pos.y + 0.1,
        pos.z + (Math.random() - 0.5) * 0.5
      );
      const vel = {
        x: (Math.random() - 0.5) * 0.05,
        y: Math.random() * 0.08 + 0.02,
        z: (Math.random() - 0.5) * 0.05
      };
      scene.add(mesh);
      particles.push({ mesh, vel, life: 0 });
    }

    const animParticles = () => {
      let alive = false;
      particles.forEach(p => {
        p.life += 0.04;
        p.mesh.position.x += p.vel.x;
        p.mesh.position.y += p.vel.y;
        p.mesh.position.z += p.vel.z;
        p.vel.y -= 0.003;
        p.mesh.material.opacity = Math.max(0, 0.6 - p.life);
        if (p.life < 0.6) alive = true;
        else { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
      });
      if (alive) requestAnimationFrame(animParticles);
    };
    requestAnimationFrame(animParticles);
  }

  // ===== HIGHLIGHT ANIMATIONS =====
  pulseHighlight(mesh, color, duration = 1000) {
    const startTime = performance.now();
    const anim = () => {
      const t = ((performance.now() - startTime) % duration) / duration;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      if (mesh.material) {
        mesh.material.emissiveIntensity = pulse * 0.5;
      }
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // ===== CHECK ANIMATION (king flashing red) =====
  animateCheck(kingMesh) {
    if (!kingMesh) return;
    let count = 0;
    const flash = () => {
      kingMesh.traverse(child => {
        if (child.material) {
          child.material.emissive = new THREE.Color(count % 2 === 0 ? 0xff0000 : 0x000000);
          child.material.emissiveIntensity = 0.8;
        }
      });
      count++;
      if (count < 8) setTimeout(flash, 150);
    };
    flash();
  }

  // ===== VICTORY ANIMATION =====
  animateVictory(kingMesh) {
    if (!kingMesh) return;
    let t = 0;
    const anim = () => {
      t += 0.05;
      kingMesh.position.y += Math.sin(t) * 0.01;
      kingMesh.rotation.y += 0.02;
      if (t < Math.PI * 4) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }
}

window.AnimationManager = AnimationManager;
