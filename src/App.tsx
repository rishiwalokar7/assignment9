import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check,
  ChevronRight, CircleHelp, Clock3, Cpu, Database, FileText, Gauge, Layers3, Menu, Pause,
  Play, Plus, RotateCcw, ShieldCheck, TrainFront, Trash2, Users, X,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { scheduleProcesses, sampleProcesses, type Algorithm, type ProcessInput, type ScheduleResult } from './features/cpu-scheduling/engine'
import { classicBanker, requestResources, safetyCheck, type BankerState } from './features/bankers-algorithm/engine'
import { allocate, compact, deallocate, initialMemory, memoryStats, translateAddress, type Fit } from './features/memory-management/engine'
import { consume, createBuffer, produce } from './features/producer-consumer/engine'
import { useRailcoreStore } from './store/useRailcoreStore'

type Page = 'Command Center' | 'Railway Booking' | 'CPU Scheduling' | 'Producer–Consumer' | 'Banker’s Algorithm' | 'Memory Management' | 'Reports & Analytics' | 'Learn OS'

const pages: { name: Page; icon: typeof Activity; group: string }[] = [
  { name: 'Command Center', icon: Gauge, group: 'OPERATIONS' },
  { name: 'Railway Booking', icon: TrainFront, group: 'OPERATIONS' },
  { name: 'CPU Scheduling', icon: Cpu, group: 'OS LABS' },
  { name: 'Producer–Consumer', icon: Users, group: 'OS LABS' },
  { name: 'Banker’s Algorithm', icon: ShieldCheck, group: 'OS LABS' },
  { name: 'Memory Management', icon: Layers3, group: 'OS LABS' },
  { name: 'Reports & Analytics', icon: FileText, group: 'INSIGHTS' },
  { name: 'Learn OS', icon: BookOpen, group: 'INSIGHTS' },
]

const trainData = [
  { number: 'RC 2041', name: 'Coastal Meridian', from: 'Mumbai', to: 'Pune', depart: '06:40', arrive: '10:15', duration: '3h 35m', fare: 640 },
  { number: 'RC 1188', name: 'Deccan Nightline', from: 'Pune', to: 'Hyderabad', depart: '21:10', arrive: '07:25', duration: '10h 15m', fare: 1120 },
  { number: 'RC 3062', name: 'Western Arc Express', from: 'Mumbai', to: 'Ahmedabad', depart: '08:30', arrive: '15:05', duration: '6h 35m', fare: 890 },
  { number: 'RC 4410', name: 'Blue Ridge Local', from: 'Pune', to: 'Mumbai', depart: '17:15', arrive: '20:50', duration: '3h 35m', fare: 610 },
]

const demoGuidance = [
  'Introduce the problem, shared state, and architecture. Open Learn OS for the system overview before starting the labs.',
  'Run Round Robin, then compare its Gantt chart with FCFS, SJF, SRTF, or Priority and explain the waiting-time formula.',
  'Produce and consume items; explain empty/full semaphores and the shared critical section.',
  'Run the safety trace, then submit a safe request and explain why an unsafe request is rolled back.',
  'Allocate/free a block, compare fit policies, compact memory, and translate a paged logical address.',
  'Complete a fictional booking, test payment failure, then cancel a confirmed ticket and inspect inventory.',
  'Export a report and explain which results come from current local state versus the built-in comparison dataset.',
]

const concepts = {
  'CPU Scheduling': {
    definition: 'The OS decides which ready process gets CPU time and for how long.',
    analogy: 'A single service counter chooses the next person from a waiting line.',
    steps: 'Choose ready work → run according to policy → record completion → calculate waiting, turnaround, and response times.',
    formula: 'Turnaround = Completion − Arrival · Waiting = Turnaround − Burst · Response = First start − Arrival',
    pseudocode: 'while work remains: choose eligible process by policy; run for its slice; update remaining time; record completion',
    example: 'P1 arrives at 0 with burst 5; P2 arrives at 1 with burst 3. FCFS runs P1 [0,5), then P2 [5,8). P2 waits 4 and turns around in 7.',
    pros: 'FCFS is simple; SJF can minimize average waiting; SRTF responds quickly to short jobs; Round Robin is fair for interactive work.',
    cons: 'FCFS can convoy; SJF may starve long jobs; preemption costs switches; Round Robin depends on quantum; priorities can starve low-ranked work.',
    questions: [['What is a ready queue?', 'Processes in memory that are ready to use the CPU.'], ['Define turnaround time.', 'Completion time minus arrival time.'], ['What makes SRTF preemptive?', 'A newly arrived job can replace the running job when it has less remaining work.'], ['Why use a time quantum?', 'It limits each Round Robin turn to share CPU access fairly.'], ['What is response time?', 'Time from arrival until the process first runs.'], ['What is starvation?', 'Indefinite delay when a process is repeatedly bypassed.'], ['How does FCFS break ties?', 'By arrival time, then original input order.'], ['What is CPU utilization?', 'Busy CPU time divided by elapsed simulation time.'], ['How is throughput measured?', 'Completed processes per unit of elapsed time.'], ['When is SJF non-preemptive?', 'Once a selected job starts, it runs until completion.']],
  },
  'Producer–Consumer': {
    definition: 'A synchronization problem where producers add to a bounded shared buffer and consumers remove items.',
    analogy: 'A loading bay with a fixed number of slots; one worker loads and another unloads.',
    steps: 'Producer waits on empty, acquires mutex, inserts, releases mutex, signals full. Consumer waits on full, acquires mutex, removes, releases mutex, signals empty.',
    formula: 'empty + full = capacity when no reservations are in flight; occupancy is always between zero and capacity.',
    pseudocode: 'Producer: wait(empty); wait(mutex); insert; signal(mutex); signal(full). Consumer: wait(full); wait(mutex); remove; signal(mutex); signal(empty).',
    example: 'Capacity 3 starts empty=(3), full=(0). One produce gives empty=2, full=1 and occupancy=1. One consume restores empty=3, full=0.',
    pros: 'Semaphores coordinate access and prevent buffer over/underflow.',
    cons: 'Incorrect ordering can cause races, deadlock, or lost wakeups. This browser lab is a deterministic model, not actual OS threads.',
    questions: [['What is a semaphore?', 'A synchronization counter with atomic wait and signal operations.'], ['What does mutex protect?', 'The critical section that accesses shared buffer data.'], ['What is a critical section?', 'Code that accesses shared mutable state and must be exclusive.'], ['Why is the buffer bounded?', 'It models finite shared storage and requires producer/consumer coordination.'], ['When does a producer block?', 'When no empty slots are available.'], ['When does a consumer block?', 'When no produced items are available.'], ['What is a race condition?', 'An outcome depending on uncontrolled interleaving of concurrent work.'], ['What is busy waiting?', 'Repeatedly checking a condition instead of blocking.'], ['Can an empty buffer be consumed?', 'No; wait(full) blocks until an item exists.'], ['Is this using OS threads?', 'No, it deterministically simulates protocol steps in the browser.']],
  },
  'Banker’s Algorithm': {
    definition: 'A deadlock-avoidance method that grants requests only when the resulting allocation remains in a safe state.',
    analogy: 'A careful lender approves a loan only if all customers can still eventually finish and repay.',
    steps: 'Need=Maximum−Allocation; start Work=Available; repeatedly find unfinished Need≤Work; pretend completion releases allocation; safe if all finish.',
    formula: 'Need[i][r] = Maximum[i][r] − Allocation[i][r]. A state is safe if a sequence exists that lets every process finish.',
    pseudocode: 'Work=Available; Finish=false; while an unfinished process has Need<=Work: Work+=Allocation; Finish=true; safe iff all Finish',
    example: 'Classic five-process sample starts Available=(3,3,2). Need is computed from the matrices; the engine searches for a sequence and shows each Work update.',
    pros: 'Prevents unsafe grants by considering maximum declared demand before allocation.',
    cons: 'Requires known maximum claims and can be costly; unsafe is not the same thing as an existing deadlock.',
    questions: [['What is a safe state?', 'A state with at least one order in which every process can complete.'], ['Does unsafe mean deadlocked?', 'No. It means completion cannot be guaranteed for every possible future request.'], ['What is Need?', 'Maximum remaining demand, calculated as Maximum minus Allocation.'], ['What is Work?', 'A temporary copy of available resources in the safety check.'], ['What does Finish represent?', 'Whether a process can be considered completed in the simulated sequence.'], ['What is deadlock avoidance?', 'Making allocation decisions using future-claim information to avoid unsafe states.'], ['What is deadlock prevention?', 'Structurally denying at least one necessary deadlock condition.'], ['What is a safe sequence?', 'An order in which each process can obtain Need and then release resources.'], ['When is a request rolled back?', 'When tentative allocation makes the resulting state unsafe.'], ['Are railway seats Banker resources here?', 'No. The lab uses abstract resources separate from seat inventory.']],
  },
  'Memory Management': {
    definition: 'The OS tracks memory regions and assigns available space to processes.',
    analogy: 'A contiguous free shelf section must be large enough to hold one item.',
    steps: 'Find a suitable hole using First/Best/Worst Fit → split it on allocation → merge adjacent holes on free → optionally compact.',
    formula: 'External fragmentation = (Total free − Largest free block) / Total free × 100%. Page = floor(address/page size); offset = address mod page size.',
    pseudocode: 'find eligible free blocks; choose by fit policy; allocate requested contiguous size; coalesce neighbors after release',
    example: 'Free holes 40, 100, 60 units; a 50-unit request uses 100 with First Fit. Best Fit chooses 60; Worst Fit chooses 100.',
    pros: 'Fit policies are easy to compare; paging translates logical addresses without requiring one contiguous physical region.',
    cons: 'Contiguous allocation can fragment memory. Compaction costs movement; paging can waste the last page’s internal space.',
    questions: [['What is a memory hole?', 'An unallocated contiguous region.'], ['What does First Fit choose?', 'The first hole large enough in address order.'], ['What does Best Fit choose?', 'The smallest hole that is still large enough.'], ['What does Worst Fit choose?', 'The largest available hole.'], ['What is external fragmentation?', 'Free memory split into holes too small for a requested contiguous allocation.'], ['What does compaction do?', 'Moves allocated regions together to combine free space into a larger hole.'], ['What is internal fragmentation?', 'Allocated space within a block/page that the process does not use.'], ['How is a page number found?', 'Floor of logical address divided by page size.'], ['How is the offset found?', 'Logical address modulo page size.'], ['How is physical address calculated?', 'Frame number times page size plus offset.']],
  },
}

