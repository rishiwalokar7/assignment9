import { describe, expect, it } from 'vitest'
import { allocate, coalesce, deallocate, translateAddress, type MemoryBlock } from './engine'

describe('memory management', () => {
  const blocks: MemoryBlock[] = [
    { id: 'a', size: 40, process: null },
    { id: 'b', size: 100, process: null },
    { id: 'c', size: 60, process: null },
  ]
  it('selects the correct free block for each fit policy', () => {
    expect(allocate(blocks, 'P1', 35, 'First Fit').selected).toBe(0)
    expect(allocate(blocks, 'P1', 35, 'Best Fit').selected).toBe(0)
    expect(allocate(blocks, 'P1', 50, 'Worst Fit').selected).toBe(1)
  })
  it('deallocates and merges adjacent free blocks', () => {
    const split = allocate(blocks, 'P1', 20, 'First Fit').blocks
    const restored = deallocate(split, 'P1')
    expect(restored).toHaveLength(1)
    expect(restored[0]).toMatchObject({ size: 200, process: null })
    expect(coalesce([{ id: 'x', size: 2, process: null }, { id: 'y', size: 3, process: null }])).toHaveLength(1)
  })
  it('translates logical addresses and rejects unmapped pages', () => {
    expect(translateAddress(19, 8, [2, 5, 7])).toEqual({ page: 2, offset: 3, frame: 7, physical: 59 })
    expect(() => translateAddress(24, 8, [2, 5, 7])).toThrow(/not mapped/)
  })
})
