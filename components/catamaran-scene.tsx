import * as THREE from "three";

/**
 * The 3D scene itself. Loaded only on the client, only when WebGL is
 * available — see `catamaran-hero.tsx` for the gate and the fallback.
 *
 * Built entirely from primitive geometry and two small shaders, not an
 * imported model or texture: the same reason `GradientHero` uses a CSS
 * gradient instead of a stock photo applies here — there is no real boat to
 * license or misrepresent, so the honest option is something everyone can see
 * is drawn, not photographed.
 *
 * The ocean and the boat's motion both evaluate `waveHeight()` — one formula,
 * so the hull actually sits on the surface the shader draws rather than
 * floating over an approximation of it.
 */

const WAVES = [
  { dir: [1, 0.25], length: 5.2, speed: 0.9, amp: 0.16 },
  { dir: [0.6, -1], length: 3.1, speed: 1.3, amp: 0.09 },
  { dir: [-0.4, 0.7], length: 1.7, speed: 1.8, amp: 0.045 },
] as const;

/** Mirrors the vertex shader's displacement — kept in JS so the hull can ride the same surface it's drawn on. */
function waveHeight(x: number, z: number, t: number): number {
  let y = 0;
  for (const w of WAVES) {
    const [dx, dz] = w.dir;
    const k = (2 * Math.PI) / w.length;
    y += w.amp * Math.sin(x * dx * k + z * dz * k + t * w.speed);
  }
  return y;
}

const GLSL_WAVE_FUNCTION = `
  float waveHeight(vec2 p, float t) {
    float y = 0.0;
    ${WAVES.map(
      (w) => `
    {
      vec2 dir = normalize(vec2(${w.dir[0]}, ${w.dir[1]}));
      float k = 6.28318530718 / ${w.length};
      y += ${w.amp} * sin(dot(p, dir) * k + t * ${w.speed});
    }`,
    ).join("\n")}
    return y;
  }
`;

