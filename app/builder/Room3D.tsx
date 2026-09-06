'use client';

/* ------------------------------------------------------------------ *
 * A to-scale volume study, not a product render.
 *
 * Everything drawn here is either published by Bells of Steel, supplied by
 * the person using the tool, or a stated assumption. The rack is deliberately
 * built from primitives at real dimensions rather than modelled: we know the
 * upright height, the crossmember width and the tubing size, and we do not
 * know what the castings, feet or hardware look like. Drawing a realistic rack
 * would mean inventing the parts we cannot source.
 *
 * Units: 1 three.js unit = 1 inch.
 * ------------------------------------------------------------------ */
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useMemo, useState } from 'react';
import type { Verdict } from '@/lib/fit';

const COLOUR: Record<Verdict, string> = {
  fits: '#15803d', tight: '#b45309', no: '#dc2626', unknown: '#6b7280',
};

type Props = {
  roomW: number; roomD: number; ceiling: number;
  rackW: number | null; rackD: number | null; rackH: number | null;
  tubing: number;
  frame: string | null;
  usesBarbell: boolean;
  personH: number;
  verdict: Verdict;
};

const BAR_LEN = 86;

function Upright({ x, z, h, t, colour }: { x: number; z: number; h: number; t: number; colour: string }) {
  return (
    <mesh position={[x, h / 2, z]} castShadow>
      <boxGeometry args={[t, h, t]} />
      <meshStandardMaterial color={colour} roughness={0.55} metalness={0.15} />
    </mesh>
  );
}

/* Scale figure, drawn as a flat silhouette that always faces the camera - the
   technique architectural renderings use, and the reason they use it: a single
   dark shape reads as a person instantly, where shaded 3D primitives just read as
   a pile of capsules with visible joins.
   Painted into a canvas at real anthropometric fractions of stature (shoulder
   0.805H, hip 0.53H, knee 0.285H), so it stays an honest scale reference. No
   asset is fetched; the texture is generated at runtime. */
const SKIN = '#4a5057';

/* One continuous outline rather than overlapping strokes. Stacking capsules leaves
   notches where limbs meet the trunk and spikes at the shoulders, which is what made
   the first two attempts read as a toy. Points are half a body, mirrored, and smoothed
   through their midpoints. Positions are fractions of stature: shoulder 0.805, waist
   0.615, hip 0.53, knee 0.29, so it stays a true scale reference. */
type Pt = [number, number]; // [x offset in px, height as fraction of stature]

const HALF_BODY: Pt[] = [
  [-14, 0.858], [-35, 0.828], [-58, 0.810], [-70, 0.786],   // neck, trap, shoulder, deltoid
  [-75, 0.718], [-74, 0.645], [-68, 0.558], [-63, 0.490],   // arm outer edge to wrist
  [-61, 0.450], [-48, 0.458],                                // hand
  [-47, 0.550], [-48, 0.648], [-46, 0.735], [-40, 0.775],   // arm inner edge up to armpit
  [-40, 0.700], [-33, 0.612],                                // lat sweep into the waist
  [-42, 0.545], [-48, 0.498],                                // hip
  [-47, 0.400], [-39, 0.292], [-38, 0.190], [-27, 0.068],   // thigh, knee, calf, ankle
  [-38, 0.014], [-8, 0.014],                                 // foot
  [-12, 0.068], [-15, 0.195], [-13, 0.292], [-8, 0.400],    // inner leg back up
  [-2, 0.478],                                               // crotch
];

function useFigureTexture() {
  return useMemo(() => {
    const W = 220, H = 560, cx = W / 2;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;

    const pt = ([dx, f]: Pt, mirror = false): Pt => [cx + (mirror ? -dx : dx), H * (1 - f)];
    const outline = [...HALF_BODY.map((q) => pt(q)), ...[...HALF_BODY].reverse().map((q) => pt(q, true))];

    c.fillStyle = SKIN;
    c.beginPath();
    c.moveTo(outline[0][0], outline[0][1]);
    for (let i = 1; i < outline.length - 1; i++) {
      const [x1, y1] = outline[i];
      const [x2, y2] = outline[i + 1];
      c.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
    }
    c.closePath();
    c.fill();

    // neck bridging the trunk and the head, drawn under both so no seam shows
    c.beginPath();
    c.ellipse(cx, H * (1 - 0.868), 16, 26, 0, 0, Math.PI * 2);
    c.fill();
    // head: crown lands at full stature
    c.beginPath();
    c.ellipse(cx, H * (1 - 0.947), 22, 28, 0, 0, Math.PI * 2);
    c.fill();

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }, []);
}

