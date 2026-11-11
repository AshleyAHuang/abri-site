// Interactive 3D blueprint of a client home with the Abri kit installed.
// Plan coordinates are metres: x runs west→east (0–10), z north→south (0–8).
// Three.js is vendored in ./vendor so the page works offline (demo-day Wi-Fi).
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/OrbitControls.js'

const root = document.querySelector('#kit')
const stage = root.querySelector('.bp-stage')
const canvas = root.querySelector('#bp-canvas')
const overlay = root.querySelector('.bp-overlay')
const panel = root.querySelector('.bp-info')
const log = root.querySelector('.bp-log ol')
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = matchMedia('(pointer: coarse)').matches

const C = {
  bg: 0x0d3158,
  line: 0xd6ecff,
  dim: 0x6f9cc8,
  amber: 0xf2a541,
  radar: 0x7fd3ff,
  aide: 0x7fe3c4,
}
const W = 10, D = 8, H = 1.8 // house size and cutaway wall height
const P = (x, z, y = 0) => new THREE.Vector3(x - W / 2, y, z - D / 2) // plan → world

// ---------- renderer, scene, camera ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.localClippingEnabled = true
const scene = new THREE.Scene()
scene.background = new THREE.Color(C.bg)
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)

const controls = new OrbitControls(camera, canvas)
controls.enableZoom = false // keep the mouse wheel for scrolling the page
controls.enablePan = false
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.15
if (coarse) {
  // On phones a one-finger drag should scroll the page; the view buttons move the camera instead.
  controls.enabled = false
  canvas.style.touchAction = 'pan-y'
}

const lineMat = (color = C.line, opacity = 0.9) => new THREE.LineBasicMaterial({ color, transparent: true, opacity })
const fillMat = (color = C.line, opacity = 0.06) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })

function outlinedBox(w, h, d, { line = C.line, lineOpacity = 0.9, fill = C.line, fillOpacity = 0.05 } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const g = new THREE.Group()
  g.add(new THREE.Mesh(geo, fillMat(fill, fillOpacity)))
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(line, lineOpacity)))
  return g
}

// ---------- floor and grid ----------
const grid = new THREE.GridHelper(16, 32, C.dim, C.dim)
grid.material.transparent = true
grid.material.opacity = 0.22
grid.position.y = -0.01
scene.add(grid)

const rooms = [
  { name: 'Bedroom', x: [0, 5], z: [0, 3.5] },
  { name: 'Bath', x: [5, 7.5], z: [0, 3.5] },
  { name: 'Kitchen', x: [7.5, 10], z: [0, 4.8] },
  { name: 'Hallway', x: [0, 7.5], z: [3.5, 4.8], hall: true },
  { name: 'Living room', x: [0, 10], z: [4.8, 8] },
]
for (const r of rooms) {
  const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0]
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fillMat(r.hall ? C.radar : C.line, r.hall ? 0.08 : 0.035))
  m.rotation.x = -Math.PI / 2
  m.position.copy(P((r.x[0] + r.x[1]) / 2, (r.z[0] + r.z[1]) / 2, 0.002))
  scene.add(m)
}

// ---------- walls (gaps are doorways) ----------
const walls = [
  [0, 0, 10, 0], [0, 0, 0, 8], [10, 0, 10, 8], [0, 8, 2.4, 8], [3.4, 8, 10, 8], // outside, front door gap
  [0, 3.5, 1.0, 3.5], [1.9, 3.5, 6.2, 3.5], [7.0, 3.5, 7.5, 3.5], // hallway north: bedroom + bath doors
  [5, 0, 5, 3.5], [7.5, 0, 7.5, 4.8], // bedroom | bath | kitchen
  [0, 4.8, 4.6, 4.8], [6.2, 4.8, 7.5, 4.8], // hallway south, opening to living room
  [7.5, 4.8, 8.2, 4.8], [9.4, 4.8, 10, 4.8], // kitchen south
]
for (const [x1, z1, x2, z2] of walls) {
  const len = Math.hypot(x2 - x1, z2 - z1)
  const wall = outlinedBox(len, H, 0.1, { lineOpacity: 0.55, fillOpacity: 0.05 })
  wall.position.copy(P((x1 + x2) / 2, (z1 + z2) / 2, H / 2))
  wall.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
  scene.add(wall)
}

