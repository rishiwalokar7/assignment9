export type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'Round Robin' | 'Priority'
export type ProcessInput = { id: string; arrival: number; burst: number; priority: number }
export type ProcessMetrics = ProcessInput & {
  firstStart: number
  completion: number
  waiting: number
  turnaround: number
  response: number
}
export type Segment = { id: string; start: number; end: number }
export type ScheduleResult = {
  algorithm: Algorithm
  segments: Segment[]
  processes: ProcessMetrics[]
  averageWaiting: number
  averageTurnaround: number
  averageResponse: number
  utilization: number
  throughput: number
  elapsed: number
  contextSwitches: number
}

function validate(processes: ProcessInput[]) {
  const ids = new Set<string>()
  for (const process of processes) {
    if (!process.id.trim() || ids.has(process.id)) throw new Error('Process IDs must be non-empty and unique.')
    if (!Number.isInteger(process.arrival) || process.arrival < 0) throw new Error('Arrival times must be non-negative integers.')
    if (!Number.isInteger(process.burst) || process.burst <= 0) throw new Error('Burst times must be positive integers.')
    if (!Number.isInteger(process.priority)) throw new Error('Priority must be an integer.')
    ids.add(process.id)
  }
}

function append(segments: Segment[], id: string, start: number) {
  const last = segments.at(-1)
  if (last?.id === id && last.end === start) last.end += 1
  else segments.push({ id, start, end: start + 1 })
}

export function scheduleProcesses(
  input: ProcessInput[],
  algorithm: Algorithm,
  quantum = 2,
  preemptivePriority = false,
): ScheduleResult {
  validate(input)
  if (algorithm === 'Round Robin' && (!Number.isInteger(quantum) || quantum < 1)) {
    throw new Error('Time quantum must be a positive integer.')
  }
  const jobs = input.map((job, order) => ({ ...job, remaining: job.burst, firstStart: -1, completion: -1, order }))
  const segments: Segment[] = []
  let time = 0
  let rrQueue: typeof jobs = []
  let rrAdded = new Set<string>()

  const addArrivals = () => {
    for (const job of jobs) {
      if (job.arrival <= time && job.remaining > 0 && !rrAdded.has(job.id)) {
        rrQueue.push(job)
        rrAdded.add(job.id)
      }
    }
  }

  if (algorithm === 'FCFS' || algorithm === 'SJF') {
    const pending = [...jobs].sort((a, b) => a.arrival - b.arrival || a.order - b.order)
    while (pending.some(job => job.remaining > 0)) {
      const ready = pending.filter(job => job.remaining > 0 && job.arrival <= time)
      if (!ready.length) {
        const next = pending.find(job => job.remaining > 0)!
        while (time < next.arrival) append(segments, 'IDLE', time++)
        continue
      }
      const current = algorithm === 'FCFS'
        ? ready[0]
        : [...ready].sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.order - b.order)[0]
      if (current.firstStart < 0) current.firstStart = time
      while (current.remaining > 0) {
        append(segments, current.id, time++)
        current.remaining -= 1
      }
      current.completion = time
    }
  } else if (algorithm === 'Round Robin') {
    while (jobs.some(job => job.remaining > 0)) {
      addArrivals()
      if (!rrQueue.length) {
        const next = jobs.filter(job => job.remaining > 0).sort((a, b) => a.arrival - b.arrival || a.order - b.order)[0]
        while (time < next.arrival) append(segments, 'IDLE', time++)
        continue
      }
      const current = rrQueue.shift()!
      const slice = Math.min(quantum, current.remaining)
      if (current.firstStart < 0) current.firstStart = time
      for (let tick = 0; tick < slice; tick++) {
        append(segments, current.id, time++)
        current.remaining -= 1
        addArrivals()
      }
      if (current.remaining === 0) current.completion = time
      else {
        rrQueue.push(current)
        rrAdded.add(current.id)
      }
    }
  } else {
    while (jobs.some(job => job.remaining > 0)) {
      const ready = jobs.filter(job => job.remaining > 0 && job.arrival <= time)
      if (!ready.length) {
        append(segments, 'IDLE', time++)
        continue
      }
      const current = [...ready].sort((a, b) => algorithm === 'SRTF'
        ? a.remaining - b.remaining || a.arrival - b.arrival || a.order - b.order
        : a.priority - b.priority || a.arrival - b.arrival || a.order - b.order)[0]
      if (current.firstStart < 0) current.firstStart = time
      append(segments, current.id, time++)
      current.remaining -= 1
      if (current.remaining === 0) current.completion = time
      if (algorithm === 'Priority' && !preemptivePriority && current.remaining > 0) {
        while (current.remaining > 0) {
          append(segments, current.id, time++)
          current.remaining -= 1
        }
        current.completion = time
      }
    }
  }

  const completed = jobs.map(({ remaining: _remaining, order: _order, ...job }) => ({
    ...job,
    turnaround: job.completion - job.arrival,
    waiting: job.completion - job.arrival - job.burst,
    response: job.firstStart - job.arrival,
  }))
  const count = completed.length || 1
  const elapsed = segments.at(-1)?.end ?? 0
  const busy = segments.reduce((sum, segment) => sum + (segment.id === 'IDLE' ? 0 : segment.end - segment.start), 0)
  const contextSwitches = segments.slice(1).filter((segment, index) =>
    segment.id !== 'IDLE' && segments[index].id !== 'IDLE' && segment.id !== segments[index].id,
  ).length
  return {
    algorithm, segments, processes: completed,
    averageWaiting: completed.reduce((sum, process) => sum + process.waiting, 0) / count,
    averageTurnaround: completed.reduce((sum, process) => sum + process.turnaround, 0) / count,
    averageResponse: completed.reduce((sum, process) => sum + process.response, 0) / count,
    utilization: elapsed ? busy / elapsed * 100 : 0,
    throughput: elapsed ? completed.length / elapsed : 0,
    elapsed, contextSwitches,
  }
}

export const sampleProcesses: ProcessInput[] = [
  { id: 'P1', arrival: 0, burst: 7, priority: 2 },
  { id: 'P2', arrival: 2, burst: 4, priority: 1 },
  { id: 'P3', arrival: 4, burst: 1, priority: 3 },
  { id: 'P4', arrival: 5, burst: 4, priority: 2 },
]
