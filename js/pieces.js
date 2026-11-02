// ===== 3D PIECE GEOMETRY BUILDER =====
// Creates ancient Indian styled chess pieces using Three.js primitives

class PieceBuilder {
  constructor(THREE) {
    this.THREE = THREE;
  }

  // Common materials
  getMaterial(color, type = 'standard') {
    const T = this.THREE;
    const isWhite = color === 'white';

    const configs = {
      standard: {
        white: { color: 0xF5DEB3, roughness: 0.3, metalness: 0.6 },
        black: { color: 0x2C1810, roughness: 0.4, metalness: 0.5 }
      },
      gold: {
        white: { color: 0xFFD700, roughness: 0.1, metalness: 0.9 },
        black: { color: 0xB8860B, roughness: 0.2, metalness: 0.8 }
      },
      gem: {
        white: { color: 0xFF6B6B, roughness: 0.1, metalness: 0.8 },
        black: { color: 0x6B0000, roughness: 0.1, metalness: 0.9 }
      }
    };

    const cfg = configs[type][isWhite ? 'white' : 'black'];
    return new T.MeshStandardMaterial({
      color: cfg.color,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
    });
  }

  createCylinder(radiusTop, radiusBottom, height, segments = 16) {
    return new this.THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  }

  createSphere(radius, ws = 16, hs = 12) {
    return new this.THREE.SphereGeometry(radius, ws, hs);
  }

  createBox(w, h, d) {
    return new this.THREE.BoxGeometry(w, h, d);
  }

