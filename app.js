/* ═══════════════════════════════════════════════════════
   DIA TRABALHADO v3 — app.js
   ─────────────────────────────────────────────────────
   Estrutura de dados:
     appData[cycleId][dateISO] = {
       rt1: 'fiorino' | 'van_diesel' | 'van_eletrica' | null,
       rt2: 'fiorino' | 'van_diesel' | 'van_eletrica' | null,
       rt3: 'fiorino' | 'van_diesel' | 'van_eletrica' | null,
     }
   Cada slot RT guarda qual veículo foi usado (ou null se vazio).
   ─────────────────────────────────────────────────────
   Ciclos automáticos:
     Ciclo 1 → dia 15 até penúltimo do mês, recebe dia 20 mês seguinte
     Ciclo 2 → último dia do mês até dia 14 do mês seguinte, recebe dia 5
   ─────────────────────────────────────────────────────
   Firebase: procure os blocos marcados com 🔥 e descomente
═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   🔥 FIREBASE CONFIG
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
   CONSTANTES
══════════════════════════════════════════ */
const VEHICLES = [
  { key: 'fiorino',      label: 'Fiorino',      icon: '🚐', value: 130 },
  { key: 'van_diesel',   label: 'Van Diesel',   icon: '🚌', value: 170 },
  { key: 'van_eletrica', label: 'Van Elétrica', icon: '⚡',  value: 190 },
];

/** Mapa rápido chave → objeto veículo */
const VEHICLE_MAP = Object.fromEntries(VEHICLES.map(v => [v.key, v]));

const RT_SLOTS  = ['rt1', 'rt2', 'rt3'];
const STORAGE_KEY = 'dia_trab_v3';
const WEEKDAYS    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS_PT   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* ══════════════════════════════════════════
   ESTADO GLOBAL
══════════════════════════════════════════ */
/**
 * appData[cycleId][dateISO] = { rt1: key|null, rt2: key|null, rt3: key|null }
 */
let appData = {};

/** Offset de meses em relação ao mês atual */
let monthOffset = 0;

/** Aba ativa: 0 = Ciclo1, 1 = Ciclo2 */
let activeCycleTab = 0;

/* Estado do sheet de seleção */
const sheetState = {
  cycleId: null,
  dateISO: null,
  slot:    null,   // 'rt1' | 'rt2' | 'rt3'
  blockEl: null,
  cycle:   null,
};

