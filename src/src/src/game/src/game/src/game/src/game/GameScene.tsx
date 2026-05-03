// GameScene.tsx — Full 3D GTA-style scene using React Three Fiber

import React, {
  useRef, useEffect, useMemo, useState, useCallback,
  Component, ErrorInfo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { BUILDINGS } from "./buildings";
import { gameState } from "./state";

// ── Constants ──────────────────────────────────────────────────────────────
const PLAYER_SPEED     = 6;
const SPRINT_MULTIPLIER = 2.0;
const PLAYER_RADIUS    = 0.5;
const CAR_ENTER_DIST   = 4.5;
const CAR_ACCEL        = 14;
const CAR_FRICTION     = 0.86;
const CAR_STEER_SPEED  = 1.8;
const CAR_MAX_SPEED    = 28;
const CAM_DIST         = 7;
const CAM_HEIGHT       = 3.5;
const CAM_CAR_DIST     = 10;
const CAM_CAR_HEIGHT   = 5;
const WORLD_BOUND      = 98;

// ── Keyboard map ──────────────────────────────────────────────────────────
enum Controls { forward="forward", back="back", left="left", right="right", sprint="sprint" }

const KEY_MAP = [
  { name: Controls.forward, keys: ["KeyW","ArrowUp"]    },
  { name: Controls.back,    keys: ["KeyS","ArrowDown"]  },
  { name: Controls.left,    keys: ["KeyA","ArrowLeft"]  },
  { name: Controls.right,   keys: ["KeyD","ArrowRight"] },
  { name: Controls.sprint,  keys: ["ShiftLeft","ShiftRight"] },
];

// ── AABB collision ─────────────────────────────────────────────────────────
function resolveCollisions(nx: number, nz: number, radius: number) {
  let rx = nx, rz = nz;
  for (const b of BUILDINGS) {
    const minX = b.minX - radius, maxX = b.maxX + radius;
    const minZ = b.minZ - radius, maxZ = b.maxZ + radius;
    if (rx > minX && rx < maxX && rz > minZ && rz < maxZ) {
      const oL = rx - minX, oR = maxX - rx;
      const oF = rz - minZ, oB = maxZ - rz;
      const m = Math.min(oL, oR, oF, oB);
      if      (m === oL) rx = minX;
      else if (m === oR) rx = maxX;
      else if (m === oF) rz = minZ;
      else               rz = maxZ;
    }
  }
  return {
    x: Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, rx)),
    z: Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, rz)),
  };
}

// ── Floor ─────────────────────────────────────────────────────────────────
function Floor() {
  return (
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[200,200,4,4]} />
      <meshLambertMaterial color="#444955" />
    </mesh>
  );
}

// ── Road grid ─────────────────────────────────────────────────────────────
function Roads() {
  const roads = useMemo(() => {
    const items = [];
    for (let z = -80; z <= 80; z += 40)
      items.push({ x:0, z, width:200, depth:6 });
    for (let x = -80; x <= 80; x += 40)
      items.push({ x, z:0, width:6, depth:200 });
    return items;
  }, []);
  return (
    <>
      {roads.map((r,i) => (
        <mesh key={i} position={[r.x, 0.01, r.z]} rotation={[-Math.PI/2,0,0]} receiveShadow>
          <planeGeometry args={[r.width, r.depth]} />
          <meshLambertMaterial color="#2d3140" />
        </mesh>
      ))}
    </>
  );
}

