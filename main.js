// Abri landing page: scroll progress, reveal-on-scroll, animated counters,
// a scroll-driven phone story, a walking-speed chart drawn by scroll, and a claims timeline.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

// Progress bar + nav state ------------------------------------------------------
const bar = $('.progress span')
const nav = $('.nav')
const navLinks = $$('.nav nav a')
const sections = navLinks.map((a) => $(a.getAttribute('href')))

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
  nav.classList.toggle('scrolled', scrollY > 20)
  const current = sections.findLastIndex((s) => s && s.getBoundingClientRect().top < innerHeight * 0.4)
  navLinks.forEach((a, i) => a.classList.toggle('on', i === current))
  parallax()
  drawChart()
}

// Reveal on scroll ---------------------------------------------------------------
const revealer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('shown'), revealer.unobserve(e.target))),
  { threshold: 0.15 },
)
$$('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`
  revealer.observe(el)
})

// Animated counters --------------------------------------------------------------
const counter = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return
    counter.unobserve(e.target)
    const el = e.target
    const end = Number(el.dataset.count)
    const dec = Number(el.dataset.decimals ?? 0)
    const fmt = (v) => `${el.dataset.prefix ?? ''}${v.toFixed(dec)}${el.dataset.suffix ?? ''}`
    if (reduced) return (el.textContent = fmt(end))
    const t0 = performance.now()
    const tick = (t) => {
      const p = clamp((t - t0) / 1400)
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}, { threshold: 0.6 })
$$('[data-count]').forEach((el) => counter.observe(el))

// Hero parallax --------------------------------------------------------------------
const floats = $$('.float')
let mx = 0
let my = 0
addEventListener('pointermove', (e) => {
  mx = e.clientX / innerWidth - 0.5
  my = e.clientY / innerHeight - 0.5
  parallax()
})
function parallax() {
  if (reduced) return
  floats.forEach((f) => {
    const d = Number(f.dataset.depth)
    f.style.transform = `translate3d(${mx * d * 300}px, ${my * d * 200 - scrollY * d * 1.5}px, 0)`
  })
}

// Scroll-driven phone story -------------------------------------------------------
const screens = $$('.screen')
const steps = $$('.step')
const typed = $('.typed')
const scoreEl = $('[data-score]')
const scoreBar = $('.score em')
let typingTimer = null

function showScreen(i) {
  screens.forEach((s, j) => s.classList.toggle('active', j === i))
  steps.forEach((s, j) => s.classList.toggle('active', j === i))
  if (i === 1) typeOut()
  if (i === 3) bumpScore()
}

function typeOut() {
  clearInterval(typingTimer)
  const text = typed.dataset.text
  if (reduced) return (typed.textContent = text)
  let n = 0
  typed.textContent = ''
  typingTimer = setInterval(() => {
    typed.textContent = text.slice(0, ++n)
    if (n >= text.length) clearInterval(typingTimer)
  }, 28)
}

function bumpScore() {
  const from = 54
  const to = 79
  scoreBar.style.width = `${to}%`
  if (reduced) return (scoreEl.textContent = to)
  const t0 = performance.now()
  const tick = (t) => {
    const p = clamp((t - t0) / 1200)
    scoreEl.textContent = Math.round(from + (to - from) * p)
    if (p < 1) requestAnimationFrame(tick)
  }
  scoreEl.textContent = from
  scoreBar.style.width = `${from}%`
  requestAnimationFrame(() => (scoreBar.style.width = `${to}%`))
  requestAnimationFrame(tick)
}

// On small screens the sticky phone is hidden; each step gets its own copy of its screen.
if (matchMedia('(max-width: 960px)').matches) {
  steps.forEach((step, i) => {
    const clone = screens[i].cloneNode(true)
    clone.className = 'inline-screen'
    const t = clone.querySelector('.typed')
    if (t) t.textContent = t.dataset.text
    const sc = clone.querySelector('[data-score]')
    if (sc) (sc.textContent = 79), (clone.querySelector('.score em').style.width = '79%')
    step.append(clone)
  })
}

const stepper = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && showScreen(Number(e.target.dataset.step))),
  { rootMargin: '-45% 0px -45% 0px' },
)
steps.forEach((s) => stepper.observe(s))

// Walking-speed chart drawn by scroll ---------------------------------------------
const speeds = [0.94, 0.93, 0.95, 0.92, 0.9, 0.88, 0.85, 0.83, 0.79, 0.77, 0.75, 0.73]
const trips = [2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5]
const chart = $('.chart')
const X = (i) => 40 + (i * 460) / (speeds.length - 1)
const Y = (v) => 270 - ((v - 0.65) / (1.0 - 0.65)) * 230
const alertY = Y(0.935 * 0.85)
$('.alert').setAttribute('y1', alertY)
$('.alert').setAttribute('y2', alertY)
$('.alert-t').setAttribute('y', alertY - 8)

function drawChart() {
  const r = chart.getBoundingClientRect()
  // 0 when the chart enters the bottom of the screen, 1 by the time it reaches the upper third.
  const p = reduced ? 1 : clamp((innerHeight - r.top) / (innerHeight * 0.75))
  const upto = p * (speeds.length - 1)
  const pts = []
  for (let i = 0; i <= Math.floor(upto); i++) pts.push([X(i), Y(speeds[i])])
  const frac = upto - Math.floor(upto)
  const k = Math.floor(upto)
  if (k < speeds.length - 1 && frac > 0) {
    const v = speeds[k] + (speeds[k + 1] - speeds[k]) * frac
    pts.push([X(k + frac), Y(v)])
  }
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  $('.trend').setAttribute('d', d)
  const last = pts.at(-1)
  $('.area').setAttribute('d', pts.length > 1 ? `${d} L${last[0]},270 L40,270 Z` : '')
  const dot = $('.dot')
  dot.setAttribute('cx', last[0])
  dot.setAttribute('cy', last[1])
  dot.classList.toggle('below', last[1] > alertY)
  const idx = Math.min(speeds.length - 1, Math.round(upto))
  $('.speed').textContent = (speeds[k] + ((speeds[Math.min(k + 1, speeds.length - 1)] - speeds[k]) * frac)).toFixed(2)
  $('.trips').textContent = trips[idx]
}

// Claims timeline plays in sequence ---------------------------------------------------
const timeline = $('.timeline')
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return
  obs.disconnect()
  const items = [...$$('.ev', timeline), $('.verdict', timeline)]
  items.forEach((el, i) => setTimeout(() => el.classList.add('shown'), reduced ? 0 : i * 450))
}, { threshold: 0.3 }).observe(timeline)

addEventListener('scroll', onScroll, { passive: true })
addEventListener('resize', onScroll)
onScroll()
showScreen(0)

// If the 3D kit blueprint can't start (no WebGL), say what it would have shown.
setTimeout(() => {
  if (!document.querySelector('#kit.bp-ready')) document.querySelector('.bp-fallback')?.classList.add('show')
}, 4000)
