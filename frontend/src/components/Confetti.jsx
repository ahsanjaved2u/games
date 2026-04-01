'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#00e5ff', '#a855f7', '#ff2d78', '#00ff88', '#ffd93d', '#4361ee'];

export default function Confetti({ active, duration = 3000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 8,
    }));

    let frame;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = elapsed > duration * 0.7 ? 1 - (elapsed - duration * 0.7) / (duration * 0.3) : 1;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rv;
        p.vy += 0.04;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'none',
    }} />
  );
}