// ── Buildings ─────────────────────────────────────────────────────────────
function Buildings() {
  return (
    <>
      {BUILDINGS.map((b,i) => (
        <mesh key={i} position={[b.x, b.height/2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshLambertMaterial color={b.color} />
        </mesh>
      ))}
    </>
  );
}

// ── Car ───────────────────────────────────────────────────────────────────
interface CarProps {
  inCarRef: React.MutableRefObject<boolean>;
  carPosRef: React.MutableRefObject<THREE.Vector3>;
  carAngleRef: React.MutableRefObject<number>;
  carSpeedRef: React.MutableRefObject<number>;
}

function Car({ inCarRef, carPosRef, carAngleRef, carSpeedRef }: CarProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (inCarRef.current) {
      const k = getKeys();
      if (k.forward) carSpeedRef.current += CAR_ACCEL * dt;
      else if (k.back) carSpeedRef.current -= CAR_ACCEL * 0.7 * dt;

      carSpeedRef.current *= Math.pow(CAR_FRICTION, dt * 60);
      carSpeedRef.current  = Math.max(-CAR_MAX_SPEED*0.4, Math.min(CAR_MAX_SPEED, carSpeedRef.current));

      const sf = Math.abs(carSpeedRef.current) / CAR_MAX_SPEED;
      if (k.left)  carAngleRef.current += CAR_STEER_SPEED * sf * dt * Math.sign(carSpeedRef.current || 1);
      if (k.right) carAngleRef.current -= CAR_STEER_SPEED * sf * dt * Math.sign(carSpeedRef.current || 1);

      const nx = carPosRef.current.x - Math.sin(carAngleRef.current) * carSpeedRef.current * dt;
      const nz = carPosRef.current.z - Math.cos(carAngleRef.current) * carSpeedRef.current * dt;
      const r  = resolveCollisions(nx, nz, 2.2);
      carPosRef.current.set(r.x, 0, r.z);

      gameState.carPos.x  = r.x;
      gameState.carPos.z  = r.z;
      gameState.carAngle  = carAngleRef.current;
    }
    if (meshRef.current) {
      meshRef.current.position.copy(carPosRef.current);
      meshRef.current.position.y = 0.75;
      meshRef.current.rotation.y = carAngleRef.current;
    }
  });

  const wheelPos: [number,number,number][] = [
    [-0.95,-0.4, 1.3],[0.95,-0.4, 1.3],
    [-0.95,-0.4,-1.3],[0.95,-0.4,-1.3],
  ];

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <boxGeometry args={[2.0,1.0,4.2]} />
        <meshLambertMaterial color="#e53e3e" />
      </mesh>
      <mesh position={[0,0.75,-0.3]} castShadow>
        <boxGeometry args={[1.7,0.7,2.4]} />
        <meshLambertMaterial color="#c53030" />
      </mesh>
      {wheelPos.map((pos,i) => (
        <mesh key={i} position={pos} rotation={[0,0,Math.PI/2]} castShadow>
          <cylinderGeometry args={[0.35,0.35,0.25,8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Headlights */}
      {([[0.6,0,2.15],[-0.6,0,2.15]] as [number,number,number][]).map((pos,i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.4,0.25,0.1]} />
          <meshLambertMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Player ────────────────────────────────────────────────────────────────
interface PlayerProps {
  inCarRef: React.MutableRefObject<boolean>;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  carPosRef: React.MutableRefObject<THREE.Vector3>;
  cameraYawRef: React.MutableRefObject<number>;
}

function Player({ inCarRef, playerPosRef, carPosRef, cameraYawRef }: PlayerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (inCarRef.current) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    if (meshRef.current) meshRef.current.visible = true;

    const k = getKeys();
    const speed = PLAYER_SPEED * (k.sprint ? SPRINT_MULTIPLIER : 1) * dt;
    const yaw = cameraYawRef.current;
    let dx = 0, dz = 0;

    if (k.forward) { dx -= Math.sin(yaw)*speed; dz -= Math.cos(yaw)*speed; }
    if (k.back)    { dx += Math.sin(yaw)*speed; dz += Math.cos(yaw)*speed; }
    if (k.left)    { dx -= Math.cos(yaw)*speed; dz += Math.sin(yaw)*speed; }
    if (k.right)   { dx += Math.cos(yaw)*speed; dz -= Math.sin(yaw)*speed; }

    if (dx !== 0 || dz !== 0) {
      const r = resolveCollisions(
        playerPosRef.current.x + dx,
        playerPosRef.current.z + dz,
        PLAYER_RADIUS
      );
      playerPosRef.current.set(r.x, 0, r.z);
      if (meshRef.current) meshRef.current.rotation.y = Math.atan2(dx, dz) + Math.PI;
    }

    gameState.playerPos.x = playerPosRef.current.x;
    gameState.playerPos.z = playerPosRef.current.z;
    gameState.playerAngle = yaw;

    if (meshRef.current) {
      meshRef.current.position.copy(playerPosRef.current);
      meshRef.current.position.y = 0;
    }

    gameState.showEnterPrompt = carPosRef.current.distanceTo(playerPosRef.current) < CAR_ENTER_DIST;
    gameState.showExitPrompt  = false;
  });

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh position={[0,1.0,0]} castShadow>
        <boxGeometry args={[0.6,0.8,0.35]} />
        <meshLambertMaterial color="#3182ce" />
      </mesh>
      {/* Head */}
      <mesh position={[0,1.75,0]} castShadow>
        <boxGeometry args={[0.45,0.45,0.45]} />
        <meshLambertMaterial color="#f6ad55" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.16,0.45,0]} castShadow>
        <boxGeometry args={[0.22,0.7,0.3]} />
        <meshLambertMaterial color="#2d3748" />
      </mesh>
      <mesh position={[0.16,0.45,0]} castShadow>
        <boxGeometry args={[0.22,0.7,0.3]} />
        <meshLambertMaterial color="#2d3748" />
      </mesh>
    </group>
  );
}

// ── Camera (third-person, pointer-lock) ───────────────────────────────────
interface CameraControllerProps {
  inCarRef: React.MutableRefObject<boolean>;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  carPosRef: React.MutableRefObject<THREE.Vector3>;
  carAngleRef: React.MutableRefObject<number>;
  cameraYawRef: React.MutableRefObject<number>;
  cameraPitchRef: React.MutableRefObject<number>;
}

function CameraController({ inCarRef, playerPosRef, carPosRef, carAngleRef, cameraYawRef, cameraPitchRef }: CameraControllerProps) {
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      cameraYawRef.current   -= e.movementX * 0.002;
      cameraPitchRef.current -= e.movementY * 0.002;
      cameraPitchRef.current  = Math.max(-0.5, Math.min(0.8, cameraPitchRef.current));
    };
    const onClick = () => { if (!document.pointerLockElement) canvas.requestPointerLock(); };
    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
    };
  }, [gl.domElement, cameraYawRef, cameraPitchRef]);

  useFrame(() => {
    const yaw   = cameraYawRef.current;
    const pitch = cameraPitchRef.current;
    let target: THREE.Vector3, dist: number, height: number;

    if (inCarRef.current) {
      cameraYawRef.current = carAngleRef.current + Math.PI;
      target = carPosRef.current.clone(); target.y = 0.75;
      dist = CAM_CAR_DIST; height = CAM_CAR_HEIGHT;
    } else {
      target = playerPosRef.current.clone(); target.y = 1.0;
      dist = CAM_DIST; height = CAM_HEIGHT;
    }

    const cx = target.x + Math.sin(yaw) * dist * Math.cos(pitch);
    const cy = target.y + height + dist * Math.sin(pitch);
    const cz = target.z + Math.cos(yaw) * dist * Math.cos(pitch);

    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.15);
    camera.lookAt(target.x, target.y + 0.5, target.z);
  });

  return null;
}

