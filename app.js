/* ═══════════════════════════════════════════════════════
   DIA TRABALHADO v2 — app.js
   ─────────────────────────────────────────────────────
   Lógica de ciclos quinzenais, seleção de veículos,
   persistência localStorage + Firebase Firestore (SDK v9 compat)
═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   🔥 FIREBASE CONFIG
   1. Descomente os scripts no index.html
   2. Preencha os valores abaixo com suas
      credenciais do Firebase Console
══════════════════════════════════════════ */
/*
const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FS_COLLECTION = 'dias_trabalhados';
*/

/* ══════════════════════════════════════════
   CONSTANTES DE VEÍCULOS
══════════════════════════════════════════ */
const VEHICLES = [
  { key: 'fiorino',      label: 'Fiorino',      icon: '🚐', value: 130 },
  { key: 'van_diesel',   label: 'Van Diesel',   icon: '🚌', value: 170 },
  { key: 'van_eletrica', label: 'Van Elétrica', icon: '⚡',  value: 190 },
];

const STORAGE_KEY = 'dia_trab_v2';

/* ══════════════════════════════════════════
   ESTADO GLOBAL
══════════════════════════════════════════ */
/**
 * data[cycleId] = { [dateStr]: { fiorino: bool, van_diesel: bool, van_eletrica: bool } }
 * cycleId = ex: "2025-04-C1"
 */
let appData = {};

/** Índice de offset de meses a partir do mês atual (0 = atual) */
let monthOffset = 0;

/** Aba ativa: 0 = Ciclo1, 1 = Ciclo2 */
let activeCycleTab = 0;

/* ══════════════════════════════════════════
   UTILITÁRIOS DE DATA
══════════════════════════════════════════ */

/**
 * Último dia de um mês.
 * @param {number} year
 * @param {number} month - 1-based
 */
