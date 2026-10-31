import * as THREE from "three";

const canvas = document.querySelector("#hero-scene");
const hero = document.querySelector("#hero-art");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function roundedRectangle(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function createScreenTexture() {
  const screen = document.createElement("canvas");
  screen.width = 1152;
  screen.height = 702;
  const context = screen.getContext("2d");
  if (!context) throw new Error("The browser couldn't create the 3D scene texture.");

  const background = context.createLinearGradient(0, 0, 1152, 702);
  background.addColorStop(0, "#101c2a");
  background.addColorStop(0.52, "#152333");
  background.addColorStop(1, "#211c35");
  context.fillStyle = background;
  context.fillRect(0, 0, 1152, 702);
  context.fillStyle = "rgba(255,255,255,0.055)";
  context.fillRect(0, 0, 1152, 66);
  context.fillStyle = "rgba(49, 228, 209, 0.1)";
  context.fillRect(0, 65, 1152, 2);

  ["#fa7580", "#eabe68", "#52d8b7"].forEach((color, index) => {
    context.beginPath();
    context.fillStyle = color;
    context.arc(31 + index * 26, 33, 7, 0, Math.PI * 2);
    context.fill();
  });
  context.fillStyle = "#c9d6e8";
  context.font = "600 17px monospace";
  context.fillText("PRINCE RAJ  /  PORTFOLIO", 137, 40);
  context.textAlign = "right";
  context.fillStyle = "#52e3d5";
  context.fillText("AVAILABLE TO BUILD", 1115, 40);
  context.textAlign = "left";

  const glow = context.createRadialGradient(180, 365, 6, 180, 365, 215);
  glow.addColorStop(0, "rgba(49, 228, 209, 0.5)");
  glow.addColorStop(1, "rgba(49, 228, 209, 0)");
  context.fillStyle = glow;
  context.fillRect(12, 88, 350, 520);
  context.beginPath();
  context.strokeStyle = "rgba(106, 242, 226, 0.88)";
  context.lineWidth = 3;
  context.arc(184, 341, 115, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.fillStyle = "#35decb";
  context.arc(184, 341, 101, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.fillStyle = "rgba(255,255,255,0.3)";
  context.arc(151, 305, 34, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#10222a";
  context.font = "bold 68px sans-serif";
  context.textAlign = "center";
  context.fillText("PR", 184, 365);
  context.font = "600 17px monospace";
  context.fillStyle = "#c6d5e5";
  context.fillText("PRINCE RAJ", 184, 505);
  context.fillStyle = "#74e9dc";
  context.font = "14px monospace";
  context.fillText("DEVELOPER · ANALYST", 184, 534);

  context.textAlign = "left";
  const panel = context.createLinearGradient(380, 0, 1120, 0);
  panel.addColorStop(0, "rgba(255,255,255,0.055)");
  panel.addColorStop(1, "rgba(255,255,255,0.018)");
  context.fillStyle = panel;
  context.beginPath();
  context.roundRect(387, 116, 720, 468, 24);
  context.fill();
  context.strokeStyle = "rgba(182, 206, 232, 0.17)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#62e9dd";
  context.font = "700 18px monospace";
  context.fillText("HELLO, I'M", 432, 175);
  context.fillStyle = "#f3f5f8";
  context.font = "700 66px sans-serif";
  context.fillText("Prince Raj", 426, 250);
  const underline = context.createLinearGradient(430, 0, 765, 0);
  underline.addColorStop(0, "#35decb");
  underline.addColorStop(1, "#aa7cff");
  context.fillStyle = underline;
  context.fillRect(432, 274, 294, 7);

  const roles = [
    { label: "PYTHON DEVELOPER", x: 432, width: 287, color: "#35decb" },
    { label: "FULL-STACK BUILDER", x: 738, width: 290, color: "#a778e7" },
  ];
  context.font = "700 17px monospace";
  roles.forEach(({ label, x, width, color }) => {
    context.fillStyle = "rgba(255,255,255,0.075)";
    context.beginPath();
    context.roundRect(x, 311, width, 49, 12);
    context.fill();
    context.fillStyle = color;
    context.fillRect(x, 323, 4, 25);
    context.fillStyle = "#f3f5f8";
    context.fillText(label, x + 17, 342);
  });

  context.fillStyle = "#d6dfed";
  context.font = "600 23px sans-serif";
  context.fillText("Data analytics  ·  AI & machine learning", 432, 415);
  context.fillStyle = "#aab7ca";
  context.font = "20px sans-serif";
  context.fillText("I turn ideas and data into useful digital products.", 432, 456);

  context.fillStyle = "rgba(49, 228, 209, 0.11)";
  context.beginPath();
  context.roundRect(432, 494, 237, 49, 24);
  context.fill();
  context.strokeStyle = "rgba(49, 228, 209, 0.38)";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = "#72f1df";
  context.font = "700 16px monospace";
  context.fillText("DESIGN  /  BUILD  /  GROW", 453, 524);

  const texture = new THREE.CanvasTexture(screen);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createScene() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  camera.position.set(0, 0.3, 10.1);

  scene.add(new THREE.AmbientLight(0xb9e8ef, 1.7));
  const keyLight = new THREE.DirectionalLight(0xe0ffff, 3.5);
  keyLight.position.set(-4, 6, 8);
  scene.add(keyLight);

  const cyanLight = new THREE.PointLight(0x32f2dd, 34, 11);
  cyanLight.position.set(-3.1, 1.8, 3.2);
  scene.add(cyanLight);
  const violetLight = new THREE.PointLight(0x9e67ff, 37, 10);
  violetLight.position.set(3.2, -1.4, 2.4);
  scene.add(violetLight);

  const assembly = new THREE.Group();
  const monitor = new THREE.Group();
  assembly.add(monitor);
  monitor.position.set(0, 0.5, 0);

  const bodyGeometry = new THREE.ExtrudeGeometry(roundedRectangle(4.5, 2.86, 0.16), {
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.035,
  });
  bodyGeometry.computeVertexNormals();
  const bezel = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x30384b,
      metalness: 0.72,
      roughness: 0.27,
      emissive: 0x090d18,
    }),
  );
  bezel.position.z = -0.02;
  monitor.add(bezel);

  const screenGeometry = new THREE.ShapeGeometry(roundedRectangle(4.24, 2.58, 0.1));
  screenGeometry.computeBoundingBox();
  const bounds = screenGeometry.boundingBox;
  const screenPositions = screenGeometry.getAttribute("position");
  const screenUvs = screenGeometry.getAttribute("uv");
  for (let index = 0; index < screenPositions.count; index += 1) {
    screenUvs.setXY(
      index,
      (screenPositions.getX(index) - bounds.min.x) / (bounds.max.x - bounds.min.x),
      (screenPositions.getY(index) - bounds.min.y) / (bounds.max.y - bounds.min.y),
    );
  }
  screenUvs.needsUpdate = true;

  const screenMesh = new THREE.Mesh(
    screenGeometry,
    new THREE.MeshBasicMaterial({ map: createScreenTexture() }),
  );
  screenMesh.position.z = 0.218;
  monitor.add(screenMesh);

  const stem = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.65, 0.21),
    new THREE.MeshStandardMaterial({ color: 0x687187, metalness: 0.82, roughness: 0.28 }),
  );
  stem.position.set(0.05, -1.63, -0.025);
  monitor.add(stem);

  const stand = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectangle(1.7, 0.15, 0.07), {
      depth: 0.54,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    }),
    new THREE.MeshStandardMaterial({ color: 0x838ba0, metalness: 0.74, roughness: 0.3 }),
  );
  stand.position.set(0.05, -2.02, -0.05);
  monitor.add(stand);

  const rings = [];
  [
    { radius: 3.16, tube: 0.012, color: 0x42e5d8, x: 0.27, y: -0.25, z: -0.65 },
    { radius: 3.52, tube: 0.009, color: 0x986ae6, x: -0.35, y: 0.28, z: -1.35 },
    { radius: 2.86, tube: 0.008, color: 0x7be6ed, x: 0.08, y: 0.55, z: -1.05 },
  ].forEach(({ radius, tube, color, x, y, z }) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.54 }),
    );
    ring.position.set(x, y, z);
    ring.rotation.set(0.74, -0.35, 0.22);
    assembly.add(ring);
    rings.push(ring);
  });

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.31, 0.085, 110, 14, 2, 5),
    new THREE.MeshStandardMaterial({
      color: 0x66f5e1,
      emissive: 0x0d807d,
      metalness: 0.68,
      roughness: 0.21,
    }),
  );
  knot.position.set(-2.78, 1.42, 0.15);
  assembly.add(knot);

  const gem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.24, 1),
    new THREE.MeshStandardMaterial({
      color: 0xb090ff,
      emissive: 0x452a91,
      metalness: 0.58,
      roughness: 0.2,
      flatShading: true,
    }),
  );
  gem.position.set(2.84, -1.34, 0.45);
  assembly.add(gem);

  const starGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(225 * 3);
  let seed = 2789;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = (random() - 0.5) * 11;
    positions[index + 1] = (random() - 0.5) * 7.5;
    positions[index + 2] = -2.5 - random() * 4;
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x8af5ed,
      size: 0.024,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true,
    }),
  );
  scene.add(stars);
  scene.add(assembly);

  return { renderer, scene, camera, assembly, rings, knot, gem, stars, cyanLight, violetLight };
}