// ── F-key enter/exit car ──────────────────────────────────────────────────
interface InputHandlerProps {
  inCarRef: React.MutableRefObject<boolean>;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  carPosRef: React.MutableRefObject<THREE.Vector3>;
  carAngleRef: React.MutableRefObject<number>;
  carSpeedRef: React.MutableRefObject<number>;
}

function InputHandler({ inCarRef, playerPosRef, carPosRef, carAngleRef, carSpeedRef }: InputHandlerProps) {
  const fCooldown = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" || fCooldown.current) return;
      fCooldown.current = true;
      setTimeout(() => { fCooldown.current = false; }, 400);

      if (!inCarRef.current) {
        if (carPosRef.current.distanceTo(playerPosRef.current) < CAR_ENTER_DIST) {
          inCarRef.current = true;
          gameState.inCar = true;
          gameState.showEnterPrompt = false;
        }
      } else {
        const offset = new THREE.Vector3(
          Math.cos(carAngleRef.current) * 2.5, 0,
          -Math.sin(carAngleRef.current) * 2.5
        );
        playerPosRef.current.copy(carPosRef.current).add(offset);
        carSpeedRef.current = 0;
        inCarRef.current = false;
        gameState.inCar = false;
        gameState.showExitPrompt = false;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inCarRef, playerPosRef, carPosRef, carAngleRef, carSpeedRef]);

  useFrame(() => {
    if (inCarRef.current) {
      gameState.showExitPrompt  = true;
      gameState.showEnterPrompt = false;
    }
  });

  return null;
}

// ── Lighting ──────────────────────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} color="#b0c4de" />
      <directionalLight
        castShadow position={[50,80,30]} intensity={1.2} color="#fff8e1"
        shadow-mapSize={[1024,1024]}
        shadow-camera-near={1} shadow-camera-far={200}
        shadow-camera-left={-100} shadow-camera-right={100}
        shadow-camera-top={100} shadow-camera-bottom={-100}
      />
      <hemisphereLight args={["#87ceeb","#444955",0.3]} />
    </>
  );
}

// ── WebGL health checker (inside R3F Canvas) ──────────────────────────────
function WebGLChecker({ onError }: { onError: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => { e.preventDefault(); onError(); };
    canvas.addEventListener("webglcontextlost", onLost);

    let checks = 0;
    const poll = setInterval(() => {
      checks++;
      const ctx = gl.getContext() as WebGLRenderingContext | null;
      if (!ctx || ctx.isContextLost()) { onError(); clearInterval(poll); }
      if (checks >= 10) clearInterval(poll);
    }, 300);

    return () => { canvas.removeEventListener("webglcontextlost", onLost); clearInterval(poll); };
  }, []); // eslint-disable-line

  return null;
}

