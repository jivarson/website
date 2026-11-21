// ---------- Three.js background: cyber globe, Matrix rain, network plexus & friends ----------
// Tuned for low-end laptops: capped FPS, adaptive resolution, shared textures, no per-frame allocations.
(function () {
  if (!window.THREE) return;
  const canvas = document.getElementById("bg");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.045);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.z = 14;
  const ADD = THREE.AdditiveBlending;

  // ----- quality settings (adapted at runtime) -----
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 700;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, lowEnd ? 0.75 : 1);
  const FPS = 30, FRAME = 1 / FPS;

  const group = new THREE.Group();
  scene.add(group);

  // Globe: wireframe icosahedron + glowing vertex nodes
  const globeGeo = new THREE.IcosahedronGeometry(4, 2);
  const globe = new THREE.Mesh(globeGeo, new THREE.MeshBasicMaterial({ color: 0x00ff41, wireframe: true, transparent: true, opacity: 0.25 }));
  group.add(globe);
  group.add(new THREE.Points(globeGeo, new THREE.PointsMaterial({ color: 0x9dffb0, size: 0.12 })));

  // Inner core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.6, 0),
    new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true, transparent: true, opacity: 0.6 })
  );
  group.add(core);

  // Orbiting rings
  const rings = [];
  [[5.5, 0x9dffb0, 1.2], [6.5, 0x39ff14, -0.6], [7.4, 0x00ff41, 0.4]].forEach(([r, color, tilt]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.015, 4, 96),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2 + tilt;
    ring.rotation.y = tilt;
    group.add(ring);
    rings.push(ring);
  });

  // Starfield of "data packets"
  const COUNT = lowEnd ? 900 : 1500;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i++) pos[i] = (Math.random() - 0.5) * 80;
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x00ff41, size: 0.06, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  // Grid floor
  const grid = new THREE.GridHelper(120, 60, 0x9dffb0, 0x0a4a1a);
  grid.position.y = -8;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  // 1) 3D Matrix rain: ONE small canvas texture shared by three depth layers
  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ0123456789ABCDEF<>{}[]/$#";
  const RS = 256, FONT = 12;
  const rc = document.createElement("canvas");
  rc.width = rc.height = RS;
  const rctx = rc.getContext("2d");
  rctx.fillStyle = "#000"; rctx.fillRect(0, 0, RS, RS);
  rctx.font = FONT + "px monospace";
  const cols = Math.floor(RS / FONT);
  const drops = Array.from({ length: cols }, () => Math.random() * -RS / FONT);
  const rainTex = new THREE.CanvasTexture(rc);
  rainTex.wrapS = rainTex.wrapT = THREE.RepeatWrapping;
  rainTex.minFilter = THREE.LinearFilter; // no mipmap regeneration on every upload
  rainTex.generateMipmaps = false;
  const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
  function stepRain() {
    rctx.fillStyle = "rgba(0,0,0,0.12)"; rctx.fillRect(0, 0, RS, RS);
    for (let i = 0; i < cols; i++) {
      const y = drops[i] * FONT;
      rctx.fillStyle = "#d8ffe0"; rctx.fillText(glyph(), i * FONT, y);
      rctx.fillStyle = "#00ff41"; rctx.fillText(glyph(), i * FONT, y - FONT);
      if (y > RS && Math.random() > 0.95) drops[i] = 0;
      drops[i] += 1;
    }
    rainTex.needsUpdate = true;
  }
  // All layers use the same texture (one GPU upload per update); tiling/offset is baked into each plane's UVs.
  [[-22, 70, 0.4, 2], [-34, 100, 0.25, 3], [-50, 150, 0.15, 4]].forEach(([z, s, op, rep], i) => {
    const geo = new THREE.PlaneGeometry(s, s * 0.6);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * rep + i * 0.37, uv.getY(k) * rep * 0.6 + i * 0.21);
    const plane = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, opacity: op, blending: ADD, depthWrite: false, fog: false })
    );
    plane.position.set((i - 1) * 6, 0, z);
    scene.add(plane);
  });

  // 2) Network "plexus": drifting nodes that link up when close (preallocated buffers)
  const N = lowEnd ? 40 : 55, LINK = 6.5, LINK2 = LINK * LINK;
  const nPos = new Float32Array(N * 3), nVel = new Float32Array(N * 3);
  const LIM = [22, 12, 10], CEN = [0, 0, -13];
  for (let i = 0; i < N; i++) {
    nPos[i * 3] = (Math.random() - 0.5) * 44;
    nPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    nPos[i * 3 + 2] = -6 - Math.random() * 14;
    nVel[i * 3] = (Math.random() - 0.5) * 0.06;
    nVel[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
    nVel[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
  scene.add(new THREE.Points(netGeo, new THREE.PointsMaterial({ color: 0x9dffb0, size: 0.18, transparent: true, opacity: 0.9, blending: ADD, depthWrite: false })));
  const MAXL = (N * (N - 1)) / 2;
  const lPos = new Float32Array(MAXL * 6), lCol = new Float32Array(MAXL * 6);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(lCol, 3));
  scene.add(new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: ADD, depthWrite: false })));
  function updateNet(move) {
    if (move) for (let i = 0; i < N * 3; i++) {
      nPos[i] += nVel[i];
      const a = i % 3;
      if (Math.abs(nPos[i] - CEN[a]) > LIM[a]) nVel[i] = -nVel[i];
    }
    let k = 0;
    for (let i = 0; i < N; i++) {
      const ix = nPos[i * 3], iy = nPos[i * 3 + 1], iz = nPos[i * 3 + 2];
      for (let j = i + 1; j < N; j++) {
        const dx = ix - nPos[j * 3], dy = iy - nPos[j * 3 + 1], dz = iz - nPos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < LINK2) {
          const f = 1 - Math.sqrt(d2) / LINK, o = k * 6;
          lPos[o] = ix; lPos[o + 1] = iy; lPos[o + 2] = iz;
          lPos[o + 3] = nPos[j * 3]; lPos[o + 4] = nPos[j * 3 + 1]; lPos[o + 5] = nPos[j * 3 + 2];
          lCol[o] = 0; lCol[o + 1] = f; lCol[o + 2] = f * 0.25;
          lCol[o + 3] = 0; lCol[o + 4] = f; lCol[o + 5] = f * 0.25;
          k++;
        }
      }
    }
    linkGeo.setDrawRange(0, k * 2);
    netGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
  }

  // 3) Data packets racing along the orbit rings
  const packetMat = new THREE.MeshBasicMaterial({ color: 0xd8ffe0 });
  const packetGeo = new THREE.OctahedronGeometry(0.14);
  const packets = rings.map((ring, i) => {
    const p = new THREE.Mesh(packetGeo, packetMat);
    ring.add(p);
    return { p, r: ring.geometry.parameters.radius, speed: 0.9 + i * 0.35 };
  });

  // 4) Radar pulses expanding out from the globe
  const pulseGeo = new THREE.RingGeometry(3.9, 4.05, 64);
  const pulses = [0, 0.5].map((offset) => {
    const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, side: THREE.DoubleSide, blending: ADD, depthWrite: false }));
    m.rotation.x = Math.PI / 2;
    group.add(m);
    return { m, offset };
  });

  // 5) Floating wireframe shards
  const shardGeos = [new THREE.OctahedronGeometry(0.7), new THREE.TetrahedronGeometry(0.8), new THREE.BoxGeometry(0.9, 0.9, 0.9)];
  const shardMats = [0x00ff41, 0x39ff14].map((color) => new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55 }));
  const shards = [];
  for (let i = 0; i < (lowEnd ? 10 : 16); i++) {
    const s = new THREE.Mesh(shardGeos[i % 3], shardMats[i % 2]);
    s.position.set((Math.random() - 0.5) * 36, (Math.random() - 0.5) * 18, -2 - Math.random() * 16);
    s.userData = { spin: (Math.random() - 0.5) * 1.5, bob: Math.random() * Math.PI * 2, y0: s.position.y };
    scene.add(s);
    shards.push(s);
  }

  // 6) Horizontal scan beam sweeping the scene
  const beam = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.35, blending: ADD, depthWrite: false })
  );
  beam.position.z = -4;
  scene.add(beam);

  updateNet(false);
  for (let i = 0; i < 40; i++) stepRain();

  // ----- sizing / adaptive resolution -----
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    group.position.x = w > 900 ? 4 : 0; // offset globe on wide screens
  }
  window.addEventListener("resize", resize);
  resize();

  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let acc = 0, lastRain = 0, frame = 0, slowFrames = 0, running = true;

  function update(t) {
    group.rotation.y = t * 0.15 + mouse.x * 0.6;
    group.rotation.x = mouse.y * 0.4;
    core.rotation.x = t * 0.8;
    core.rotation.y = t * 0.6;
    core.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    rings.forEach((r, i) => (r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1)));
    stars.rotation.y = t * 0.01;
    grid.position.z = (t * 2) % 2;

    if (t - lastRain > 0.08) { stepRain(); lastRain = t; }
    if (frame % 2 === 0) updateNet(true);
    for (let i = 0; i < packets.length; i++) {
      const { p, r, speed } = packets[i], a = t * speed;
      p.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      p.rotation.y = t * 3;
    }
    for (let i = 0; i < pulses.length; i++) {
      const k = (t * 0.35 + pulses[i].offset) % 1;
      pulses[i].m.scale.setScalar(1 + k * 2.2);
      pulses[i].m.material.opacity = (1 - k) * 0.6;
    }
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i], u = s.userData;
      s.rotation.x += u.spin * 0.02; s.rotation.y += u.spin * 0.026;
      s.position.y = u.y0 + Math.sin(t * 0.8 + u.bob) * 0.6;
    }
    beam.position.y = Math.sin(t * 0.4) * 12;
    grid.material.opacity = Math.random() > 0.985 ? 0.7 : 0.35; // occasional glitch flicker
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    acc += dt;
    if (acc < FRAME) return; // cap at ~30fps
    // adaptive quality: if we're consistently missing the 30fps budget, drop resolution
    if (acc > FRAME * 1.6) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 20 && pixelRatio > 0.5) { pixelRatio = Math.max(0.5, pixelRatio - 0.15); slowFrames = 0; resize(); }
    acc %= FRAME;
    frame++;
    update(clock.elapsedTime);
    renderer.render(scene, camera);
  }

  // draw the first frame immediately so the background never starts blank
  update(0);
  renderer.render(scene, camera);
  if (!reduce) {
    loop();
    // stop rendering entirely while the tab is hidden
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) { clock.getDelta(); acc = 0; loop(); }
    });
  }
})();

// ---------- 3D tilt on hover ----------
document.querySelectorAll(".tilt").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.02)`;
  });
  el.addEventListener("pointerleave", () => (el.style.transform = ""));
});
