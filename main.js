// ---------- Three.js background: wireframe "cyber globe", orbiting rings, data particles ----------
(function () {
  if (!window.THREE) return;
  const canvas = document.getElementById("bg");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070d, 0.045);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.z = 14;

  const group = new THREE.Group();
  scene.add(group);

  // Globe: wireframe icosahedron + glowing vertex nodes
  const globeGeo = new THREE.IcosahedronGeometry(4, 2);
  const globe = new THREE.Mesh(globeGeo, new THREE.MeshBasicMaterial({ color: 0x00ff9c, wireframe: true, transparent: true, opacity: 0.25 }));
  group.add(globe);
  const nodes = new THREE.Points(globeGeo, new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.12 }));
  group.add(nodes);

  // Inner core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.6, 0),
    new THREE.MeshBasicMaterial({ color: 0xff2bd6, wireframe: true, transparent: true, opacity: 0.6 })
  );
  group.add(core);

  // Orbiting rings
  const rings = [];
  [[5.5, 0x00e5ff, 1.2], [6.5, 0xff2bd6, -0.6], [7.4, 0x00ff9c, 0.4]].forEach(([r, color, tilt]) => {
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
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x00ff9c, size: 0.06, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  // Grid floor
  const grid = new THREE.GridHelper(120, 60, 0x00e5ff, 0x0a3a4a);
  grid.position.y = -8;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

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
      camera.position.z = 14 + scrollT * 10;
      camera.position.y = -scrollT * 3;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();
})();

// ---------- Typing effect ----------
(function () {
  const el = document.getElementById("typed");
  const lines = ["cybersecurity enthusiast", "ethical hacker in training", "ctf player", "linux tinkerer", "breaking things to secure them"];
  let li = 0, ci = 0, deleting = false;
  (function tick() {
    const line = lines[li];
    el.textContent = line.slice(0, ci);
    if (!deleting && ci < line.length) ci++;
    else if (deleting && ci > 0) ci--;
    else if (!deleting) { deleting = true; return setTimeout(tick, 1600); }
    else { deleting = false; li = (li + 1) % lines.length; }
    setTimeout(tick, deleting ? 35 : 75);
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

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => en.isIntersecting && en.target.classList.add("visible"));
}, { threshold: 0.15 });
document.querySelectorAll("section:not(.hero) > *").forEach((el) => { el.classList.add("reveal"); io.observe(el); });

document.getElementById("year").textContent = new Date().getFullYear();