/* public/figure.png is an anatomical scale figure, pre-cropped to its own
   bounding box so the plane's height is the person's height. It ships with a
   real alpha channel, so no background keying is needed here. Falls back to the
   drawn silhouette if the file is missing or fails to decode. */
function useFigureImage(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(
      '/figure.png',
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.anisotropy = 8;
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => { /* no figure.png - the drawn silhouette is used instead */ },
    );
    return () => { cancelled = true; };
  }, []);

  return tex;
}

function Person({ h, x, z }: { h: number; x: number; z: number }) {
  const drawn = useFigureTexture();
  const photo = useFigureImage();
  const tex = photo ?? drawn;
  if (!tex) return null;

  const src = tex.image as { width?: number; height?: number } | undefined;
  const aspect = src?.width && src?.height ? src.width / src.height : 220 / 560;
  const w = h * aspect;

  return (
    <Billboard position={[x, h / 2, z]} follow lockX={false} lockY={false} lockZ>
      <mesh castShadow>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.35} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

/* R3F measures its container once on mount. When the canvas is revealed by a
   toggle, the container is already at its final size, so nothing changes and no
   resize is observed - the canvas sits at its 300x150 default.
   Measuring the parent directly and calling setSize avoids depending on a
   ResizeObserver firing at all; the observer is kept only for later resizes. */
function Resizer() {
  const setSize = useThree((s) => s.setSize);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement.parentElement;
    if (!el) return;

    const apply = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setSize(width, height);
    };

    apply();
    const raf = requestAnimationFrame(apply);
    const t = setTimeout(apply, 250);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [gl, setSize]);

  return null;
}

