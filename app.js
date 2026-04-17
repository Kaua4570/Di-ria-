/* ═══════════════════════════════════════════════════════
   DIA TRABALHADO — app.js
   Lógica principal do PWA
   ─────────────────────────────────────────────────────
   Firebase: descomente os blocos marcados com 🔥 e
   preencha com suas credenciais para ativar a nuvem.
═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   🔥 FIREBASE CONFIG
   Preencha com seus dados do console Firebase
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
const COLLECTION = 'periods';
*/

/* ══════════════════════════════════════════
   CONSTANTES & ESTADO
══════════════════════════════════════════ */
const STORAGE_KEY = 'dia_trabalhado_v1';

/** @type {Array<Period>} */
let state = { periods: [] };

/** Período sendo editado (null = novo) */
let editingPeriodId = null;

/* ══════════════════════════════════════════
   TIPOS (JSDoc)
══════════════════════════════════════════ */
/**
 * @typedef {Object} ShiftValues
 * @property {number} rt1
 * @property {number} rt2
 * @property {number} rt3
 */

/**
 * @typedef {Object} DayRecord
 * @property {string} id       - Identificador único do dia
 * @property {string} date     - "YYYY-MM-DD"
 * @property {boolean} rt1
 * @property {boolean} rt2
 * @property {boolean} rt3
 */

/**
 * @typedef {Object} Period
 * @property {string}      id
 * @property {string}      name
 * @property {string}      startDate   - "YYYY-MM-DD"
 * @property {string}      endDate     - "YYYY-MM-DD"
 * @property {string}      payDate     - "YYYY-MM-DD"
 * @property {ShiftValues} shiftValues
 * @property {DayRecord[]} days
 */

/* ══════════════════════════════════════════
   PERSISTÊNCIA LOCAL
══════════════════════════════════════════ */
function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage indisponível:', e);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao carregar dados locais:', e);
  }
}

/* ══════════════════════════════════════════
   🔥 FIREBASE HELPERS
   Descomente os blocos abaixo para ativar
══════════════════════════════════════════ */

/**
 * Salva um período no Firestore
 * @param {Period} period
 */
async function saveToFirestore(period) {
  /* 🔥 Descomente:
  try {
    await db.collection(COLLECTION).doc(period.id).set(period);
  } catch (e) {
    console.error('Firestore write error:', e);
  }
  */
}

/**
 * Deleta um período do Firestore
 * @param {string} periodId
 */
async function deleteFromFirestore(periodId) {
  /* 🔥 Descomente:
  try {
    await db.collection(COLLECTION).doc(periodId).delete();
  } catch (e) {
    console.error('Firestore delete error:', e);
  }
  */
}

/**
 * Carrega todos os períodos do Firestore (substitui o localStorage)
 */
async function loadFromFirestore() {
  /* 🔥 Descomente:
  try {
    const snapshot = await db.collection(COLLECTION).orderBy('startDate').get();
    state.periods = snapshot.docs.map(doc => doc.data());
    render();
  } catch (e) {
    console.error('Firestore read error:', e);
  }
  */
}

/* ══════════════════════════════════════════
   UTILITÁRIOS
══════════════════════════════════════════ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Formata um valor numérico em Real (BRL)
 * @param {number} v
 */
function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata "YYYY-MM-DD" para "DD/MM/AAAA"
 * @param {string} d
 */
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/**
 * Retorna o nome curto do dia da semana para uma data "YYYY-MM-DD"
 * @param {string} d
 */
function weekday(d) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dt = new Date(d + 'T12:00:00');
  return days[dt.getDay()];
}

/**
 * Gera um array de datas (strings "YYYY-MM-DD") entre start e end (inclusive)
 * @param {string} start
 * @param {string} end
 */
