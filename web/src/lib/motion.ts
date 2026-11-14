export interface MotionSample {
  time: number;
  x: number;
  y: number;
}

export interface SpringOptions {
  velocity?: number;
  damping?: number;
  response?: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

const reducedMotionQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

export function prefersReducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false;
}

/** Apple's exponential-decay momentum projection (§6 of the design notes). */
export function project(
  initialVelocity: number,
  decelerationRate = 0.998,
): number {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55,
): number {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

/**
 * A damped spring in Apple's damping-ratio / response terms. It can be
 * cancelled at any time; callers keep their value in a signal, so the next
 * gesture starts from the live presentation value.
 */
export function spring(
  from: number,
  to: number,
  options: SpringOptions,
): () => void {
  if (prefersReducedMotion()) {
    options.onUpdate(to);
    options.onComplete?.();
    return () => {};
  }

  const damping = options.damping ?? 1;
  const response = Math.max(0.05, options.response ?? 0.4);
  const omega = (2 * Math.PI) / response;
  let value = from;
  let velocity = options.velocity ?? 0;
  let frame = 0;
  let cancelled = false;
  let last = performance.now();

  const tick = (now: number) => {
    if (cancelled) return;
    const elapsed = Math.min(Math.max((now - last) / 1000, 0), 1 / 30);
    last = now;
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 240)));
    const step = elapsed / steps;
    for (let index = 0; index < steps; index += 1) {
      const acceleration =
        -omega * omega * (value - to) - 2 * damping * omega * velocity;
      velocity += acceleration * step;
      value += velocity * step;
    }

    if (Math.abs(value - to) < 0.5 && Math.abs(velocity) < 12) {
      options.onUpdate(to);
      options.onComplete?.();
      return;
    }
    options.onUpdate(value);
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

export function velocityOf(samples: MotionSample[], axis: "x" | "y"): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsed = last.time - first.time;
  if (elapsed <= 0) return 0;
  return ((last[axis] - first[axis]) / elapsed) * 1000;
}

export function pushSample(
  samples: MotionSample[],
  sample: MotionSample,
  windowMs = 120,
): void {
  samples.push(sample);
  const cutoff = sample.time - windowMs;
  while (samples.length > 2 && samples[0].time < cutoff) samples.shift();
}