function createOcean(segments: number, colors: { deep: THREE.Color; shallow: THREE.Color; sun: THREE.Color }) {
  const geometry = new THREE.PlaneGeometry(60, 60, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: colors.deep },
      uShallow: { value: colors.shallow },
      uSun: { value: colors.sun },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.35).normalize() },
      uFogColor: { value: colors.shallow },
      uFogNear: { value: 8 },
      uFogFar: { value: 26 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      ${GLSL_WAVE_FUNCTION}

      void main() {
        vec3 pos = position;
        float eps = 0.15;
        float h  = waveHeight(pos.xz, uTime);
        float hx = waveHeight(pos.xz + vec2(eps, 0.0), uTime);
        float hz = waveHeight(pos.xz + vec2(0.0, eps), uTime);
        pos.y += h;

        // Analytic normal from the local slope rather than a second geometry
        // pass — cheap enough to run per-vertex on a modest-resolution plane.
        vec3 tangentX = normalize(vec3(eps, hx - h, 0.0));
        vec3 tangentZ = normalize(vec3(0.0, hz - h, eps));
        vNormal = normalize(cross(tangentZ, tangentX));

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      // Cheap hash so the sun glint breaks into glints instead of one
      // uniform highlight — texture-free sparkle.
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfVec = normalize(uSunDir + viewDir);

        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
        vec3 base = mix(uDeep, uShallow, fresnel);

        float spec = pow(max(dot(normal, halfVec), 0.0), 60.0);
        float sparkle = step(0.985, hash(floor(vWorldPos.xz * 9.0)));
        vec3 color = base + uSun * spec * (0.5 + sparkle * 1.6);

        float dist = length(cameraPosition - vWorldPos);
        float fog = smoothstep(uFogNear, uFogFar, dist);
        color = mix(color, uFogColor, fog);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  return { mesh: new THREE.Mesh(geometry, material), material };
}

/** One hull, as an extruded side-profile — a bow curve, a flat run, a transom. */
function createHull(length: number, height: number, width: number, color: THREE.ColorRepresentation) {
  const shape = new THREE.Shape();
  const halfL = length / 2;
  shape.moveTo(halfL, height * 0.55);
  shape.quadraticCurveTo(halfL * 1.02, -height * 0.1, halfL * 0.55, -height * 0.5);
  shape.lineTo(-halfL * 0.85, -height * 0.42);
  shape.quadraticCurveTo(-halfL * 1.05, -height * 0.1, -halfL, height * 0.5);
  shape.lineTo(halfL, height * 0.55);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -width / 2);
  geometry.rotateY(Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
  return new THREE.Mesh(geometry, material);
}

function createSailMaterial(color: THREE.ColorRepresentation) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.35).normalize() },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormal;
      void main() {
        vec3 pos = position;
        // A gentle luff: bigger near the leech (uv.x toward 1) and near the
        // foot, tapering to nothing at the mast edge and the head — a sail
        // billows, it doesn't flap rigidly.
        float taper = uv.x * (1.0 - 0.35 * uv.y);
        pos.z += sin(pos.y * 3.0 + uTime * 2.2) * 0.05 * taper;
        pos.z += sin(uTime * 1.3) * 0.02 * taper;

        vNormal = normalMatrix * vec3(0.0, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSunDir;
      varying vec3 vNormal;
      void main() {
        vec3 n = normalize(vNormal);
        float light = 0.55 + 0.45 * max(dot(n, normalize(uSunDir)), 0.0);
        gl_FragColor = vec4(uColor * light, 1.0);
      }
    `,
  });
}

function createBoat(palette: {
  hull: THREE.ColorRepresentation;
  deck: THREE.ColorRepresentation;
  mast: THREE.ColorRepresentation;
  sail: THREE.ColorRepresentation;
}) {
  const group = new THREE.Group();
  const beam = 1.7; // distance between the two hulls
  const hullLength = 2.6;
  const hullHeight = 0.55;
  const hullWidth = 0.32;

  for (const side of [-1, 1]) {
    const hull = createHull(hullLength, hullHeight, hullWidth, palette.hull);
    hull.position.z = side * (beam / 2);
    group.add(hull);
  }

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(hullLength * 0.62, 0.05, beam - hullWidth * 0.6),
    new THREE.MeshStandardMaterial({ color: palette.deck, roughness: 0.8 }),
  );
  deck.position.y = 0.12;
  group.add(deck);

  const mastHeight = 2.1;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, mastHeight, 8),
    new THREE.MeshStandardMaterial({ color: palette.mast, roughness: 0.4, metalness: 0.3 }),
  );
  mast.position.set(-hullLength * 0.08, 0.12 + mastHeight / 2, 0);
  group.add(mast);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, hullLength * 0.34, 6),
    mast.material,
  );
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-hullLength * 0.08 + hullLength * 0.17, 0.4, 0);
  group.add(boom);

  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, mastHeight * 0.92);
  sailShape.quadraticCurveTo(hullLength * 0.42, mastHeight * 0.35, hullLength * 0.36, 0);
  sailShape.lineTo(0, 0);
  const sailGeometry = new THREE.ShapeGeometry(sailShape, 6);
  const sail = new THREE.Mesh(sailGeometry, createSailMaterial(palette.sail));
  sail.position.set(-hullLength * 0.08, 0.4, 0);
  sail.rotation.y = Math.PI / 2;
  group.add(sail);

  return { group, sailMaterial: sail.material as THREE.ShaderMaterial };
}

export interface CatamaranSceneOptions {
  /** Skip the render loop after the first frame — respects prefers-reduced-motion without hiding the scene. */
  reducedMotion: boolean;
  onReady?: () => void;
}

/** Imperative Three.js setup, deliberately not react-three-fiber — one scene, mounted once, no reconciler needed. */
export default function mountCatamaranScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  options: CatamaranSceneOptions,
): () => void {
  const isMobile = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: isMobile ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  // Pitched shallow rather than steeply down, so the gradient the scene sits
  // on top of still reads as open sky above a distant horizon, not just more
  // water — the boat lives out near that horizon rather than in the
  // foreground, which is what keeps it clear of the text column at any width.
  const basePos = new THREE.Vector3(5, 3.6, 8.5);
  const lookTarget = new THREE.Vector3(2.2, 1.1, -1.5);
  camera.position.copy(basePos);
  camera.lookAt(lookTarget);

  // Colors read from the brand tokens rather than re-picked, so the scene
  // never drifts from whatever `app/globals.css` says the palette is.
  const styles = getComputedStyle(document.documentElement);
  const color = (token: string, fallback: string) =>
    new THREE.Color((styles.getPropertyValue(token) || fallback).trim());

  const navy900 = color("--color-navy-900", "#0a1628");
  const navy700 = color("--color-navy-700", "#1b3454");
  const sea500 = color("--color-sea-500", "#2f8f8a");
  const sea200 = color("--color-sea-200", "#aadfda");
  const sand400 = color("--color-sand-400", "#d4b678");
  const sand200 = color("--color-sand-200", "#f0e5d0");

  scene.fog = new THREE.Fog(sea500.getHex(), 8, 26);

  const hemi = new THREE.HemisphereLight(sand200, navy900, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(sand400, 1.4);
  sun.position.set(4, 7, 3.5);
  scene.add(sun);

  const { mesh: ocean, material: oceanMaterial } = createOcean(isMobile ? 32 : 56, {
    deep: navy700,
    shallow: sea200,
    sun: sand400,
  });
  scene.add(ocean);

  const { group: boat, sailMaterial } = createBoat({
    hull: navy700,
    deck: sand200,
    mast: navy900,
    sail: 0xfaf7f0,
  });
  // A small, distant silhouette near the horizon rather than a foreground
  // centrepiece — the composition the text has to share the frame with. Fixed
  // once here; the render loop only ever touches boat.position.y (the ride
  // over the waves) and boat.rotation, so this offset is the boat's location.
  boat.scale.setScalar(0.55);
  boat.position.set(3.4, 0, -3.9);
  // Heading, not touched by the per-frame pitch/roll below — chosen so the
  // sail's broad face and both hulls are presented to the camera instead of
  // being seen edge-on, which is what a flat sail viewed side-on looks like.
  boat.rotation.y = Math.PI * 0.62;
  scene.add(boat);

  let frame = 0;
  let raf = 0;
  let running = true;
  let readySent = false;
  const clock = new THREE.Clock();

  function resize() {
    const { clientWidth, clientHeight } = container;
    if (clientWidth === 0 || clientHeight === 0) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  }

  function render() {
    const t = clock.getElapsedTime();
    oceanMaterial.uniforms.uTime.value = t;
    sailMaterial.uniforms.uTime.value = t;

    const h = waveHeight(boat.position.x, boat.position.z, t);
    const hFwd = waveHeight(boat.position.x + 0.6, boat.position.z, t);
    const hSide = waveHeight(boat.position.x, boat.position.z + 0.6, t);
    boat.position.y = h;
    boat.rotation.x = (h - hFwd) * 0.4;
    boat.rotation.z = (hSide - h) * 0.4;

    // Small, slow drift rather than an orbit — ambient, not a product demo spin.
    camera.position.x = basePos.x + Math.sin(t * 0.08) * 0.5;
    camera.position.y = basePos.y + Math.sin(t * 0.12) * 0.15;
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);

    if (!readySent) {
      readySent = true;
      options.onReady?.();
    }
  }

  function loop() {
    if (!running) return;
    render();
    frame++;
    if (!options.reducedMotion) raf = requestAnimationFrame(loop);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function handleVisibility() {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      loop();
    }
  }
  document.addEventListener("visibilitychange", handleVisibility);

  // Rendering also pauses off-screen — the home page is long, and there is
  // no reason to keep a GPU loop running under six sections of scrolled-past
  // content, especially on battery.
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      const visible = entry.isIntersecting;
      if (visible && !running) {
        running = true;
        loop();
      } else if (!visible) {
        running = false;
      }
    },
    { threshold: 0.01 },
  );
  intersectionObserver.observe(container);

  function handleContextLost(event: Event) {
    event.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
  }
  canvas.addEventListener("webglcontextlost", handleContextLost);

  loop();

  return function cleanup() {
    running = false;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", handleVisibility);
    canvas.removeEventListener("webglcontextlost", handleContextLost);

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    renderer.dispose();
  };
}