// ---------- furniture (dim outlines) ----------
const furniture = [
  [0.4, 0.3, 2.4, 2.3, 0.5], // bed
  [3.6, 0.15, 4.8, 0.65, 0.9], // dresser
  [6.5, 0.2, 7.2, 0.9, 0.45], // toilet
  [5.15, 0.15, 6.2, 1.2, 0.08], // shower tray
  [7.65, 0.15, 9.85, 0.75, 0.9], // counter
  [0.6, 6.7, 3.2, 7.6, 0.8], // sofa
  [4.2, 5.8, 5.4, 6.6, 0.45], // coffee table
]
for (const [x1, z1, x2, z2, h] of furniture) {
  const f = outlinedBox(x2 - x1, h, z2 - z1, { line: C.dim, lineOpacity: 0.8, fillOpacity: 0.03 })
  f.position.copy(P((x1 + x2) / 2, (z1 + z2) / 2, h / 2))
  scene.add(f)
}
const table = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 24)), lineMat(C.dim, 0.6))
table.position.copy(P(8.7, 2.8, 0.375))
scene.add(table)

// ---------- doors: swing arc on the floor + a leaf that opens on door events ----------
const doors = {}
function door(id, hx, hz, width) {
  const arc = new THREE.EllipseCurve(0, 0, width, width, 0, Math.PI / 2).getPoints(24)
  const arcLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc.map((p) => new THREE.Vector3(p.x, 0.01, -p.y))), lineMat(C.dim, 0.7))
  arcLine.position.copy(P(hx, hz))
  scene.add(arcLine)
  const leaf = new THREE.Group()
  const panelBox = outlinedBox(width, H - 0.05, 0.04, { lineOpacity: 0.85, fillOpacity: 0.08 })
  panelBox.position.set(width / 2, (H - 0.05) / 2, 0)
  leaf.add(panelBox)
  leaf.position.copy(P(hx, hz))
  leaf.rotation.y = 0.12
  scene.add(leaf)
  doors[id] = { leaf, target: 0.12 }
}
door('bedroom', 1.0, 3.5, 0.9)
door('bath', 6.2, 3.5, 0.8)
door('front', 2.4, 8, 1.0)

// ---------- the kit ----------
const amberBox = (w, h, d) => outlinedBox(w, h, d, { line: C.amber, lineOpacity: 1, fill: C.amber, fillOpacity: 0.55 })
const HUB = P(0.08, 4.15, 1.5)
const hub = amberBox(0.08, 0.24, 0.17)
hub.position.copy(HUB)
scene.add(hub)
const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: C.aide }))
led.position.copy(HUB).add(new THREE.Vector3(0.05, 0.07, 0))
scene.add(led)

const sensors = {
  bath: P(7.0, 3.5, 1.5),
  front: P(3.4, 8, 1.5),
}
for (const pos of Object.values(sensors)) {
  const s = amberBox(0.06, 0.12, 0.06)
  s.position.copy(pos)
  scene.add(s)
}

// Radar field of view: ±60°, ~6 m, clipped to the hallway so it reads as "this path only".
const hallClip = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), W / 2),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 7.5 - W / 2),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), -(3.55 - D / 2)),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 4.75 - D / 2),
]
function sector(radius, opacity) {
  const geo = new THREE.CircleGeometry(radius, 48, -Math.PI / 3, (2 * Math.PI) / 3)
  geo.rotateX(-Math.PI / 2)
  const mat = fillMat(C.radar, opacity)
  mat.clippingPlanes = hallClip
  const m = new THREE.Mesh(geo, mat)
  m.position.set(HUB.x, 1.0, HUB.z)
  return m
}
const fan = sector(6, 0.13)
scene.add(fan)
const pulses = [0, 1, 2].map(() => {
  const geo = new THREE.RingGeometry(0.96, 1, 48, 1, -Math.PI / 3, (2 * Math.PI) / 3)
  geo.rotateX(-Math.PI / 2)
  const mat = fillMat(C.radar, 0.5)
  mat.clippingPlanes = hallClip
  const m = new THREE.Mesh(geo, mat)
  m.position.set(HUB.x, 1.01, HUB.z)
  scene.add(m)
  return m
})

// Dimension line for the measured walk: bedroom door → bathroom door.
const DIM_Z = 4.6
const dimPts = [P(1.45, DIM_Z, 0.02), P(6.6, DIM_Z, 0.02)]
const dimMat = new THREE.LineDashedMaterial({ color: C.line, dashSize: 0.18, gapSize: 0.1, transparent: true, opacity: 0.8 })
const dim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dimPts), dimMat)
dim.computeLineDistances()
scene.add(dim)
for (const p of dimPts) {
  const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().setZ(p.z - 0.15), p.clone().setZ(p.z + 0.15)]), lineMat(C.line, 0.8))
  scene.add(tick)
}

