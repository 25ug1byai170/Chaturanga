// ===== 3D RENDERER =====
// Handles Three.js scene, board, pieces, lighting, and visual effects

class ChaturangaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.T = THREE;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.boardMeshes = [];
    this.pieceMeshes = {}; // key: "row_col" -> THREE.Group
    this.highlightMeshes = [];
    this.pieceBuilder = null;
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.cameraPolar = { theta: Math.PI / 4, phi: Math.PI / 3.5, radius: 14 };
    this.boardSize = 8;
    this.squareSize = 1.0;
    this.boardOffset = -3.5;
  }

  init() {
    const T = this.T;

    // Scene
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x0a0500);
    this.scene.fog = new T.FogExp2(0x0a0500, 0.025);

    // Camera
    this.camera = new T.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.updateCameraFromSpherical();

    // Renderer
    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Piece builder
    this.pieceBuilder = new PieceBuilder(T);

    // Build scene
    this.buildEnvironment();
    this.buildBoard();
    this.setupLighting();
    this.setupControls();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    return this;
  }

  buildEnvironment() {
    const T = this.T;
    const scene = this.scene;

    // Stars
    const starGeo = new T.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 80 + Math.random() * 40;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
    const starMat = new T.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
    scene.add(new T.Points(starGeo, starMat));

    // Ground plane
    const groundGeo = new T.PlaneGeometry(80, 80, 20, 20);
    const groundMat = new T.MeshStandardMaterial({
      color: 0x2a1500,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new T.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    scene.add(ground);

    // Torches at corners
    this.addTorches();

    // Decorative pillars at board corners
    this.addPillars();
  }

  addTorches() {
    const T = this.T;
    const positions = [[-5.5, -5.5], [-5.5, 5.5], [5.5, -5.5], [5.5, 5.5]];
    positions.forEach(([x, z]) => {
      // Torch pole
      const poleGeo = new T.CylinderGeometry(0.08, 0.1, 2.5, 8);
      const poleMat = new T.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
      const pole = new T.Mesh(poleGeo, poleMat);
      pole.position.set(x, 0.85, z);
      pole.castShadow = true;
      this.scene.add(pole);

      // Torch bowl
      const bowlGeo = new T.CylinderGeometry(0.18, 0.1, 0.3, 10);
      const bowlMat = new T.MeshStandardMaterial({ color: 0x8B6914, metalness: 0.6, roughness: 0.3 });
      const bowl = new T.Mesh(bowlGeo, bowlMat);
      bowl.position.set(x, 2.2, z);
      this.scene.add(bowl);

      // Flame light
      const light = new T.PointLight(0xFF6600, 1.5, 10);
      light.position.set(x, 2.5, z);
      light.castShadow = false;
      this.scene.add(light);

      // Animate flame flicker
      const startIntensity = 1.5;
      const animFlicker = () => {
        light.intensity = startIntensity + (Math.random() - 0.5) * 0.6;
        light.position.x = x + (Math.random() - 0.5) * 0.05;
        light.position.z = z + (Math.random() - 0.5) * 0.05;
        setTimeout(animFlicker, 60 + Math.random() * 80);
      };
      setTimeout(animFlicker, Math.random() * 500);
    });
  }

  addPillars() {
    const T = this.T;
    const positions = [[-5, -5], [-5, 5], [5, -5], [5, 5]];
    const pillarMat = new T.MeshStandardMaterial({
      color: 0xC19A6B, roughness: 0.6, metalness: 0.3
    });
    positions.forEach(([x, z]) => {
      const geo = new T.CylinderGeometry(0.2, 0.25, 4, 12);
      const mesh = new T.Mesh(geo, pillarMat);
      mesh.position.set(x, 1.6, z);
      mesh.castShadow = true;
      this.scene.add(mesh);

      // Capital
      const capGeo = new T.CylinderGeometry(0.38, 0.22, 0.3, 12);
      const cap = new T.Mesh(capGeo, pillarMat);
      cap.position.set(x, 3.75, z);
      this.scene.add(cap);
    });
  }

  buildBoard() {
    const T = this.T;
    const squareSize = this.squareSize;
    const offset = this.boardOffset;

    // Board base
    const baseGeo = new T.BoxGeometry(9.4, 0.35, 9.4);
    const baseMat = new T.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.6,
      metalness: 0.3
    });
    const base = new T.Mesh(baseGeo, baseMat);
    base.position.y = -0.3;
    base.receiveShadow = true;
    base.castShadow = true;
    this.scene.add(base);

    // Border frame
    const frameMat = new T.MeshStandardMaterial({
      color: 0xD4AF37, roughness: 0.2, metalness: 0.8
    });
    const borders = [
      { w: 9.6, h: 0.18, d: 0.28, x: 0, y: 0.07, z: -4.7 },
      { w: 9.6, h: 0.18, d: 0.28, x: 0, y: 0.07, z: 4.7 },
      { w: 0.28, h: 0.18, d: 9.6, x: -4.7, y: 0.07, z: 0 },
      { w: 0.28, h: 0.18, d: 9.6, x: 4.7, y: 0.07, z: 0 },
    ];
    borders.forEach(b => {
      const geo = new T.BoxGeometry(b.w, b.h, b.d);
      const mesh = new T.Mesh(geo, frameMat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });

    // Squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const geo = new T.BoxGeometry(squareSize - 0.02, 0.12, squareSize - 0.02);

        // Ornate materials
        const mat = new T.MeshStandardMaterial({
          color: isLight ? 0xF0D9B5 : 0x8B5E3C,
          roughness: isLight ? 0.4 : 0.6,
          metalness: isLight ? 0.15 : 0.1,
        });

        const mesh = new T.Mesh(geo, mat);
        mesh.position.x = offset + col * squareSize + squareSize / 2;
        mesh.position.y = 0;
        mesh.position.z = offset + row * squareSize + squareSize / 2;
        mesh.receiveShadow = true;
        mesh.userData.row = row;
        mesh.userData.col = col;
        mesh.userData.isSquare = true;
        mesh.userData.originalColor = isLight ? 0xF0D9B5 : 0x8B5E3C;
        this.scene.add(mesh);
        this.boardMeshes.push(mesh);
      }
    }

    // Coordinate labels (subtle etching effect)
    // Using floating text would require canvas texture; skip for perf
  }

  setupLighting() {
    const T = this.T;
    const scene = this.scene;

    // Ambient
    const ambient = new T.AmbientLight(0x3D2B1F, 0.4);
    scene.add(ambient);

    // Main directional (sun-like)
    const dirLight = new T.DirectionalLight(0xFFD080, 1.2);
    dirLight.position.set(8, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    dirLight.shadow.bias = -0.0002;
    scene.add(dirLight);

    // Rim light
    const rimLight = new T.DirectionalLight(0xFF6600, 0.5);
    rimLight.position.set(-6, 4, -8);
    scene.add(rimLight);

    // Board surface glow
    const boardLight = new T.PointLight(0xFFCC66, 0.6, 12);
    boardLight.position.set(0, 4, 0);
    scene.add(boardLight);

    this.boardLight = boardLight;
  }

  setupControls() {
    const canvas = this.canvas;
    let isDown = false;
    let lastX, lastY;
    let pinchDist = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.cameraPolar.theta -= dx * 0.01;
      this.cameraPolar.phi = Math.max(0.2, Math.min(Math.PI / 2.2, this.cameraPolar.phi + dy * 0.01));
      this.updateCameraFromSpherical();
    });

    canvas.addEventListener('mouseup', () => { isDown = false; });
    canvas.addEventListener('mouseleave', () => { isDown = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraPolar.radius = Math.max(5, Math.min(22, this.cameraPolar.radius + e.deltaY * 0.01));
      this.updateCameraFromSpherical();
    }, { passive: false });

    // Touch
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDown = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDown) {
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        this.cameraPolar.theta -= dx * 0.01;
        this.cameraPolar.phi = Math.max(0.2, Math.min(Math.PI / 2.2, this.cameraPolar.phi + dy * 0.01));
        this.updateCameraFromSpherical();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => { isDown = false; });
  }

  updateCameraFromSpherical() {
    const { theta, phi, radius } = this.cameraPolar;
    this.camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = radius * Math.cos(phi);
    this.camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
    this.camera.lookAt(this.cameraTarget);
  }

  // Convert board row/col to world position
  boardToWorld(row, col) {
    const offset = this.boardOffset;
    const s = this.squareSize;
    return new THREE.Vector3(
      offset + col * s + s / 2,
      0.12,
      offset + row * s + s / 2
    );
  }

  // Place all pieces on board
  placePieces(boardState) {
    // Remove existing
    Object.values(this.pieceMeshes).forEach(mesh => this.scene.remove(mesh));
    this.pieceMeshes = {};

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece) this.addPieceMesh(piece.type, piece.color, row, col);
      }
    }
  }

  addPieceMesh(type, color, row, col) {
    const mesh = this.pieceBuilder.buildPiece(type, color);
    const pos = this.boardToWorld(row, col);
    mesh.position.copy(pos);

    // Scale pieces to fit board
    const scale = 0.38;
    mesh.scale.set(scale, scale, scale);

    // Face the correct direction
    if (color === 'black') mesh.rotation.y = Math.PI;

    mesh.castShadow = true;
    this.scene.add(mesh);
    this.pieceMeshes[`${row}_${col}`] = mesh;
    return mesh;
  }

  getPieceMesh(row, col) {
    return this.pieceMeshes[`${row}_${col}`] || null;
  }

  removePieceMesh(row, col) {
    const key = `${row}_${col}`;
    const mesh = this.pieceMeshes[key];
    if (mesh) {
      this.scene.remove(mesh);
      mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      delete this.pieceMeshes[key];
    }
  }

  movePieceMesh(fromRow, fromCol, toRow, toCol) {
    const key = `${fromRow}_${fromCol}`;
    const mesh = this.pieceMeshes[key];
    if (!mesh) return;
    delete this.pieceMeshes[key];
    this.pieceMeshes[`${toRow}_${toCol}`] = mesh;

    const toPos = this.boardToWorld(toRow, toCol);
    mesh.position.copy(toPos);
  }

  doCastlingVisual(to, side, color) {
    const rank = color === 'white' ? 7 : 0;
    if (side === 'kingside') {
      const rookMesh = this.getPieceMesh(rank, 7);
      if (!rookMesh) return;
      delete this.pieceMeshes[`${rank}_7`];
      this.pieceMeshes[`${rank}_5`] = rookMesh;
      const pos = this.boardToWorld(rank, 5);
      rookMesh.position.copy(pos);
    } else {
      const rookMesh = this.getPieceMesh(rank, 0);
      if (!rookMesh) return;
      delete this.pieceMeshes[`${rank}_0`];
      this.pieceMeshes[`${rank}_3`] = rookMesh;
      const pos = this.boardToWorld(rank, 3);
      rookMesh.position.copy(pos);
    }
  }

  // ===== HIGHLIGHTS =====
  clearHighlights() {
    this.highlightMeshes.forEach(m => this.scene.remove(m));
    this.highlightMeshes = [];

    // Reset square colors
    this.boardMeshes.forEach(m => {
      m.material.color.setHex(m.userData.originalColor);
      m.material.emissive = new THREE.Color(0x000000);
      m.material.emissiveIntensity = 0;
    });
  }

  highlightSquare(row, col, type = 'selected') {
    const colors = {
      selected: 0x44AA44,
      valid:    0x2255DD,
      capture:  0xDD4422,
      check:    0xFF0000,
      lastMove: 0xAAAA22
    };
    const emissiveColors = {
      selected: 0x225522,
      valid:    0x112244,
      capture:  0x441111,
      check:    0x440000,
      lastMove: 0x333300
    };

    const square = this.boardMeshes.find(m => m.userData.row === row && m.userData.col === col);
    if (square) {
      square.material.color.setHex(colors[type] || 0x44AA44);
      square.material.emissive = new THREE.Color(emissiveColors[type] || 0x112211);
      square.material.emissiveIntensity = 0.4;
    }

    // Add dot indicator for valid moves
    if (type === 'valid' || type === 'capture') {
      const T = this.T;
      const pos = this.boardToWorld(row, col);
      const dotGeo = new T.CylinderGeometry(
        type === 'capture' ? 0.4 : 0.2,
        type === 'capture' ? 0.4 : 0.2,
        0.05, 16
      );
      const dotMat = new T.MeshBasicMaterial({
        color: type === 'capture' ? 0xFF4422 : 0x4488FF,
        transparent: true,
        opacity: 0.65
      });
      const dot = new T.Mesh(dotGeo, dotMat);
      dot.position.set(pos.x, 0.2, pos.z);
      this.scene.add(dot);
      this.highlightMeshes.push(dot);
    }
  }

  highlightLastMove(from, to) {
    this.highlightSquare(from[0], from[1], 'lastMove');
    this.highlightSquare(to[0], to[1], 'lastMove');
  }

  highlightCheck(row, col) {
    this.highlightSquare(row, col, 'check');
  }

  // ===== RAYCASTING (click detection) =====
  getClickedSquare(clientX, clientY) {
    const T = this.T;
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new T.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new T.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.boardMeshes);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData.isSquare !== undefined) {
        return { row: obj.userData.row, col: obj.userData.col };
      }
    }

    // Also check piece meshes
    const pieceMeshArray = Object.values(this.pieceMeshes);
    const pieceIntersects = raycaster.intersectObjects(pieceMeshArray, true);
    if (pieceIntersects.length > 0) {
      let obj = pieceIntersects[0].object;
      // Walk up to find the root group (which is in pieceMeshes)
      while (obj.parent) {
        for (const [key, mesh] of Object.entries(this.pieceMeshes)) {
          if (mesh === obj) {
            const [r, c] = key.split('_').map(Number);
            return { row: r, col: c };
          }
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  // ===== CAMERA PRESETS =====
  setCameraView(view) {
    const targets = {
      top:        { theta: 0, phi: 0.05, radius: 14 },
      white:      { theta: Math.PI, phi: Math.PI / 3.5, radius: 14 },
      black:      { theta: 0, phi: Math.PI / 3.5, radius: 14 },
      cinematic:  null // handled by animation loop
    };

    if (view === 'cinematic') {
      this.cinematicMode = true;
      return;
    }
    this.cinematicMode = false;

    const target = targets[view];
    if (!target) return;

    const startTheta = this.cameraPolar.theta;
    const startPhi = this.cameraPolar.phi;
    const startRadius = this.cameraPolar.radius;
    const duration = 1.0;
    const startTime = performance.now();

    const animCam = () => {
      const t = Math.min((performance.now() - startTime) / 1000 / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      this.cameraPolar.theta = startTheta + (target.theta - startTheta) * ease;
      this.cameraPolar.phi = startPhi + (target.phi - startPhi) * ease;
      this.cameraPolar.radius = startRadius + (target.radius - startRadius) * ease;
      this.updateCameraFromSpherical();
      if (t < 1) requestAnimationFrame(animCam);
    };
    requestAnimationFrame(animCam);
  }

  // ===== RENDER LOOP =====
  startRenderLoop() {
    let time = 0;
    const render = () => {
      requestAnimationFrame(render);
      time += 0.01;

      // Animate board light
      if (this.boardLight) {
        this.boardLight.intensity = 0.5 + Math.sin(time * 0.7) * 0.1;
      }

      // Cinematic auto-rotate
      if (this.cinematicMode) {
        this.cameraPolar.theta += 0.003;
        this.updateCameraFromSpherical();
      }

      // Animate highlight dots
      this.highlightMeshes.forEach(m => {
        m.rotation.y += 0.02;
        m.material.opacity = 0.5 + Math.sin(time * 3) * 0.2;
      });

      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.ChaturangaRenderer = ChaturangaRenderer;
