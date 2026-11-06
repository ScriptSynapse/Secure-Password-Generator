import { useEffect, useRef, type RefObject } from 'react';
import { secureRandomInt } from '../lib/crypto';
import { isLowPowerDevice } from '../hooks/useReducedMotion';
import { IconKey, IconLock, IconShield } from './Icons';

/**
 * Hero visual: a floating metallic vault built with CSS 3D transforms (no WebGL),
 * orbiting rings, floating security chips, a canvas particle field and pointer parallax.
 *
 * Performance: transforms/opacity only (GPU-composited), particles capped and paused
 * when off-screen or the tab is hidden, parallax disabled on touch devices, and
 * everything static under prefers-reduced-motion.
 */

const rand = () => secureRandomInt(1_000_000) / 1_000_000; // decorative only

function useParticles(canvasRef: RefObject<HTMLCanvasElement | null>, reduced: boolean) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const low = isLowPowerDevice();
    const dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : 2);
    let w = 0;
    let h = 0;
    const count = low ? 24 : window.innerWidth < 640 ? 34 : 60;
    const ps = Array.from({ length: count }, () => ({
      x: rand(),
      y: rand(),
      r: 0.6 + rand() * 1.8,
      s: 0.00025 + rand() * 0.0009,
      a: 0.15 + rand() * 0.6,
      tw: rand() * Math.PI * 2,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (!reduced) {
          p.y -= p.s;
          if (p.y < -0.02) {
            p.y = 1.02;
            p.x = rand();
          }
        }
        const dx = p.x - 0.5;
        const dy = p.y - 0.5;
        const fade = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.6);
        const twinkle = reduced ? 1 : 0.65 + 0.35 * Math.sin(t / 900 + p.tw);
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 155, ${(p.a * fade * twinkle).toFixed(3)})`;
        ctx.fill();
      }
    };

    resize();
    let raf = 0;
    let visible = true;
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (reduced) draw(0);
      else if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(0);
    });
    ro.observe(canvas);
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [canvasRef, reduced]);
}

function useParallax(stageRef: RefObject<HTMLDivElement | null>, rigRef: RefObject<HTMLDivElement | null>, reduced: boolean) {
  useEffect(() => {
    const rig = rigRef.current;
    const stage = stageRef.current;
    if (!rig || !stage || reduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      rig.style.setProperty('--rx', `${cy.toFixed(2)}deg`);
      rig.style.setProperty('--ry', `${cx.toFixed(2)}deg`);
      stage.style.setProperty('--px', `${(cx * 1.4).toFixed(2)}px`);
      stage.style.setProperty('--py', `${(-cy * 1.4).toFixed(2)}px`);
      if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      tx = nx * 22;
      ty = -ny * 16;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [stageRef, rigRef, reduced]);
}

const BOLTS = Array.from({ length: 12 }, (_, i) => i * 30);
const SPOKES = [0, 120, 240];

export default function Vault3D({ reduced = false }: { reduced?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  useParticles(canvasRef, reduced);
  useParallax(stageRef, rigRef, reduced);

  return (
    <div ref={stageRef} className="vault-stage" aria-hidden="true" data-testid="vault-3d">
      <div className="vault-halo" />
      <canvas ref={canvasRef} className="vault-particles" />
      <div ref={rigRef} className="vault-rig">
        <div className="vault-enter">
          <div className="vault-float">
            <div className="vault-spin">
              <div className="vault-floor" />
              <div className="vault-ring r3" />
              <div className="vault-ring r1">
                <span className="sat" />
              </div>
              <div className="vault-ring r2" />

              <div className="vault-face back" />
              <div className="vault-face left" />
              <div className="vault-face right" />
              <div className="vault-face top" />
              <div className="vault-face bottom" />
              <div className="vault-face front" />
              <span className="vault-led" />
              <div className="vault-layer door-rim" />
              <div className="vault-layer door-bolts">
                {BOLTS.map((a) => (
                  <span key={a} style={{ ['--a' as string]: `${a}deg` }} />
                ))}
              </div>
              <div className="vault-layer door-dial" />
              <div className="vault-layer door-handle">
                {SPOKES.map((a) => (
                  <i key={a} style={{ ['--a' as string]: `${a}deg` }} />
                ))}
              </div>
              <div className="vault-layer door-hub" />
            </div>
          </div>

          {/* Floating security elements at different depths */}
          <div className="vault-chip" style={{ ['--d' as string]: '0s' }}>
            <div className="glass hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink sm:flex" style={{ ['--x' as string]: '-0.95', ['--y' as string]: '-0.6', ['--z' as string]: '90px' }}>
              <IconLock size={14} className="text-primary" />
              Local only
            </div>
          </div>
          <div className="vault-chip" style={{ ['--d' as string]: '-2s' }}>
            <div
              className="glass hidden items-center gap-2 rounded-xl px-3 py-2 font-mono text-[0.7rem] text-primary sm:flex"
              style={{ ['--x' as string]: '0.62', ['--y' as string]: '0.64', ['--z' as string]: '120px' }}
            >
              crypto.getRandomValues()
            </div>
          </div>
          <div className="vault-chip" style={{ ['--d' as string]: '-4s' }}>
            <div className="glass grid h-11 w-11 place-items-center rounded-xl text-primary" style={{ ['--x' as string]: '0.8', ['--y' as string]: '-0.5', ['--z' as string]: '60px' }}>
              <IconShield size={20} />
            </div>
          </div>
          <div className="vault-chip" style={{ ['--d' as string]: '-3s' }}>
            <div className="glass grid h-10 w-10 place-items-center rounded-xl text-primary" style={{ ['--x' as string]: '-0.72', ['--y' as string]: '0.42', ['--z' as string]: '40px' }}>
              <IconKey size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