function lastDay(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Penúltimo dia de um mês.
 */
function penultDay(year, month) {
  return lastDay(year, month) - 1;
}

/**
 * Adiciona N meses a um {year, month} (1-based).
 */
function addMonths(year, month, n) {
  let m = month - 1 + n; // 0-based
  let y = year + Math.floor(m / 12);
  let mo = ((m % 12) + 12) % 12 + 1;
  return { year: y, month: mo };
}

/**
 * Formata Date para "YYYY-MM-DD"
 */
function toISO(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/**
 * Formata "YYYY-MM-DD" para "DD/MM"
 */
function toBR(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * Formata "YYYY-MM-DD" para "DD/MM/AAAA"
 */
function toBRFull(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Nome do dia da semana abreviado.
 */
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function weekdayName(iso) {
  // Usa meio-dia para evitar problemas de fuso
  const dt = new Date(iso + 'T12:00:00');
  return WEEKDAYS[dt.getDay()];
}

function isWeekend(iso) {
  const dt = new Date(iso + 'T12:00:00');
  return dt.getDay() === 0 || dt.getDay() === 6;
}

/**
 * Gera array de "YYYY-MM-DD" de start até end (inclusive).
 */
function dateRange(startISO, endISO) {
  const result = [];
  const cur = new Date(startISO + 'T12:00:00');
  const end = new Date(endISO  + 'T12:00:00');
  while (cur <= end) {
    result.push(cur.toISOString().slice(0,10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/* ══════════════════════════════════════════
   GERAÇÃO DOS CICLOS
══════════════════════════════════════════ */

/**
 * Calcula as datas de Ciclo 1 e Ciclo 2 para um mês.
 *
 * CICLO 1:
 *   Início:  dia 15 do mês atual
 *   Fim:     penúltimo dia do mês atual
 *   Receber: dia 20 do mês seguinte
 *
 * CICLO 2:
 *   Início:  último dia do mês atual
 *   Fim:     dia 14 do mês seguinte
 *   Receber: dia 05 do mês subsequente (2 meses à frente do início)
 *
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {{ c1: CycleInfo, c2: CycleInfo }}
 */
function computeCycles(year, month) {
  const ld   = lastDay(year, month);
  const pld  = penultDay(year, month);

  const next  = addMonths(year, month, 1);
  const next2 = addMonths(year, month, 2);

  const c1 = {
    id:       `${year}-${String(month).padStart(2,'0')}-C1`,
    label:    `Ciclo 1 — ${monthName(month)}/${year}`,
    start:    toISO(year, month, 15),
    end:      toISO(year, month, pld),
    payDate:  toISO(next.year, next.month, 20),
  };

  const c2 = {
    id:       `${year}-${String(month).padStart(2,'0')}-C2`,
    label:    `Ciclo 2 — ${monthName(month)}/${year}`,
    start:    toISO(year, month, ld),
    end:      toISO(next.year, next.month, 14),
    payDate:  toISO(next2.year, next2.month, 5),
  };

  return { c1, c2 };
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function monthName(m) { return MONTHS_PT[m - 1]; }

/* ══════════════════════════════════════════
   PERSISTÊNCIA
══════════════════════════════════════════ */
function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
  catch(e) { console.warn('localStorage error:', e); }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) appData = JSON.parse(raw);
  } catch(e) { console.warn('localStorage load error:', e); }
}

/* ── Firebase helpers ── */

/**
 * Salva o registro de um dia no Firestore.
 * @param {string} cycleId  - ex: "2025-04-C1"
 * @param {string} dateISO  - ex: "2025-04-15"
 * @param {Object} selection - { fiorino, van_diesel, van_eletrica }
 */
async function saveToFirestore(cycleId, dateISO, selection) {
  /* 🔥 Descomente:
  try {
    const docId = `${cycleId}_${dateISO}`;
    await db.collection(FS_COLLECTION).doc(docId).set({
      cycleId,
      date: dateISO,
      ...selection,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch(e) { console.error('Firestore write error:', e); }
  */
}

/**
 * Carrega todos os registros do Firestore para appData.
 */
async function loadFromFirestore() {
  /* 🔥 Descomente:
  try {
    const snap = await db.collection(FS_COLLECTION).get();
    snap.forEach(doc => {
      const d = doc.data();
      if (!appData[d.cycleId]) appData[d.cycleId] = {};
      appData[d.cycleId][d.date] = {
        fiorino:     d.fiorino     || false,
        van_diesel:  d.van_diesel  || false,
        van_eletrica:d.van_eletrica|| false,
      };
    });
    render();
  } catch(e) { console.error('Firestore read error:', e); }
  */
}

/* ══════════════════════════════════════════
   CÁLCULO FINANCEIRO
══════════════════════════════════════════ */

function dayTotal(cycleId, dateISO) {
  const sel = (appData[cycleId] || {})[dateISO] || {};
  return VEHICLES.reduce((sum, v) => sum + (sel[v.key] ? v.value : 0), 0);
}

function cycleTotal(cycleId, dates) {
  return dates.reduce((sum, d) => sum + dayTotal(cycleId, d), 0);
}

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ══════════════════════════════════════════
   ESTADO DE UI POR LINHA (aberta / fechada)
══════════════════════════════════════════ */
const openRows = new Set(); // guarda "cycleId_dateISO" abertas

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
const mainEl      = document.getElementById('mainContent');
const brandSubEl  = document.getElementById('brandCycle');

function render() {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth() + 1; // 1-based

  // Aplica offset
  const target = addMonths(year, month, monthOffset);
  const { c1, c2 } = computeCycles(target.year, target.month);

  // Atualiza subtítulo do header
  brandSubEl.textContent = `${monthName(target.month)} ${target.year}`;

  // Decide qual ciclo mostrar
  const cycle = activeCycleTab === 0 ? c1 : c2;

  mainEl.innerHTML = '';
  mainEl.appendChild(buildPeriodBlock(cycle));
}

function buildPeriodBlock(cycle) {
  const dates  = dateRange(cycle.start, cycle.end);
  const total  = cycleTotal(cycle.id, dates);
  const hasVal = total > 0;

  const block = document.createElement('div');
  block.className = 'period-block';

  block.innerHTML = `
    <div class="period-head">
      <div class="period-meta">
        <div>
          <div class="period-title">${cycle.label}</div>
          <div class="period-dates">
            <span class="date-chip">
              <span class="dot"></span>
              ${toBRFull(cycle.start)} → ${toBRFull(cycle.end)}
            </span>
            <span class="date-chip pay">
              <span class="dot"></span>
              Receber: ${toBRFull(cycle.payDate)}
            </span>
          </div>
        </div>
        <div class="period-total-wrap">
          <span class="total-label-sm">Total</span>
          <span class="period-total-value ${hasVal ? 'active' : ''}" id="ptotal-${cycle.id}">
            ${brl(total)}
          </span>
        </div>
      </div>
    </div>
    <div class="days-list" id="list-${cycle.id}">
      ${dates.map(d => buildDayRowHTML(cycle, d)).join('')}
    </div>
  `;

  // Eventos dos toggles e chips
  block.querySelectorAll('.day-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleRow(btn.dataset.key, block, cycle));
  });

  block.querySelectorAll('.v-chip').forEach(chip => {
    chip.addEventListener('click', () => handleVehicleClick(chip, block, cycle));
  });

  return block;
}

function buildDayRowHTML(cycle, dateISO) {
  const sel     = (appData[cycle.id] || {})[dateISO] || {};
  const total   = dayTotal(cycle.id, dateISO);
  const rowKey  = `${cycle.id}_${dateISO}`;
  const isOpen  = openRows.has(rowKey);
  const hasWork = total > 0;
  const [, , dd] = dateISO.split('-');
  const wd = weekdayName(dateISO);
  const wkd = isWeekend(dateISO);

  // Summary dots
  const dots = VEHICLES
    .filter(v => sel[v.key])
    .map(v => `<span class="summary-dot ${v.key.replace('_','-')}"></span>`)
    .join('');

  const summaryContent = dots.length
    ? dots
    : `<span class="summary-empty">—</span>`;

  // Vehicle chips
  const chips = VEHICLES.map(v => `
    <button
      class="v-chip ${v.key.replace('_','-')} ${sel[v.key] ? 'selected' : ''}"
      data-cycle="${cycle.id}"
      data-date="${dateISO}"
      data-vehicle="${v.key}"
      title="${v.label} (R$ ${v.value})"
    >
      <span class="v-icon">${v.icon}</span>
      <span class="v-name">${v.label}</span>
      <span class="v-val">R$${v.value}</span>
    </button>
  `).join('');

  return `
    <div
      class="day-row ${hasWork ? 'worked' : ''} ${wkd ? 'weekend' : ''} ${isOpen ? 'open' : ''}"
      data-row="${rowKey}"
    >
      <div class="day-info">
        <span class="day-num">${dd}</span>
        <span class="day-wd">${wd}</span>
      </div>

      <button class="day-toggle" data-key="${rowKey}" title="Ver turnos">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="5 8 10 13 15 8"/>
        </svg>
      </button>

      <!-- Resumo (quando fechado) -->
      <div class="day-summary">${summaryContent}</div>

      <!-- Chips de veículo (quando aberto) -->
      <div class="vehicle-chips">${chips}</div>

      <!-- Total do dia -->
      <div class="day-total-wrap">
        <span class="day-total ${total > 0 ? 'active' : ''}" id="dtotal-${rowKey}">
          ${total > 0 ? brl(total) : '—'}
        </span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   INTERAÇÕES
══════════════════════════════════════════ */

/** Abre/fecha a linha de um dia */
function toggleRow(rowKey, block, cycle) {
  if (openRows.has(rowKey)) {
    openRows.delete(rowKey);
  } else {
    openRows.add(rowKey);
  }
  // Re-renderiza só a lista de dias do bloco (mais leve que render() completo)
  const listEl = block.querySelector(`#list-${cycle.id}`);
  const dates  = dateRange(cycle.start, cycle.end);
  listEl.innerHTML = dates.map(d => buildDayRowHTML(cycle, d)).join('');

  // Reagrupa eventos
  bindBlockEvents(block, cycle);
}

/** Clique em chip de veículo */
function handleVehicleClick(chip, block, cycle) {
  const { cycle: cycleId, date: dateISO, vehicle } = chip.dataset;

  if (!appData[cycleId]) appData[cycleId] = {};
  if (!appData[cycleId][dateISO]) appData[cycleId][dateISO] = {};

  // Toggle
  appData[cycleId][dateISO][vehicle] = !appData[cycleId][dateISO][vehicle];

  // Persiste
  saveLocal();
  saveToFirestore(cycleId, dateISO, appData[cycleId][dateISO]);

  // Atualização cirúrgica da UI — sem re-renderizar tudo
  const rowKey = `${cycleId}_${dateISO}`;
  updateDayRowUI(rowKey, cycleId, dateISO, block);
  updatePeriodTotalUI(cycleId, cycle.start, cycle.end);
}

/** Atualiza visualmente uma linha sem re-renderizar */
function updateDayRowUI(rowKey, cycleId, dateISO, block) {
  const sel   = (appData[cycleId] || {})[dateISO] || {};
  const total = dayTotal(cycleId, dateISO);
  const rowEl = block.querySelector(`[data-row="${rowKey}"]`);
  if (!rowEl) return;

  // Chips
  rowEl.querySelectorAll('.v-chip').forEach(chip => {
    const sel2 = (appData[chip.dataset.cycle] || {})[chip.dataset.date] || {};
    chip.classList.toggle('selected', !!sel2[chip.dataset.vehicle]);
  });

  // Total do dia
  const totalEl = block.querySelector(`#dtotal-${rowKey}`);
  if (totalEl) {
    totalEl.textContent = total > 0 ? brl(total) : '—';
    totalEl.classList.toggle('active', total > 0);
  }

  // Worked class
  rowEl.classList.toggle('worked', total > 0);

  // Summary dots
  const summaryEl = rowEl.querySelector('.day-summary');
  if (summaryEl) {
    const dots = VEHICLES
      .filter(v => sel[v.key])
      .map(v => `<span class="summary-dot ${v.key.replace('_','-')}"></span>`)
      .join('');
    summaryEl.innerHTML = dots.length ? dots : `<span class="summary-empty">—</span>`;
  }
}

/** Atualiza o total do período no cabeçalho */
function updatePeriodTotalUI(cycleId, startISO, endISO) {
  const dates = dateRange(startISO, endISO);
  const total = cycleTotal(cycleId, dates);
  const el    = document.getElementById(`ptotal-${cycleId}`);
  if (el) {
    el.textContent = brl(total);
    el.classList.toggle('active', total > 0);
  }
}

/** Reagrupa todos os event listeners de um bloco (após innerHTML) */
function bindBlockEvents(block, cycle) {
  block.querySelectorAll('.day-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleRow(btn.dataset.key, block, cycle));
  });
  block.querySelectorAll('.v-chip').forEach(chip => {
    chip.addEventListener('click', () => handleVehicleClick(chip, block, cycle));
  });
}

/* ══════════════════════════════════════════
   NAVEGAÇÃO DE MESES / TABS
══════════════════════════════════════════ */
document.getElementById('btnPrevCycle').addEventListener('click', () => {
  monthOffset--;
  openRows.clear();
  render();
});

document.getElementById('btnNextCycle').addEventListener('click', () => {
  monthOffset++;
  openRows.clear();
  render();
});

document.querySelectorAll('.cycle-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cycle-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCycleTab = parseInt(tab.dataset.cycle, 10);
    openRows.clear();
    render();
  });
});

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

/* ══════════════════════════════════════════
   SERVICE WORKER
══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(r => console.log('[PWA] SW registrado:', r.scope))
      .catch(e => console.warn('[PWA] SW falhou:', e));
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
loadLocal();
// 🔥 Firebase: substitua a linha abaixo por loadFromFirestore()
render();
