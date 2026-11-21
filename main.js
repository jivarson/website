// ---------- Three.js background: wireframe "cyber globe", orbiting rings, data particles ----------
(function () {
  if (!window.THREE) return;
  const canvas = document.getElementById("bg");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.045);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.z = 14;

  const group = new THREE.Group();
  scene.add(group);

  // Globe: wireframe icosahedron + glowing vertex nodes
  const globeGeo = new THREE.IcosahedronGeometry(4, 2);
  const globe = new THREE.Mesh(globeGeo, new THREE.MeshBasicMaterial({ color: 0x00ff41, wireframe: true, transparent: true, opacity: 0.25 }));
  group.add(globe);
  const nodes = new THREE.Points(globeGeo, new THREE.PointsMaterial({ color: 0x9dffb0, size: 0.12 }));
  group.add(nodes);

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
      new THREE.TorusGeometry(r, 0.015, 8, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2 + tilt;
    ring.rotation.y = tilt;
    group.add(ring);
    rings.push(ring);
  });

  // Starfield of "data packets"
  const COUNT = 1800;
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


  // ---------- Extra cyber effects ----------
  const ADD = THREE.AdditiveBlending;

  // 1) 3D Matrix rain: layered "curtains" of falling glyphs at different depths
  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ0123456789ABCDEF<>{}[]/$#";
  function makeRain(size, font, speed) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size);
    const cols = Math.floor(size / font);
    const drops = Array.from({ length: cols }, () => Math.random() * -size / font);
    const tex = new THREE.CanvasTexture(c);
    return {
      tex,
      step() {
        ctx.fillStyle = "rgba(0,0,0,0.09)"; ctx.fillRect(0, 0, size, size);
        ctx.font = font + "px monospace";
        for (let i = 0; i < cols; i++) {
          const y = drops[i] * font;
          const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          ctx.fillStyle = "#d8ffe0"; ctx.fillText(ch, i * font, y);           // bright head
          ctx.fillStyle = "#00ff41"; ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * font, y - font);
          if (y > size && Math.random() > 0.96) drops[i] = 0;
          drops[i] += speed;
        }
        tex.needsUpdate = true;
      },
    };
  }
  const rains = [];
  [[-22, 70, 0.4], [-34, 100, 0.25], [-50, 150, 0.15]].forEach(([z, s, op], i) => {
    const rain = makeRain(512, 14 + i * 2, 1);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(s, s * 0.6),
      new THREE.MeshBasicMaterial({ map: rain.tex, transparent: true, opacity: op, blending: ADD, depthWrite: false, fog: false })
    );
    plane.position.set((i - 1) * 6, 0, z);
    scene.add(plane);
    rains.push(rain);
  });

  // 2) Network "plexus": drifting nodes that link up when close
  const N = 70, LINK = 6.5;
  const nPos = new Float32Array(N * 3), nVel = [];
  for (let i = 0; i < N; i++) {
    nPos[i * 3] = (Math.random() - 0.5) * 44;
    nPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    nPos[i * 3 + 2] = -6 - Math.random() * 14;
    nVel.push([(Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.02]);
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
  const netNodes = new THREE.Points(netGeo, new THREE.PointsMaterial({ color: 0x9dffb0, size: 0.18, transparent: true, opacity: 0.9, blending: ADD, depthWrite: false }));
  scene.add(netNodes);
  const MAXL = N * N / 2;
  const lPos = new Float32Array(MAXL * 6), lCol = new Float32Array(MAXL * 6);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(lCol, 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: ADD, depthWrite: false }));
  scene.add(links);
  function updateNet(move) {
    let k = 0;
    for (let i = 0; i < N; i++) {
      if (move) for (let a = 0; a < 3; a++) {
        nPos[i * 3 + a] += nVel[i][a];
        const lim = [22, 12, 10][a], c = a === 2 ? -13 : 0;
        if (Math.abs(nPos[i * 3 + a] - c) > lim) nVel[i][a] *= -1;
      }
    }
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = nPos[i*3]-nPos[j*3], dy = nPos[i*3+1]-nPos[j*3+1], dz = nPos[i*3+2]-nPos[j*3+2];
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < LINK) {
        const f = 1 - d / LINK;
        lPos.set([nPos[i*3], nPos[i*3+1], nPos[i*3+2], nPos[j*3], nPos[j*3+1], nPos[j*3+2]], k * 6);
        lCol.set([0, f, f * 0.25, 0, f, f * 0.25], k * 6);
        k++;
      }
    }
    linkGeo.setDrawRange(0, k * 2);
    netGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
  }

  // 3) Data packets racing along the orbit rings
  const packets = rings.map((ring, i) => {
    const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: 0xd8ffe0 }));
    ring.add(p);
    return { p, r: ring.geometry.parameters.radius, speed: 0.9 + i * 0.35 };
  });

  // 4) Radar pulses expanding out from the globe
  const pulses = [0, 0.5].map((offset) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(3.9, 4.05, 96),
      new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, side: THREE.DoubleSide, blending: ADD, depthWrite: false })
    );
    m.rotation.x = Math.PI / 2;
    group.add(m);
    return { m, offset };
  });

  // 5) Floating wireframe shards
  const shards = [];
  for (let i = 0; i < 16; i++) {
    const geo = [new THREE.OctahedronGeometry(0.7), new THREE.TetrahedronGeometry(0.8), new THREE.BoxGeometry(0.9, 0.9, 0.9)][i % 3];
    const s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x00ff41 : 0x39ff14, wireframe: true, transparent: true, opacity: 0.55 }));
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
  rains.forEach((r) => { for (let i = 0; i < 60; i++) r.step(); });
  let lastRain = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
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
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  (function animate() {
    const t = clock.getElapsedTime();
    const scrollT = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
    if (!reduce) {
      group.rotation.y = t * 0.15 + mouse.x * 0.6;
      group.rotation.x = mouse.y * 0.4;
      core.rotation.x = t * 0.8;
      core.rotation.y = t * 0.6;
      core.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
      rings.forEach((r, i) => (r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1)));
      stars.rotation.y = t * 0.01;
      grid.position.z = (t * 2) % 2;
      if (t - lastRain > 0.05) { rains.forEach((r) => r.step()); lastRain = t; }
      updateNet(true);
      packets.forEach(({ p, r, speed }) => { const a = t * speed; p.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); p.rotation.y = t * 3; });
      pulses.forEach(({ m, offset }) => {
        const k = (t * 0.35 + offset) % 1;
        m.scale.setScalar(1 + k * 2.2);
        m.material.opacity = (1 - k) * 0.6;
      });
      shards.forEach((s) => {
        const u = s.userData;
        s.rotation.x += u.spin * 0.01; s.rotation.y += u.spin * 0.013;
        s.position.y = u.y0 + Math.sin(t * 0.8 + u.bob) * 0.6;
      });
      beam.position.y = Math.sin(t * 0.4) * 12;
      grid.material.opacity = Math.random() > 0.985 ? 0.7 : 0.35; // occasional glitch flicker
      camera.position.z = 14 + scrollT * 10;
      camera.position.y = -scrollT * 3;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();
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
