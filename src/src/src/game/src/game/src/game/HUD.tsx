import React, { useEffect, useRef, useState } from "react";
import { gameState } from "./state";
import { BUILDINGS } from "./buildings";

const MINIMAP_SIZE = 160;
const WORLD_HALF = 100;
const SCALE = MINIMAP_SIZE / (WORLD_HALF * 2);

function worldToMinimap(wx: number, wz: number) {
  return {
    x: (wx + WORLD_HALF) * SCALE,
    y: (wz + WORLD_HALF) * SCALE,
  };
}

export default function HUD() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [health, setHealth]       = useState(100);
  const [inCar, setInCar]         = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const [showExit, setShowExit]   = useState(false);

  useEffect(() => {
    let animId = 0;
    let lastRender = 0;

    const draw = (now: number) => {
      if (now - lastRender > 33) {
        lastRender = now;
        setHealth(gameState.health);
        setInCar(gameState.inCar);
        setShowEnter(gameState.showEnterPrompt);
        setShowExit(gameState.showExitPrompt);

        const canvas = canvasRef.current;
        if (!canvas) { animId = requestAnimationFrame(draw); return; }
        const ctx = canvas.getContext("2d");
        if (!ctx)    { animId = requestAnimationFrame(draw); return; }

        ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

        // Buildings
        ctx.fillStyle = "#4a5568";
        for (const b of BUILDINGS) {
          ctx.fillRect(
            (b.minX + WORLD_HALF) * SCALE,
            (b.minZ + WORLD_HALF) * SCALE,
            b.width * SCALE,
            b.depth * SCALE
          );
        }

        // Car (yellow)
        const car = worldToMinimap(gameState.carPos.x, gameState.carPos.z);
        ctx.fillStyle = "#f6c90e";
        ctx.beginPath();
        ctx.arc(car.x, car.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Player (green) + direction line
        const pp = worldToMinimap(gameState.playerPos.x, gameState.playerPos.z);
        ctx.fillStyle = "#48bb78";
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 5, 0, Math.PI * 2);
        ctx.fill();

        const angle = gameState.playerAngle;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(pp.x - Math.sin(angle) * 9, pp.y - Math.cos(angle) * 9);
        ctx.stroke();

        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
      }
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  const healthColor =
    health > 60 ? "#48bb78" : health > 30 ? "#ecc94b" : "#fc8181";

  return (
    <>
      {/* Health bar — top-left */}
      <div style={{ position:"fixed", top:16, left:16, zIndex:100, pointerEvents:"none", userSelect:"none" }}>
        <div style={{ color:"#e2e8f0", fontSize:13, marginBottom:4, fontFamily:"monospace", fontWeight:600, textShadow:"0 1px 3px #000" }}>
          ❤ HEALTH
        </div>
        <div style={{ width:180, height:14, background:"rgba(0,0,0,0.5)", borderRadius:3, border:"1px solid rgba(255,255,255,0.2)" }}>
          <div style={{ width:`${health}%`, height:"100%", background:healthColor, borderRadius:3, transition:"width 0.2s" }} />
        </div>
        <div style={{ color:"#e2e8f0", fontSize:11, marginTop:3, fontFamily:"monospace", textShadow:"0 1px 3px #000" }}>
          {health} / 100
        </div>
      </div>

      {/* Mode badge — top-center */}
      <div style={{
        position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:100,
        pointerEvents:"none", background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.15)",
        borderRadius:6, padding:"4px 14px", color: inCar ? "#f6c90e" : "#a0aec0",
        fontSize:12, fontFamily:"monospace", fontWeight:700, letterSpacing:1, textShadow:"0 1px 3px #000",
      }}>
        {inCar
          ? "🚗  DRIVING  —  WASD to drive · F to exit"
          : "🏃  ON FOOT  —  WASD · Mouse to look · Shift sprint"}
      </div>

      {/* Enter/Exit prompt */}
      {(showEnter || showExit) && (
        <div style={{
          position:"fixed", bottom:"38%", left:"50%", transform:"translateX(-50%)", zIndex:100,
          pointerEvents:"none", background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.25)",
          borderRadius:8, padding:"8px 20px", color:"#faf089", fontSize:14,
          fontFamily:"monospace", fontWeight:600, textShadow:"0 1px 3px #000",
          animation:"pulse 1.2s ease-in-out infinite",
        }}>
          {showExit ? "Press  F  to exit car" : "Press  F  to enter car"}
        </div>
      )}

      {/* Controls hint — bottom-center */}
      <div style={{
        position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:100,
        pointerEvents:"none", color:"rgba(255,255,255,0.4)", fontSize:11,
        fontFamily:"monospace", textShadow:"0 1px 3px #000",
      }}>
        Click to lock mouse · Escape to unlock
      </div>

      {/* Minimap — bottom-right */}
      <div style={{ position:"fixed", bottom:16, right:16, zIndex:100, pointerEvents:"none" }}>
        <div style={{ color:"#a0aec0", fontSize:11, marginBottom:4, fontFamily:"monospace", textAlign:"right", textShadow:"0 1px 3px #000" }}>
          MINIMAP
        </div>
        <canvas ref={canvasRef} width={MINIMAP_SIZE} height={MINIMAP_SIZE} style={{ display:"block", borderRadius:4 }} />
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </>
  );
}
