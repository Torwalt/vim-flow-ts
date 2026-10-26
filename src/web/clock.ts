/**
 * Converts monotonic frame timestamps into whole integer milliseconds without
 * losing the fractional remainder between frames.
 */
export class ElapsedClock {
  private previous: number | null;
  private carry = 0;

  constructor(start: number | null = null) {
    this.previous = start;
  }

  consume(now: number): number {
    if (!Number.isFinite(now)) return 0;
    if (this.previous === null) {
      this.previous = now;
      return 0;
    }
    const delta = Math.max(0, now - this.previous);
    this.previous = now;
    this.carry += delta;
    const whole = Math.floor(this.carry);
    this.carry -= whole;
    return whole;
  }

  reset(start: number | null = null): void {
    this.previous = start;
    this.carry = 0;
  }
}
