import { beforeEach, describe, expect, it } from 'vitest'
import { useRailcoreStore } from './useRailcoreStore'

const booking = {
  id: 'booking-1',
  pnr: 'RC-TEST-1',
  passenger: 'Asha Patel',
  train: 'RC 2041 · Coastal Meridian',
  date: '2026-11-02',
  className: 'Chair Car',
  fare: 640,
  status: 'Confirmed' as const,
}

describe('booking inventory transactions', () => {
  beforeEach(() => useRailcoreStore.getState().reset())

  it('decrements inventory once and restores it on cancellation', () => {
    const store = useRailcoreStore.getState()
    store.addBooking(booking)
    expect(useRailcoreStore.getState().seats).toBe(95)
    useRailcoreStore.getState().cancelBooking(booking.pnr)
    expect(useRailcoreStore.getState().seats).toBe(96)
    expect(useRailcoreStore.getState().bookings[0].status).toBe('Cancelled')
  })

  it('rejects duplicate PNRs and duplicate cancellation without inventory drift', () => {
    const store = useRailcoreStore.getState()
    store.addBooking(booking)
    expect(() => useRailcoreStore.getState().addBooking({ ...booking, id: 'booking-2' })).toThrow(/unique/)
    useRailcoreStore.getState().cancelBooking(booking.pnr)
    expect(() => useRailcoreStore.getState().cancelBooking(booking.pnr)).toThrow(/already cancelled/)
    expect(useRailcoreStore.getState().seats).toBe(96)
  })
})