// ---------- people ----------
function person(color) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.9, 4, 12), fillMat(color, 0.35))
  body.position.y = 0.62
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), fillMat(color, 0.5))
  head.position.y = 1.42
  g.add(body, head)
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry, 30), lineMat(color, 0.9)).translateY(0.62))
  g.visible = false
  scene.add(g)
  return g
}
const client = person(0xffffff)
const aide = person(C.aide)
const ble = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 40), fillMat(C.aide, 0.6))
  m.rotation.x = -Math.PI / 2
  m.visible = false
  scene.add(m)
  return m
})

// ---------- labels and hotspots (HTML positioned from 3D points) ----------
const labels = []
function label(text, pos, cls) {
  const el = document.createElement('span')
  el.className = `bp-label ${cls ?? ''}`
  el.textContent = text
  el.setAttribute('aria-hidden', 'true')
  overlay.append(el)
  labels.push({ el, pos })
  return el
}
for (const r of rooms) label(r.name.toUpperCase(), P((r.x[0] + r.x[1]) / 2, r.name === 'Hallway' ? 4.95 : (r.z[0] + r.z[1]) / 2, 0), 'room')
const dimLabel = label('5.2 m · measured walk', P(4.0, DIM_Z + 0.02, 0.02), 'dim')

const PARTS = {
  overview: {
    title: 'The Abri Kit',
    body: 'One box on the hallway wall and two stick-on door sensors. The aide installs it in about 15 minutes. It goes only to the highest-risk homes, and the agency’s insurer often pays for it.',
    meta: ['~$140–170 per kit at pilot scale', '~$85–115 at volume', 'No camera · no microphone'],
  },
  hub: {
    title: 'Abri Hub',
    body: 'Has its own cellular connection and a backup battery, so the home needs no Wi-Fi. It hears the aide’s phone over Bluetooth and the door sensors over Zigbee, then sends small, signed events to Abri.',
    meta: ['LTE-M cellular · BLE · Zigbee', 'Wall-mounted 1.5–2 m up', 'Pilot build: Raspberry Pi Zero 2 W'],
    pos: HUB, view: { pos: P(2.6, 6.2, 2.6), target: P(0.6, 4.15, 1.4) },
  },
  radar: {
    title: '24 GHz radar',
    body: 'Tracks movement along the hallway about 10 times a second. The hub turns each walk into a single number: how long the bedroom-to-bathroom walk took.',
    meta: ['HLK-LD2450 · ±60° · ~6 m', 'Walking speed is a leading fall-risk signal', 'Raw signals stay in the home'],
    pos: P(3.4, 4.15, 1.0), view: { pos: P(-1.5, 6.6, 3.6), target: P(4.0, 4.15, 0.6) },
  },
  bath: {
    title: 'Bathroom door sensor',
    body: 'Records when the bathroom door opens and closes, which counts night-time bathroom trips. A rising count is a change worth a check-in.',
    meta: ['Zigbee contact sensor', 'Stick-on, battery-powered'],
    pos: sensors.bath, view: { pos: P(8.5, 6.8, 3.2), target: P(6.6, 3.5, 1.2) },
  },
  front: {
    title: 'Front door sensor',
    body: 'Timestamps every opening. Together with the aide’s phone check-in, it builds the visit record that clears aides of false accusations.',
    meta: ['Zigbee contact sensor', 'Feeds the tamper-evident evidence record'],
    pos: sensors.front, view: { pos: P(5.6, 10.8, 3.4), target: P(3.0, 7.4, 1.0) },
  },
}
const hotspots = []
Object.entries(PARTS).forEach(([id, part], i) => {
  if (!part.pos) return
  const b = document.createElement('button')
  b.className = 'bp-hot'
  b.type = 'button'
  b.textContent = String(i)
  b.setAttribute('aria-label', `Show ${part.title}`)
  b.addEventListener('click', () => select(id))
  overlay.append(b)
  hotspots.push({ el: b, pos: part.pos, id })
})

function select(id) {
  const part = PARTS[id]
  panel.innerHTML = `<p class="bp-kicker">${id === 'overview' ? 'Pilot design' : 'Part'}</p><h3>${part.title}</h3><p>${part.body}</p><ul>${part.meta.map((m) => `<li>${m}</li>`).join('')}</ul>`
  hotspots.forEach((h) => h.el.classList.toggle('active', h.id === id))
  if (part.view) fly(part.view)
}
select('overview')

