import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createBuffer, type BufferState } from '../features/producer-consumer/engine'
import { initialMemory, type MemoryBlock } from '../features/memory-management/engine'
import { sampleProcesses, type Algorithm, type ProcessInput } from '../features/cpu-scheduling/engine'

export type RailEvent = { id: number; time: number; type: string; detail: string }
export type Booking = { id: string; pnr: string; passenger: string; train: string; date: string; className: string; fare: number; status: 'Confirmed' | 'Cancelled' }
type Store = {
  clock: number
  running: boolean
  events: RailEvent[]
  bookings: Booking[]
  seats: number
  buffer: BufferState
  memory: MemoryBlock[]
  cpuProcesses: ProcessInput[]
  cpuAlgorithm: Algorithm
  cpuQuantum: number
  tick: () => void
  setRunning: (running: boolean) => void
  log: (type: string, detail: string) => void
  addBooking: (booking: Booking) => void
  cancelBooking: (pnr: string) => void
  clearEvents: () => void
  setBuffer: (buffer: BufferState) => void
  setMemory: (memory: MemoryBlock[]) => void
  setCpuProcesses: (processes: ProcessInput[]) => void
  setCpuSettings: (algorithm: Algorithm, quantum: number) => void
  reset: () => void
}

const initialState = {
  clock: 0, running: false, events: [] as RailEvent[], bookings: [] as Booking[], seats: 96,
  buffer: createBuffer(5), memory: initialMemory, cpuProcesses: sampleProcesses,
  cpuAlgorithm: 'Round Robin' as Algorithm, cpuQuantum: 2,
}

function isBooking(value: unknown): value is Booking {
  if (!value || typeof value !== 'object') return false
  const booking = value as Partial<Booking>
  return typeof booking.id === 'string' && typeof booking.pnr === 'string' &&
    typeof booking.passenger === 'string' && typeof booking.train === 'string' &&
    typeof booking.date === 'string' && typeof booking.className === 'string' &&
    typeof booking.fare === 'number' && Number.isFinite(booking.fare) && booking.fare >= 0 &&
    (booking.status === 'Confirmed' || booking.status === 'Cancelled')
}

function isEvent(value: unknown): value is RailEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<RailEvent>
  return typeof event.id === 'number' && Number.isFinite(event.id) &&
    typeof event.time === 'number' && Number.isFinite(event.time) && event.time >= 0 &&
    typeof event.type === 'string' && typeof event.detail === 'string'
}

function validBuffer(value: unknown): value is BufferState {
  if (!value || typeof value !== 'object') return false
  const buffer = value as Partial<BufferState>
  return Number.isInteger(buffer.capacity) && Number(buffer.capacity) > 0 &&
    Array.isArray(buffer.items) && buffer.items.every(item => typeof item === 'string') &&
    Number.isInteger(buffer.empty) && Number.isInteger(buffer.full) &&
    buffer.empty! >= 0 && buffer.full! >= 0 && buffer.empty! + buffer.full! === buffer.capacity &&
    buffer.items.length === buffer.full && (buffer.mutex === 0 || buffer.mutex === 1)
}

function validMemory(value: unknown): value is MemoryBlock[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return false
    const block = entry as Partial<MemoryBlock>
    return typeof block.id === 'string' && Number.isInteger(block.size) &&
      Number(block.size) > 0 && (block.process === null || typeof block.process === 'string')
  })
}

function validProcesses(value: unknown): value is ProcessInput[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  return value.every((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return false
    const process = entry as Partial<ProcessInput>
    if (typeof process.id !== 'string' || !process.id.trim() || ids.has(process.id) ||
        !Number.isInteger(process.arrival) || Number(process.arrival) < 0 ||
        !Number.isInteger(process.burst) || Number(process.burst) <= 0 ||
        !Number.isInteger(process.priority)) return false
    ids.add(process.id)
    return true
  })
}

export const useRailcoreStore = create<Store>()(persist((set, get) => ({
  ...initialState,
  tick: () => set(state => ({ clock: state.clock + 1 })),
  setRunning: running => set({ running }),
  log: (type, detail) => set(state => ({
    events: [{ id: Math.max(Date.now(), ...state.events.map(event => event.id + 1)), time: state.clock, type, detail }, ...state.events].slice(0, 100),
  })),
  addBooking: booking => {
    const state = get()
    if (state.seats <= 0) throw new Error('No seats remain in the simulated inventory.')
    if (state.bookings.some(item => item.id === booking.id || item.pnr === booking.pnr)) throw new Error('Booking ID and PNR must be unique.')
    if (booking.status !== 'Confirmed' || !booking.passenger.trim()) throw new Error('A confirmed booking needs a passenger name.')
    set(current => ({ bookings: [booking, ...current.bookings], seats: current.seats - 1 }))
    get().log('Booking confirmed', `PNR ${booking.pnr} for ${booking.passenger}`)
  },
  cancelBooking: pnr => {
    const booking = get().bookings.find(item => item.pnr === pnr && item.status === 'Confirmed')
    if (!booking) throw new Error('Ticket is not active or was already cancelled.')
    set(state => ({
      bookings: state.bookings.map(item => item.pnr === pnr ? { ...item, status: 'Cancelled' } : item),
      seats: state.seats + 1,
    }))
    get().log('Booking cancelled', `PNR ${pnr}; one seat returned`)
  },
  clearEvents: () => set({ events: [] }),
  setBuffer: buffer => set({ buffer }),
  setMemory: memory => set({ memory }),
  setCpuProcesses: cpuProcesses => set({ cpuProcesses }),
  setCpuSettings: (cpuAlgorithm, cpuQuantum) => set({ cpuAlgorithm, cpuQuantum }),
  reset: () => set(initialState),
}), { name: 'railcore-os-state', partialize: state => ({
  clock: state.clock, events: state.events, bookings: state.bookings, seats: state.seats,
  buffer: state.buffer, memory: state.memory,
  cpuProcesses: state.cpuProcesses, cpuAlgorithm: state.cpuAlgorithm, cpuQuantum: state.cpuQuantum,
}), merge: (persisted, current) => {
  if (!persisted || typeof persisted !== 'object') return current
  const saved = persisted as Partial<Store>
  const bookings = Array.isArray(saved.bookings) ? saved.bookings.filter(isBooking) : current.bookings
  const confirmed = bookings.filter(booking => booking.status === 'Confirmed').length
  const events = Array.isArray(saved.events) ? saved.events.filter(isEvent).slice(0, 100) : current.events
  return {
    ...current,
    clock: Number.isInteger(saved.clock) && Number(saved.clock) >= 0 ? Number(saved.clock) : current.clock,
    events,
    bookings,
    seats: confirmed <= current.seats ? current.seats - confirmed : current.seats,
    buffer: validBuffer(saved.buffer) ? saved.buffer : current.buffer,
    memory: validMemory(saved.memory) ? saved.memory : current.memory,
    cpuProcesses: validProcesses(saved.cpuProcesses) ? saved.cpuProcesses : current.cpuProcesses,
    cpuAlgorithm: ['FCFS', 'SJF', 'SRTF', 'Round Robin', 'Priority'].includes(String(saved.cpuAlgorithm))
      ? saved.cpuAlgorithm as Algorithm : current.cpuAlgorithm,
    cpuQuantum: Number.isInteger(saved.cpuQuantum) && Number(saved.cpuQuantum) > 0
      ? Number(saved.cpuQuantum) : current.cpuQuantum,
  }
} }))
