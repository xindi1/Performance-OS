const STORAGE_KEY = 'performanceos.entries.v1';
const THEME_KEY = 'performanceos.theme.v1';
const domains = ['recovery', 'fuel', 'training', 'focus'];
const domainLabels = { recovery: 'Recovery', fuel: 'Fuel', training: 'Training', focus: 'Focus' };

const $ = (id) => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0, 10);
let entries = loadEntries();

function loadEntries() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveEntries() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
function calculateScore() { return domains.reduce((sum, d) => sum + Number($(d).value || 0), 0); }

function scoreStatus(score) {
  if (score >= 85) return ['Peak-ready', 'Your recovery, fuel, load, and focus look strong today.'];
  if (score >= 70) return ['Ready with guardrails', 'You can perform well, but protect the weakest domain.'];
  if (score >= 50) return ['Moderate readiness', 'Choose a controlled session or tighten recovery, fuel, or focus first.'];
  if (score > 0) return ['Low readiness', 'Keep the load light and prioritize food, hydration, sleep, and reset.'];
  return ['Start today’s check-in', 'Complete the four domains to reveal today’s readiness.'];
}

function updateScoreUI() {
  const score = calculateScore();
  $('dailyScore').textContent = score;
  const [status, insight] = scoreStatus(score);
  $('scoreStatus').textContent = status;
  $('scoreInsight').textContent = insight;
  document.querySelector('.score-ring').style.background = `conic-gradient(var(--accent) ${score * 3.6}deg, rgba(255,255,255,0.1) 0deg)`;
  domains.forEach(d => $(`${d}Value`).textContent = $(d).value);
}

function hydrateDate(date) {
  const entry = entries.find(e => e.date === date);
  domains.forEach(d => { $(d).value = entry?.domains?.[d] ?? 0; $(`${d}Note`).value = entry?.notes?.[d] ?? ''; });
  ['sleep','soreness','energy','stress','dailyNote'].forEach(id => $(id).value = entry?.metrics?.[id] ?? '');
  updateScoreUI();
}

function buildEntry() {
  const date = $('entryDate').value || todayISO();
  const domainScores = Object.fromEntries(domains.map(d => [d, Number($(d).value || 0)]));
  const notes = Object.fromEntries(domains.map(d => [d, $(`${d}Note`).value.trim()]));
  const metrics = { sleep: $('sleep').value, soreness: $('soreness').value, energy: $('energy').value, stress: $('stress').value, dailyNote: $('dailyNote').value.trim() };
  return { id: crypto.randomUUID(), date, score: calculateScore(), domains: domainScores, notes, metrics, updatedAt: new Date().toISOString() };
}

function saveCurrentEntry() {
  const entry = buildEntry();
  entries = entries.filter(e => e.date !== entry.date);
  entries.push(entry);
  entries.sort((a, b) => b.date.localeCompare(a.date));
  saveEntries(); renderAll();
  $('saveEntry').textContent = 'Saved';
  setTimeout(() => $('saveEntry').textContent = 'Save Today', 900);
}

function resetForm() { domains.forEach(d => { $(d).value = 0; $(`${d}Note`).value = ''; }); ['sleep','soreness','energy','stress','dailyNote'].forEach(id => $(id).value = ''); updateScoreUI(); }
function dateLabel(date) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

function renderTrend() {
  const wrap = $('trendBars'); wrap.innerHTML = '';
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0,10); });
  days.forEach(day => { const entry = entries.find(e => e.date === day); const score = entry?.score || 0; const el = document.createElement('div'); el.className = 'trend-day'; el.innerHTML = `<div class="bar" title="${dateLabel(day)}: ${score}" style="height:${Math.max(score, 5)}%"></div><small>${dateLabel(day).replace(' ', '<br>')}</small>`; wrap.appendChild(el); });
}

function renderHistory() {
  const list = $('historyList'); const recent = entries.slice(0, 8);
  if (!recent.length) { list.innerHTML = '<p>No entries yet. Save today to start your performance record.</p>'; return; }
  list.innerHTML = recent.map(e => `<article class="history-item"><div class="history-item-top"><div><strong>${e.score}/100</strong><p>${dateLabel(e.date)}</p></div><span class="badge">${scoreStatus(e.score)[0]}</span></div>${e.metrics?.dailyNote ? `<p>${escapeHTML(e.metrics.dailyNote)}</p>` : ''}<div class="history-domains">${domains.map(d => `<span>${domainLabels[d]} ${e.domains[d]}/25</span>`).join('')}</div></article>`).join('');
}
function escapeHTML(str) { return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function renderStreak() { let streak = 0; const dates = new Set(entries.map(e => e.date)); const d = new Date(); while (dates.has(d.toISOString().slice(0,10))) { streak++; d.setDate(d.getDate() - 1); } $('streakBadge').textContent = `${streak} day streak`; }
function renderAll() { updateScoreUI(); renderTrend(); renderHistory(); renderStreak(); }

function exportJSON() { const blob = new Blob([JSON.stringify({ app: 'PerformanceOS', version: 1, entries }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `performanceos-export-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url); }
function importJSON(file) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const payload = JSON.parse(reader.result); const incoming = Array.isArray(payload) ? payload : payload.entries; if (!Array.isArray(incoming)) throw new Error('Invalid file'); const byDate = new Map(entries.map(e => [e.date, e])); incoming.forEach(e => e?.date && byDate.set(e.date, e)); entries = [...byDate.values()].sort((a,b) => b.date.localeCompare(a.date)); saveEntries(); renderAll(); hydrateDate($('entryDate').value); } catch { alert('Could not import this JSON file.'); } }; reader.readAsText(file); }
function applyTheme() { const theme = localStorage.getItem(THEME_KEY) || 'dark'; document.body.classList.toggle('light', theme === 'light'); $('themeToggle').textContent = theme === 'light' ? '☀' : '☾'; }

function init() {
  $('entryDate').value = todayISO(); applyTheme(); hydrateDate($('entryDate').value);
  domains.forEach(d => $(d).addEventListener('input', updateScoreUI));
  $('entryDate').addEventListener('change', e => hydrateDate(e.target.value));
  $('saveEntry').addEventListener('click', saveCurrentEntry); $('resetEntry').addEventListener('click', resetForm);
  $('exportData').addEventListener('click', exportJSON); $('importData').addEventListener('change', e => importJSON(e.target.files[0]));
  $('clearData').addEventListener('click', () => { if (confirm('Clear all PerformanceOS data on this device?')) { entries = []; saveEntries(); resetForm(); renderAll(); } });
  $('themeToggle').addEventListener('click', () => { const next = document.body.classList.contains('light') ? 'dark' : 'light'; localStorage.setItem(THEME_KEY, next); applyTheme(); });
  renderAll();
}
document.addEventListener('DOMContentLoaded', init);