/* ══════════════════════════════════════════
   UTILITÁRIOS DE DATA
══════════════════════════════════════════ */
function lastDay(year, month) {            // month: 1-based
  return new Date(year, month, 0).getDate();
}
function penultDay(year, month) {
  return lastDay(year, month) - 1;
}
function addMonths(year, month, n) {
  let m = month - 1 + n;
  return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
}
function toISO(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function toBRFull(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function weekdayName(iso) {
  return WEEKDAYS[new Date(iso + 'T12:00:00').getDay()];
}
function isWeekend(iso) {
  const day = new Date(iso + 'T12:00:00').getDay();
  return day === 0 || day === 6;
}
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
function monthName(m) { return MONTHS_PT[m - 1]; }

/* ══════════════════════════════════════════
   GERAÇÃO DOS CICLOS
══════════════════════════════════════════ */
function computeCycles(year, month) {
  const ld   = lastDay(year, month);
  const pld  = penultDay(year, month);
  const next  = addMonths(year, month, 1);
  const next2 = addMonths(year, month, 2);

  const c1 = {
    id:      `${year}-${String(month).padStart(2,'0')}-C1`,
    label:   `Ciclo 1 — ${monthName(month)}/${year}`,
    start:   toISO(year, month, 15),
    end:     toISO(year, month, pld),
    payDate: toISO(next.year, next.month, 20),
  };
  const c2 = {
    id:      `${year}-${String(month).padStart(2,'00')}-C2`,
    label:   `Ciclo 2 — ${monthName(month)}/${year}`,
    start:   toISO(year, month, ld),
    end:     toISO(next.year, next.month, 14),
    payDate: toISO(next2.year, next2.month, 5),
  };
  return { c1, c2 };
}

/* ══════════════════════════════════════════
   PERSISTÊNCIA LOCAL
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

/* ══════════════════════════════════════════
   🔥 FIREBASE HELPERS
══════════════════════════════════════════ */
async function saveToFirestore(cycleId, dateISO, slots) {
  /* 🔥 Descomente:
  try {
    const docId = `${cycleId}_${dateISO}`;
    await db.collection(FS_COLLECTION).doc(docId).set({
      cycleId, date: dateISO,
      rt1: slots.rt1 || null,
      rt2: slots.rt2 || null,
      rt3: slots.rt3 || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch(e) { console.error('Firestore write error:', e); }
  */
}

async function loadFromFirestore() {
  /* 🔥 Descomente:
  try {
    const snap = await db.collection(FS_COLLECTION).get();
    snap.forEach(doc => {
      const d = doc.data();
      if (!appData[d.cycleId]) appData[d.cycleId] = {};
      appData[d.cycleId][d.date] = { rt1: d.rt1||null, rt2: d.rt2||null, rt3: d.rt3||null };
    });
    render();
  } catch(e) { console.error('Firestore read error:', e); }
  */
}

/* ══════════════════════════════════════════
   CÁLCULO FINANCEIRO
══════════════════════════════════════════ */

/** Retorna os slots do dia (garante objeto válido) */
function getDaySlots(cycleId, dateISO) {
  return ((appData[cycleId] || {})[dateISO]) || { rt1: null, rt2: null, rt3: null };
}

/** Total financeiro de um dia (soma de todos os slots RT) */
function dayTotal(cycleId, dateISO) {
  const slots = getDaySlots(cycleId, dateISO);
  return RT_SLOTS.reduce((sum, rt) => {
    const veh = slots[rt];
    return sum + (veh && VEHICLE_MAP[veh] ? VEHICLE_MAP[veh].value : 0);
  }, 0);
}

/** Total financeiro de um ciclo inteiro */
function cycleTotal(cycleId, dates) {
  return dates.reduce((sum, d) => sum + dayTotal(cycleId, d), 0);
}

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ══════════════════════════════════════════
   RENDER PRINCIPAL
══════════════════════════════════════════ */
const mainEl = document.getElementById('mainContent');

function render() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const { year: ry, month: rm } = addMonths(year, month, monthOffset);

  const { c1, c2 } = computeCycles(ry, rm);
  const cycle = activeCycleTab === 0 ? c1 : c2;

  // Atualiza subtitle do header
  const brandSub = document.getElementById('brandCycle');
  if (brandSub) brandSub.textContent = `${monthName(rm)} ${ry}`;

  mainEl.innerHTML = '';
  mainEl.appendChild(buildPeriodBlock(cycle));
}

/* ══════════════════════════════════════════
   BUILD PERIOD BLOCK
══════════════════════════════════════════ */
function buildPeriodBlock(cycle) {
  const dates  = dateRange(cycle.start, cycle.end);
  const total  = cycleTotal(cycle.id, dates);

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
          <span class="period-total-value ${total > 0 ? 'active' : ''}" id="ptotal-${cycle.id}">
            ${brl(total)}
          </span>
        </div>
      </div>
    </div>
    <div class="days-list" id="list-${cycle.id}">
      ${dates.map(d => buildDayRowHTML(cycle, d)).join('')}
    </div>
  `;

  /* Bind eventos dos slots RT */
  bindSlotEvents(block, cycle);

  return block;
}

/* ══════════════════════════════════════════
   BUILD DAY ROW HTML
══════════════════════════════════════════ */
function buildDayRowHTML(cycle, dateISO) {
  const slots   = getDaySlots(cycle.id, dateISO);
  const total   = dayTotal(cycle.id, dateISO);
  const [,,dd]  = dateISO.split('-');
  const wd      = weekdayName(dateISO);
  const wkd     = isWeekend(dateISO);
  const rowKey  = `${cycle.id}_${dateISO}`;

  const slotHTML = RT_SLOTS.map((rt, i) => buildSlotHTML(rt, i + 1, slots[rt], rowKey, dateISO, cycle.id)).join('');

  return `
    <div class="day-row ${total > 0 ? 'worked' : ''} ${wkd ? 'weekend' : ''}" data-row="${rowKey}">
      <div class="day-info">
        <span class="day-num">${dd}</span>
        <span class="day-wd">${wd}</span>
      </div>
      ${slotHTML}
      <div class="day-total-wrap">
        <span class="day-total ${total > 0 ? 'active' : ''}" id="dtotal-${rowKey}">
          ${total > 0 ? brl(total) : '—'}
        </span>
      </div>
    </div>
  `;
}

/**
 * Gera o HTML de um único slot RT
 * @param {string} rt        - 'rt1' | 'rt2' | 'rt3'
 * @param {number} rtNum     - 1 | 2 | 3
 * @param {string|null} vKey - chave do veículo ou null
 * @param {string} rowKey    - "cycleId_dateISO"
 * @param {string} dateISO
 * @param {string} cycleId
 */
function buildSlotHTML(rt, rtNum, vKey, rowKey, dateISO, cycleId) {
  const isEmpty = !vKey;
  const veh     = vKey ? VEHICLE_MAP[vKey] : null;

  let selClass = '';
  if (!isEmpty) selClass = `sel-${vKey}`;

  const iconContent = isEmpty
    ? `<span class="rt-icon">＋</span>`
    : `<span class="rt-icon">${veh.icon}</span>`;

  const nameContent = isEmpty
    ? ``
    : `<span class="rt-name">${veh.label}</span>`;

  return `
    <button
      class="rt-slot ${isEmpty ? 'empty' : selClass}"
      data-rt="${rt}"
      data-row="${rowKey}"
      data-date="${dateISO}"
      data-cycle="${cycleId}"
      title="${isEmpty ? `Adicionar turno ${rtNum}` : `${veh.label} — clique para trocar`}"
      aria-label="Turno RT${rtNum}: ${isEmpty ? 'vazio' : veh.label}"
    >
      <span class="rt-label">RT${rtNum}</span>
      ${iconContent}
      ${nameContent}
    </button>
  `;
}

/* ══════════════════════════════════════════
   BIND EVENTOS
══════════════════════════════════════════ */
function bindSlotEvents(block, cycle) {
  block.querySelectorAll('.rt-slot').forEach(btn => {
    btn.addEventListener('click', () => openSheet(btn, block, cycle));
  });
}

/* ══════════════════════════════════════════
   BOTTOM SHEET — SELEÇÃO DE VEÍCULO
══════════════════════════════════════════ */
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetOptions  = document.getElementById('sheetOptions');
const sheetTitle    = document.getElementById('sheetTitle');

/**
 * Abre o bottom sheet para selecionar veículo num slot
 * @param {HTMLElement} btn    - o botão .rt-slot clicado
 * @param {HTMLElement} blockEl - o bloco do período
 * @param {Object}      cycle
 */
function openSheet(btn, blockEl, cycle) {
  const { rt, date: dateISO, cycle: cycleId } = btn.dataset;
  const rtNum = rt.replace('rt','');

  sheetState.cycleId = cycleId;
  sheetState.dateISO = dateISO;
  sheetState.slot    = rt;
  sheetState.blockEl = blockEl;
  sheetState.cycle   = cycle;

  const currentKey = getDaySlots(cycleId, dateISO)[rt];

  sheetTitle.textContent = `RT${rtNum} — Qual veículo?`;

  /* Monta as opções */
  sheetOptions.innerHTML = '';

  VEHICLES.forEach(v => {
    const isSelected = currentKey === v.key;
    const opt = document.createElement('button');
    opt.className = `sheet-opt ${v.key.replace('_','-')}${isSelected ? ' current' : ''}`;
    opt.innerHTML = `
      <span class="sheet-opt-icon">${v.icon}</span>
      <div class="sheet-opt-info">
        <span class="sheet-opt-name">${v.label}${isSelected ? ' ✓' : ''}</span>
        <span class="sheet-opt-val">${brl(v.value)} por turno</span>
      </div>
    `;
    opt.addEventListener('click', () => selectVehicle(v.key));
    sheetOptions.appendChild(opt);
  });

  /* Opção "Limpar slot" (só aparece se houver algo selecionado) */
  if (currentKey) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'sheet-opt clear-opt';
    clearBtn.innerHTML = `
      <span class="sheet-opt-icon">✕</span>
      <div class="sheet-opt-info">
        <span class="sheet-opt-name">Limpar turno RT${rtNum}</span>
        <span class="sheet-opt-val">Remover veículo selecionado</span>
      </div>
    `;
    clearBtn.addEventListener('click', () => selectVehicle(null));
    sheetOptions.appendChild(clearBtn);
  }

  sheetBackdrop.classList.add('open');
  sheetBackdrop.setAttribute('aria-hidden', 'false');
}

/** Fecha o sheet */
function closeSheet() {
  sheetBackdrop.classList.remove('open');
  sheetBackdrop.setAttribute('aria-hidden', 'true');
}

/**
 * Aplica a seleção de veículo (ou null para limpar) ao slot ativo
 * @param {string|null} vehicleKey
 */
function selectVehicle(vehicleKey) {
  const { cycleId, dateISO, slot, blockEl, cycle } = sheetState;
  if (!cycleId || !dateISO || !slot) return;

  /* Garante estrutura de dados */
  if (!appData[cycleId]) appData[cycleId] = {};
  if (!appData[cycleId][dateISO]) appData[cycleId][dateISO] = { rt1: null, rt2: null, rt3: null };

  appData[cycleId][dateISO][slot] = vehicleKey || null;

  /* Persiste */
  saveLocal();
  saveToFirestore(cycleId, dateISO, appData[cycleId][dateISO]);

  /* Atualiza UI cirurgicamente (sem re-render total) */
  updateDayRowUI(cycleId, dateISO, blockEl);
  updatePeriodTotalUI(cycleId, cycle.start, cycle.end);

  closeSheet();
}

/* ══════════════════════════════════════════
   ATUALIZAÇÃO CIRÚRGICA DA UI
══════════════════════════════════════════ */

/**
 * Re-renderiza apenas a linha do dia afetada
 */
function updateDayRowUI(cycleId, dateISO, blockEl) {
  const rowKey = `${cycleId}_${dateISO}`;
  const rowEl  = blockEl.querySelector(`[data-row="${rowKey}"]`);
  if (!rowEl) return;

  const cycle  = sheetState.cycle;
  const newHTML = buildDayRowHTML(cycle, dateISO);

  /* Substitui só a linha */
  const tmp = document.createElement('div');
  tmp.innerHTML = newHTML;
  const newRow = tmp.firstElementChild;

  rowEl.replaceWith(newRow);

  /* Re-bind eventos da nova linha */
  newRow.querySelectorAll('.rt-slot').forEach(btn => {
    btn.addEventListener('click', () => openSheet(btn, blockEl, cycle));
  });
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

/* ══════════════════════════════════════════
   EVENTOS DO SHEET
══════════════════════════════════════════ */
document.getElementById('sheetClose').addEventListener('click', closeSheet);
sheetBackdrop.addEventListener('click', e => { if (e.target === sheetBackdrop) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ══════════════════════════════════════════
   NAVEGAÇÃO DE MESES / TABS
══════════════════════════════════════════ */
document.getElementById('btnPrevCycle').addEventListener('click', () => {
  monthOffset--;
  render();
});
document.getElementById('btnNextCycle').addEventListener('click', () => {
  monthOffset++;
  render();
});

document.querySelectorAll('.cycle-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cycle-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCycleTab = parseInt(tab.dataset.cycle, 10);
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
// 🔥 Firebase: substitua por loadFromFirestore()
render();
