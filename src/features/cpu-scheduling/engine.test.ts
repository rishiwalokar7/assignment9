import { describe, expect, it } from 'vitest'
import { scheduleProcesses, type ProcessInput } from './engine'

const jobs: ProcessInput[] = [
  { id: 'A', arrival: 0, burst: 5, priority: 2 },
  { id: 'B', arrival: 1, burst: 3, priority: 1 },
]

describe('CPU scheduling', () => {
  it('runs FCFS in arrival order and computes metrics', () => {
    const result = scheduleProcesses(jobs, 'FCFS')
    expect(result.segments.map(segment => segment.id)).toEqual(['A', 'B'])
    expect(result.processes.map(process => [process.waiting, process.turnaround, process.response])).toEqual([[0, 5, 0], [4, 7, 4]])
  })
  it('selects the shortest ready job for non-preemptive SJF', () => {
    const input: ProcessInput[] = [
      { id: 'A', arrival: 0, burst: 5, priority: 2 },
      { id: 'B', arrival: 0, burst: 2, priority: 1 },
      { id: 'C', arrival: 1, burst: 1, priority: 3 },
    ]
    expect(scheduleProcesses(input, 'SJF').segments.map(segment => segment.id)).toEqual(['B', 'C', 'A'])
  })
  it('preempts a long job for SRTF', () => {
    const result = scheduleProcesses(jobs, 'SRTF')
    expect(result.segments.map(segment => [segment.id, segment.start, segment.end])).toEqual([['A', 0, 1], ['B', 1, 4], ['A', 4, 8]])
  })
  it('rotates ready processes using the configured quantum', () => {
    const result = scheduleProcesses(jobs, 'Round Robin', 2)
    expect(result.segments.map(segment => [segment.id, segment.start, segment.end])).toEqual([
      ['A', 0, 2], ['B', 2, 4], ['A', 4, 6], ['B', 6, 7], ['A', 7, 8],
    ])
  })
  it('supports preemptive priority scheduling', () => {
    const result = scheduleProcesses(jobs, 'Priority', 2, true)
    expect(result.segments.map(segment => segment.id)).toEqual(['A', 'B', 'A'])
  })
  it('runs non-preemptive priority jobs to completion', () => {
    const result = scheduleProcesses(jobs, 'Priority', 2, false)
    expect(result.segments.map(segment => segment.id)).toEqual(['A', 'B'])
  })
  it('accounts for idle periods', () => {
    const result = scheduleProcesses([{ id: 'I', arrival: 3, burst: 2, priority: 1 }], 'FCFS')
    expect(result.segments.map(segment => segment.id)).toEqual(['IDLE', 'I'])
    expect(result.utilization).toBe(40)
  })
})