  addMesh(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const mesh = new this.THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ===== PADATI (Pawn / Foot Soldier) =====
  buildPawn(color) {
    const T = this.THREE;
    const group = new T.Group();
    const mat = this.getMaterial(color);
    const goldMat = this.getMaterial(color, 'gold');

    // Base
    this.addMesh(group, this.createCylinder(0.28, 0.35, 0.1, 12), mat, 0, 0.05, 0);
    // Lower shaft
    this.addMesh(group, this.createCylinder(0.14, 0.26, 0.35, 10), mat, 0, 0.275, 0);
    // Waist ring
    this.addMesh(group, this.createCylinder(0.18, 0.18, 0.08, 12), goldMat, 0, 0.48, 0);
    // Upper shaft
    this.addMesh(group, this.createCylinder(0.16, 0.15, 0.2, 10), mat, 0, 0.64, 0);
    // Neck
    this.addMesh(group, this.createCylinder(0.12, 0.14, 0.12, 10), mat, 0, 0.8, 0);
    // Head - helmet-like
    this.addMesh(group, this.createSphere(0.2, 12, 10), mat, 0, 0.98, 0);
    // Crest on helmet
    this.addMesh(group, this.createCylinder(0.04, 0.06, 0.18, 8), goldMat, 0, 1.24, 0);

    group.userData.pieceType = 'pawn';
    group.userData.pieceColor = color;
    return group;
  }

  // ===== ASHVA (Knight / Horse) =====
  buildKnight(color) {
    const T = this.THREE;
    const group = new T.Group();
    const mat = this.getMaterial(color);
    const goldMat = this.getMaterial(color, 'gold');

    // Base
    this.addMesh(group, this.createCylinder(0.3, 0.38, 0.1, 12), mat, 0, 0.05, 0);
    // Shaft
    this.addMesh(group, this.createCylinder(0.15, 0.28, 0.4, 10), mat, 0, 0.3, 0);
    // Waist
    this.addMesh(group, this.createCylinder(0.2, 0.2, 0.07, 12), goldMat, 0, 0.535, 0);
    // Body platform
    this.addMesh(group, this.createCylinder(0.22, 0.18, 0.25, 10), mat, 0, 0.695, 0);
    // Horse body
    this.addMesh(group, new T.SphereGeometry(0.22, 12, 10), mat, 0, 0.9, 0);
    // Horse neck going up-forward
    const neckGeo = this.createCylinder(0.1, 0.14, 0.35, 10);
    this.addMesh(group, neckGeo, mat, 0.1, 1.12, 0, 0, 0, -0.6);
    // Horse head
    const headGeo = new T.SphereGeometry(0.18, 12, 10);
    this.addMesh(group, headGeo, mat, 0.22, 1.34, 0);
    // Snout
    this.addMesh(group, this.createCylinder(0.07, 0.1, 0.18, 8), mat, 0.38, 1.28, 0, 0, 0, 1.2);
    // Mane - small spikes
    for (let i = 0; i < 4; i++) {
      const maneGeo = this.createCylinder(0.03, 0.06, 0.14, 6);
      const x = 0.12 + i * 0.02;
      const y = 1.42 + i * 0.05;
      this.addMesh(group, maneGeo, goldMat, x, y, 0, 0, 0, -0.4 - i * 0.1);
    }
    // Ear
    this.addMesh(group, this.createCylinder(0.02, 0.05, 0.1, 6), mat, 0.18, 1.52, 0.08);
    this.addMesh(group, this.createCylinder(0.02, 0.05, 0.1, 6), mat, 0.18, 1.52, -0.08);

    group.userData.pieceType = 'knight';
    group.userData.pieceColor = color;
    return group;
  }

  // ===== GAJA (Bishop / Elephant) =====
  buildBishop(color) {
    const T = this.THREE;
    const group = new T.Group();
    const mat = this.getMaterial(color);
    const goldMat = this.getMaterial(color, 'gold');
    const gemMat = this.getMaterial(color, 'gem');

    // Base
    this.addMesh(group, this.createCylinder(0.32, 0.40, 0.1, 14), mat, 0, 0.05, 0);
    // Lower body
    this.addMesh(group, this.createCylinder(0.28, 0.35, 0.25, 12), mat, 0, 0.225, 0);
    // Decorative ring
    this.addMesh(group, this.createCylinder(0.32, 0.32, 0.06, 14), goldMat, 0, 0.385, 0);
    // Upper body - elephant belly
    this.addMesh(group, new T.SphereGeometry(0.3, 14, 12), mat, 0, 0.6, 0);
    // Elephant head - larger
    const headGeo = new T.SphereGeometry(0.28, 14, 12);
    this.addMesh(group, headGeo, mat, 0, 0.98, 0);
    // Trunk - curved downward
    this.addMesh(group, this.createCylinder(0.06, 0.1, 0.45, 8), mat, 0.2, 0.78, 0, 0, 0, 1.1);
    this.addMesh(group, this.createCylinder(0.05, 0.06, 0.25, 8), mat, 0.44, 0.62, 0, 0, 0, 1.5);
    // Tusks
    this.addMesh(group, this.createCylinder(0.03, 0.05, 0.3, 6), goldMat, 0.18, 0.9, 0.1, 0, 0, 1.2);
    this.addMesh(group, this.createCylinder(0.03, 0.05, 0.3, 6), goldMat, 0.18, 0.9, -0.1, 0, 0, 1.2);
    // Ears
    const earGeo = new T.SphereGeometry(0.18, 10, 8);
    this.addMesh(group, earGeo, mat, 0, 0.92, 0.28);
    this.addMesh(group, earGeo, mat, 0, 0.92, -0.28);
    // Howdah (seat on top)
    this.addMesh(group, this.createBox(0.35, 0.08, 0.3), goldMat, 0, 1.3, 0);
    // Howdah walls
    this.addMesh(group, this.createBox(0.32, 0.18, 0.04), goldMat, 0, 1.42, 0.13);
    this.addMesh(group, this.createBox(0.32, 0.18, 0.04), goldMat, 0, 1.42, -0.13);
    // Gem on howdah
    this.addMesh(group, new T.SphereGeometry(0.07, 8, 8), gemMat, 0, 1.56, 0);

    group.userData.pieceType = 'bishop';
    group.userData.pieceColor = color;
    return group;
  }

  // ===== RATHA (Rook / Chariot) =====
  buildRook(color) {
    const T = this.THREE;
    const group = new T.Group();
    const mat = this.getMaterial(color);
    const goldMat = this.getMaterial(color, 'gold');
    const gemMat = this.getMaterial(color, 'gem');

    // Chariot wheels (large and ornate)
    const wheelGeo = new T.TorusGeometry(0.28, 0.06, 8, 16);
    const wheelMat = this.getMaterial(color, 'gold');
    this.addMesh(group, wheelGeo, wheelMat, -0.22, 0.28, 0.0, Math.PI/2, 0, 0);
    this.addMesh(group, wheelGeo, wheelMat, 0.22, 0.28, 0.0, Math.PI/2, 0, 0);
    // Wheel spokes
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      for (const side of [-0.22, 0.22]) {
        const spokeGeo = this.createCylinder(0.02, 0.02, 0.26, 4);
        this.addMesh(group, spokeGeo, mat, side, 0.28, 0,
          0, 0, angle);
      }
    }
    // Axle
    this.addMesh(group, this.createCylinder(0.05, 0.05, 0.5, 8), mat, 0, 0.28, 0, 0, 0, Math.PI/2);
    // Chariot body floor
    this.addMesh(group, this.createBox(0.7, 0.08, 0.55), mat, 0, 0.58, 0);
    // Side walls
    this.addMesh(group, this.createBox(0.08, 0.5, 0.55), goldMat, 0.31, 0.87, 0);
    this.addMesh(group, this.createBox(0.08, 0.5, 0.55), goldMat, -0.31, 0.87, 0);
    this.addMesh(group, this.createBox(0.7, 0.5, 0.08), goldMat, 0, 0.87, -0.24);
    // Battlements (crenellations on top)
    for (let i = 0; i < 4; i++) {
      const xPos = -0.24 + i * 0.16;
      this.addMesh(group, this.createBox(0.1, 0.22, 0.08), mat, xPos, 1.23, -0.24);
      this.addMesh(group, this.createBox(0.08, 0.22, 0.1), goldMat, 0.31, 1.23, -0.06 + i * 0.16 > 0.2 ? 0.2 : -0.06 + i*0.16);
      this.addMesh(group, this.createBox(0.08, 0.22, 0.1), goldMat, -0.31, 1.23, -0.06 + i * 0.16 > 0.2 ? 0.2 : -0.06 + i*0.16);
    }
    // Flag on top
    this.addMesh(group, this.createCylinder(0.02, 0.02, 0.4, 6), goldMat, 0, 1.45, -0.2);
    this.addMesh(group, this.createBox(0.18, 0.12, 0.02), gemMat, 0.09, 1.62, -0.2);

    group.userData.pieceType = 'rook';
    group.userData.pieceColor = color;
    return group;
  }

