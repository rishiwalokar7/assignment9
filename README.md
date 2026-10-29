# RAILCORE OS

RAILCORE OS is a fictional railway reservation simulator and operating-systems laboratory. It demonstrates CPU scheduling, bounded-buffer synchronization, Banker’s deadlock avoidance, and memory management in a deterministic browser application. No real railway inventory or payment system is connected.

## Run locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. To produce a production bundle or run the unit tests:

```powershell
npm run build
npm test
```

## Modules

- **Command Center** — shared simulation clock, current bookings and lab summaries, navigation, event stream, and simulation controls.
- **Railway Booking** — fictional train search, passenger and class selection, simulated payment success/failure, PNRs, booking history, cancellation, and seat inventory.
- **CPU Scheduling Lab** — FCFS, non-preemptive SJF, SRTF, Round Robin, and configurable preemptive/non-preemptive priority scheduling. Results and Gantt segments are calculated from process data.
- **Producer–Consumer Lab** — bounded FIFO buffer, semaphore counters, complete producer/consumer protocol traces, and boundary checks. Operations are atomic in the browser; this does not create operating-system threads.
- **Banker’s Algorithm Lab** — computed Need matrix, safety trace, safe sequence, sample state, resource requests, and rollback when a tentative grant is unsafe.
- **Memory Management Lab** — First/Best/Worst Fit, contiguous allocation and release, adjacent free-block merging, compaction, fragmentation statistics, and paging address translation.
- **Reports & Analytics** — current local bookings, computed scheduler comparisons, lab activity, event log, CSV/JSON exports, and print view.
- **Learn OS** — worked examples, pseudocode, formulas, trade-offs, common pitfalls, ten viva Q&As per concept, project overview, and source map.

## Core implementation

- `src/features/cpu-scheduling/engine.ts` — pure scheduling policies and calculated process metrics.
- `src/features/producer-consumer/engine.ts` — bounded-buffer operations and semaphore invariants.
- `src/features/bankers-algorithm/engine.ts` — safety algorithm and transactional resource requests.
- `src/features/memory-management/engine.ts` — allocation, coalescing, compaction, statistics, and paging.
- `src/store/useRailcoreStore.ts` — persisted shared clock, event stream, bookings, buffer, and memory state.
- `src/App.tsx` — navigation and interactive application modules.
- `src/style.css` — responsive dark command-center interface.

## Simulation notes

- The global clock advances deterministically by one second per tick while running. Events carry the current simulation time.
- CPU policy ties resolve by arrival time and then original input order. Priority `1` is highest. The context-switch count counts adjacent changes between non-idle processes; idle transitions are not counted.
- CPU utilization uses busy time divided by elapsed time from simulation time zero. Throughput is completions divided by the same elapsed interval.
- Banker resources are abstract reusable resources and are deliberately separate from railway seats. An unsafe state is not necessarily a deadlock.
- Memory external fragmentation is `(total free − largest free block) / total free × 100%`; it is zero when no free memory remains.
- Booking records, simulation clock, events, buffer, and memory layout are stored in browser localStorage. Reset clears this simulation state.

## Validation

The Vitest suite includes tests for all five CPU schedulers, idle-time metrics, buffer overflow/underflow and semaphore counts, Banker safety and unsafe-request rollback, memory fit selection and deallocation/coalescing, and paging address translation.
