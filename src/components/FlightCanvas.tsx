import React, { useRef, useEffect } from 'react';
import { RoundStatus } from '../types/game';
import { Language, translations } from '../utils/i18n';

interface FlightCanvasProps {
  status: RoundStatus;
  currentMultiplier: number;
  finalCrashMultiplier: number;
  waitingCountdown: number; // 0 to 5 seconds
  lang: Language;
}

export const FlightCanvas: React.FC<FlightCanvasProps> = ({
  status,
  currentMultiplier,
  finalCrashMultiplier,
  waitingCountdown,
  lang,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Animation state stored in refs for 60fps rendering
  const starsRef = useRef<Array<{ x: number; y: number; size: number; speed: number; alpha: number }>>([]);
  const propellerAngleRef = useRef(0);
  const crashFlyProgressRef = useRef(0);
  const exhaustParticlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }>>([]);

  const t = translations[lang];

  // Initialize stars once
  useEffect(() => {
    const stars: Array<{ x: number; y: number; size: number; speed: number; alpha: number }> = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random() * 1000,
        y: Math.random() * 600,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    if (status === 'CRASHED') {
      crashFlyProgressRef.current = 0;
    }
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Handle DPI scaling
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Draw Background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle grid dots / stars moving left/down to simulate forward flight speed
      const speedFactor = status === 'FLYING' ? Math.min(4, 1 + currentMultiplier * 0.3) : 0.5;
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach((star) => {
        star.x -= star.speed * speedFactor;
        if (star.x < 0) {
          star.x = width;
          star.y = Math.random() * height;
        }
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x % width, star.y % height, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Subtle horizontal axis grid lines
      ctx.strokeStyle = '#161c28';
      ctx.lineWidth = 1;
      const gridStep = Math.max(40, height / 8);
      for (let y = height - 20; y > 0; y -= gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Graph coordinates padding
      const startX = 25;
      const startY = height - 18;
      const maxCurveWidth = width * 0.8;
      const maxCurveHeight = height * 0.72;

      propellerAngleRef.current += status === 'FLYING' ? 0.35 : 0.05;

      if (status === 'FLYING' || status === 'CRASHED') {
        // Multiplier progression curve:
        // map multiplier from 1.00 to current
        // progress t from 0 to 1 as multiplier climbs
        const curveProgress = Math.min(1, Math.log(currentMultiplier) / Math.log(30)); // 30x reaches max right
        const easeT = Math.min(1, Math.max(0.04, curveProgress));

        const targetX = startX + maxCurveWidth * easeT;
        // Exponential trajectory curve: y rises smoothly
        const targetY = startY - maxCurveHeight * Math.pow(easeT, 0.78);

        // Control point for smooth curved arc
        const cpX = startX + (targetX - startX) * 0.65;
        const cpY = startY - (startY - targetY) * 0.15;

        // Draw glowing gradient fill under curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
        ctx.lineTo(targetX, startY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, targetY, 0, startY);
        grad.addColorStop(0, 'rgba(229, 29, 36, 0.45)');
        grad.addColorStop(0.7, 'rgba(229, 29, 36, 0.15)');
        grad.addColorStop(1, 'rgba(229, 29, 36, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Draw red curve stroke line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
        ctx.strokeStyle = '#E51D24';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(229, 29, 36, 0.8)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // Calculate tangent angle for plane rotation
        // Tangent of quadratic curve B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const tVal = 0.99;
        const dx = 2 * (1 - tVal) * (cpX - startX) + 2 * tVal * (targetX - cpX);
        const dy = 2 * (1 - tVal) * (cpY - startY) + 2 * tVal * (targetY - cpY);
        let angle = Math.atan2(dy, dx);

        // Plane Bobbing vibration
        const bobOffset = Math.sin(Date.now() * 0.008) * 3;

        let planeX = targetX;
        let planeY = targetY + bobOffset;

        if (status === 'CRASHED') {
          // In crashed state, plane zooms off screen with higher speed
          crashFlyProgressRef.current = Math.min(1, crashFlyProgressRef.current + 0.035);
          planeX += crashFlyProgressRef.current * 400;
          planeY -= crashFlyProgressRef.current * 250;
          angle -= crashFlyProgressRef.current * 0.4;
        } else {
          // Add exhaust particle occasionally
          if (Math.random() < 0.6) {
            exhaustParticlesRef.current.push({
              x: planeX - 25 * Math.cos(angle),
              y: planeY - 25 * Math.sin(angle),
              vx: -Math.cos(angle) * (2 + Math.random() * 2),
              vy: -Math.sin(angle) * (1 + Math.random() * 2),
              life: 1,
              maxLife: 20 + Math.random() * 15,
              size: 3 + Math.random() * 3,
            });
          }
        }

        // Draw exhaust particles
        for (let i = exhaustParticlesRef.current.length - 1; i >= 0; i--) {
          const p = exhaustParticlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          const alpha = Math.max(0, 1 - p.life / p.maxLife);

          ctx.fillStyle = `rgba(229, 29, 36, ${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + p.life / p.maxLife), 0, Math.PI * 2);
          ctx.fill();

          if (p.life >= p.maxLife) {
            exhaustParticlesRef.current.splice(i, 1);
          }
        }

        // Draw the sleek red Aviator plane
        drawAviatorPlane(ctx, planeX, planeY, angle, propellerAngleRef.current, status === 'CRASHED');
      }

      // 3. Render Large Multiplier or Status Text in Center
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;

      if (status === 'FLYING') {
        // Multiplier number (e.g. 1.84x)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 clamp(36px, 9vw, 54px) "Orbitron", "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fillText(`${currentMultiplier.toFixed(2)}x`, centerX, centerY);
      } else if (status === 'CRASHED') {
        // Crash state: "FLEW AWAY!" & final multiplier
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '800 clamp(16px, 4vw, 24px) "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#E51D24';
        ctx.shadowColor = 'rgba(229, 29, 36, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fillText(t.flewAway.toUpperCase(), centerX, centerY - 20);

        ctx.font = '900 clamp(34px, 8vw, 48px) "Orbitron", sans-serif';
        ctx.fillStyle = '#E51D24';
        ctx.shadowColor = 'rgba(229, 29, 36, 0.9)';
        ctx.shadowBlur = 18;
        ctx.fillText(`@ ${finalCrashMultiplier.toFixed(2)}x`, centerX, centerY + 18);
      } else if (status === 'WAITING') {
        // Waiting countdown state
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '700 clamp(13px, 3vw, 16px) "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(t.waitingForNextRound.toUpperCase(), centerX, centerY - 18);

        // Animated progress loading bar
        const barWidth = Math.min(240, width * 0.65);
        const barHeight = 6;
        const barX = centerX - barWidth / 2;
        const barY = centerY + 4;

        // Track background
        ctx.fillStyle = '#1e2638';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 3);
        ctx.fill();

        // Progress fill (fills from 0 to 100% over 5 seconds)
        const progress = Math.max(0, Math.min(1, (5 - waitingCountdown) / 5));
        ctx.fillStyle = '#E51D24';
        ctx.shadowColor = 'rgba(229, 29, 36, 0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * progress, barHeight, 3);
        ctx.fill();

        // Seconds remaining
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${Math.max(0, waitingCountdown).toFixed(1)}s`, centerX, centerY + 24);
      }

      ctx.restore();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [status, currentMultiplier, finalCrashMultiplier, waitingCountdown, lang, t]);

  // Helper function to draw the red propeller airplane
  const drawAviatorPlane = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    propellerAngle: number,
    isCrashed: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Plane scale
    const scale = 0.85;
    ctx.scale(scale, scale);

    // If crashed, add slight red glow/transparency
    if (isCrashed) {
      ctx.globalAlpha = 0.85;
    }

    // Fuselage (main red body)
    ctx.fillStyle = '#E51D24';
    ctx.beginPath();
    ctx.moveTo(35, 0); // nose
    ctx.bezierCurveTo(20, -10, -25, -9, -38, -4); // upper curve to tail
    ctx.lineTo(-44, -14); // tail fin tip
    ctx.lineTo(-40, 0); // tail back
    ctx.bezierCurveTo(-35, 6, -10, 8, 20, 5); // bottom fuselage
    ctx.closePath();
    ctx.shadowColor = 'rgba(229, 29, 36, 0.7)';
    ctx.shadowBlur = 8;
    ctx.fill();

    // Wings (tilted perspective)
    ctx.fillStyle = '#c71017';
    ctx.beginPath();
    ctx.moveTo(5, -2);
    ctx.lineTo(-12, -22);
    ctx.lineTo(-24, -20);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    // Foreground main wing
    ctx.fillStyle = '#b30e15';
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(-10, 20);
    ctx.lineTo(-22, 17);
    ctx.lineTo(-5, 3);
    ctx.closePath();
    ctx.fill();

    // Cockpit windshield (glossy white/cyan glass)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(14, -4, 9, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Propeller hub (black nose cone)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(36, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Spinning propeller blades
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    const propLen = 14;
    const pCos = Math.cos(propellerAngle);
    const pSin = Math.sin(propellerAngle);

    ctx.beginPath();
    ctx.moveTo(36 - propLen * pSin, -propLen * pCos);
    ctx.lineTo(36 + propLen * pSin, propLen * pCos);
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div className="relative w-full h-[175px] sm:h-[220px] bg-[#0a0d14] rounded-2xl overflow-hidden border border-[#1a2336] shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
