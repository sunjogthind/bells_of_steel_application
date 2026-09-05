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
import { OrbitControls, Grid } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import type { Verdict } from '@/lib/fit';

const COLOUR: Record<Verdict, string> = {
  fits: '#15803d', tight: '#b45309', no: '#dc2626', unknown: '#6b7280',
};

type Props = {
  roomW: number; roomD: number; ceiling: number;
  rackW: number | null; rackD: number | null; rackH: number | null;
  tubing: number;
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

/** A simple standing figure. Purely a scale reference at a height the user sets. */
function Person({ h, x, z }: { h: number; x: number; z: number }) {
  const head = h * 0.13, torso = h * 0.35, legs = h * 0.47;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, legs / 2, 0]} castShadow>
        <capsuleGeometry args={[h * 0.055, legs * 0.75, 4, 8]} />
        <meshStandardMaterial color="#5b6167" roughness={0.9} />
      </mesh>
      <mesh position={[0, legs + torso / 2, 0]} castShadow>
        <capsuleGeometry args={[h * 0.075, torso * 0.7, 4, 8]} />
        <meshStandardMaterial color="#5b6167" roughness={0.9} />
      </mesh>
      <mesh position={[0, legs + torso + head / 2, 0]} castShadow>
        <sphereGeometry args={[head / 2, 16, 16]} />
        <meshStandardMaterial color="#5b6167" roughness={0.9} />
      </mesh>
    </group>
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
  const halfW = p.roomW / 2, halfD = p.roomD / 2;

  // Rack frame: four uprights at the published crossmember span, plus the
  // top bar and a mid safety. Depth is our estimate, so it is drawn but the
  // caption says so.
  const rack = useMemo(() => {
    if (p.rackW == null || p.rackH == null) return null;
    const w = p.rackW, d = p.rackD ?? 48, h = p.rackH;
    const x = w / 2 - t / 2, z = d / 2 - t / 2;
    return { w, d, h, posts: [[-x, -z], [x, -z], [-x, z], [x, z]] as [number, number][] };
  }, [p.rackW, p.rackD, p.rackH, t]);

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

      {/* ceiling plane, the constraint the whole tool is about */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, p.ceiling, 0]}>
        <planeGeometry args={[p.roomW, p.roomD]} />
        <meshStandardMaterial color="#9aa3aa" roughness={1} transparent opacity={0.35} side={2} />
      </mesh>

      {rack && (
        <group>
          {rack.posts.map(([x, z], i) => (
            <Upright key={i} x={x} z={z} h={rack.h} t={t} colour={colour} />
          ))}
          {/* pull-up bar across the front top */}
          <mesh position={[0, rack.h - t / 2, -(rack.d / 2 - t / 2)]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[t * 0.32, t * 0.32, rack.w - t, 16]} />
            <meshStandardMaterial color={colour} roughness={0.4} metalness={0.3} />
          </mesh>
          {/* top crossmembers */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, rack.h - t / 2, s * (rack.d / 2 - t / 2)]} castShadow>
              <boxGeometry args={[rack.w - t, t * 0.7, t * 0.7]} />
              <meshStandardMaterial color={colour} roughness={0.55} metalness={0.15} />
            </mesh>
          ))}
          {/* safeties at working height */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, rack.h * 0.42, s * (rack.d / 2 - t / 2)]} castShadow>
              <boxGeometry args={[rack.w - t, t * 0.45, t * 0.45]} />
              <meshStandardMaterial color={colour} roughness={0.6} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      )}

      {p.usesBarbell && (
        <group position={[0, 44, rack ? (rack.d / 2 + 14) : 20]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, BAR_LEN, 12]} />
            <meshStandardMaterial color="#d63a1f" roughness={0.35} metalness={0.5} />
          </mesh>
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
