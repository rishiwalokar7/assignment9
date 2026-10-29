export type MemoryBlock = { id: string; size: number; process: string | null }
export type Fit = 'First Fit' | 'Best Fit' | 'Worst Fit'
export type AllocationResult = { blocks: MemoryBlock[]; selected: number; message: string }

export function allocate(blocks: MemoryBlock[], process: string, size: number, fit: Fit): AllocationResult {
  if (!process.trim()) throw new Error('Enter a process ID.')
  if (!Number.isInteger(size) || size <= 0) throw new Error('Memory size must be a positive integer.')
  if (blocks.some(block => block.process === process)) throw new Error('That process already has an allocation.')
  const free = blocks.map((block, index) => ({ block, index })).filter(entry => entry.block.process === null && entry.block.size >= size)
  if (!free.length) throw new Error(`No contiguous free block can fit ${size} units. Total free space may be fragmented.`)
  const choice = fit === 'First Fit' ? free[0]
    : fit === 'Best Fit' ? [...free].sort((a, b) => a.block.size - b.block.size || a.index - b.index)[0]
      : [...free].sort((a, b) => b.block.size - a.block.size || a.index - b.index)[0]
  const selected = choice.index
  const block = blocks[selected]
  const updated = [...blocks]
  updated.splice(selected, 1, { ...block, id: `${block.id}-used-${process}`, size, process },
    ...(block.size > size ? [{ id: `${block.id}-free-${process}`, size: block.size - size, process: null }] : []))
  return { blocks: updated, selected, message: `${fit} selected free block ${block.id} (${block.size} units).` }
}

export function deallocate(blocks: MemoryBlock[], process: string): MemoryBlock[] {
  if (!blocks.some(block => block.process === process)) throw new Error(`No allocated block found for ${process}.`)
  return coalesce(blocks.map(block => block.process === process ? { ...block, process: null, id: `free-${block.id}` } : block))
}

export function coalesce(blocks: MemoryBlock[]): MemoryBlock[] {
  return blocks.reduce<MemoryBlock[]>((result, block) => {
    const previous = result.at(-1)
    if (previous && previous.process === null && block.process === null) {
      previous.size += block.size
      previous.id = 'free-merged'
    } else result.push({ ...block })
    return result
  }, [])
}

export function compact(blocks: MemoryBlock[]): MemoryBlock[] {
  const allocated = blocks.filter(block => block.process !== null).map(block => ({ ...block }))
  const free = blocks.filter(block => block.process === null).reduce((sum, block) => sum + block.size, 0)
  return free ? [...allocated, { id: 'free-compacted', size: free, process: null }] : allocated
}

export function memoryStats(blocks: MemoryBlock[]) {
  const free = blocks.filter(block => block.process === null).map(block => block.size)
  const allocated = blocks.filter(block => block.process !== null).reduce((sum, block) => sum + block.size, 0)
  const totalFree = free.reduce((sum, size) => sum + size, 0)
  return {
    totalFree, largestFree: Math.max(0, ...free), holes: free.length, allocated, internalFragmentation: 0,
    externalFragmentation: totalFree ? (totalFree - Math.max(...free)) / totalFree * 100 : 0,
  }
}

export function translateAddress(logical: number, pageSize: number, frames: number[]) {
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('Page size must be a positive integer.')
  if (!Number.isInteger(logical) || logical < 0) throw new Error('Logical address must be a non-negative integer.')
  const page = Math.floor(logical / pageSize)
  const offset = logical % pageSize
  const frame = frames[page]
  if (frame === undefined || !Number.isInteger(frame) || frame < 0) throw new Error(`Page ${page} is not mapped in the page table.`)
  return { page, offset, frame, physical: frame * pageSize + offset }
}

export const initialMemory: MemoryBlock[] = [
  { id: 'block-a', size: 100, process: null },
  { id: 'block-b', size: 200, process: null },
  { id: 'block-c', size: 150, process: null },
  { id: 'block-d', size: 300, process: null },
]