function dateRange(start, end) {
  const result = [];
  const cur = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  while (cur <= last) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/**
 * Calcula o total financeiro de um dia
 * @param {DayRecord} day
 * @param {ShiftValues} sv
 */
function dayTotal(day, sv) {
  return (day.rt1 ? sv.rt1 : 0) + (day.rt2 ? sv.rt2 : 0) + (day.rt3 ? sv.rt3 : 0);
}

/**
 * Calcula o total financeiro de um período completo
 * @param {Period} period
 */
function periodTotal(period) {
  return period.days.reduce((sum, d) => sum + dayTotal(d, period.shiftValues), 0);
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
const mainContent = document.getElementById('mainContent');
const emptyState  = document.getElementById('emptyState');

function render() {
  // Limpa cards anteriores (mantém emptyState)
  document.querySelectorAll('.period-card').forEach(el => el.remove());

  const hasPeriods = state.periods.length > 0;
  emptyState.style.display = hasPeriods ? 'none' : 'flex';

  state.periods.forEach(period => {
    mainContent.appendChild(buildPeriodCard(period));
  });
}

/**
 * Constrói o card HTML de um período
 * @param {Period} period
 * @returns {HTMLElement}
 */
function buildPeriodCard(period) {
  const total = periodTotal(period);

  const card = document.createElement('div');
  card.className = 'period-card';
  card.dataset.id = period.id;

  /* ── Header ── */
  const payBadge = period.payDate
    ? `<div class="pay-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        Receber em ${fmtDate(period.payDate)}
      </div>`
    : '';

  card.innerHTML = `
    <div class="period-header">
      <div class="period-header-top">
        <h2 class="period-name">${escHtml(period.name)}</h2>
        <div class="period-actions">
          <button class="btn-icon" data-action="edit" title="Editar período">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete" data-action="delete" title="Excluir período">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="period-dates">
        <span class="date-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${fmtDate(period.startDate)}
        </span>
        <span class="date-badge">→ ${fmtDate(period.endDate)}</span>
      </div>
      ${payBadge}

      <div class="period-total-bar">
        <span class="total-label">Total do Período</span>
        <span class="total-value" data-total="${period.id}">${brl(total)}</span>
      </div>
    </div>

    <div class="period-body">
      <div class="shift-legend">
        <span class="legend-day">Dia</span>
        <span class="legend-shift legend-rt1">RT1</span>
        <span class="legend-shift legend-rt2">RT2</span>
        <span class="legend-shift legend-rt3">RT3</span>
        <span class="legend-total">Total</span>
      </div>
      <div class="days-list" data-period="${period.id}">
        ${period.days.map(day => buildDayRowHTML(day, period.shiftValues)).join('')}
      </div>
    </div>
  `;

  /* ── Eventos dos botões de editar/excluir ── */
  card.querySelector('[data-action="edit"]').addEventListener('click', () => openEditPeriod(period.id));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(period.id));

  /* ── Eventos dos checkboxes de turno ── */
  card.querySelectorAll('.shift-check input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', handleShiftChange);
  });

  return card;
}

/**
 * Gera o HTML de uma linha de dia
 * @param {DayRecord} day
 * @param {ShiftValues} sv
 */
function buildDayRowHTML(day, sv) {
  const total = dayTotal(day, sv);
  const totalStr = total > 0 ? brl(total) : '—';
  const totalClass = total > 0 ? 'day-total has-value' : 'day-total';
  const [, , dd] = day.date.split('-');
  const wd = weekday(day.date);

  const makeCheck = (rt, checked) => `
    <div class="shift-check ${rt}">
      <input type="checkbox" id="${rt}-${day.id}" name="${rt}" data-day="${day.id}" ${checked ? 'checked' : ''} />
      <label for="${rt}-${day.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </label>
    </div>`;

  return `
    <div class="day-row" data-day-id="${day.id}">
      <div class="day-label">
        <span class="day-number">${dd}</span>
        <span class="day-weekday">${wd}</span>
      </div>
      <div class="shift-checks">
        ${makeCheck('rt1', day.rt1)}
        ${makeCheck('rt2', day.rt2)}
        ${makeCheck('rt3', day.rt3)}
      </div>
      <span class="${totalClass}" data-day-total="${day.id}">${totalStr}</span>
    </div>`;
}

/**
 * Sanitiza string para evitar XSS básico
 * @param {string} s
 */
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════
   EVENTO: Marcar / desmarcar turno
══════════════════════════════════════════ */
function handleShiftChange(e) {
  const cb      = e.target;
  const dayId   = cb.dataset.day;
  const shift   = cb.name;           // 'rt1' | 'rt2' | 'rt3'
  const checked = cb.checked;

  // Encontra o período que contém esse dia
  let period = null;
  let day    = null;
  for (const p of state.periods) {
    const d = p.days.find(d => d.id === dayId);
    if (d) { period = p; day = d; break; }
  }
  if (!period || !day) return;

  day[shift] = checked;

  // Atualiza total do dia na UI
  const total      = dayTotal(day, period.shiftValues);
  const totalSpan  = document.querySelector(`[data-day-total="${dayId}"]`);
  if (totalSpan) {
    totalSpan.textContent = total > 0 ? brl(total) : '—';
    totalSpan.className   = total > 0 ? 'day-total has-value' : 'day-total';
  }

  // Atualiza total do período na UI
  const pTotal     = periodTotal(period);
  const pTotalSpan = document.querySelector(`[data-total="${period.id}"]`);
  if (pTotalSpan) pTotalSpan.textContent = brl(pTotal);

  // Persiste
  saveLocal();
  saveToFirestore(period);
}

/* ══════════════════════════════════════════
   MODAL — Novo Período
══════════════════════════════════════════ */
const modalPeriod     = document.getElementById('modalPeriod');
const modalTitle      = document.getElementById('modalTitle');
const inputName       = document.getElementById('inputPeriodName');
const inputStart      = document.getElementById('inputStartDate');
const inputEnd        = document.getElementById('inputEndDate');
const inputPay        = document.getElementById('inputPayDate');
const inputRT1        = document.getElementById('inputRT1');
const inputRT2        = document.getElementById('inputRT2');
const inputRT3        = document.getElementById('inputRT3');
const inputTotalDays  = document.getElementById('inputTotalDays');

