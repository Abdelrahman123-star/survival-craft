/**
 * A seedable Pseudo-Random Number Generator (PRNG) using the Alea algorithm.
 * This ensures that for the same seed, we always get the same sequence of numbers.
 */
export class Random {
    private s0: number = 0
    private s1: number = 0
    private s2: number = 0
    private c: number = 1

    constructor(seed: string | number = Math.random()) {
        const seedStr = seed.toString()
        let masch = this.mash()
        this.s0 = masch(" ")
        this.s1 = masch(" ")
        this.s2 = masch(" ")

        this.s0 -= masch(seedStr)
        if (this.s0 < 0) this.s0 += 1
        this.s1 -= masch(seedStr)
        if (this.s1 < 0) this.s1 += 1
        this.s2 -= masch(seedStr)
        if (this.s2 < 0) this.s2 += 1
    }

    private mash() {
        let n = 0xefc8249d
        return (data: string) => {
            for (let i = 0; i < data.length; i++) {
                n += data.charCodeAt(i)
                let h = 0.02519603282416938 * n
                n = h >>> 0
                h -= n
                h *= n
                n = h >>> 0
                h -= n
                n += h * 0x100000000 // 2^32
            }
            return (n >>> 0) * 2.3283064365386963e-10 // 2^-32
        }
    }

    /** Returns a random float between 0 and 1 */
    public next(): number {
        const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10 // 2^-32
        this.s0 = this.s1
        this.s1 = this.s2
        this.c = t | 0
        this.s2 = t - this.c
        return this.s2
    }

    /** Returns a random integer between min (inclusive) and max (exclusive) */
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min) + min)
    }

    /** Returns a random float between min and max */
    public nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min
    }
}
