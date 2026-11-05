import { describe, expect, it } from 'vitest'
import { randomUUID } from './uuid'

const V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('randomUUID', () => {
  it('menghasilkan UUID v4 yang valid', () => {
    expect(V4_RE.test(randomUUID())).toBe(true)
  })

  it('menghasilkan nilai unik untuk tiap pemanggilan', () => {
    const values = new Set(Array.from({ length: 200 }, () => randomUUID()))
    expect(values.size).toBe(200)
  })
})