let experience;
try {
  experience = createScene();
} catch (error) {
  console.warn("The 3D workspace is unavailable; showing the static illustration instead.", error);
}

if (experience) {
  const { renderer, scene, camera, assembly, rings, knot, gem, stars, cyanLight, violetLight } = experience;
  let visible = true;
  let animationFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  const clock = new THREE.Clock();

  function resizeScene() {
    const { width, height } = hero.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = width < 440 ? 12 : width < 650 ? 11.1 : 10.1;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!visible || reduceMotion) renderScene();
  }

  function renderScene() {
    renderer.render(scene, camera);
    hero.classList.add("scene-ready");
  }

  function animate() {
    if (!visible || document.hidden) {
      animationFrame = 0;
      return;
    }
    animationFrame = window.requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    if (!reduceMotion) {
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      assembly.rotation.y = Math.sin(time * 0.21) * 0.075 + pointerX * 0.16;
      assembly.rotation.x = Math.cos(time * 0.17) * 0.03 + pointerY * 0.1;
      assembly.position.y = Math.sin(time * 0.62) * 0.075;
      rings[0].rotation.z = Math.sin(time * 0.16) * 0.08;
      rings[1].rotation.y = -0.35 + Math.sin(time * 0.12) * 0.12;
      knot.rotation.x = time * 0.2;
      knot.rotation.y = time * 0.33;
      gem.rotation.y = time * 0.42;
      gem.rotation.x = time * 0.21;
      stars.rotation.y = Math.sin(time * 0.06) * 0.035;
      cyanLight.intensity = 30 + Math.sin(time * 0.75) * 5;
      violetLight.intensity = 34 + Math.sin(time * 0.6 + 1) * 5;
    }
    renderer.render(scene, camera);
    hero.classList.add("scene-ready");
  }

  function startAnimation() {
    if (!animationFrame && visible && !document.hidden) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function updateVisibility(entries) {
    visible = entries[0].isIntersecting;
    if (visible) startAnimation();
    else if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  });
  hero.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
  });
  document.addEventListener("visibilitychange", startAnimation);
  window.addEventListener("resize", resizeScene, { passive: true });

  const resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(hero);
  const sceneObserver = new IntersectionObserver(updateVisibility, { threshold: 0 });
  sceneObserver.observe(hero);
  resizeScene();
  renderScene();

  window.addEventListener("pagehide", () => {
    sceneObserver.disconnect();
    resizeObserver.disconnect();
    renderer.dispose();
    stars.geometry.dispose();
  }, { once: true });
}