function App() {
  const [active, setActive] = useState<Page>('Command Center')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [demoIndex, setDemoIndex] = useState(-1)
  const [notice, setNotice] = useState('')
  const { clock, running, tick, setRunning, log, reset } = useRailcoreStore()
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [running, tick])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])
  const alertUser = (message: string) => setNotice(message)
  const changePage = (page: Page) => {
    setActive(page)
    setMobileOpen(false)
  }
  const startDemo = () => {
    setDemoIndex(0)
    setActive('Command Center')
  }
  const page = active === 'Command Center'
    ? <Dashboard changePage={changePage} startDemo={startDemo} />
    : active === 'Railway Booking'
      ? <Booking alertUser={alertUser} />
      : active === 'CPU Scheduling'
        ? <CpuLab alertUser={alertUser} log={log} />
        : active === 'Producer–Consumer'
          ? <ProducerLab alertUser={alertUser} log={log} />
          : active === 'Banker’s Algorithm'
            ? <BankerLab alertUser={alertUser} log={log} />
            : active === 'Memory Management'
              ? <MemoryLab alertUser={alertUser} log={log} />
              : active === 'Reports & Analytics'
                ? <Reports alertUser={alertUser} />
                : <Learn alertUser={alertUser} />

  const resetAll = () => {
    if (!window.confirm('Reset all simulation data, events, clock, and bookings? This cannot be undone.')) return
    reset()
    setRunning(false)
    setDemoIndex(-1)
    alertUser('Simulation reset to its initial state.')
  }
  const demoPages: Page[] = ['Command Center', 'CPU Scheduling', 'Producer–Consumer', 'Banker’s Algorithm', 'Memory Management', 'Railway Booking', 'Reports & Analytics']
  const nextDemo = () => {
    const next = demoIndex + 1
    if (next >= demoPages.length) {
      setDemoIndex(-1)
      alertUser('Guided demonstration complete.')
      return
    }
    setDemoIndex(next)
    setActive(demoPages[next])
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button aria-label="Close navigation overlay" className="scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><TrainFront size={20} /></div>
          <div><strong>RAILCORE <span>OS</span></strong><small>OPERATIONS CONSOLE</small></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="env-pill"><span className="pulse-dot" /> SIMULATION ENVIRONMENT</div>
        <nav aria-label="Main navigation">
          {['OPERATIONS', 'OS LABS', 'INSIGHTS'].map(group => (
            <div className="nav-group" key={group}>
              <div className="nav-label">{group}</div>
              {pages.filter(item => item.group === group).map(item => {
                const Icon = item.icon
                return <button key={item.name} className={`nav-item ${active === item.name ? 'active' : ''}`} onClick={() => changePage(item.name)}>
                  <Icon size={17} strokeWidth={1.8} /><span>{item.name}</span>{active === item.name && <ChevronRight className="nav-chevron" size={15} />}
                </button>
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><BrainCircuit size={17} /><span>OS concepts, made observable.</span></div>
          <div className="sidebar-user"><div className="avatar">RC</div><div><strong>Lab Operator</strong><small>Student workspace</small></div><span className="status-dot" /></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>RAILCORE OS</span><ChevronRight size={14} /><strong>{active}</strong></div>
          <div className="top-actions">
            <div className="top-clock"><Clock3 size={15} /><span>SIM T+{String(Math.floor(clock / 60)).padStart(2, '0')}:{String(clock % 60).padStart(2, '0')}</span></div>
            <span className="run-state"><i className={running ? 'pulse-dot' : ''} />{running ? 'RUNNING' : 'PAUSED'}</span>
            <button className="top-control" onClick={() => setRunning(!running)} aria-label={running ? 'Pause simulation' : 'Start simulation'}>{running ? <Pause size={15} /> : <Play size={15} />}</button>
            <button className="top-control" onClick={tick} aria-label="Advance simulation one second"><ArrowRight size={15} /></button>
            <button className="top-control reset-control" onClick={resetAll} aria-label="Reset simulation"><RotateCcw size={15} /></button>
          </div>
        </header>
        <div className="content">
          {page}
          <footer>RAILCORE OS <span>·</span> Fictional railway and deterministic OS laboratory simulation</footer>
        </div>
      </main>
      {notice && <div role="status" className="toast"><Check size={16} />{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15} /></button></div>}
      {demoIndex >= 0 && <div className="demo-banner"><div><span className="eyebrow">GUIDED DEMO · STEP {demoIndex + 1} OF {demoPages.length}</span><strong>{demoPages[demoIndex]}</strong><small>{demoGuidance[demoIndex]}</small></div><button className="button button-primary" onClick={nextDemo}>{demoIndex === demoPages.length - 1 ? 'Finish demo' : 'Next module'}<ArrowRight size={15} /></button><button className="icon-button" aria-label="End guided demo" onClick={() => setDemoIndex(-1)}><X size={17} /></button></div>}
    </div>
  )
}

function PageHeading({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{kicker}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>
}

function Panel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>{children}</section>
}

function Metric({ label, value, note, icon: Icon, tone = '' }: { label: string; value: string | number; note: string; icon: typeof Activity; tone?: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={18} /></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>
}

function Dashboard({ changePage, startDemo }: { changePage: (page: Page) => void; startDemo: () => void }) {
  const { bookings, seats, events, clock, clearEvents, buffer, memory } = useRailcoreStore()
  const activeBookings = bookings.filter(item => item.status === 'Confirmed').length
  const safe = safetyCheck(classicBanker).safe
  const usage = memoryStats(memory)
  const cpuSample = scheduleProcesses(sampleProcesses, 'Round Robin', 2)
  const chart = Array.from({ length: 7 }, (_, index) => ({
    time: `T+${Math.max(0, clock - (6 - index) * 5)}`,
    bookings: bookings.length ? Math.max(0, Math.round(bookings.length * (index + 1) / 7)) : 0,
    cpu: [22, 48, 36, 70, 58, 82, 64][index],
  }))
  return <>
    <PageHeading kicker="OPERATIONS / OVERVIEW" title="Command Center" description="A live view of railway inventory and OS lab simulations." action={<div className="button-row"><button className="button button-secondary button-small" onClick={() => { if (window.confirm('Clear the complete event log?')) clearEvents() }}><Trash2 size={14} />Clear log</button><span className="sim-badge"><span className="pulse-dot" />DETERMINISTIC SIMULATION</span></div>} />
    <div className="metrics-grid">
      <Metric label="SEAT INVENTORY" value="96" note={`${seats} available · ${96 - seats} booked`} icon={TrainFront} tone="cyan" />
      <Metric label="ACTIVE BOOKINGS" value={activeBookings} note={`${bookings.filter(item => item.status === 'Cancelled').length} cancellations`} icon={CalendarDays} tone="violet" />
      <Metric label="CPU WAIT AVG." value={cpuSample.averageWaiting.toFixed(2)} note="Sample set · Round Robin q=2" icon={Cpu} tone="amber" />
      <Metric label="BUFFER OCCUPANCY" value={`${buffer.items.length} / ${buffer.capacity}`} note={`Empty ${buffer.empty} · Full ${buffer.full} · Mutex ${buffer.mutex}`} icon={Users} tone="green" />
      <Metric label="BANKER STATUS" value={safe ? 'SAFE' : 'UNSAFE'} note="Classic dataset · sequence available" icon={ShieldCheck} tone="green" />
      <Metric label="FREE MEMORY" value={`${usage.totalFree} u`} note={`${usage.holes} holes · ${usage.externalFragmentation.toFixed(0)}% external frag.`} icon={Database} tone="blue" />
    </div>
    <div className="dashboard-grid">
      <Panel title="Operations pulse" subtitle="Booking requests and illustrative CPU load" className="chart-panel">
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
          <defs><linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3bd8e8" stopOpacity={0.23} /><stop offset="95%" stopColor="#3bd8e8" stopOpacity={0} /></linearGradient><linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9580ff" stopOpacity={0.2} /><stop offset="95%" stopColor="#9580ff" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#1e2d3d" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#7d8d9f', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#7d8d9f', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#111d2b', border: '1px solid #27394c', borderRadius: 8, color: '#e7f0f8' }} />
          <Area type="monotone" dataKey="cpu" name="CPU load %" stroke="#4bd7e5" fill="url(#cpuFill)" strokeWidth={2} /><Area type="monotone" dataKey="bookings" name="Booking activity" stroke="#9681ff" fill="url(#bookingFill)" strokeWidth={2} />
        </AreaChart></ResponsiveContainer></div>
        <div className="chart-legend"><span><i className="legend-cyan" /> CPU load · illustrative</span><span><i className="legend-violet" /> Bookings · from current data</span></div>
      </Panel>
      <Panel title="System modules" subtitle="Jump into a live laboratory">
        <div className="module-list">
          {(['CPU Scheduling', 'Producer–Consumer', 'Banker’s Algorithm', 'Memory Management'] as Page[]).map((name, index) => {
            const icons = [Cpu, Users, ShieldCheck, Layers3]
            const Icon = icons[index]
            const status = [cpuSample.processes.length ? 'READY' : 'IDLE', buffer.items.length ? 'ACTIVE' : 'IDLE', safe ? 'SAFE' : 'UNSAFE', `${usage.holes} HOLES`][index]
            const detail = ['Five algorithms available', `Bounded buffer · ${buffer.capacity} slots`, 'Classic safety example', `${usage.allocated} allocated units`][index]
            return <button className="module-row" key={name} onClick={() => changePage(name)}><div className="module-icon"><Icon size={17} /></div><div><strong>{name}</strong><small>{detail}</small></div><span className="module-state">{status}</span><ChevronRight size={15} /></button>
          })}
        </div>
      </Panel>
      <Panel title="Recent event log" subtitle={`${events.length} events recorded · simulation time T+${clock}`}>
        {events.length === 0 ? <EmptyState icon={Activity} title="No events yet" detail="Your interactions will appear here as a timestamped event stream." /> :
          <div className="event-list">{events.slice(0, 5).map(event => <div className="event-row" key={event.id}><span className="event-time">T+{event.time}</span><span className="event-line" /><div><strong>{event.type}</strong><small>{event.detail}</small></div></div>)}</div>}
      </Panel>
      <Panel title="Quick start" subtitle="A suggested first run">
        <div className="quick-start"><div className="quick-number">01</div><div><strong>Run a scheduling policy</strong><p>Compare waiting time and inspect the Gantt timeline.</p></div><button className="icon-button" aria-label="Open CPU Scheduling" onClick={() => changePage('CPU Scheduling')}><ArrowRight size={17} /></button></div>
        <div className="quick-start"><div className="quick-number">02</div><div><strong>Request abstract resources</strong><p>See Banker’s safety check and safe sequence.</p></div><button className="icon-button" aria-label="Open Banker’s Algorithm" onClick={() => changePage('Banker’s Algorithm')}><ArrowRight size={17} /></button></div>
        <div className="quick-start"><div className="quick-number">03</div><div><strong>Start professor demo</strong><p>Follow a guided walk through all modules.</p></div><button className="button button-small" onClick={startDemo}>Start tour</button></div>
      </Panel>
    </div>
  </>
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return <div className="empty-state"><div><Icon size={21} /></div><strong>{title}</strong><p>{detail}</p></div>
}

function Booking({ alertUser }: { alertUser: (message: string) => void }) {
  const { seats, bookings, addBooking, cancelBooking, log } = useRailcoreStore()
  const [from, setFrom] = useState('Mumbai')
  const [to, setTo] = useState('Pune')
  const [journeyDate, setJourneyDate] = useState('2026-11-02')
  const [selectedTrain, setSelectedTrain] = useState<(typeof trainData)[number] | null>(null)
  const [passenger, setPassenger] = useState('')
  const [className, setClassName] = useState('Chair Car')
  const [payment, setPayment] = useState('success')
  const filtered = trainData.filter(train => train.from.toLowerCase().includes(from.toLowerCase()) && train.to.toLowerCase().includes(to.toLowerCase()))
  const confirm = () => {
    if (!selectedTrain) return alertUser('Select a train before booking.')
    if (passenger.trim().length < 2) return alertUser('Enter the passenger name (at least 2 characters).')
    if (!journeyDate || Number.isNaN(Date.parse(journeyDate))) return alertUser('Choose a valid journey date.')
    log('Booking requested', `${passenger.trim()} · ${selectedTrain.number} · ${journeyDate}`)
    if (payment !== 'success') {
      log('Booking failed', 'Simulated payment failure; inventory was not changed.')
      return alertUser('Simulated payment failed. No ticket was created and inventory is unchanged.')
    }
    if (seats <= 0) {
      log('Booking failed', 'No simulated seats remain; inventory was not changed.')
      return alertUser('No seats remain in the simulated inventory.')
    }
    let pnr = ''
    do { pnr = `RC${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}` }
    while (bookings.some(booking => booking.pnr === pnr))
    const classFare = Math.round(selectedTrain.fare * (className === 'AC 3 Tier' ? 1.8 : className === 'Sleeper' ? 1.25 : 1))
    try {
      addBooking({ id: crypto.randomUUID(), pnr, passenger: passenger.trim(), train: `${selectedTrain.number} · ${selectedTrain.name}`, date: journeyDate, className, fare: classFare, status: 'Confirmed' })
    } catch (error) {
      log('Booking failed', error instanceof Error ? error.message : 'The booking could not be committed.')
      return alertUser(error instanceof Error ? error.message : 'The booking could not be committed.')
    }
    alertUser(`Ticket confirmed. Simulation PNR: ${pnr}`)
    setSelectedTrain(null)
    setPassenger('')
  }
  const cancel = (pnr: string) => {
    if (!window.confirm(`Cancel simulated ticket ${pnr}?`)) return
    try { cancelBooking(pnr); alertUser(`Ticket ${pnr} cancelled. One seat returned to inventory.`) }
    catch (error) { alertUser(error instanceof Error ? error.message : 'Cancellation failed.') }
  }
  return <>
    <PageHeading kicker="OPERATIONS / RESERVATIONS" title="Railway Booking" description="Search fictional services and transact against a local, simulated seat inventory." action={<span className="sim-badge"><TrainFront size={14} /> 96 TOTAL SIMULATED SEATS</span>} />
    <Panel title="Find a service" subtitle="All routes and payment outcomes are fictional. Tickets are not valid for travel.">
      <div className="booking-search">
        <label>FROM<select value={from} onChange={event => { setFrom(event.target.value); setSelectedTrain(null) }}><option>Mumbai</option><option>Pune</option></select></label>
        <button className="swap-button" aria-label="Swap route" onClick={() => { setFrom(to); setTo(from); setSelectedTrain(null) }}><ArrowRight size={16} /></button>
        <label>TO<select value={to} onChange={event => { setTo(event.target.value); setSelectedTrain(null) }}><option>Pune</option><option>Mumbai</option><option>Hyderabad</option><option>Ahmedabad</option></select></label>
        <label>JOURNEY DATE<input type="date" value={journeyDate} onChange={event => setJourneyDate(event.target.value)} /></label>
        <div className="inventory-chip"><span className="status-dot" />{seats} available</div>
      </div>
    </Panel>
    <div className="booking-grid">
      <div className="train-results">
        <div className="section-inline"><h2>Available services</h2><span>{filtered.length} routes found</span></div>
        {filtered.length === 0 ? <Panel title="No service found"><EmptyState icon={TrainFront} title="No matching train" detail="Try another source or destination." /></Panel> : filtered.map(train => <button key={train.number} className={`train-card ${selectedTrain?.number === train.number ? 'selected' : ''}`} onClick={() => setSelectedTrain(train)}>
          <div className="train-title"><div className="train-mark"><TrainFront size={17} /></div><div><strong>{train.name}</strong><small>{train.number} <span>·</span> Simulation service</small></div><span className="fare">₹{train.fare}</span></div>
          <div className="train-route"><div><strong>{train.depart}</strong><small>{train.from}</small></div><div className="route-line"><span /><small>{train.duration}</small><span /></div><div className="route-destination"><strong>{train.arrive}</strong><small>{train.to}</small></div></div>
          <div className="train-footer"><span><Users size={14} />{seats} seats in shared demo inventory</span><span>Select service <ChevronRight size={14} /></span></div>
        </button>)}
      </div>
      <Panel title="Booking details" subtitle="Payment is simulated locally; no real transaction occurs.">
        {selectedTrain ? <div className="booking-form">
          <div className="selected-summary"><span>{selectedTrain.number}</span><strong>{selectedTrain.name}</strong><small>{selectedTrain.from} → {selectedTrain.to} · {journeyDate}</small><b>₹{Math.round(selectedTrain.fare * (className === 'AC 3 Tier' ? 1.8 : className === 'Sleeper' ? 1.25 : 1))}</b></div>
          <label>PASSENGER NAME<input value={passenger} onChange={event => setPassenger(event.target.value)} placeholder="e.g. Asha Patel" /></label>
          <label>CLASS<select value={className} onChange={event => setClassName(event.target.value)}><option>Chair Car</option><option>Sleeper</option><option>AC 3 Tier</option></select></label>
          <label>SIMULATED PAYMENT<select value={payment} onChange={event => setPayment(event.target.value)}><option value="success">Success (demo)</option><option value="fail">Fail (test rollback)</option></select></label>
          <div className="fare-row"><span>Total fare</span><strong>₹{Math.round(selectedTrain.fare * (className === 'AC 3 Tier' ? 1.8 : className === 'Sleeper' ? 1.25 : 1))}</strong></div>
          <button className="button button-primary button-wide" onClick={confirm}>Confirm simulated booking<ArrowRight size={15} /></button>
        </div> : <EmptyState icon={TrainFront} title="Choose a service" detail="Select a train to enter passenger and payment details." />}
      </Panel>
    </div>
    <Panel title="Booking history" subtitle="Confirmed and cancelled tickets from this browser">
      {bookings.length ? <div className="table-scroll"><table><thead><tr><th>PNR</th><th>PASSENGER</th><th>SERVICE</th><th>DATE</th><th>CLASS</th><th>FARE</th><th>STATUS</th><th /></tr></thead><tbody>{bookings.map(booking => <tr key={booking.id}><td className="mono">{booking.pnr}</td><td>{booking.passenger}</td><td>{booking.train}</td><td>{booking.date}</td><td>{booking.className}</td><td>₹{booking.fare}</td><td><span className={`tag ${booking.status === 'Confirmed' ? 'tag-safe' : 'tag-muted'}`}>{booking.status}</span></td><td>{booking.status === 'Confirmed' && <button className="text-button danger-text" onClick={() => cancel(booking.pnr)}>Cancel</button>}</td></tr>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No bookings yet" detail="A confirmed ticket will appear here." />}
    </Panel>
  </>
}

function CpuLab({ alertUser, log }: { alertUser: (message: string) => void; log: (type: string, detail: string) => void }) {
  const { cpuProcesses: processes, setCpuProcesses: setProcesses, cpuAlgorithm: algorithm, cpuQuantum: quantum, setCpuSettings } = useRailcoreStore()
  const [preemptive, setPreemptive] = useState(true)
  const [result, setResult] = useState<ScheduleResult | null>(null)
  const [form, setForm] = useState<ProcessInput>({ id: 'P5', arrival: 0, burst: 3, priority: 2 })
  const setAlgorithm = (value: Algorithm) => setCpuSettings(value, quantum)
  const setQuantum = (value: number) => setCpuSettings(algorithm, value)
  const run = () => {
    try {
      const computed = scheduleProcesses(processes, algorithm, quantum, preemptive)
      setResult(computed)
      computed.segments.forEach((segment, index) => {
        if (segment.id === 'IDLE') return
        const previous = computed.segments[index - 1]
        if (previous && previous.id !== segment.id && previous.id !== 'IDLE') {
          const previousProcess = computed.processes.find(process => process.id === previous.id)
          if (previousProcess && previousProcess.completion > previous.end) log('CPU process preempted', `${previous.id} at T+${previous.end}`)
        }
        if (!previous || previous.id !== segment.id) log('CPU process scheduled', `${segment.id} dispatched at T+${segment.start}`)
      })
      computed.processes.forEach(process => log('CPU process completed', `${process.id} completed at T+${process.completion}`))
      log('CPU schedule completed', `${algorithm}: ${computed.processes.length} processes, average wait ${computed.averageWaiting.toFixed(2)}`)
    }
    catch (error) { alertUser(error instanceof Error ? error.message : 'Scheduling failed.') }
  }
  const add = () => {
    try {
      if (!form.id.trim() || processes.some(process => process.id === form.id.trim())) throw new Error('Process ID must be unique and non-empty.')
      const next = [...processes, { ...form, id: form.id.trim() }]
      scheduleProcesses(next, algorithm, quantum, preemptive)
      setProcesses(next)
      setForm({ id: `P${processes.length + 2}`, arrival: 0, burst: 3, priority: 2 })
      setResult(null)
      log('CPU process created', `${form.id.trim()} · arrival ${form.arrival}, burst ${form.burst}, priority ${form.priority}`)
    } catch (error) { alertUser(error instanceof Error ? error.message : 'Invalid process.') }
  }
  const update = (id: string, field: keyof ProcessInput, raw: string) => {
    if (field === 'id') {
      if (processes.some(process => process.id !== id && process.id === raw)) return alertUser('Process IDs must be unique.')
      setProcesses(processes.map(process => process.id === id ? { ...process, id: raw } : process))
    } else {
      const value = Number(raw)
      setProcesses(processes.map(process => process.id !== id ? process : field === 'arrival'
        ? { ...process, arrival: value }
        : field === 'burst' ? { ...process, burst: value } : { ...process, priority: value }))
    }
    setResult(null)
  }
  const remove = (id: string) => { setProcesses(processes.filter(process => process.id !== id)); setResult(null) }
  return <>
    <PageHeading kicker="OS LAB / PROCESS MANAGEMENT" title="CPU Scheduling Lab" description="Compare five policies using arrival-aware deterministic timelines and derived metrics." action={<button className="button button-secondary" onClick={() => { setProcesses(sampleProcesses); setResult(null) }}><RotateCcw size={15} />Load example</button>} />
    <div className="lab-grid">
      <Panel title="Scheduler setup" subtitle="Priority 1 is the highest priority; ties use arrival then input order.">
        <div className="control-grid"><label>ALGORITHM<select value={algorithm} onChange={event => { setAlgorithm(event.target.value as Algorithm); setResult(null) }}>{['FCFS', 'SJF', 'SRTF', 'Round Robin', 'Priority'].map(item => <option key={item}>{item}</option>)}</select></label>
          {algorithm === 'Round Robin' && <label>TIME QUANTUM<input type="number" min="1" step="1" value={quantum} onChange={event => setQuantum(Number(event.target.value))} /></label>}
          {algorithm === 'Priority' && <label className="check-label"><input type="checkbox" checked={preemptive} onChange={event => setPreemptive(event.target.checked)} /> Preemptive</label>}
        </div>
        <div className="add-process">
          <label>PID<input value={form.id} onChange={event => setForm({ ...form, id: event.target.value })} /></label><label>ARRIVAL<input type="number" min="0" value={form.arrival} onChange={event => setForm({ ...form, arrival: Number(event.target.value) })} /></label><label>BURST<input type="number" min="1" value={form.burst} onChange={event => setForm({ ...form, burst: Number(event.target.value) })} /></label><label>PRIORITY<input type="number" value={form.priority} onChange={event => setForm({ ...form, priority: Number(event.target.value) })} /></label><button className="button button-small button-primary" onClick={add}><Plus size={14} />Add</button>
        </div>
        <div className="table-scroll"><table><thead><tr><th>PROCESS</th><th>ARRIVAL</th><th>BURST</th><th>PRIORITY</th><th /></tr></thead><tbody>{processes.map(process => <tr key={process.id}><td><input className="table-input mono" aria-label={`${process.id} process ID`} value={process.id} onChange={event => update(process.id, 'id', event.target.value)} /></td><td><input className="table-input" aria-label={`${process.id} arrival time`} type="number" min="0" value={process.arrival} onChange={event => update(process.id, 'arrival', event.target.value)} /></td><td><input className="table-input" aria-label={`${process.id} burst time`} type="number" min="1" value={process.burst} onChange={event => update(process.id, 'burst', event.target.value)} /></td><td><input className="table-input" aria-label={`${process.id} priority`} type="number" value={process.priority} onChange={event => update(process.id, 'priority', event.target.value)} /></td><td><button className="icon-button danger-icon" aria-label={`Remove ${process.id}`} onClick={() => remove(process.id)}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
        <button className="button button-primary" onClick={run}><Play size={15} />Run {algorithm}</button>
      </Panel>
      <Panel title="Policy guide" subtitle={algorithm}>
        <div className="learning-inline"><div className="definition-label">HOW IT CHOOSES</div><p>{algorithm === 'FCFS' ? 'Runs ready processes in arrival order until each finishes.' : algorithm === 'SJF' ? 'Chooses the ready process with the shortest burst; non-preemptive.' : algorithm === 'SRTF' ? 'At each time unit, runs the ready process with least remaining time.' : algorithm === 'Round Robin' ? `Runs each ready process for up to ${quantum} time units, then rotates the queue.` : `Runs the ready process with the highest priority (lowest number); ${preemptive ? 'can preempt' : 'non-preemptive'}.`}</p><div className="formula-box">Waiting = Completion − Arrival − Burst<br />Response = First Start − Arrival<br />Switches count adjacent non-idle process changes.</div><small>When ties occur, earlier arrival wins, then original input order. The initial idle period is included in elapsed time.</small></div>
      </Panel>
    </div>
    {result && <>
      <div className="metrics-grid compact-metrics"><Metric label="AVG WAITING" value={result.averageWaiting.toFixed(2)} note="time units / process" icon={Clock3} tone="amber" /><Metric label="AVG TURNAROUND" value={result.averageTurnaround.toFixed(2)} note="time units / process" icon={Activity} tone="cyan" /><Metric label="CPU UTILIZATION" value={`${result.utilization.toFixed(1)}%`} note={`${result.elapsed} elapsed time units`} icon={Cpu} tone="green" /><Metric label="THROUGHPUT" value={result.throughput.toFixed(2)} note={`${result.processes.length} completed`} icon={Gauge} tone="violet" /></div>
      <Panel title="Execution timeline" subtitle={`${result.contextSwitches} process-to-process context switches · idle is shown explicitly`}>
        <div className="gantt">{result.segments.map((segment, index) => <div key={`${segment.id}-${segment.start}-${index}`} className={`gantt-segment ${segment.id === 'IDLE' ? 'gantt-idle' : `gantt-color-${Math.abs(segment.id.charCodeAt(0)) % 5}`}`} style={{ flexGrow: segment.end - segment.start, flexBasis: 0 }} title={`${segment.id}: ${segment.start}–${segment.end}`}><strong>{segment.id}</strong><small>{segment.start}–{segment.end}</small></div>)}</div><div className="timeline-axis"><span>0</span><span>{result.elapsed} time units</span></div>
      </Panel>
      <Panel title="Process metrics" subtitle="Every value is calculated from this run">
        <div className="table-scroll"><table><thead><tr><th>PID</th><th>ARRIVAL</th><th>BURST</th><th>FIRST START</th><th>COMPLETION</th><th>WAITING</th><th>TURNAROUND</th><th>RESPONSE</th></tr></thead><tbody>{result.processes.map(process => <tr key={process.id}><td className="mono">{process.id}</td><td>{process.arrival}</td><td>{process.burst}</td><td>{process.firstStart}</td><td>{process.completion}</td><td>{process.waiting}</td><td>{process.turnaround}</td><td>{process.response}</td></tr>)}</tbody></table></div>
      </Panel>
    </>}
  </>
}

function ProducerLab({ alertUser, log }: { alertUser: (message: string) => void; log: (type: string, detail: string) => void }) {
  const { buffer, setBuffer } = useRailcoreStore()
  const [capacityText, setCapacityText] = useState('5')
  const [nextItem, setNextItem] = useState(1)
  const [timeline, setTimeline] = useState<string[]>([])
  const [itemText, setItemText] = useState('')
  const produceOne = () => {
    const item = itemText.trim() || `ITEM-${nextItem}`
    try {
      const next = produce(buffer, item)
      setBuffer(next); setItemText(''); setNextItem(value => value + 1)
      const actions = [`Producer wait(empty) → ${next.empty}`, 'Producer wait(mutex) → 0', `Insert ${item}`, 'Producer signal(mutex) → 1', `Producer signal(full) → ${next.full}`]
      setTimeline(current => [...actions.reverse(), ...current].slice(0, 25))
      log('Producer completed', `${item} inserted; buffer ${next.items.length}/${next.capacity}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Producer is blocked.'
      log('Producer blocked', message)
      alertUser(message)
    }
  }
  const consumeOne = () => {
    try {
      const result = consume(buffer)
      setBuffer(result.state)
      const actions = [`Consumer wait(full) → ${result.state.full}`, 'Consumer wait(mutex) → 0', `Remove ${result.item}`, 'Consumer signal(mutex) → 1', `Consumer signal(empty) → ${result.state.empty}`]
      setTimeline(current => [...actions.reverse(), ...current].slice(0, 25))
      log('Consumer completed', `${result.item} removed; buffer ${result.state.items.length}/${result.state.capacity}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Consumer is blocked.'
      log('Consumer blocked', message)
      alertUser(message)
    }
  }
  const resetBuffer = () => {
    try { const next = createBuffer(Number(capacityText)); setBuffer(next); setTimeline([]); setNextItem(1); log('Buffer reset', `Bounded buffer capacity set to ${next.capacity}`) }
    catch (error) { alertUser(error instanceof Error ? error.message : 'Invalid capacity.') }
  }
  return <>
    <PageHeading kicker="OS LAB / SYNCHRONIZATION" title="Producer–Consumer" description="Observe bounded-buffer semaphore rules using deterministic, atomic protocol transactions." action={<span className="sim-badge"><span className="status-dot" />BROWSER SIMULATION · NOT OS THREADS</span>} />
    <div className="metrics-grid three-metrics"><Metric label="EMPTY SLOTS" value={buffer.empty} note="semaphore: empty" icon={ArrowDownToLine} tone="cyan" /><Metric label="OCCUPIED SLOTS" value={buffer.full} note="semaphore: full" icon={Database} tone="violet" /><Metric label="MUTEX" value={buffer.mutex === 1 ? 'UNLOCKED' : 'LOCKED'} note="one simulated critical section" icon={ShieldCheck} tone="green" /></div>
    <div className="lab-grid">
      <Panel title={`Bounded buffer · ${buffer.items.length} / ${buffer.capacity}`} subtitle="Items are removed in FIFO order. Each button performs the complete semaphore protocol atomically.">
        <div className="buffer-slots">{Array.from({ length: buffer.capacity }, (_, index) => <div key={index} className={`buffer-slot ${buffer.items[index] ? 'occupied' : ''}`}><span className="slot-index">SLOT {String(index + 1).padStart(2, '0')}</span>{buffer.items[index] ? <strong>{buffer.items[index]}</strong> : <small>EMPTY</small>}</div>)}</div>
        <div className="buffer-config"><label>CAPACITY<input type="number" min="1" max="20" value={capacityText} onChange={event => setCapacityText(event.target.value)} /></label><button className="button button-secondary" onClick={resetBuffer}><RotateCcw size={14} />Reset buffer</button></div>
        <div className="producer-controls"><label>ITEM VALUE<input value={itemText} onChange={event => setItemText(event.target.value)} placeholder={`ITEM-${nextItem}`} /></label><button className="button button-primary" onClick={produceOne}><Plus size={15} />Produce</button><button className="button button-secondary" onClick={consumeOne}><ArrowDownToLine size={15} />Consume</button></div>
      </Panel>
      <Panel title="Protocol timeline" subtitle="Most recent semaphore operations first">
        {timeline.length ? <div className="protocol-log">{timeline.map((line, index) => <div key={`${line}-${index}`}><span>{String(timeline.length - index).padStart(2, '0')}</span><i />{line}</div>)}</div> : <EmptyState icon={Activity} title="Awaiting first operation" detail="Run a producer or consumer operation to record semaphore actions." />}
        <div className="formula-box protocol-note">Invariant: occupancy stays within 0…capacity. With no in-flight reservations, empty + full = capacity.</div>
      </Panel>
    </div>
    <Panel title="Synchronization concepts" subtitle="Why the protocol uses this ordering">
      <div className="concept-cards">{[['Critical section', 'Shared buffer insertion/removal; mutex allows one process at a time.'], ['Race condition', 'Uncontrolled interleaving could corrupt occupancy or lose an item.'], ['Semaphore', 'empty/full count resource slots; mutex provides mutual exclusion.'], ['Deadlock', 'Can occur if locks/resources are acquired in inconsistent order.']].map(([title, body]) => <div className="concept-card" key={title}><strong>{title}</strong><p>{body}</p></div>)}</div>
    </Panel>
  </>
}

function BankerLab({ alertUser, log }: { alertUser: (message: string) => void; log: (type: string, detail: string) => void }) {
  const [state, setState] = useState<BankerState>(classicBanker)
  const [process, setProcess] = useState(1)
  const [requestText, setRequestText] = useState('1, 0, 2')
  const [result, setResult] = useState(() => safetyCheck(classicBanker))
  const [requestMessage, setRequestMessage] = useState('')
  const runSafety = () => {
    try { const next = safetyCheck(state); setResult(next); log('Safety check completed', next.safe ? `Safe sequence: ${next.sequence.map(p => `P${p}`).join(' → ')}` : 'No safe sequence exists'); }
    catch (error) { alertUser(error instanceof Error ? error.message : 'Safety check failed.') }
  }
  const request = () => {
    try {
      const vector = requestText.split(',').map(value => Number(value.trim()))
      const outcome = requestResources(state, process, vector)
      setRequestMessage(`${outcome.granted ? 'GRANTED' : 'DENIED'} · ${outcome.reason}`)
      setResult(outcome.safety)
      if (outcome.granted) setState(outcome.state)
      log(outcome.granted ? 'Resource request approved' : 'Resource request denied', `P${process}: [${vector.join(', ')}] — ${outcome.reason}`)
    } catch (error) { alertUser(error instanceof Error ? error.message : 'Invalid request.') }
  }
  const loadUnsafe = () => {
    const unsafe = { available: [0, 0, 0], allocation: [[1, 0, 0], [0, 1, 0]], maximum: [[2, 1, 0], [1, 2, 0]] }
    setState(unsafe); setResult(safetyCheck(unsafe)); setRequestMessage('Unsafe teaching example loaded.'); log('Unsafe state loaded', 'Two-process example with no currently available resources.')
  }
  return <>
    <PageHeading kicker="OS LAB / DEADLOCK AVOIDANCE" title="Banker’s Algorithm" description="Calculate Need, inspect a safe sequence, and test resource requests with rollback on unsafe outcomes." action={<button className="button button-secondary" onClick={() => { setState(classicBanker); setResult(safetyCheck(classicBanker)); setRequestMessage('') }}><RotateCcw size={15} />Classic example</button>} />
    <div className="banker-top">
      <div className={`safety-banner ${result.safe ? 'safe-banner' : 'unsafe-banner'}`}><div className="safety-symbol">{result.safe ? <ShieldCheck size={22} /> : <CircleHelp size={22} />}</div><div><span className="eyebrow">CURRENT RESOURCE STATE</span><strong>{result.safe ? 'SAFE STATE' : 'UNSAFE STATE'}</strong><small>{result.safe ? `Sequence: ${result.sequence.map(item => `P${item}`).join(' → ')}` : 'No complete safe sequence found. Unsafe does not necessarily mean deadlock.'}</small></div><button className="button button-primary" onClick={runSafety}>Run safety check<ArrowRight size={15} /></button></div>
    </div>
    {requestMessage && <div className={`request-message ${requestMessage.startsWith('GRANTED') ? 'request-ok' : 'request-no'}`}>{requestMessage}</div>}
    <div className="banker-grid">
      <Panel title="Resource state" subtitle={`Available: [${state.available.join(', ')}] · Need = Maximum − Allocation`}>
        <div className="table-scroll"><table><thead><tr><th>PROCESS</th><th>ALLOCATION</th><th>MAXIMUM</th><th>NEED</th></tr></thead><tbody>{state.allocation.map((allocation, p) => <tr key={p}><td className="mono">P{p}</td><td className="vector">{allocation.join(' · ')}</td><td className="vector">{state.maximum[p].join(' · ')}</td><td className="vector need">{result.need[p]?.join(' · ')}</td></tr>)}</tbody></table></div>
        <div className="available-vector"><span>AVAILABLE VECTOR</span>{state.available.map((value, index) => <strong key={index}>R{index}: {value}</strong>)}</div>
      </Panel>
      <Panel title="Request resources" subtitle="Requests are tentatively granted only if the resulting state is safe.">
        <div className="request-form"><label>PROCESS<select value={process} onChange={event => setProcess(Number(event.target.value))}>{state.allocation.map((_, index) => <option key={index} value={index}>P{index}</option>)}</select></label><label>REQUEST VECTOR<input value={requestText} onChange={event => setRequestText(event.target.value)} placeholder="1, 0, 2" /></label><button className="button button-primary" onClick={request}>Evaluate request</button></div>
        <div className="formula-box">Request validation checks Need, Available, then tentatively allocates. If the safety check fails, original matrices remain unchanged.</div>
        <button className="text-button" onClick={loadUnsafe}>Load unsafe teaching example <ArrowRight size={14} /></button>
      </Panel>
    </div>
    <Panel title="Safety algorithm trace" subtitle="Work starts at Available. Each completed process releases its allocated vector.">
      <div className="trace-list">{result.steps.map((step, index) => <div className="trace-row" key={`${step.process}-${index}`}><span className="trace-index">{index + 1}</span><div><strong>Process P{step.process} can finish</strong><small>Need [{result.need[step.process].join(', ')}] ≤ Work [{step.workBefore.join(', ')}]</small></div><ArrowRight size={15} /><span className="work-value">Work → [{step.workAfter.join(', ')}]</span></div>)}{!result.steps.length && <p className="muted">No process can complete with the current Available vector.</p>}</div>
    </Panel>
    <div className="warning-note"><CircleHelp size={16} /><span><strong>Unsafe ≠ deadlocked.</strong> An unsafe state means the system cannot guarantee completion for every possible future request. Banker resources are abstract and separate from railway seats.</span></div>
  </>
}

function MemoryLab({ alertUser, log }: { alertUser: (message: string) => void; log: (type: string, detail: string) => void }) {
  const { memory: blocks, setMemory: setBlocks } = useRailcoreStore()
  const [fit, setFit] = useState<Fit>('First Fit')
  const [pid, setPid] = useState('P1')
  const [size, setSize] = useState(80)
  const [pageSize, setPageSize] = useState(16)
  const [logical, setLogical] = useState(37)
  const [frames, setFrames] = useState('3, 5, 8, 2, 9')
  const [translation, setTranslation] = useState<{ page: number; offset: number; frame: number; physical: number } | null>(null)
  const stats = memoryStats(blocks)
  const doAllocate = () => {
    try {
      const result = allocate(blocks, pid, size, fit)
      setBlocks(result.blocks)
      log('Memory allocated', `${pid}: ${size} units using ${fit}; ${result.message}`)
      alertUser(result.message)
    } catch (error) { alertUser(error instanceof Error ? error.message : 'Allocation failed.') }
  }
  const doFree = (process: string) => {
    try { setBlocks(deallocate(blocks, process)); log('Memory freed', `${process} deallocated and adjacent free holes coalesced.`) }
    catch (error) { alertUser(error instanceof Error ? error.message : 'Deallocation failed.') }
  }
  const doCompact = () => { setBlocks(compact(blocks)); log('Memory compacted', 'Allocated blocks moved together and free space coalesced.') }
  const translate = () => {
    try { const result = translateAddress(logical, pageSize, frames.split(',').map(item => Number(item.trim()))); setTranslation(result); log('Address translated', `Logical ${logical} → physical ${result.physical}`) }
    catch (error) { setTranslation(null); alertUser(error instanceof Error ? error.message : 'Translation failed.') }
  }
  return <>
    <PageHeading kicker="OS LAB / MEMORY" title="Memory Management" description="Experiment with contiguous allocation strategies, fragmentation, coalescing, compaction, and paging." action={<button className="button button-secondary" onClick={() => { setBlocks(initialMemory); setTranslation(null) }}><RotateCcw size={15} />Reset memory</button>} />
    <div className="metrics-grid four-metrics"><Metric label="ALLOCATED" value={`${stats.allocated} u`} note="current process regions" icon={Database} tone="cyan" /><Metric label="TOTAL FREE" value={`${stats.totalFree} u`} note="sum across all holes" icon={Layers3} tone="green" /><Metric label="LARGEST FREE" value={`${stats.largestFree} u`} note={`${stats.holes} free hole(s)`} icon={Activity} tone="violet" /><Metric label="EXT. FRAGMENTATION" value={`${stats.externalFragmentation.toFixed(1)}%`} note="(free − largest) / free" icon={Gauge} tone="amber" /></div>
    <div className="lab-grid">
      <Panel title="Contiguous memory map" subtitle={`Total managed memory: ${blocks.reduce((sum, block) => sum + block.size, 0)} units`}>
        <div className="memory-map">{blocks.map(block => <div className={`memory-block ${block.process ? 'memory-used' : 'memory-free'}`} key={block.id} style={{ flexGrow: block.size, flexBasis: 0 }}><strong>{block.process ?? 'FREE'}</strong><small>{block.size} units</small>{block.process && <button aria-label={`Free memory for ${block.process}`} onClick={() => doFree(block.process!)}><X size={13} /></button>}</div>)}</div>
        <div className="memory-scale"><span>BASE ADDRESS · 0</span><span>END · {blocks.reduce((sum, block) => sum + block.size, 0)}</span></div>
        <div className="internal-frag-note">Internal fragmentation: {stats.internalFragmentation} units. Contiguous blocks use the exact requested size; no rounding is applied.</div>
        <div className="allocation-form"><label>PROCESS ID<input value={pid} onChange={event => setPid(event.target.value)} /></label><label>SIZE (UNITS)<input type="number" min="1" value={size} onChange={event => setSize(Number(event.target.value))} /></label><label>FIT POLICY<select value={fit} onChange={event => setFit(event.target.value as Fit)}><option>First Fit</option><option>Best Fit</option><option>Worst Fit</option></select></label><button className="button button-primary" onClick={doAllocate}><Plus size={14} />Allocate</button></div>
        <button className="button button-secondary" onClick={doCompact}>Compact memory</button>
      </Panel>
      <Panel title="Paging address translation" subtitle="Page table maps logical pages to physical frames.">
        <div className="paging-form"><label>LOGICAL ADDRESS<input type="number" min="0" value={logical} onChange={event => setLogical(Number(event.target.value))} /></label><label>PAGE SIZE<input type="number" min="1" value={pageSize} onChange={event => setPageSize(Number(event.target.value))} /></label><label>FRAME TABLE<input value={frames} onChange={event => setFrames(event.target.value)} placeholder="3, 5, 8" /></label><button className="button button-primary" onClick={translate}>Translate</button></div>
        <div className="page-table"><div className="page-table-title">PAGE TABLE · page → frame</div>{frames.split(',').map((frame, index) => <div key={index}><span>Page {index}</span><strong>Frame {frame.trim()}</strong></div>)}</div>
        {translation && <div className="translation-result"><span>PAGE <b>{translation.page}</b></span><span>OFFSET <b>{translation.offset}</b></span><span>FRAME <b>{translation.frame}</b></span><span>PHYSICAL ADDRESS <b>{translation.physical}</b></span></div>}
        <div className="formula-box">Physical address = frame × page size + offset<br />Paging avoids external fragmentation; the final page may have internal fragmentation.</div>
      </Panel>
    </div>
    <Panel title="Fit algorithm comparison" subtitle="Selected blocks are calculated from current free holes.">
      <div className="concept-cards">{[['First Fit', 'First available hole large enough. Fast to search.'], ['Best Fit', 'Smallest hole that can satisfy request. May leave tiny holes.'], ['Worst Fit', 'Largest hole available. Leaves the largest remainder.']].map(([name, explanation]) => <div className="concept-card" key={name}><strong>{name}</strong><p>{explanation}</p><small>For next request of {size} units: {blocks.filter(block => block.process === null && block.size >= size).length ? 'eligible free region exists' : 'no contiguous region fits'}</small></div>)}</div>
    </Panel>
  </>
}

function Reports({ alertUser }: { alertUser: (message: string) => void }) {
  const { bookings, events, seats, memory, buffer } = useRailcoreStore()
  const [cpu] = useState(() => scheduleProcesses(sampleProcesses, 'Round Robin', 2))
  const safe = safetyCheck(classicBanker)
  const memorySummary = memoryStats(memory)
  const report = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    bookings: { total: bookings.length, confirmed: bookings.filter(booking => booking.status === 'Confirmed').length, cancelled: bookings.filter(booking => booking.status === 'Cancelled').length, seatsAvailable: seats, records: bookings },
    cpu: { algorithm: cpu.algorithm, averageWaiting: cpu.averageWaiting, averageTurnaround: cpu.averageTurnaround, utilizationPercent: cpu.utilization, throughput: cpu.throughput, processMetrics: cpu.processes },
    producerConsumer: { capacity: buffer.capacity, occupancy: buffer.items.length, empty: buffer.empty, full: buffer.full, note: 'Operations use the deterministic bounded-buffer protocol.', completedOperations: events.filter(event => event.type.includes('Producer') || event.type.includes('Consumer')).length },
    banker: { safe: safe.safe, sequence: safe.sequence.map(index => `P${index}`), checksAndRequests: events.filter(event => event.type.toLowerCase().includes('resource') || event.type.toLowerCase().includes('safety')) },
    memory: memorySummary,
    events,
  }), [bookings, seats, events, cpu, safe, memorySummary, buffer])
  const exportJson = () => {
    downloadFile('railcore-report.json', JSON.stringify(report, null, 2), 'application/json')
    alertUser('JSON report exported.')
  }
  const exportCsv = () => {
    const rows = [['time', 'type', 'detail'], ...events.map(event => [`T+${event.time}`, event.type, event.detail])]
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    downloadFile('railcore-events.csv', csv, 'text/csv;charset=utf-8')
    alertUser('Event CSV exported.')
  }
  return <>
    <PageHeading kicker="INSIGHTS / EXPORTS" title="Reports & Analytics" description="Reports are generated from current bookings, algorithm calculations, and the shared event log." action={<div className="button-row"><button className="button button-secondary" onClick={() => window.print()}><FileText size={15} />Print summary</button><button className="button button-secondary" onClick={exportCsv}><ArrowDownToLine size={15} />Export CSV</button><button className="button button-primary" onClick={exportJson}><ArrowDownToLine size={15} />Export JSON</button></div>} />
    <div className="metrics-grid four-metrics"><Metric label="BOOKINGS" value={bookings.length} note={`${report.bookings.confirmed} confirmed · ${report.bookings.cancelled} cancelled`} icon={TrainFront} tone="cyan" /><Metric label="CPU AVG WAIT" value={cpu.averageWaiting.toFixed(2)} note={`${cpu.algorithm} · sample processes`} icon={Cpu} tone="amber" /><Metric label="BANKER STATE" value={safe.safe ? 'SAFE' : 'UNSAFE'} note={safe.sequence.map(index => `P${index}`).join(' → ')} icon={ShieldCheck} tone="green" /><Metric label="FREE MEMORY" value={`${memorySummary.totalFree} u`} note={`${memorySummary.holes} holes · current layout`} icon={Database} tone="violet" /></div>
    <div className="report-grid">
      <Panel title="Booking statistics" subtitle="Live local transaction state"><div className="report-stat-row"><span>Seats available</span><strong>{seats} / 96</strong></div><div className="report-stat-row"><span>Total ticket records</span><strong>{bookings.length}</strong></div><div className="report-stat-row"><span>Active confirmed</span><strong>{report.bookings.confirmed}</strong></div><div className="report-stat-row"><span>Cancelled (inventory restored)</span><strong>{report.bookings.cancelled}</strong></div></Panel>
      <Panel title="CPU scheduling comparison" subtitle="Recomputed against the built-in sample dataset"><div className="table-scroll"><table><thead><tr><th>ALGORITHM</th><th>AVG WAIT</th><th>AVG TURN</th><th>UTILIZATION</th><th>THROUGHPUT</th></tr></thead><tbody>{(['FCFS', 'SJF', 'SRTF', 'Round Robin', 'Priority'] as Algorithm[]).map(algorithm => { const result = scheduleProcesses(sampleProcesses, algorithm, 2); return <tr key={algorithm}><td>{algorithm}</td><td>{result.averageWaiting.toFixed(2)}</td><td>{result.averageTurnaround.toFixed(2)}</td><td>{result.utilization.toFixed(1)}%</td><td>{result.throughput.toFixed(2)}</td></tr> })}</tbody></table></div></Panel>
      <Panel title="Lab activity summary" subtitle="Shared event log based"><div className="report-stat-row"><span>Producer/consumer operations</span><strong>{report.producerConsumer.completedOperations}</strong></div><div className="report-stat-row"><span>Current buffer occupancy</span><strong>{buffer.items.length} / {buffer.capacity}</strong></div><div className="report-stat-row"><span>Banker checks / requests</span><strong>{report.banker.checksAndRequests.length}</strong></div><div className="report-stat-row"><span>Tracked events</span><strong>{events.length}</strong></div><div className="report-stat-row"><span>External fragmentation</span><strong>{memorySummary.externalFragmentation.toFixed(1)}%</strong></div></Panel>
      <Panel title="Event stream" subtitle="Most recent first · CSV export contains these events">
        {events.length ? <div className="event-list report-events">{events.map(event => <div className="event-row" key={event.id}><span className="event-time">T+{event.time}</span><span className="event-line" /><div><strong>{event.type}</strong><small>{event.detail}</small></div></div>)}</div> : <EmptyState icon={Activity} title="No events to report" detail="Complete a booking or use a lab to populate the shared event log." />}
      </Panel>
    </div>
    <div className="print-summary"><h2>RAILCORE OS · Project demonstration summary</h2><p>Railway Reservation and Ticket Processing System demonstrating CPU scheduling, producer–consumer synchronization, Banker’s deadlock avoidance, and memory management. Fictional routes and local data only.</p><p>Generated: {report.generatedAt}</p></div>
  </>
}

function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function Learn({ alertUser }: { alertUser: (message: string) => void }) {
  const [activeConcept, setActiveConcept] = useState<keyof typeof concepts>('CPU Scheduling')
  const [showQuestions, setShowQuestions] = useState(true)
  const content = concepts[activeConcept]
  const conceptKeys = Object.keys(concepts) as (keyof typeof concepts)[]
  return <>
    <PageHeading kicker="INSIGHTS / VIVA PREPARATION" title="Learn OS" description="A practical viva guide tied directly to each interactive simulation and its algorithm." action={<button className="button button-primary" onClick={() => alertUser('Demo checklist: architecture → CPU → synchronization → Banker → memory → booking → report. Use the guided demo banner to step through.')}>Professor demo checklist<Play size={15} /></button>} />
    <div className="learning-layout">
      <div className="concept-nav">{conceptKeys.map(key => <button key={key} className={activeConcept === key ? 'selected' : ''} onClick={() => setActiveConcept(key)}><span className="concept-number">0{conceptKeys.indexOf(key) + 1}</span><span>{key}<small>{key === 'CPU Scheduling' ? 'Process management' : key === 'Producer–Consumer' ? 'Synchronization' : key === 'Banker’s Algorithm' ? 'Deadlock avoidance' : 'Memory allocation'}</small></span><ChevronRight size={15} /></button>)}<div className="syllabus-note"><BookOpen size={16} /><span>Each lab includes a code trace and working example. Start with the definition, then narrate the live controls.</span></div></div>
      <div className="learning-content">
        <div className="concept-hero"><div className="eyebrow">OPERATING SYSTEM CONCEPT</div><h2>{activeConcept}</h2><p>{content.definition}</p></div>
        <div className="concept-detail-grid">
          <div className="detail-card"><span>WHY IT MATTERS</span><p>{activeConcept === 'CPU Scheduling' ? 'A processor is shared among many ready tasks. A policy affects fairness, responsiveness, and throughput.' : activeConcept === 'Producer–Consumer' ? 'Concurrent code shares finite data structures. Synchronization prevents inconsistent updates and invalid reads.' : activeConcept === 'Banker’s Algorithm' ? 'A resource grant can lead the system into a state where some processes might never complete.' : 'Many processes compete for finite RAM; the OS must assign regions while minimizing waste.'}</p></div>
          <div className="detail-card"><span>REAL-WORLD ANALOGY</span><p>{content.analogy}</p></div>
          <div className="detail-card"><span>ALGORITHM AT A GLANCE</span><p>{content.steps}</p></div>
          <div className="detail-card"><span>FORMULAS / INVARIANTS</span><p className="formula-content">{content.formula}</p></div>
          <div className="detail-card"><span>PSEUDOCODE</span><pre>{content.pseudocode}</pre></div>
          <div className="detail-card"><span>WORKED EXAMPLE</span><p>{content.example}</p></div>
          <div className="detail-card"><span>ADVANTAGES</span><p>{content.pros}</p></div>
          <div className="detail-card"><span>LIMITATIONS & COMMON MISTAKES</span><p>{content.cons}</p></div>
        </div>
        <Panel title="Viva questions & answers" subtitle={`${content.questions.length} questions for your oral examination`} className="viva-panel">
          <button className="viva-toggle" onClick={() => setShowQuestions(!showQuestions)}>{showQuestions ? 'Collapse answers' : 'Show viva questions'}<ChevronRight size={15} /></button>
          {showQuestions && <div className="viva-list">{content.questions.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>Q{String(index + 1).padStart(2, '0')}</span>{question}</summary><p>{answer}</p></details>)}</div>}
        </Panel>
        <Panel title="Project overview" subtitle="Explain the system as a whole before showing the labs">
          <div className="project-overview">
            <div><span>PROBLEM STATEMENT</span><p>Demonstrate a railway reservation workflow while making four operating-system concepts observable through deterministic simulations.</p></div>
            <div><span>OBJECTIVES & SCOPE</span><p>Provide fictional booking operations, teach policies and resource management, and generate reports. No server, real payment, or real train inventory is connected.</p></div>
            <div><span>ARCHITECTURE & DATA FLOW</span><p>React + TypeScript views → pure TypeScript algorithm engines → Zustand shared simulation clock/event log → browser localStorage persistence for booking state.</p></div>
            <div><span>TECH STACK</span><p>Vite, React, strict TypeScript, Zustand, Recharts, Lucide, Tailwind CSS tooling, and Vitest for algorithm tests.</p></div>
            <div><span>TESTING STRATEGY</span><p>Unit tests cover scheduling metrics and idle time, buffer boundaries and counters, Banker safety and rollback, fit selection/coalescing, and address translation.</p></div>
            <div><span>LIMITATIONS & FUTURE SCOPE</span><p>Local single-browser state; fictional routes; atomic browser protocol demonstrations. Future work could add editable persisted datasets, finer semaphore stepping, accessible guided narration, and backend-backed accounts.</p></div>
          </div>
          <div className="source-map"><strong>Important source files</strong><span>CPU: src/features/cpu-scheduling/engine.ts</span><span>Synchronization: src/features/producer-consumer/engine.ts</span><span>Banker: src/features/bankers-algorithm/engine.ts</span><span>Memory: src/features/memory-management/engine.ts</span><span>Shared state: src/store/useRailcoreStore.ts</span></div>
        </Panel>
      </div>
    </div>
  </>
}

export default App
