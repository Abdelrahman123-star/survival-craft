import { Random } from "../../utils/Random"

/**
 * A simple Simplex Noise implementation for 2D terrain generation.
 * Ported from various open-source implementations for lightweight use.
 */
export class NoiseGenerator {
    private p: Uint8Array
    private perm: Uint8Array
    private permMod12: Uint8Array

    constructor(seed: string | number) {
        const rand = new Random(seed)
        this.p = new Uint8Array(256)
        for (let i = 0; i < 256; i++) {
            this.p[i] = i
        }
        for (let i = 255; i > 0; i--) {
            const r = rand.nextInt(0, i + 1)
            const tmp = this.p[i]
            this.p[i] = this.p[r]
            this.p[r] = tmp
        }

        this.perm = new Uint8Array(512)
        this.permMod12 = new Uint8Array(512)
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255]
            this.permMod12[i] = this.perm[i] % 12
        }
    }

    private static G2 = (3.0 - Math.sqrt(3.0)) / 6.0
    private static grad3 = new Float32Array([
        1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
        1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
        0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
    ])

    public noise2D(xin: number, yin: number): number {
        let n0, n1, n2
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
        const s = (xin + yin) * F2
        const i = Math.floor(xin + s)
        const j = Math.floor(yin + s)
        const G2 = NoiseGenerator.G2
        const t = (i + j) * G2
        const X0 = i - t
        const Y0 = j - t
        const x0 = xin - X0
        const y0 = yin - Y0

        let i1, j1
        if (x0 > y0) {
            i1 = 1; j1 = 0
        } else {
            i1 = 0; j1 = 1
        }

        const x1 = x0 - i1 + G2
        const y1 = y0 - j1 + G2
        const x2 = x0 - 1.0 + 2.0 * G2
        const y2 = y0 - 1.0 + 2.0 * G2

        const ii = i & 255
        const jj = j & 255

        let t0 = 0.5 - x0 * x0 - y0 * y0
        if (t0 < 0) n0 = 0.0
        else {
            t0 *= t0
            const gi0 = this.permMod12[ii + this.perm[jj]] * 3
            n0 = t0 * t0 * (NoiseGenerator.grad3[gi0] * x0 + NoiseGenerator.grad3[gi0 + 1] * y0)
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1
        if (t1 < 0) n1 = 0.0
        else {
            t1 *= t1
            const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3
            n1 = t1 * t1 * (NoiseGenerator.grad3[gi1] * x1 + NoiseGenerator.grad3[gi1 + 1] * y1)
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2
        if (t2 < 0) n2 = 0.0
        else {
            t2 *= t2
            const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3
            n2 = t2 * t2 * (NoiseGenerator.grad3[gi2] * x2 + NoiseGenerator.grad3[gi2 + 1] * y2)
        }

        return 70.0 * (n0 + n1 + n2)
    }

    /** Returns noise normalized to [0, 1] */
    public getNormalized(x: number, y: number, scale: number = 1.0): number {
        return (this.noise2D(x * scale, y * scale) + 1) / 2
    }

    /** Fractal Brownian Motion (octaves) */
    public fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5, scale: number = 1.0): number {
        let total = 0
        let frequency = scale
        let amplitude = 1
        let maxValue = 0
        for (let i = 0; i < octaves; i++) {
            total += this.getNormalized(x, y, frequency) * amplitude
            maxValue += amplitude
            amplitude *= persistence
            frequency *= 2
        }
        return total / maxValue
    }
}