// ---------- camera views ----------
const VIEWS = {
  iso: () => ({ pos: new THREE.Vector3(8.5, 11, 11.5).multiplyScalar(Math.max(1, 1.1 / camera.aspect)), target: new THREE.Vector3(0, 0, 0.3) }),
  plan: () => {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const d = Math.max(5 / t, 6 / (t * camera.aspect))
    return { pos: new THREE.Vector3(0, d, 0.001), target: new THREE.Vector3(0, 0, 0) }
  },
  hall: () => ({ pos: P(-2.2, 8.6, 5.6), target: P(4.0, 3.6, 0.2) }),
}
let flight = null
function fly(view, ms = 1100) {
  autoRotate = false
  if (reduceMotion) ms = 0
  flight = { from: camera.position.clone(), fromT: controls.target.clone(), to: view.pos.clone(), toT: view.target.clone(), t0: performance.now(), ms }
}
root.querySelectorAll('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    root.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
    fly(VIEWS[b.dataset.view]())
  }),
)
let autoRotate = !reduceMotion
controls.addEventListener('start', () => { autoRotate = false; flight = null })

// ---------- scenes: walk a path, fire events along the way ----------
const EVENT_KINDS = { presence: 'zone', transit: 'walk', door: 'door', aide_presence: 'aide', alert: 'alert' }
function emit(kind, text) {
  log.querySelector('.ev-empty')?.remove()
  const li = document.createElement('li')
  li.className = `bp-ev bp-ev-${kind}`
  const time = new Date(clock).toISOString().slice(11, 19)
  li.innerHTML = `<time>${time}</time><b>${EVENT_KINDS[kind] ?? kind}</b><span>${text}</span>`
  log.prepend(li)
  while (log.children.length > 7) log.lastChild.remove()
}

let scene_ = null // the running scene
let clock = 0
const NORMAL = 0.9, SLOW = 0.72 // m/s; matches the dashboard's "down 20% vs 8 weeks ago"

const SCENES = {
  night: { speed: NORMAL, start: '2026-11-05T02:14:00Z' },
  slow: { speed: SLOW, start: '2026-11-05T02:41:00Z' },
  aide: { speed: 1.1, start: '2026-11-05T07:13:00Z' },
}
const TRIP = [[1.4, 2.6], [1.45, 3.3], [1.45, 4.15], [6.6, 4.15], [6.6, 3.2], [6.75, 1.5]]
const VISIT = [[2.9, 9.2], [2.9, 7.4], [4.2, 6.4], [5.4, 5.0], [5.4, 4.15], [1.6, 4.15]]

