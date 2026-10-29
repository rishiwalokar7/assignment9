export type BufferState = { capacity: number; items: string[]; empty: number; full: number; mutex: number }

export function createBuffer(capacity: number): BufferState {
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Buffer capacity must be a positive integer.')
  return { capacity, items: [], empty: capacity, full: 0, mutex: 1 }
}

export function produce(state: BufferState, item: string): BufferState {
  if (!item.trim()) throw new Error('Produced item cannot be empty.')
  if (state.empty <= 0 || state.items.length >= state.capacity) throw new Error('Buffer is full; producer must wait.')
  if (state.mutex !== 1) throw new Error('Critical section is occupied.')
  const next = { ...state, items: [...state.items, item], empty: state.empty - 1, full: state.full + 1 }
  assertBufferInvariants(next)
  return next
}

export function consume(state: BufferState): { state: BufferState; item: string } {
  if (state.full <= 0 || !state.items.length) throw new Error('Buffer is empty; consumer must wait.')
  if (state.mutex !== 1) throw new Error('Critical section is occupied.')
  const [item, ...items] = state.items
  const next = { ...state, items, empty: state.empty + 1, full: state.full - 1 }
  assertBufferInvariants(next)
  return { state: next, item }
}

export function assertBufferInvariants(state: BufferState) {
  if (state.items.length < 0 || state.items.length > state.capacity) throw new Error('Buffer occupancy invariant violated.')
  if (state.empty < 0 || state.full < 0 || state.empty + state.full !== state.capacity) throw new Error('Semaphore count invariant violated.')
  if (state.items.length !== state.full) throw new Error('Full semaphore must match occupied slots.')
}
