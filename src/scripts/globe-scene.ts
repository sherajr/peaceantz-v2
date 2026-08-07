import * as THREE from 'three';

/**
 * The homepage's scroll-driven WebGL scene.
 *
 * A dot-matrix Earth (gold land, dim ocean) rises out of a starfield while
 * light "trails" arc between continents and quote cards orbit like
 * satellites. Everything is procedural — no external textures, so the page
 * stays self-contained and CSP-safe.
 *
 * Scroll position (0..1) drives camera distance, globe placement, and the
 * reveal of arcs/cards. The caller owns the scroll value; this module only
 * reads it.
 */

export interface SceneHandle {
  destroy(): void;
}

interface Options {
  canvas: HTMLCanvasElement;
  cardUrls: string[];
  getProgress: () => number;
}

const R = 120;

/** Coarse continent approximation: [centreLon, centreLat, radiusLon, radiusLat] */
const LAND_BLOBS: Array<[number, number, number, number]> = [
  // Africa
  [20, 2, 24, 22], [8, 20, 24, 14], [43, 8, 10, 7], [47, -20, 4, 7],
  // Europe
  [16, 50, 24, 11], [-3, 54, 5, 5],
  // Asia
  [55, 45, 24, 17], [88, 52, 30, 18], [112, 42, 22, 15], [108, 66, 46, 11],
  [78, 22, 12, 12], [104, 14, 11, 9], [138, 38, 4, 8], [130, 62, 22, 10],
  // North America
  [-114, 48, 21, 15], [-82, 44, 19, 13], [-100, 62, 30, 11], [-150, 63, 13, 8],
  [-90, 16, 12, 7], [-42, 72, 15, 9],
  // South America
  [-62, -5, 16, 14], [-65, -28, 10, 17],
  // Oceania
  [134, -25, 20, 13], [172, -42, 4, 6],
];

function isLand(lon: number, lat: number): boolean {
  if (lat < -68) return true; // Antarctica
  for (const [cx, cy, rx, ry] of LAND_BLOBS) {
    let dx = lon - cx;
    if (dx > 180) dx -= 360;
    if (dx < -180) dx += 360;
    const dy = lat - cy;
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) return true;
  }
  return false;
}

/** Smoothstep between two scroll positions. */
function ss(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Piecewise-smooth animation track: [scrollPos, value] keyframes. */
function track(p: number, stops: Array<[number, number]>): number {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, v0] = stops[i];
    const [p1, v1] = stops[i + 1];
    if (p <= p1) return v0 + (v1 - v0) * ss(p0, p1, p);
  }
  return stops[stops.length - 1][1];
}

function antTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f0e4c0';
  g.strokeStyle = '#f0e4c0';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  // legs first, so the body sits on top
  g.beginPath();
  g.moveTo(24, 34); g.lineTo(16, 48);
  g.moveTo(30, 34); g.lineTo(28, 50);
  g.moveTo(36, 33); g.lineTo(42, 48);
  g.moveTo(24, 30); g.lineTo(16, 16);
  g.moveTo(30, 30); g.lineTo(28, 14);
  g.moveTo(36, 31); g.lineTo(42, 16);
  g.stroke();
  // antennae
  g.beginPath();
  g.moveTo(46, 28); g.quadraticCurveTo(54, 20, 58, 22);
  g.moveTo(46, 31); g.quadraticCurveTo(56, 28, 60, 30);
  g.stroke();
  // body
  g.beginPath(); g.ellipse(18, 32, 12, 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(32, 32, 8, 6.5, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(44, 31, 6.5, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createScene({ canvas, cardUrls, getProgress }: Options): SceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x04070f, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 6000);
  camera.position.set(0, 0, 560);

  // ——— starfield ———
  const starCount = 2600;
  const starPos = new Float32Array(starCount * 3);
  const starAlpha = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    // shell of stars well outside the globe
    const r = 900 + Math.random() * 1900;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    starPos[i * 3 + 2] = r * Math.cos(ph);
    starAlpha[i] = 0.25 + Math.random() * 0.75;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aAlpha', new THREE.BufferAttribute(starAlpha, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSize: { value: 3.2 * renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aAlpha;
      uniform float uTime;
      uniform float uSize;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.65 + 0.35 * sin(uTime * 1.6 + aAlpha * 40.0);
        vA = aAlpha * tw;
        gl_PointSize = uSize * (900.0 / -mv.z);
      }
    `,
    fragmentShader: `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float f = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.98, 0.92), vA * f);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ——— globe ———
  const globe = new THREE.Group();
  scene.add(globe);
  const spinner = new THREE.Group(); // everything that rotates with the Earth
  globe.add(spinner);

  const landPositions: THREE.Vector3[] = [];
  const landPts: number[] = [];
  const seaPts: number[] = [];
  const N = 11000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * golden;
    const x = Math.cos(th) * rad;
    const z = Math.sin(th) * rad;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (Math.atan2(z, x) * 180) / Math.PI;
    const px = x * R, py = y * R, pz = z * R;
    if (isLand(lon, lat)) {
      landPts.push(px, py, pz);
      if (lat > -60 && landPositions.length < 900) {
        landPositions.push(new THREE.Vector3(px, py, pz));
      }
    } else if (i % 2 === 0) {
      seaPts.push(px, py, pz);
    }
  }

  const mkPoints = (arr: number[], color: number, size: number, opacity: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.Points(g, m);
  };

  const land = mkPoints(landPts, 0xe0b862, 2.9, 1.0);
  const sea = mkPoints(seaPts, 0x5f88cc, 1.9, 0.7);
  spinner.add(land, sea);

  // solid interior so the far side of the globe is properly hidden
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x0a1428 })
  );
  spinner.add(core);

  // atmospheric rim — a thin halo, not a bloom
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.05, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uIntensity: { value: 1 } },
      vertexShader: `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vN;
        uniform float uIntensity;
        void main() {
          float i = pow(max(0.0, 0.82 - dot(vN, vec3(0.0, 0.0, 1.0))), 5.0);
          vec3 warm = vec3(0.80, 0.65, 0.34);
          vec3 cool = vec3(0.36, 0.50, 0.86);
          vec3 c = mix(cool, warm, clamp(vN.y * 0.5 + 0.55, 0.0, 1.0));
          gl_FragColor = vec4(c * i * uIntensity, 1.0);
        }
      `,
    })
  );
  globe.add(atmo);

  // ——— connection arcs between land points ———
  const ARCS = 30;
  const SEG = 64;
  const arcs: Array<{ line: THREE.Line; head: THREE.Mesh }> = [];
  const arcGroup = new THREE.Group();
  spinner.add(arcGroup);
  const headGeo = new THREE.SphereGeometry(1.9, 10, 8);
  const headMat = new THREE.MeshBasicMaterial({
    color: 0xf1dCa6,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  for (let i = 0; i < ARCS; i++) {
    const a = landPositions[Math.floor(Math.random() * landPositions.length)];
    let b = landPositions[Math.floor(Math.random() * landPositions.length)];
    let guard = 0;
    while (a.distanceTo(b) < R * 0.75 && guard++ < 24) {
      b = landPositions[Math.floor(Math.random() * landPositions.length)];
    }
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const lift = 1 + (a.distanceTo(b) / (2 * R)) * 0.55;
    mid.setLength(R * lift);
    const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
    const pts = curve.getPoints(SEG);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({
      color: 0xe6c87e,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const line = new THREE.Line(g, m);
    line.geometry.setDrawRange(0, 0);
    const head = new THREE.Mesh(headGeo, headMat.clone());
    head.visible = false;
    arcGroup.add(line, head);
    arcs.push({ line, head });
    (line.userData as any).curve = curve;
  }

  // ——— ants marching on the surface ———
  const ANTS = 16;
  const antTex = antTexture();
  const antPos = new Float32Array(ANTS * 3);
  const antGeo = new THREE.BufferGeometry();
  antGeo.setAttribute('position', new THREE.BufferAttribute(antPos, 3));
  const antMat = new THREE.PointsMaterial({
    map: antTex,
    size: 13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.25,
  });
  const antPoints = new THREE.Points(antGeo, antMat);
  spinner.add(antPoints);
  const antPaths = Array.from({ length: ANTS }, () => {
    const u = new THREE.Vector3().randomDirection();
    const tmp = new THREE.Vector3().randomDirection();
    const v = new THREE.Vector3().crossVectors(u, tmp).normalize();
    return { u, v, phase: Math.random() * Math.PI * 2, speed: 0.05 + Math.random() * 0.06 };
  });

  // ——— orbiting quote cards ———
  const cardGroup = new THREE.Group();
  scene.add(cardGroup);
  const loader = new THREE.TextureLoader();
  const cards: THREE.Mesh[] = [];
  cardUrls.forEach((url, i) => {
    const tex = loader.load(url, () => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    });
    const h = 52;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(h * 1.75, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 })
    );
    mesh.userData.angle = (i / cardUrls.length) * Math.PI * 2;
    mesh.userData.tilt = (i % 2 === 0 ? 1 : -1) * (0.16 + i * 0.05);
    cardGroup.add(mesh);
    cards.push(mesh);
  });

  // ——— resize ———
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    starMat.uniforms.uSize.value = 3.2 * renderer.getPixelRatio();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ——— loop ———
  const _v = new THREE.Vector3();
  const clock = new THREE.Clock();
  let smooth = getProgress();
  let raf = 0;
  let running = true;

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    const target = getProgress();
    smooth += (target - smooth) * 0.075;
    const p = smooth;
    const narrow = window.innerWidth < 900;

    // camera + globe choreography — the globe keeps clear of the text column
    camera.position.z = track(p, [
      [0.0, 600], [0.2, 700], [0.4, 505], [0.6, 545],
      [0.8, 660], [1.0, 830],
    ]) * (narrow ? 1.35 : 1);
    globe.position.x = narrow ? 0 : track(p, [
      [0.0, 0], [0.22, 0], [0.4, 180], [0.6, 160], [0.78, 0], [1.0, 0],
    ]);
    globe.position.y = track(p, [
      [0.0, -190], [0.2, -280], [0.4, -12], [0.6, -12],
      [0.8, -225], [1.0, -200],
    ]);

    spinner.rotation.y = t * 0.035 + p * 2.2;
    spinner.rotation.x = -0.32;
    atmo.rotation.copy(spinner.rotation);
    (atmo.material as THREE.ShaderMaterial).uniforms.uIntensity.value =
      0.85 + 0.5 * ss(0.1, 0.45, p);

    stars.rotation.y = t * 0.006;
    starMat.uniforms.uTime.value = t;

    // arcs draw in as the "unity" chapter arrives, then pulse
    const arcReveal = ss(0.1, 0.46, p);
    arcs.forEach((arc, i) => {
      const stagger = i / arcs.length;
      const local = Math.min(1, Math.max(0, (arcReveal - stagger * 0.55) / 0.45));
      const flow = (t * 0.13 + stagger) % 1;
      const draw = local * (0.35 + 0.65 * flow);
      arc.line.geometry.setDrawRange(0, Math.floor(draw * (SEG + 1)));
      (arc.line.material as THREE.LineBasicMaterial).opacity = 0.5 * local;
      if (local > 0.02 && draw > 0.02) {
        arc.head.visible = true;
        (arc.line.userData as any).curve.getPoint(Math.min(1, draw), arc.head.position);
        (arc.head.material as THREE.MeshBasicMaterial).opacity = local * 0.95;
      } else {
        arc.head.visible = false;
      }
    });

    // ants crawl their great circles
    const antAlpha = ss(0.02, 0.2, p) * (1 - ss(0.86, 1, p) * 0.65);
    antMat.opacity = 0.92 * antAlpha;
    for (let i = 0; i < ANTS; i++) {
      const { u, v, phase, speed } = antPaths[i];
      const a = phase + t * speed;
      const c = Math.cos(a), s = Math.sin(a);
      antPos[i * 3] = (u.x * c + v.x * s) * R * 1.012;
      antPos[i * 3 + 1] = (u.y * c + v.y * s) * R * 1.012;
      antPos[i * 3 + 2] = (u.z * c + v.z * s) * R * 1.012;
    }
    antGeo.attributes.position.needsUpdate = true;

    // cards orbit once the Creator chapter is in view
    const cardAlpha = ss(0.42, 0.58, p) * (1 - ss(0.82, 0.95, p));
    cardGroup.position.copy(globe.position);
    cardGroup.visible = cardAlpha > 0.01;
    cards.forEach((mesh) => {
      const a = mesh.userData.angle + t * 0.16 + p * 1.1;
      const orbit = R * 1.3;
      mesh.position.set(
        Math.cos(a) * orbit,
        Math.sin(a * 0.9) * R * 0.55 + 6,
        Math.sin(a) * orbit * 0.62
      );
      mesh.lookAt(camera.position);
      mesh.rotation.z += mesh.userData.tilt * 0.35;
      const depth = (Math.sin(a) + 1) * 0.5; // dim the ones swinging behind
      // fade any card that drifts left over the text column
      const worldX = mesh.position.x + cardGroup.position.x;
      const clear = narrow ? 1 : ss(-40, 90, worldX);
      // ...and fade before it can be sliced by the viewport edge
      _v.set(worldX, mesh.position.y + cardGroup.position.y, mesh.position.z).project(camera);
      const edge = 1 - ss(0.56, 0.8, Math.abs(_v.x));
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        cardAlpha * (0.42 + 0.58 * depth) * clear * edge;
    });

    renderer.render(scene, camera);
  }
  frame();

  function onVisibility() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      clock.getDelta();
      frame();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
      scene.traverse((o) => {
        const any = o as any;
        any.geometry?.dispose?.();
        const m = any.material;
        if (Array.isArray(m)) m.forEach((x: any) => x.dispose?.());
        else m?.dispose?.();
      });
    },
  };
}