  // ===== MANTRI (Queen / Counselor) =====
  buildQueen(color) {
    const T = this.THREE;
    const group = new T.Group();
    const mat = this.getMaterial(color);
    const goldMat = this.getMaterial(color, 'gold');
    const gemMat = this.getMaterial(color, 'gem');

    // Base - ornate
    this.addMesh(group, this.createCylinder(0.35, 0.42, 0.08, 16), goldMat, 0, 0.04, 0);
    this.addMesh(group, this.createCylinder(0.3, 0.35, 0.08, 14), mat, 0, 0.1, 0);
    // Lower column
    this.addMesh(group, this.createCylinder(0.18, 0.28, 0.4, 12), mat, 0, 0.34, 0);
    // Mid ring
    this.addMesh(group, this.createCylinder(0.22, 0.22, 0.08, 14), goldMat, 0, 0.58, 0);
    // Upper column
    this.addMesh(group, this.createCylinder(0.2, 0.2, 0.3, 12), mat, 0, 0.79, 0);
    // Shoulder disc
    this.addMesh(group, this.createCylinder(0.28, 0.22, 0.08, 14), goldMat, 0, 0.98, 0);
    // Body
    this.addMesh(group, new T.SphereGeometry(0.26, 14, 12), mat, 0, 1.18, 0);
    // Neck
    this.addMesh(group, this.createCylinder(0.1, 0.15, 0.18, 10), mat, 0, 1.45, 0);
    // Head
    this.addMesh(group, new T.SphereGeometry(0.2, 14, 12), mat, 0, 1.69, 0);
    // Crown
    this.addMesh(group, this.createCylinder(0.22, 0.2, 0.12, 14), goldMat, 0, 1.85, 0);
    // Crown points (7 points)
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const cx = Math.cos(angle) * 0.19;
      const cz = Math.sin(angle) * 0.19;
      this.addMesh(group, this.createCylinder(0.02, 0.05, 0.22, 6), goldMat, cx, 2.0, cz);
      // Gem on each point
      if (i % 2 === 0) {
        this.addMesh(group, new T.SphereGeometry(0.04, 6, 6), gemMat, cx, 2.12, cz);
      }
    }
    // Central gem
    this.addMesh(group, new T.SphereGeometry(0.08, 8, 8), gemMat, 0, 1.94, 0);

