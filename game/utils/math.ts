export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}