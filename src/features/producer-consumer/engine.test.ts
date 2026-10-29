import { describe, expect, it } from 'vitest'
import { consume, createBuffer, produce } from './engine'

describe('producer-consumer buffer', () => {
  it('does not consume from an empty buffer', () => {
    expect(() => consume(createBuffer(2))).toThrow(/empty/)
  })
  it('does not produce into a full buffer', () => {
    const full = produce(produce(createBuffer(2), 'a'), 'b')
    expect(() => produce(full, 'c')).toThrow(/full/)
  })
  it('keeps semaphore counters consistent through produce and consume', () => {
    const full = produce(createBuffer(2), 'item-1')
    expect([full.empty, full.full, full.items.length]).toEqual([1, 1, 1])
    expect(consume(full)).toMatchObject({ item: 'item-1', state: { empty: 2, full: 0, items: [] } })
  })
})
