export type BankerState = { available: number[]; allocation: number[][]; maximum: number[][] }
export type SafetyResult = { safe: boolean; sequence: number[]; steps: { process: number; workBefore: number[]; workAfter: number[] }[]; need: number[][] }

export function validateBanker(state: BankerState) {
  const processes = state.allocation.length
  const resources = state.available.length
  if (!resources || !processes || state.maximum.length !== processes ||
      state.allocation.some(row => row.length !== resources) || state.maximum.some(row => row.length !== resources)) {
    throw new Error('Available, Allocation, and Maximum matrices must have matching dimensions.')
  }
  if ([...state.available, ...state.allocation.flat(), ...state.maximum.flat()].some(value => !Number.isInteger(value) || value < 0)) {
    throw new Error('Resource counts must be non-negative integers.')
  }
  if (state.allocation.some((row, p) => row.some((value, r) => value > state.maximum[p][r]))) {
    throw new Error('Allocation cannot exceed maximum demand.')
  }
}

export function safetyCheck(state: BankerState): SafetyResult {
  validateBanker(state)
  const need = state.maximum.map((row, p) => row.map((value, r) => value - state.allocation[p][r]))
  const work = [...state.available]
  const finish = state.allocation.map(() => false)
  const sequence: number[] = []
  const steps: SafetyResult['steps'] = []
  while (sequence.length < finish.length) {
    const process = finish.findIndex((done, p) => !done && need[p].every((value, r) => value <= work[r]))
    if (process < 0) break
    const workBefore = [...work]
    work.forEach((value, r) => { work[r] = value + state.allocation[process][r] })
    finish[process] = true
    sequence.push(process)
    steps.push({ process, workBefore, workAfter: [...work] })
  }
  return { safe: sequence.length === finish.length, sequence, steps, need }
}

export function requestResources(state: BankerState, process: number, request: number[]) {
  validateBanker(state)
  if (!Number.isInteger(process) || process < 0 || process >= state.allocation.length) throw new Error('Select a valid process.')
  if (request.length !== state.available.length || request.some(value => !Number.isInteger(value) || value < 0)) {
    throw new Error('Request must contain one non-negative integer per resource type.')
  }
  const need = state.maximum[process].map((value, r) => value - state.allocation[process][r])
  if (request.some((value, r) => value > need[r])) return { granted: false, reason: 'Request exceeds the process’s remaining need.', state, safety: safetyCheck(state) }
  if (request.some((value, r) => value > state.available[r])) return { granted: false, reason: 'Resources are not currently available; request must wait.', state, safety: safetyCheck(state) }
  const tentative = {
    available: state.available.map((value, r) => value - request[r]),
    allocation: state.allocation.map((row, p) => row.map((value, r) => value + (p === process ? request[r] : 0))),
    maximum: state.maximum.map(row => [...row]),
  }
  const safety = safetyCheck(tentative)
  return safety.safe
    ? { granted: true, reason: 'Tentative allocation is safe and has been committed.', state: tentative, safety }
    : { granted: false, reason: 'Tentative allocation is unsafe; all changes were rolled back.', state, safety }
}

export const classicBanker: BankerState = {
  available: [3, 3, 2],
  allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
  maximum: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
}
