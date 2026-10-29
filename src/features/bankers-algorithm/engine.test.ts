import { describe, expect, it } from 'vitest'
import { classicBanker, requestResources, safetyCheck } from './engine'

describe('Banker algorithm', () => {
  it('calculates the classic need matrix and safe sequence', () => {
    const result = safetyCheck(classicBanker)
    expect(result.need[0]).toEqual([7, 4, 3])
    expect(result.safe).toBe(true)
    expect(result.sequence).toEqual([1, 3, 0, 2, 4])
  })
  it('grants a safe resource request', () => {
    const result = requestResources(classicBanker, 1, [1, 0, 2])
    expect(result.granted).toBe(true)
    expect(result.state.available).toEqual([2, 3, 0])
  })
  it('rejects requests beyond need without changing state', () => {
    const result = requestResources(classicBanker, 0, [8, 0, 0])
    expect(result.granted).toBe(false)
    expect(result.state).toBe(classicBanker)
  })
  it('rolls back a request that makes the state unsafe', () => {
    const state = {
      available: [1],
      allocation: [[1], [1]],
      maximum: [[3], [2]],
    }
    const result = requestResources(state, 0, [1])
    expect(result.granted).toBe(false)
    expect(result.state).toBe(state)
  })
})
