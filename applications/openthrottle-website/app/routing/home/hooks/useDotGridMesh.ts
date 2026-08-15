import * as React from 'react';
import { LANDING_DOT_MESH } from '~/routing/home/data/data.landing';

/**
 * Interactive hero dot-mesh — the CSP-safe, canvas-based replacement for the
 * landing hero's old static drifting-grid backdrop.
 *
 * Attach the returned ref to a `<canvas>` sized to fill the hero. A lattice of
 * dots is pinned at grid intersections and wired to their right/down
 * neighbours; the pointer repels nearby dots (warping the lattice + lighting it
 * up) and they spring back home with damping. A faint idle wobble keeps it
 * breathing at rest.
 *
 * SSR-safe (all DOM work runs client-side in an effect) and degrades
 * gracefully: `prefers-reduced-motion: reduce` renders a single static frame
 * with no pointer reaction, and the animation pauses while the hero is
 * scrolled out of view.
 */
interface MeshPoint {
  /** Home (base) grid position, before idle wobble. */
  baseX: number;
  baseY: number;
  /** 0..1 pointer proximity, recomputed each frame (drives glow). */
  glow: number;
  /** Deterministic phase offsets for the idle wobble. */
  phaseX: number;
  phaseY: number;
  /** Velocity. */
  vx: number;
  vy: number;
  /** Current live position. */
  x: number;
  y: number;
}

const REVEAL_MS = 900;
const TWO_PI = Math.PI * 2;

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

export const useDotGridMesh = <T extends HTMLCanvasElement = HTMLCanvasElement>(
  enabled = true,
): React.RefObject<T | null> => {
  const canvasRef = React.useRef<T>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !enabled) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const ctx = context;
    const {
      color,
      damping,
      dotAlpha,
      dotGlow,
      dotRadius,
      idleAmplitude,
      lineAlpha,
      lineGlow,
      maxDisplace,
      repelForce,
      repelRadius,
      spacing,
      spring,
    } = LANDING_DOT_MESH;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let points: MeshPoint[] = [];
    // Neighbour connections as flat index pairs [a, b, a, b, …].
    let links: number[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Pointer state (canvas-local coordinates).
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;

    let frame = 0;
    let running = false;
    let startTime = 0;
    const maxDisplaceSq = maxDisplace * maxDisplace;
    const repelRadiusSq = repelRadius * repelRadius;

    const build = (): void => {
      const rect = canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;

      if (width < 2 || height < 2) {
        return;
      }

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      points = [];

      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const baseX = i * spacing;
          const baseY = j * spacing;

          points.push({
            baseX,
            baseY,
            glow: 0,
            phaseX: (i * 0.7 + j * 1.3) % TWO_PI,
            phaseY: (i * 1.1 + j * 0.5) % TWO_PI,
            vx: 0,
            vy: 0,
            x: baseX,
            y: baseY,
          });
        }
      }

      links = [];

      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const index = j * cols + i;

          if (i < cols - 1) {
            links.push(index, index + 1);
          }

          if (j < rows - 1) {
            links.push(index, index + cols);
          }
        }
      }
    };

    const draw = (reveal: number): void => {
      ctx.clearRect(0, 0, width, height);

      if (!points.length) {
        return;
      }

      // Lines first, so dots sit on top.
      ctx.lineWidth = 1;

      for (let k = 0; k < links.length; k += 2) {
        const a = points[links[k]];
        const b = points[links[k + 1]];
        const glow = (a.glow + b.glow) * 0.5;
        const alpha = (lineAlpha + glow * lineGlow) * reveal;

        if (alpha <= 0.002) {
          continue;
        }

        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const point of points) {
        const alpha = (dotAlpha + point.glow * dotGlow) * reveal;

        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, dotRadius + point.glow * 0.9, 0, TWO_PI);
        ctx.fill();
      }
    };

    const step = (elapsed: number): boolean => {
      let moving = false;

      for (const point of points) {
        // Idle wobble target keeps the resting lattice subtly alive.
        const homeX =
          point.baseX +
          Math.sin(elapsed * 0.0006 + point.phaseX) * idleAmplitude;
        const homeY =
          point.baseY +
          Math.cos(elapsed * 0.0005 + point.phaseY) * idleAmplitude;

        let ax = (homeX - point.x) * spring;
        let ay = (homeY - point.y) * spring;

        let glow = 0;

        if (pointerActive) {
          const dx = point.x - pointerX;
          const dy = point.y - pointerY;
          const distSq = dx * dx + dy * dy;

          if (distSq < repelRadiusSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const falloff = 1 - dist / repelRadius;

            glow = falloff;
            const force = falloff * repelForce;

            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        point.glow = glow;
        point.vx = (point.vx + ax) * damping;
        point.vy = (point.vy + ay) * damping;
        point.x += point.vx;
        point.y += point.vy;

        // Clamp how far a dot may stray from its home intersection.
        const sx = point.x - point.baseX;
        const sy = point.y - point.baseY;
        const straySq = sx * sx + sy * sy;

        if (straySq > maxDisplaceSq) {
          const scale = maxDisplace / Math.sqrt(straySq);

          point.x = point.baseX + sx * scale;
          point.y = point.baseY + sy * scale;
          point.vx *= 0.5;
          point.vy *= 0.5;
        }

        if (
          !moving &&
          (Math.abs(point.vx) > 0.02 ||
            Math.abs(point.vy) > 0.02 ||
            point.glow > 0.01)
        ) {
          moving = true;
        }
      }

      return moving;
    };

    const renderStatic = (): void => {
      for (const point of points) {
        point.x = point.baseX;
        point.y = point.baseY;
        point.glow = 0;
      }

      draw(1);
    };

    const loop = (now: number): void => {
      if (!startTime) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const reveal = smoothstep(Math.min(1, elapsed / REVEAL_MS));

      step(elapsed);
      draw(reveal);

      // Keep animating: the idle wobble never fully settles, so we run while
      // visible and rely on the IntersectionObserver to park us when off-screen.
      frame = requestAnimationFrame(loop);
    };

    const start = (): void => {
      if (running || prefersReducedMotion) {
        return;
      }

      running = true;
      startTime = 0;
      frame = requestAnimationFrame(loop);
    };

    const stop = (): void => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      pointerX = x;
      pointerY = y;
      pointerActive =
        x > -repelRadius &&
        x < width + repelRadius &&
        y > -repelRadius &&
        y < height + repelRadius;
    };

    const onPointerLeave = (): void => {
      pointerActive = false;
    };

    build();

    if (prefersReducedMotion) {
      renderStatic();

      return;
    }

    // Draw an immediate first frame so there's no flash before rAF kicks in.
    draw(0);

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            build();
          })
        : null;

    resizeObserver?.observe(canvas);

    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  start();
                } else {
                  stop();
                }
              }
            },
            { threshold: 0 },
          )
        : null;

    if (intersectionObserver) {
      intersectionObserver.observe(canvas);
    } else {
      start();
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [enabled]);

  return canvasRef;
};