function openModal() {
  modalPeriod.classList.add('open');
  modalPeriod.setAttribute('aria-hidden', 'false');
  inputName.focus();
}

function closeModal() {
  modalPeriod.classList.remove('open');
  modalPeriod.setAttribute('aria-hidden', 'true');
  clearModalFields();
  editingPeriodId = null;
}

function clearModalFields() {
  inputName.value = '';
  inputStart.value = '';
  inputEnd.value = '';
  inputPay.value = '';
  inputRT1.value = '';
  inputRT2.value = '';
  inputRT3.value = '';
  inputTotalDays.value = '';
}

/** Abre modal no modo edição */
function openEditPeriod(periodId) {
  const period = state.periods.find(p => p.id === periodId);
  if (!period) return;

  editingPeriodId = periodId;
  modalTitle.textContent = 'Editar Período';

  inputName.value      = period.name;
  inputStart.value     = period.startDate;
  inputEnd.value       = period.endDate;
  inputPay.value       = period.payDate || '';
  inputRT1.value       = period.shiftValues.rt1;
  inputRT2.value       = period.shiftValues.rt2;
  inputRT3.value       = period.shiftValues.rt3;
  inputTotalDays.value = period.days.length;

  openModal();
}

/* ── Salvar Período ── */
document.getElementById('btnSavePeriod').addEventListener('click', savePeriod);

function savePeriod() {
  const name   = inputName.value.trim();
  const start  = inputStart.value;
  const end    = inputEnd.value;

  if (!name || !start || !end) {
    showToast('Preencha nome, data inicial e data final.');
    return;
  }
  if (start > end) {
    showToast('Data inicial deve ser anterior à data final.');
    return;
  }

  const sv = {
    rt1: parseFloat(inputRT1.value) || 0,
    rt2: parseFloat(inputRT2.value) || 0,
    rt3: parseFloat(inputRT3.value) || 0,
  };

  if (editingPeriodId) {
    // ── Editar período existente ──
    const period = state.periods.find(p => p.id === editingPeriodId);
    if (!period) return;

    const oldDayMap = {};
    period.days.forEach(d => { oldDayMap[d.date] = d; });

    period.name        = name;
    period.startDate   = start;
    period.endDate     = end;
    period.payDate     = inputPay.value;
    period.shiftValues = sv;

    // Reconstrói dias mantendo checkboxes existentes
    const dates = dateRange(start, end);
    period.days = dates.map(date => {
      if (oldDayMap[date]) return oldDayMap[date];
      return { id: uid(), date, rt1: false, rt2: false, rt3: false };
    });

    saveLocal();
    saveToFirestore(period);
    render();
    showToast('Período atualizado!');

  } else {
    // ── Novo período ──
    const dates = dateRange(start, end);
    const period = {
      id:          uid(),
      name,
      startDate:   start,
      endDate:     end,
      payDate:     inputPay.value,
      shiftValues: sv,
      days: dates.map(date => ({
        id:   uid(),
        date,
        rt1:  false,
        rt2:  false,
        rt3:  false,
      })),
    };

    state.periods.push(period);
    saveLocal();
    saveToFirestore(period);
    render();
    showToast('Período criado com sucesso!');
  }

  closeModal();
}

/* ══════════════════════════════════════════
   EXCLUIR PERÍODO
══════════════════════════════════════════ */
function confirmDelete(periodId) {
  const period = state.periods.find(p => p.id === periodId);
  if (!period) return;

  if (!confirm(`Excluir o período "${period.name}"?\n\nEsta ação não pode ser desfeita.`)) return;

  state.periods = state.periods.filter(p => p.id !== periodId);
  saveLocal();
  deleteFromFirestore(periodId);
  render();
  showToast('Período excluído.');
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════
   EVENT LISTENERS GLOBAIS
══════════════════════════════════════════ */
document.getElementById('btnAddPeriod').addEventListener('click', () => {
  editingPeriodId = null;
  modalTitle.textContent = 'Novo Período';
  clearModalFields();

  // Pré-preenche datas com hoje e daqui 14 dias
  const today = new Date().toISOString().slice(0, 10);
  const end15 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  inputStart.value = today;
  inputEnd.value   = end15;

  openModal();
});

document.getElementById('btnCancelPeriod').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

// Fechar clicando no backdrop
modalPeriod.addEventListener('click', e => {
  if (e.target === modalPeriod) closeModal();
});

// Fechar com ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ══════════════════════════════════════════
   SERVICE WORKER (PWA)
══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.warn('SW falhou:', err));
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
loadLocal();
// 🔥 Para Firebase, substitua por: loadFromFirestore();
render();
