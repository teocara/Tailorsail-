import * as THREE from "three";

/**
 * The 3D scene itself. Loaded only on the client, only when WebGL is
 * available — see `catamaran-hero.tsx` for the gate and the fallback.
 *
 * Built entirely from primitive geometry and small shaders, not an imported
 * model or texture: the same reason `GradientHero` uses a CSS gradient
 * instead of a stock photo applies here — there is no real boat to license
 * or misrepresent, so the honest option is something everyone can see is
 * drawn, not photographed.
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

/**
 * Mirrors the vertex shader's displacement — kept in JS so the hull can ride
 * the same surface it's drawn on. The shader normalizes each wave's direction
 * before the dot product (`normalize(vec2(...))`); this has to as well; the
 * configured directions aren't unit length, so skipping it silently changes
 * the effective wavelength and puts the boat's sampled height out of step
 * with the surface actually drawn beneath it.
 */
function waveHeight(x: number, z: number, t: number): number {
  let y = 0;
  for (const w of WAVES) {
    const [dx, dz] = w.dir;
    const len = Math.hypot(dx, dz);
    const k = (2 * Math.PI) / w.length;
    y += w.amp * Math.sin(((x * dx + z * dz) / len) * k + t * w.speed);
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

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Beam (half-width) as a fraction of max, along the hull's length: full amidships, tapering to a point at the bow, eased in from a slightly narrower transom. */
function hullBeamProfile(u: number): number {
  const sternRamp = easeInOut(THREE.MathUtils.clamp(u / 0.12, 0, 1));
  const bowT = THREE.MathUtils.clamp((u - 0.42) / 0.58, 0, 1);
  const bowTaper = Math.pow(1 - bowT, 1.6);
  return (0.78 + 0.22 * sternRamp) * bowTaper;
}

/** Draft (half-depth) along the hull's length: deepest amidships, shoaling toward a fine bow entry that still holds some depth. */
function hullDraftProfile(u: number): number {
  const sternRamp = easeInOut(THREE.MathUtils.clamp(u / 0.15, 0, 1));
  const bowT = THREE.MathUtils.clamp((u - 0.5) / 0.5, 0, 1);
  const bowTaper = 0.45 + 0.55 * Math.pow(1 - bowT, 1.2);
  return (0.7 + 0.3 * sternRamp) * bowTaper;
}

/** Keel rocker: lifts the bow's centerline for a wave-piercing profile instead of a straight keel. */
function hullRocker(u: number): number {
  const bowT = THREE.MathUtils.clamp((u - 0.55) / 0.45, 0, 1);
  return Math.pow(bowT, 2) * 0.16;
}

/**
 * One half cross-section, keel to near-centerline-at-deck (z, y in [-1, 1]
 * unit space), mirrored below to close the ring. The loop pinches to a point
 * at the top rather than opening onto a deck — the deck box added in
 * `createBoat` covers that seam, so the hull only needs to read as rounded,
 * not be watertight.
 */
const HULL_RING: ReadonlyArray<readonly [number, number]> = [
  [0.0, -1.0],
  [0.3, -0.95],
  [0.62, -0.75],
  [0.88, -0.4],
  [1.0, -0.05],
  [0.92, 0.35],
  [0.55, 0.75],
  [0.15, 1.0],
  [-0.15, 1.0],
  [-0.55, 0.75],
  [-0.92, 0.35],
  [-1.0, -0.05],
  [-0.88, -0.4],
  [-0.62, -0.75],
  [-0.3, -0.95],
];

/** Lofts `HULL_RING` along the hull's length, tapered per-station by the profile functions above, into a real rounded hull instead of a flat extruded plank. */
function buildHullGeometry(
  length: number,
  height: number,
  width: number,
  palette: { hull: THREE.Color; boot: THREE.Color; antifouling: THREE.Color },
): THREE.BufferGeometry {
  const stations = 18;
  const ringCount = HULL_RING.length;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // A boot-stripe band at the waterline and darker antifouling below it —
  // the same ring shape at every station, so the bands run straight down
  // the hull's length rather than needing to be laid out per-station.
  const colorFor = (yu: number) => {
    if (yu < -0.5) return palette.antifouling;
    if (yu < -0.3) return palette.boot;
    return palette.hull;
  };

  for (let s = 0; s <= stations; s++) {
    const u = s / stations;
    const x = -length / 2 + u * length;
    const beam = (hullBeamProfile(u) * width) / 2;
    const draft = (hullDraftProfile(u) * height) / 2;
    const rocker = hullRocker(u) * height;
    for (const [zu, yu] of HULL_RING) {
      positions.push(x, yu * draft + rocker, zu * beam);
      const c = colorFor(yu);
      colors.push(c.r, c.g, c.b);
    }
  }

  for (let s = 0; s < stations; s++) {
    for (let r = 0; r < ringCount; r++) {
      const r2 = (r + 1) % ringCount;
      const a = s * ringCount + r;
      const b = s * ringCount + r2;
      const c = (s + 1) * ringCount + r2;
      const d = (s + 1) * ringCount + r;
      indices.push(a, b, c, a, c, d);
    }
  }

  // Bow: fan the final ring to a single point just beyond it for a proper tip.
  const bowTipIndex = positions.length / 3;
  positions.push(length / 2 + length * 0.035, hullRocker(1) * height, 0);
  colors.push(palette.hull.r, palette.hull.g, palette.hull.b);
  const lastRingStart = stations * ringCount;
  for (let r = 0; r < ringCount; r++) {
    const r2 = (r + 1) % ringCount;
    indices.push(lastRingStart + r, lastRingStart + r2, bowTipIndex);
  }

  // Stern: fan-cap the first ring flat, for a cut transom rather than a point.
  const sternCenterIndex = positions.length / 3;
  positions.push(-length / 2, 0, 0);
  colors.push(palette.antifouling.r, palette.antifouling.g, palette.antifouling.b);
  for (let r = 0; r < ringCount; r++) {
    const r2 = (r + 1) % ringCount;
    indices.push(r2, r, sternCenterIndex);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** One hull: a lofted, rounded body with a waterline boot-stripe, rather than a flat extruded plank. */
function createHull(
  length: number,
  height: number,
  width: number,
  palette: { hull: THREE.Color; boot: THREE.Color; antifouling: THREE.Color },
) {
  const geometry = buildHullGeometry(length, height, width, palette);
  // DoubleSide guards against a stray inverted-winding triangle in the hand-
  // built end caps showing up as a black facet rather than a lit one.
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.32,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
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

/** Thin standing rigging (forestay, backstay, two shrouds) as plain lines — silhouette detail, not structure. */
function createRigging(
  points: {
    mastTop: THREE.Vector3;
    bow: THREE.Vector3;
    stern: THREE.Vector3;
    shroudPort: THREE.Vector3;
    shroudStbd: THREE.Vector3;
  },
  color: THREE.ColorRepresentation,
) {
  const pairs: [THREE.Vector3, THREE.Vector3][] = [
    [points.mastTop, points.bow],
    [points.mastTop, points.stern],
    [points.mastTop, points.shroudPort],
    [points.mastTop, points.shroudStbd],
  ];
  const positions: number[] = [];
  for (const [a, b] of pairs) positions.push(a.x, a.y, a.z, b.x, b.y, b.z);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
  return new THREE.LineSegments(geometry, material);
}

interface ParticleSystemConfig {
  count: number;
  /** Seconds for one point's full outward travel before it recycles. */
  life: number;
  sizeBase: number;
  /** Downward pull applied over the point's life — 0 keeps it level (a wake); >0 arcs it down (spray falling back to the water). */
  gravity: number;
  pixelRatio: number;
  color: THREE.ColorRepresentation;
  /** The local-space vector each point travels from origin to at the end of its life. Called once per point at creation, so randomize inside it. */
  makeBase: () => THREE.Vector3;
}

/**
 * GPU-recycled point sprites: each point's position is computed in the
 * vertex shader from a fixed per-point "destination" vector and a
 * phase-shifted clock, so animating a spray or wake costs one draw call and
 * needs no per-frame CPU buffer updates.
 */
function createParticleSystem(config: ParticleSystemConfig) {
  const { count, life, sizeBase, gravity, pixelRatio, color, makeBase } = config;
  const base = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = makeBase();
    base[i * 3] = v.x;
    base[i * 3 + 1] = v.y;
    base[i * 3 + 2] = v.z;
    phase[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  // A `position` attribute is required by the geometry's bounding-sphere
  // math even though the shader recomputes the real position every frame;
  // frustum culling is disabled below instead of relying on this estimate.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aBase", new THREE.BufferAttribute(base, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uLife: { value: life },
      uPixelRatio: { value: pixelRatio },
      uSize: { value: sizeBase },
      uGravity: { value: gravity },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: `
      attribute vec3 aBase;
      attribute float aPhase;
      uniform float uTime;
      uniform float uLife;
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uGravity;
      varying float vAlpha;
      void main() {
        float cycle = mod(uTime + aPhase * uLife, uLife);
        float t01 = cycle / uLife;
        vec3 pos = aBase * t01;
        pos.y -= uGravity * t01 * t01;
        vAlpha = smoothstep(0.0, 0.12, t01) * smoothstep(1.0, 0.55, t01);
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * (1.0 - t01 * 0.5) * uPixelRatio / max(-mvPosition.z, 0.001);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  // The `position` attribute above is a placeholder, so the computed
  // bounding sphere sits at the origin — frustum culling against that would
  // clip the whole system as soon as its actual (offset) origin left center
  // frame.
  points.frustumCulled = false;
  return { points, material };
}

function createBoat(
  palette: {
    hull: THREE.Color;
    boot: THREE.Color;
    antifouling: THREE.Color;
    deck: THREE.ColorRepresentation;
    mast: THREE.ColorRepresentation;
    sail: THREE.ColorRepresentation;
  },
  isMobile: boolean,
  pixelRatio: number,
) {
  const group = new THREE.Group();
  const beam = 1.7; // distance between the two hulls
  const hullLength = 2.6;
  const hullHeight = 0.55;
  const hullWidth = 0.32;

  for (const side of [-1, 1]) {
    const hull = createHull(hullLength, hullHeight, hullWidth, {
      hull: palette.hull,
      boot: palette.boot,
      antifouling: palette.antifouling,
    });
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

  // Jib: a second, smaller headsail forward of the mast — the detail that
  // reads as "sailboat under way" in silhouette rather than "sail on a
  // stick". Built the same way as the mainsail, just smaller and shifted
  // toward the bow, low enough to clear the mainsail's foot from this
  // camera angle instead of being hidden directly behind it — the mainsail
  // and jib are both offset from the mast along the boat's own length axis,
  // which is the axis this composition views nearly end-on, so without that
  // vertical and forward separation the jib renders fully occluded.
  const jibShape = new THREE.Shape();
  jibShape.moveTo(0, 0);
  jibShape.lineTo(0, mastHeight * 0.42);
  jibShape.quadraticCurveTo(hullLength * 0.24, mastHeight * 0.15, hullLength * 0.26, 0);
  jibShape.lineTo(0, 0);
  const jibGeometry = new THREE.ShapeGeometry(jibShape, 5);
  const jib = new THREE.Mesh(jibGeometry, createSailMaterial(palette.sail));
  // Poled out to one side rather than dead-centre — besides being a real
  // downwind trim (whisker-poling the jib), the sideways offset is what
  // keeps it from rendering directly behind the mainsail: both sails hang
  // off the same fore-aft axis, which is the axis this camera angle
  // foreshortens the most.
  jib.position.set(hullLength * 0.4, 0.16, beam * 0.22);
  jib.rotation.y = Math.PI / 2;
  group.add(jib);

  const mastTop = new THREE.Vector3(mast.position.x, 0.12 + mastHeight, 0);
  const rigging = createRigging(
    {
      mastTop,
      bow: new THREE.Vector3(hullLength * 0.46, 0.12, 0),
      stern: new THREE.Vector3(-hullLength * 0.46, 0.12, 0),
      shroudPort: new THREE.Vector3(mast.position.x, 0.12, -beam * 0.42),
      shroudStbd: new THREE.Vector3(mast.position.x, 0.12, beam * 0.42),
    },
    0xe7edf0,
  );
  group.add(rigging);

  // Bow spray and a trailing stern wake — both children of the boat group,
  // so they inherit its position and heading for free and only need to be
  // authored in the boat's own local space.
  const spray = createParticleSystem({
    count: isMobile ? 22 : 40,
    life: 0.9,
    sizeBase: 9,
    gravity: 2.6,
    pixelRatio,
    color: 0xf6fbfa,
    makeBase: () => {
      const z = (Math.random() * 2 - 1) * beam * 0.6;
      const out = Math.sign(z || 1) * (0.12 + Math.random() * 0.3);
      return new THREE.Vector3(-0.15 - Math.random() * 0.25, 0.22 + Math.random() * 0.4, z + out);
    },
  });
  spray.points.position.set(hullLength * 0.47, 0.05, 0);
  group.add(spray.points);

  const wake = createParticleSystem({
    count: isMobile ? 28 : 52,
    life: 3.4,
    sizeBase: 22,
    gravity: 0,
    pixelRatio,
    color: 0xdfeceb,
    makeBase: () => {
      const z = (Math.random() * 2 - 1) * beam * 0.95;
      return new THREE.Vector3(-(0.6 + Math.random() * 2.1), 0.02, z);
    },
  });
  wake.points.position.set(-hullLength * 0.5, 0, 0);
  group.add(wake.points);

  return {
    group,
    sailMaterials: [sail.material as THREE.ShaderMaterial, jib.material as THREE.ShaderMaterial],
    particleMaterials: [spray.material, wake.material],
  };
}

export interface CatamaranSceneOptions {
  /** Skip the render loop after the first frame — respects prefers-reduced-motion without hiding the scene. */
  reducedMotion: boolean;
  onReady?: () => void;
}

/** Disposes a mesh/line/points object's geometry and material(s) — duck-typed so it covers every Object3D kind the scene uses, not just THREE.Mesh. */
function disposeObject(obj: THREE.Object3D) {
  const withResources = obj as unknown as {
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
  };
  withResources.geometry?.dispose();
  if (withResources.material) {
    const mats = Array.isArray(withResources.material) ? withResources.material : [withResources.material];
    for (const m of mats) m.dispose();
  }
}

/** Imperative Three.js setup, deliberately not react-three-fiber — one scene, mounted once, no reconciler needed. */
export default function mountCatamaranScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  options: CatamaranSceneOptions,
): () => void {
  const isMobile = window.innerWidth < 768;

  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: isMobile ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(pixelRatio);

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

  const { group: boat, sailMaterials, particleMaterials } = createBoat(
    {
      hull: navy700,
      boot: sand400,
      antifouling: navy900,
      deck: sand200,
      mast: navy900,
      sail: 0xfaf7f0,
    },
    isMobile,
    pixelRatio,
  );
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

  // A steady leeward heel, as if under sail power, rather than a boat that
  // only ever bobs level — waves add roll and pitch on top of this baseline.
  const baseHeel = -0.085;
  const basePitch = -0.02;

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
    for (const m of sailMaterials) m.uniforms.uTime.value = t;
    for (const m of particleMaterials) m.uniforms.uTime.value = t;

    const h = waveHeight(boat.position.x, boat.position.z, t);
    const hFwd = waveHeight(boat.position.x + 0.6, boat.position.z, t);
    const hSide = waveHeight(boat.position.x, boat.position.z + 0.6, t);
    boat.position.y = h;
    // A slow, gentle drift on top of the heel — gusts easing rather than a
    // fixed lean — plus the wave-induced component from the height sampled
    // just ahead of and beside the hull.
    const heelDrift = Math.sin(t * 0.17) * 0.025;
    boat.rotation.x = basePitch + (h - hFwd) * 0.4;
    boat.rotation.z = baseHeel + heelDrift + (hSide - h) * 0.4;

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
    if (!options.reducedMotion) raf = requestAnimationFrame(loop);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // Two independent reasons to pause, tracked separately so resuming one
  // never overrides the other: switching back to a tab whose hero is
  // scrolled out of view must not restart the loop, and hiding the tab must
  // not leave a requestAnimationFrame queued to fire — unpaused — the moment
  // the tab returns, running alongside the fresh loop that resuming starts.
  // A pending frame is exactly that kind of live callback, so every path
  // that sets `running = false` cancels it in the same breath.
  let isIntersecting = true;

  function updateRunning() {
    const shouldRun = !document.hidden && isIntersecting;
    if (shouldRun && !running) {
      running = true;
      loop();
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  document.addEventListener("visibilitychange", updateRunning);

  // Rendering also pauses off-screen — the home page is long, and there is
  // no reason to keep a GPU loop running under six sections of scrolled-past
  // content, especially on battery.
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      isIntersecting = entry.isIntersecting;
      updateRunning();
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
    document.removeEventListener("visibilitychange", updateRunning);
    canvas.removeEventListener("webglcontextlost", handleContextLost);

    scene.traverse(disposeObject);
    renderer.dispose();
  };
}