function play(id) {
  const s = SCENES[id]
  const who = id === 'aide' ? aide : client
  client.visible = aide.visible = false
  ble.forEach((r) => (r.visible = false))
  Object.values(doors).forEach((d) => (d.target = 0.12))
  dimMat.color.set(C.line)
  dimLabel.textContent = '5.2 m · measured walk'
  const path = (id === 'aide' ? VISIT : TRIP).map(([x, z]) => P(x, z))
  const lengths = path.slice(1).map((p, i) => p.distanceTo(path[i]))
  log.replaceChildren()
  scene_ = { id, s, who, path, lengths, total: lengths.reduce((a, b) => a + b), dist: 0, fired: new Set(), t0: null }
  clock = Date.parse(s.start)
  who.visible = true
  who.position.copy(path[0])
  if (id === 'aide') fly({ pos: P(7.5, 12.5, 7.5), target: P(3.4, 6.2, 0) })
  else if (id === 'slow' || id === 'night') fly(VIEWS.hall())
  root.querySelectorAll('[data-scene]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === id)))
}
root.querySelectorAll('[data-scene]').forEach((b) => b.addEventListener('click', () => play(b.dataset.scene)))

const PLAYBACK = 1.6 // the walk plays a little faster than real time; reported numbers are real-time
function stepScene(dt) {
  const sc = scene_
  if (!sc) return
  const moved = sc.s.speed * dt * PLAYBACK
  sc.dist = Math.min(sc.total, sc.dist + moved)
  clock += dt * PLAYBACK * 1000
  // position along the polyline
  let d = sc.dist, i = 0
  while (i < sc.lengths.length - 1 && d > sc.lengths[i]) d -= sc.lengths[i++]
  const a = sc.path[i], b = sc.path[i + 1]
  sc.who.position.lerpVectors(a, b, Math.min(1, d / sc.lengths[i]))
  sc.who.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
  const at = (x) => !sc.fired.has(x) && sc.fired.add(x)
  const pz = sc.who.position.z + D / 2, px = sc.who.position.x + W / 2

  if (sc.id === 'aide') {
    if (pz < 8.6 && at('door')) { doors.front.target = Math.PI / 2; emit('door', 'Front door opened') }
    if (pz < 8.6) ble.forEach((r) => (r.visible = true))
    if (pz < 7.6 && at('ble')) emit('aide_presence', 'Lucía’s phone seen by hub (Bluetooth token)')
    if (pz < 7.2 && at('close')) doors.front.target = 0.12
    if (pz < 4.4 && at('zone')) emit('presence', 'Movement in hallway')
    if (sc.dist >= sc.total && at('done')) emit('alert', 'Visit start added to the evidence record · hash-chained')
  } else {
    if (pz < 3.6 && at('bedroom')) doors.bedroom.target = Math.PI / 2
    if (pz > 4.0 && at('zone')) emit('presence', 'Movement leaving bedroom door zone')
    if (px > 6.5 && at('transit')) {
      const secs = 5.15 / sc.s.speed
      emit('transit', `5.2 m in ${secs.toFixed(1)} s · ${sc.s.speed.toFixed(2)} m/s`)
      dimLabel.textContent = `5.2 m · ${secs.toFixed(1)} s · ${sc.s.speed.toFixed(2)} m/s`
      dimMat.color.set(sc.id === 'slow' ? C.amber : C.aide)
      doors.bath.target = Math.PI / 2
      emit('door', 'Bathroom door opened · night trip 3 tonight')
    }
    if (sc.id === 'slow' && sc.dist >= sc.total && at('alert'))
      emit('alert', 'Walking speed down 20% vs 8 weeks ago → fall-risk alert sent to Sunrise Home Care')
    if (sc.dist >= sc.total && at('done')) doors.bedroom.target = 0.12
  }
}

// ---------- render loop ----------
function resize() {
  const width = stage.clientWidth, height = Math.min(stage.clientHeight, 900) // never feed the canvas size back into the layout
  if (!width || !height) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(stage)
resize()
const startView = VIEWS.iso() // after resize, so the house fits the stage's aspect
camera.position.copy(startView.pos)
controls.target.copy(startView.target)

let visible = false
new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' }).observe(stage)

const v = new THREE.Vector3()
function place(el, pos) {
  v.copy(pos).project(camera)
  const hidden = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05
  el.style.opacity = hidden ? '0' : ''
  el.style.transform = `translate(${((v.x + 1) / 2) * stage.clientWidth}px, ${((1 - v.y) / 2) * stage.clientHeight}px) translate(-50%, -50%)`
}

let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(1, (now - last) / 1000) // real time even at low frame rates; capped for background tabs
  last = now
  stepScene(dt) // scenes keep time even while the stage is scrolled out of view
  if (!visible) return

  if (flight) {
    const k = Math.min(1, (now - flight.t0) / Math.max(1, flight.ms))
    const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2
    camera.position.lerpVectors(flight.from, flight.to, e)
    controls.target.lerpVectors(flight.fromT, flight.toT, e)
    if (k === 1) flight = null
  } else if (autoRotate) {
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.06)
  }
  controls.update()

  if (!reduceMotion) {
    const t = now / 1000
    pulses.forEach((p, i) => {
      const k = (t * 0.45 + i / 3) % 1
      p.scale.setScalar(0.3 + k * 5.7)
      p.material.opacity = 0.45 * (1 - k)
    })
    ble.forEach((r, i) => {
      const k = (t * 0.8 + i / 3) % 1
      r.position.copy(aide.position).setY(0.03)
      r.scale.setScalar(0.3 + k * 2.2)
      r.material.opacity = 0.6 * (1 - k)
    })
    led.material.color.set(Math.sin(t * 3) > 0 ? C.aide : 0x2c6b5a)
  } else pulses.forEach((p) => (p.visible = false))

  for (const d of Object.values(doors)) d.leaf.rotation.y += (d.target - d.leaf.rotation.y) * Math.min(1, dt * 5)

  for (const l of labels) place(l.el, l.pos)
  for (const h of hotspots) place(h.el, h.pos)
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)
root.classList.add('bp-ready')