function Scene(p: Props) {
  const colour = COLOUR[p.verdict];
  const t = p.tubing;
  // 2in of hardware sits above the uprights, matching the fit engine's rule.
  const breachesCeiling = p.rackH != null && p.rackH + 2 > p.ceiling;
  const halfW = p.roomW / 2, halfD = p.roomD / 2;

  // Rack frame: four uprights at the published crossmember span, plus the
  // top bar and a mid safety. Depth is our estimate, so it is drawn but the
  // caption says so.
  const rack = useMemo(() => {
    if (p.rackW == null || p.rackH == null) return null;
    const w = p.rackW, d = p.rackD ?? 48, h = p.rackH;
    const x = w / 2 - t / 2, z = d / 2 - t / 2;

    /* Post count follows the frame. A squat stand has two uprights and a six-post
       rack has six; drawing four for all of them invents a footprint, which is the
       one thing this view is not allowed to do. */
    const twoPost = p.frame === 'squatstand' || p.frame === 'folding_2post';
    const sixPost = p.frame === '6post';
    const posts: [number, number][] = twoPost
      ? [[-x, 0], [x, 0]]
      : sixPost
      ? [[-x, -z], [x, -z], [-x, 0], [x, 0], [-x, z], [x, z]]
      : [[-x, -z], [x, -z], [-x, z], [x, z]];
    return { w, d: twoPost ? t : d, h, posts, twoPost };
  }, [p.rackW, p.rackD, p.rackH, p.frame, t]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[60, 140, 80]} intensity={1.5} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-160} shadow-camera-right={160}
        shadow-camera-top={160} shadow-camera-bottom={-160} />
      <directionalLight position={[-70, 60, -50]} intensity={0.45} />
      <hemisphereLight args={['#ffffff', '#c9ced2', 0.55]} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[p.roomW, p.roomD]} />
        <meshStandardMaterial color="#b9c0c6" roughness={0.95} />
      </mesh>
      <Grid args={[p.roomW, p.roomD]} cellSize={12} cellThickness={0.5} cellColor="#8f989f"
        sectionSize={48} sectionThickness={1} sectionColor="#6d767d"
        position={[0, 0.1, 0]} infiniteGrid={false} fadeDistance={600} />

      {/* two walls, so the room reads as a room without boxing the camera in */}
      <mesh position={[0, p.ceiling / 2, -halfD]} receiveShadow>
        <planeGeometry args={[p.roomW, p.ceiling]} />
        <meshStandardMaterial color="#dfe4e7" roughness={1} />
      </mesh>
      <mesh position={[-halfW, p.ceiling / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[p.roomD, p.ceiling]} />
        <meshStandardMaterial color="#d3d9dd" roughness={1} />
      </mesh>

      {/* Ceiling plane, the constraint the whole tool is about. When the uprights do
          not clear it, tint it: through a translucent ceiling, "poking through" and
          "just under" otherwise look almost identical. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, p.ceiling, 0]}>
        <planeGeometry args={[p.roomW, p.roomD]} />
        <meshStandardMaterial
          color={breachesCeiling ? '#dc2626' : '#9aa3aa'}
          roughness={1}
          transparent
          opacity={breachesCeiling ? 0.3 : 0.35}
          side={2}
        />
      </mesh>

      {rack && (
        <group>
          {rack.posts.map(([x, z], i) => (
            <Upright key={i} x={x} z={z} h={rack.h} t={t} colour={colour} />
          ))}
          {/* pull-up bar across the front top */}
          <mesh position={[0, rack.h - t / 2, rack.twoPost ? 0 : -(rack.d / 2 - t / 2)]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[t * 0.32, t * 0.32, rack.w - t, 16]} />
            <meshStandardMaterial color={colour} roughness={0.4} metalness={0.3} />
          </mesh>
          {/* top crossmembers */}
          {(rack.twoPost ? [0] : [-1, 1]).map((s) => (
            <mesh key={s} position={[0, rack.h - t / 2, s * (rack.d / 2 - t / 2)]} castShadow>
              <boxGeometry args={[rack.w - t, t * 0.7, t * 0.7]} />
              <meshStandardMaterial color={colour} roughness={0.55} metalness={0.15} />
            </mesh>
          ))}
          {/* safeties at working height */}
          {(rack.twoPost ? [0] : [-1, 1]).map((s) => (
            <mesh key={s} position={[0, rack.h * 0.42, s * (rack.d / 2 - t / 2)]} castShadow>
              <boxGeometry args={[rack.w - t, t * 0.45, t * 0.45]} />
              <meshStandardMaterial color={colour} roughness={0.6} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      )}

      {p.usesBarbell && (
        <group position={[0, 40, rack ? rack.d / 2 + 16 : 20]}>
          {/* 86in shaft with loading sleeves. Standard bar geometry, stated as an
              assumption in the caption - Bells of Steel do not publish bar dimensions. */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.55, 0.55, BAR_LEN - 34, 14]} />
            <meshStandardMaterial color="#8d949b" roughness={0.3} metalness={0.75} />
          </mesh>
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} position={[sgn * ((BAR_LEN - 17) / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[1.0, 1.0, 17, 14]} />
              <meshStandardMaterial color="#d63a1f" roughness={0.4} metalness={0.5} />
            </mesh>
          ))}
        </group>
      )}

      <Person h={p.personH} x={rack ? rack.w / 2 + 16 : 20} z={0} />

      <OrbitControls makeDefault enablePan={false} minDistance={60}
        maxDistance={Math.max(p.roomW, p.roomD) * 2.2}
        maxPolarAngle={Math.PI / 2 - 0.03} target={[0, p.ceiling * 0.38, 0]} />
    </>
  );
}

// R3F's own canvas style is what sets width and height to 100%. Passing a style
// prop replaces it wholesale, so the size has to be restated here or the canvas
// falls back to its 300x150 default.
const CANVAS_STYLE = { width: '100%', height: '100%', background: '#eef1f3' } as const;

export default function Room3D(p: Props) {
  const cam = Math.max(p.roomW, p.roomD, p.ceiling);
  return (
    <div className="h-full w-full">
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [cam * 0.95, cam * 0.72, cam * 1.05], fov: 42, near: 1, far: 4000 }}
      style={CANVAS_STYLE}
    >
      <Resizer />
      <Scene {...p} />
    </Canvas>
    </div>
  );
}