// ── Scene root ────────────────────────────────────────────────────────────
function Scene() {
  const inCarRef       = useRef(false);
  const playerPosRef   = useRef(new THREE.Vector3(0,0,0));
  const carPosRef      = useRef(new THREE.Vector3(8,0,0));
  const carAngleRef    = useRef(0);
  const carSpeedRef    = useRef(0);
  const cameraYawRef   = useRef(Math.PI);
  const cameraPitchRef = useRef(0.1);

  return (
    <>
      <Lights />
      <Floor />
      <Roads />
      <Buildings />
      <Car inCarRef={inCarRef} carPosRef={carPosRef} carAngleRef={carAngleRef} carSpeedRef={carSpeedRef} />
      <Player inCarRef={inCarRef} playerPosRef={playerPosRef} carPosRef={carPosRef} cameraYawRef={cameraYawRef} />
      <CameraController
        inCarRef={inCarRef} playerPosRef={playerPosRef} carPosRef={carPosRef}
        carAngleRef={carAngleRef} cameraYawRef={cameraYawRef} cameraPitchRef={cameraPitchRef}
      />
      <InputHandler
        inCarRef={inCarRef} playerPosRef={playerPosRef} carPosRef={carPosRef}
        carAngleRef={carAngleRef} carSpeedRef={carSpeedRef}
      />
    </>
  );
}

// ── WebGL unavailable fallback ────────────────────────────────────────────
function WebGLFallback() {
  return (
    <div style={{
      position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg,#1a1f2e 0%,#2d3748 100%)",
      color:"#e2e8f0", fontFamily:"monospace", textAlign:"center", padding:24, zIndex:50,
    }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🎮</div>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8, color:"#f6c90e" }}>
        GTA Starter — 3D Open World
      </h2>
      <p style={{ fontSize:14, color:"#a0aec0", maxWidth:400, marginBottom:24, lineHeight:1.7 }}>
        WebGL is blocked in this embedded preview.
        Open the game in a full browser tab for the complete 3D experience.
      </p>
      <button
        onClick={() => window.open(window.location.href, "_blank")}
        style={{
          background:"#3182ce", color:"#fff", border:"none", borderRadius:6,
          padding:"10px 28px", fontSize:15, fontWeight:700, cursor:"pointer",
          boxShadow:"0 4px 14px rgba(49,130,206,0.4)", marginBottom:28,
        }}
      >
        ↗  Open in New Tab
      </button>
      <div style={{
        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:8, padding:"14px 20px", fontSize:12, color:"#718096", lineHeight:2,
      }}>
        <strong style={{ color:"#a0aec0" }}>Controls</strong><br />
        WASD — move &nbsp;|&nbsp; Mouse — look &nbsp;|&nbsp; Shift — sprint<br />
        F — enter / exit car &nbsp;|&nbsp; WASD — drive
      </div>
    </div>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────
interface EBState { hasError: boolean }
class CanvasErrorBoundary extends Component<
  { children: React.ReactNode; onError: () => void }, EBState
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch(_e: Error, _i: ErrorInfo) { this.props.onError(); }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ── Main export ───────────────────────────────────────────────────────────
export default function GameScene() {
  const [webGLError, setWebGLError] = useState(false);
  const handleError = useCallback(() => setWebGLError(true), []);

  // Detect Three.js WebGL errors via console intercept + MutationObserver
  useEffect(() => {
    const origLog   = console.log;
    const origError = console.error;
    console.log = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("Context Lost")) handleError();
      return origLog.apply(console, args);
    };
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("WebGL context")) handleError();
      return origError.apply(console, args);
    };

    const mo = new MutationObserver(() => {
      document.querySelectorAll("canvas").forEach((c) => {
        if (!(c as HTMLCanvasElement & { _w?: boolean })._w) {
          (c as HTMLCanvasElement & { _w?: boolean })._w = true;
          c.addEventListener("webglcontextlost", (e) => { e.preventDefault(); handleError(); });
        }
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      console.log   = origLog;
      console.error = origError;
      mo.disconnect();
    };
  }, [handleError]);

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#1a1f2e", position:"relative" }}>
      {webGLError ? (
        <WebGLFallback />
      ) : (
        <CanvasErrorBoundary onError={handleError}>
          <KeyboardControls map={KEY_MAP}>
            <Canvas
              shadows
              camera={{ fov:70, near:0.1, far:500, position:[0,12,14] }}
              gl={{ antialias:false, powerPreference:"low-power", failIfMajorPerformanceCaveat:false }}
              style={{ width:"100%", height:"100%" }}
            >
              <fog attach="fog" args={["#1a1f2e",60,200]} />
              <WebGLChecker onError={handleError} />
              <Scene />
            </Canvas>
          </KeyboardControls>
        </CanvasErrorBoundary>
      )}
    </div>
  );
}