    group.userData.pieceType = 'queen';
    group.userData.pieceColor = color;
    return group;
  }

  // ===== RAJA (King / King) =====
  buildKing(color) {
    const T = this.THREE;
    const group = new T.Group();
    const mat = this.getMaterial(color);
    const goldMat = this.getMaterial(color, 'gold');
    const gemMat = this.getMaterial(color, 'gem');

    // Base - most ornate
    this.addMesh(group, this.createCylinder(0.38, 0.45, 0.08, 16), goldMat, 0, 0.04, 0);
    this.addMesh(group, this.createCylinder(0.34, 0.38, 0.06, 16), mat, 0, 0.11, 0);
    this.addMesh(group, this.createCylinder(0.32, 0.34, 0.06, 16), goldMat, 0, 0.17, 0);
    // Lower column
    this.addMesh(group, this.createCylinder(0.2, 0.3, 0.45, 12), mat, 0, 0.415, 0);
    // Mid ring
    this.addMesh(group, this.createCylinder(0.25, 0.25, 0.09, 14), goldMat, 0, 0.685, 0);
    // Upper column
    this.addMesh(group, this.createCylinder(0.22, 0.22, 0.35, 12), mat, 0, 0.905, 0);
    // Shoulder disc
    this.addMesh(group, this.createCylinder(0.32, 0.25, 0.09, 14), goldMat, 0, 1.105, 0);
    // Body
    this.addMesh(group, new T.SphereGeometry(0.3, 14, 12), mat, 0, 1.32, 0);
    // Neck
    this.addMesh(group, this.createCylinder(0.12, 0.17, 0.2, 10), mat, 0, 1.57, 0);
    // Head
    this.addMesh(group, new T.SphereGeometry(0.22, 14, 12), mat, 0, 1.82, 0);
    // Crown band
    this.addMesh(group, this.createCylinder(0.24, 0.22, 0.14, 14), goldMat, 0, 1.99, 0);
    // Crown - tall royal turban
    this.addMesh(group, this.createCylinder(0.18, 0.22, 0.3, 12), mat, 0, 2.18, 0);
    this.addMesh(group, new T.SphereGeometry(0.18, 12, 10), mat, 0, 2.36, 0);
    // Crown jewels
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const cx = Math.cos(angle) * 0.22;
      const cz = Math.sin(angle) * 0.22;
      this.addMesh(group, new T.SphereGeometry(0.06, 8, 8), gemMat, cx, 2.04, cz);
    }
    // Upright cross on crown
    this.addMesh(group, this.createBox(0.08, 0.38, 0.06), goldMat, 0, 2.24, 0);
    this.addMesh(group, this.createBox(0.28, 0.07, 0.06), goldMat, 0, 2.36, 0);
    // Top gem
    this.addMesh(group, new T.SphereGeometry(0.09, 8, 8), gemMat, 0, 2.56, 0);

    group.userData.pieceType = 'king';
    group.userData.pieceColor = color;
    return group;
  }

  buildPiece(type, color) {
    switch (type) {
      case 'pawn':   return this.buildPawn(color);
      case 'knight': return this.buildKnight(color);
      case 'bishop': return this.buildBishop(color);
      case 'rook':   return this.buildRook(color);
      case 'queen':  return this.buildQueen(color);
      case 'king':   return this.buildKing(color);
      default: return new this.THREE.Group();
    }
  }
}

window.PieceBuilder = PieceBuilder;
