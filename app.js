'use strict';

/* =========================================================
 * わんヘルス - 犬の健康管理アプリ
 * データはこのブラウザの localStorage にのみ保存されます。
 * ======================================================= */

const STORAGE_KEY = 'wan-health-v1';

const LOG_TYPES = {
  meal:    { label: 'ごはん',   icon: '🍚', valueLabel: '食べた量', options: ['完食', '半分くらい', '少しだけ', '食べなかった'] },
  walk:    { label: '散歩',     icon: '🦮', valueLabel: '時間（分）', number: true, unit: '分' },
  poop:    { label: 'うんち',   icon: '💩', valueLabel: '状態', options: ['良好', 'やわらかい', '下痢', '硬い', '血が混じる'] },
  pee:     { label: 'おしっこ', icon: '💧', valueLabel: '状態', options: ['ふつう', '多い', '少ない', '色が濃い', '血が混じる'] },
  med:     { label: 'お薬',     icon: '💊', valueLabel: '薬の名前' },
  symptom: { label: '体調',     icon: '🩺', valueLabel: '様子', options: ['元気', '元気がない', '食欲不振', '嘔吐', '咳・くしゃみ', 'かゆがる', '足をかばう', 'その他'] },
  water:   { label: '水',       icon: '🥣', valueLabel: '飲んだ量', options: ['ふつう', '多い', '少ない'] },
  note:    { label: 'メモ',     icon: '📝' },
};

// months: 次回予定日を自動提案する間隔（月）
const CARE_KINDS = {
  rabies:   { label: '狂犬病ワクチン',   icon: '💉', months: 12 },
  vaccine:  { label: '混合ワクチン',     icon: '💉', months: 12 },
  filaria:  { label: 'フィラリア予防',   icon: '🦟', months: 1 },
  fleatick: { label: 'ノミ・ダニ予防',   icon: '🛡️', months: 1 },
  vet:      { label: '通院・健康診断',   icon: '🏥', months: 0 },
  trim:     { label: 'トリミング・爪切り', icon: '✂️', months: 0 },
  other:    { label: 'その他',           icon: '📌', months: 0 },
};

/* ---------- utilities ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const pad = (n) => String(n).padStart(2, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => fmtDate(new Date());
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDate(s));
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const jpDate = (s) => {
  const d = parseDate(s);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${'日月火水木金土'[d.getDay()]})`;
};
const shortDate = (s) => { const d = parseDate(s); return `${d.getMonth() + 1}/${d.getDate()}`; };

function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
function addMonths(s, n) {
  const d = parseDate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return fmtDate(d);
}

function ageText(birthday) {
  if (!isDate(birthday)) return '';
  const b = parseDate(birthday), n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '';
  const y = Math.floor(months / 12), m = months % 12;
  return y > 0 ? `${y}歳${m}ヶ月` : `${m}ヶ月`;
}

const fmtKg = (kg) => (Math.round(kg * 100) / 100).toString();

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- state & storage ---------- */

function emptyState() {
  return { version: 1, dogs: [], activeDogId: null, weights: [], logs: [], cares: [] };
}

// 保存データ・インポートデータを安全な形に整える
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return emptyState();
  const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : '');
  const arr = (v) => (Array.isArray(v) ? v.filter((o) => o && typeof o === 'object') : []);
  const date = (v) => (isDate(v) ? v : '');

  const dogs = arr(raw.dogs).map((d) => ({
    id: str(d.id, 40) || uid(),
    name: str(d.name, 40).trim() || '名前なし',
    breed: str(d.breed, 60),
    birthday: date(d.birthday),
    sex: ['male', 'female'].includes(d.sex) ? d.sex : '',
    neutered: d.neutered === true,
    hospital: str(d.hospital, 100),
    notes: str(d.notes, 2000),
  }));
  const ids = new Set(dogs.map((d) => d.id));

  const weights = arr(raw.weights)
    .map((w) => ({ id: str(w.id, 40) || uid(), dogId: str(w.dogId, 40), date: date(w.date), kg: Number(w.kg), memo: str(w.memo, 500) }))
    .filter((w) => ids.has(w.dogId) && w.date && Number.isFinite(w.kg) && w.kg > 0);

  const logs = arr(raw.logs)
    .map((l) => ({
      id: str(l.id, 40) || uid(), dogId: str(l.dogId, 40), date: date(l.date),
      time: /^\d{2}:\d{2}$/.test(l.time) ? l.time : '',
      type: str(l.type, 20), value: str(l.value, 100), memo: str(l.memo, 1000),
    }))
    .filter((l) => ids.has(l.dogId) && l.date && Object.prototype.hasOwnProperty.call(LOG_TYPES, l.type));

  const cares = arr(raw.cares)
    .map((c) => ({
      id: str(c.id, 40) || uid(), dogId: str(c.dogId, 40), kind: str(c.kind, 20),
      title: str(c.title, 100), date: date(c.date), nextDate: date(c.nextDate),
      cost: Number.isFinite(Number(c.cost)) && Number(c.cost) > 0 ? Math.round(Number(c.cost)) : 0,
      memo: str(c.memo, 1000),
    }))
    .filter((c) => ids.has(c.dogId) && c.date && Object.prototype.hasOwnProperty.call(CARE_KINDS, c.kind));

  const activeDogId = ids.has(raw.activeDogId) ? raw.activeDogId : (dogs[0] ? dogs[0].id : null);
  return { version: 1, dogs, activeDogId, weights, logs, cares };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyState();
  } catch (e) {
    console.error('保存データの読み込みに失敗しました', e);
    return emptyState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
    toast('保存に失敗しました（ブラウザの保存容量をご確認ください）');
  }
}

let state = load();
const ui = { tab: 'home', logDate: todayStr(), weightRange: '1y' };

const activeDog = () => state.dogs.find((d) => d.id === state.activeDogId) || null;
const weightsOf = (dogId) => state.weights.filter((w) => w.dogId === dogId).sort((a, b) => a.date.localeCompare(b.date));
const logsOf = (dogId, date) => state.logs
  .filter((l) => l.dogId === dogId && l.date === date)
  .sort((a, b) => (b.time || '').localeCompare(a.time || ''));

// 種類ごとに最新の記録だけを見て「次回予定」を出す（新しい記録が入れば古い予定は消える）
function upcomingOf(dogId) {
  const latest = {};
  for (const c of state.cares) {
    if (c.dogId !== dogId) continue;
    const key = c.kind === 'other' ? `other:${c.title}` : c.kind;
    if (!latest[key] || c.date > latest[key].date) latest[key] = c;
  }
  return Object.values(latest).filter((c) => c.nextDate).sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

/* ---------- form dialog ---------- */

function fieldHtml(f) {
  const id = `f_${f.name}`;
  const req = f.required ? ' required' : '';
  const val = f.value == null ? '' : f.value;
  let control;
  if (f.type === 'select') {
    control = `<select id="${id}" name="${f.name}"${req}>${f.options.map(([v, label]) =>
      `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    control = `<textarea id="${id}" name="${f.name}" maxlength="${f.maxlength || 1000}" placeholder="${esc(f.placeholder || '')}"${req}>${esc(val)}</textarea>`;
  } else {
    const extra = ['min', 'max', 'step', 'maxlength', 'inputmode']
      .filter((k) => f[k] != null).map((k) => ` ${k}="${esc(f[k])}"`).join('');
    control = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}"${extra}${req}>`;
  }
  return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? '' : ' <span class="muted small">任意</span>'}</label>${control}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
}

function openForm({ title, fields, onSubmit, onDelete, onMount }) {
  const dlg = $('#formDialog');
  dlg.innerHTML = `
    <form>
      <h2>${esc(title)}</h2>
      ${fields.map(fieldHtml).join('')}
      <div class="form-actions">
        ${onDelete ? '<button type="button" class="btn danger" data-role="delete">削除</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn" data-role="cancel">キャンセル</button>
        <button type="submit" class="btn primary">保存</button>
      </div>
    </form>`;
  const form = $('form', dlg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {};
    for (const [k, v] of new FormData(form).entries()) values[k] = String(v).trim();
    if (onSubmit(values) !== false) dlg.close();
  });
  $('[data-role="cancel"]', dlg).addEventListener('click', () => dlg.close());
  if (onDelete) {
    $('[data-role="delete"]', dlg).addEventListener('click', () => {
      if (confirm('この記録を削除しますか？')) { onDelete(); dlg.close(); }
    });
  }
  if (onMount) onMount(form);
  dlg.showModal();
}

function commit(msg) { save(); render(); if (msg) toast(msg); }

/* ---------- forms: dog ---------- */

function dogForm(dog) {
  const d = dog || {};
  openForm({
    title: dog ? 'プロフィールを編集' : 'わんちゃんを登録',
    fields: [
      { name: 'name', label: '名前', required: true, maxlength: 40, value: d.name },
      { name: 'breed', label: '犬種', maxlength: 60, value: d.breed, placeholder: '例：柴犬' },
      { name: 'birthday', label: '誕生日', type: 'date', max: todayStr(), value: d.birthday },
      { name: 'sex', label: '性別', type: 'select', value: d.sex || '', options: [['', '未設定'], ['male', '男の子'], ['female', '女の子']] },
      { name: 'neutered', label: '避妊・去勢', type: 'select', value: d.neutered ? '1' : '0', options: [['0', 'していない／未設定'], ['1', '済み']] },
      { name: 'hospital', label: 'かかりつけ病院', maxlength: 100, value: d.hospital },
      { name: 'notes', label: 'アレルギー・持病などのメモ', type: 'textarea', maxlength: 2000, value: d.notes },
    ],
    onSubmit(v) {
      const data = { name: v.name, breed: v.breed, birthday: v.birthday, sex: v.sex, neutered: v.neutered === '1', hospital: v.hospital, notes: v.notes };
      if (!data.name) return false;
      if (dog) {
        Object.assign(dog, data);
      } else {
        const created = { id: uid(), ...data };
        state.dogs.push(created);
        state.activeDogId = created.id;
        ui.tab = 'home';
      }
      commit(dog ? '更新しました' : `${data.name} を登録しました`);
    },
  });
}

function deleteDog(dog) {
  if (!confirm(`「${dog.name}」と、その記録をすべて削除します。元に戻せません。よろしいですか？`)) return;
  state.dogs = state.dogs.filter((d) => d.id !== dog.id);
  for (const key of ['weights', 'logs', 'cares']) state[key] = state[key].filter((r) => r.dogId !== dog.id);
  if (state.activeDogId === dog.id) state.activeDogId = state.dogs[0] ? state.dogs[0].id : null;
  commit('削除しました');
}

/* ---------- forms: daily log ---------- */

function logForm(dog, type, log) {
  const def = LOG_TYPES[type];
  const l = log || {};
  const date = l.date || (ui.tab === 'logs' ? ui.logDate : todayStr());
  const fields = [
    { name: 'date', label: '日付', type: 'date', required: true, max: todayStr(), value: date },
    { name: 'time', label: '時刻', type: 'time', value: log ? l.time : (date === todayStr() ? nowTime() : '') },
  ];
  if (def.options) {
    fields.push({ name: 'value', label: def.valueLabel, type: 'select', value: l.value || def.options[0], options: def.options.map((o) => [o, o]) });
  } else if (def.number) {
    fields.push({ name: 'value', label: def.valueLabel, type: 'number', min: 1, max: 600, step: 1, inputmode: 'numeric', required: true, value: l.value || 30 });
  } else if (def.valueLabel) {
    fields.push({ name: 'value', label: def.valueLabel, required: true, maxlength: 100, value: l.value });
  }
  fields.push({ name: 'memo', label: 'メモ', type: 'textarea', value: l.memo, required: type === 'note' });

  openForm({
    title: `${def.icon} ${def.label}${log ? 'を編集' : 'を記録'}`,
    fields,
    onSubmit(v) {
      if (!isDate(v.date)) return false;
      const data = { date: v.date, time: v.time || '', value: v.value || '', memo: v.memo || '' };
      if (log) Object.assign(log, data);
      else state.logs.push({ id: uid(), dogId: dog.id, type, ...data });
      commit('記録しました');
    },
    onDelete: log ? () => { state.logs = state.logs.filter((x) => x.id !== log.id); commit('削除しました'); } : null,
  });
}

/* ---------- forms: weight ---------- */

function weightForm(dog, rec) {
  const w = rec || {};
  const last = weightsOf(dog.id).pop();
  openForm({
    title: rec ? '体重を編集' : '体重を記録',
    fields: [
      { name: 'date', label: '日付', type: 'date', required: true, max: todayStr(), value: w.date || todayStr() },
      { name: 'kg', label: '体重（kg）', type: 'number', required: true, min: 0.1, max: 150, step: 0.01, inputmode: 'decimal', value: w.kg || (last ? last.kg : '') },
      { name: 'memo', label: 'メモ', maxlength: 500, value: w.memo },
    ],
    onSubmit(v) {
      const kg = Number(v.kg);
      if (!isDate(v.date) || !Number.isFinite(kg) || kg <= 0) return false;
      // 同じ日の記録は1件にまとめる
      const id = rec ? rec.id : uid();
      state.weights = state.weights.filter((x) => x.id === id || !(x.dogId === dog.id && x.date === v.date));
      if (rec) Object.assign(rec, { date: v.date, kg, memo: v.memo });
      else state.weights.push({ id, dogId: dog.id, date: v.date, kg, memo: v.memo });
      commit('記録しました');
    },
    onDelete: rec ? () => { state.weights = state.weights.filter((x) => x.id !== rec.id); commit('削除しました'); } : null,
  });
}

/* ---------- forms: care (vaccines / prevention / vet) ---------- */

function careForm(dog, rec, preset) {
  const c = rec || preset || {};
  openForm({
    title: rec ? '予防・通院の記録を編集' : '予防・通院を記録',
    fields: [
      { name: 'kind', label: '種類', type: 'select', value: c.kind || 'vet', options: Object.entries(CARE_KINDS).map(([k, v]) => [k, v.label]) },
      { name: 'title', label: '内容', maxlength: 100, value: c.title, placeholder: '例：薬の名前、診察内容、病院名' },
      { name: 'date', label: '実施日', type: 'date', required: true, max: todayStr(), value: (rec && rec.date) || todayStr() },
      { name: 'nextDate', label: '次回予定日', type: 'date', value: rec ? rec.nextDate : '', hint: 'ワクチンや予防薬は目安の日付が自動で入ります。病院の指示に合わせて変更してください。' },
      { name: 'cost', label: '費用（円）', type: 'number', min: 0, max: 9999999, step: 1, inputmode: 'numeric', value: (rec && rec.cost) || '' },
      { name: 'memo', label: 'メモ', type: 'textarea', value: rec ? rec.memo : '' },
    ],
    onMount(form) {
      const el = form.elements;
      let touched = !!rec;
      el.nextDate.addEventListener('input', () => { touched = true; });
      const sync = () => {
        if (touched) return;
        const months = CARE_KINDS[el.kind.value].months;
        el.nextDate.value = months && isDate(el.date.value) ? addMonths(el.date.value, months) : '';
      };
      el.kind.addEventListener('change', sync);
      el.date.addEventListener('change', sync);
      sync();
    },
    onSubmit(v) {
      if (!isDate(v.date)) return false;
      if (v.nextDate && v.nextDate <= v.date) { toast('次回予定日は実施日より後にしてください'); return false; }
      const data = {
        kind: v.kind, title: v.title, date: v.date, nextDate: isDate(v.nextDate) ? v.nextDate : '',
        cost: Number(v.cost) > 0 ? Math.round(Number(v.cost)) : 0, memo: v.memo,
      };
      if (rec) Object.assign(rec, data);
      else state.cares.push({ id: uid(), dogId: dog.id, ...data });
      commit('記録しました');
    },
    onDelete: rec ? () => { state.cares = state.cares.filter((x) => x.id !== rec.id); commit('削除しました'); } : null,
  });
}

/* ---------- view pieces ---------- */

function quickGrid() {
  return `<div class="quick-grid">${Object.entries(LOG_TYPES).map(([k, t]) =>
    `<button type="button" data-action="add-log" data-type="${k}"><span aria-hidden="true">${t.icon}</span>${t.label}</button>`).join('')}</div>`;
}

function logRows(logs) {
  if (!logs.length) return '<p class="empty">まだ記録がありません</p>';
  return `<ul class="list">${logs.map((l) => {
    const t = LOG_TYPES[l.type];
    const value = l.value ? esc(l.value) + (t.unit || '') : '';
    return `<li><button type="button" class="row" data-action="edit-log" data-id="${esc(l.id)}">
      <span class="icon" aria-hidden="true">${t.icon}</span>
      <span class="body"><strong>${t.label}</strong>${value}${l.memo ? `<small>${esc(l.memo)}</small>` : ''}</span>
      <span class="side">${esc(l.time)}</span>
    </button></li>`;
  }).join('')}</ul>`;
}

function dueBadge(nextDate) {
  const d = daysBetween(todayStr(), nextDate);
  if (d < 0) return `<span class="badge overdue">⚠ ${-d}日超過</span>`;
  if (d === 0) return '<span class="badge soon">⏰ 今日</span>';
  if (d <= 14) return `<span class="badge soon">⏰ あと${d}日</span>`;
  return `<span class="badge">あと${d}日</span>`;
}

function careTitle(c) {
  const k = CARE_KINDS[c.kind];
  return c.kind === 'other' && c.title ? esc(c.title) : k.label;
}

function upcomingRows(items) {
  return `<ul class="list">${items.map((c) => `
    <li><button type="button" class="row" data-action="done-care" data-id="${esc(c.id)}" title="実施を記録する">
      <span class="icon" aria-hidden="true">${CARE_KINDS[c.kind].icon}</span>
      <span class="body"><strong>${careTitle(c)}</strong><small>${jpDate(c.nextDate)}</small></span>
      <span class="side">${dueBadge(c.nextDate)}</span>
    </button></li>`).join('')}</ul>`;
}

/* ---------- views ---------- */

const VIEWS = {
  home(dog) {
    const ws = weightsOf(dog.id);
    const last = ws[ws.length - 1];
    const meta = [dog.breed, { male: '男の子', female: '女の子' }[dog.sex], ageText(dog.birthday)].filter(Boolean).map(esc).join(' ・ ');
    const soon = upcomingOf(dog.id).filter((c) => daysBetween(todayStr(), c.nextDate) <= 60);
    return `
      <section class="card dog-card">
        <div class="dog-avatar" aria-hidden="true">🐶</div>
        <div>
          <h2>${esc(dog.name)}</h2>
          <p class="muted small">${meta || 'プロフィール未設定'}</p>
          <p class="small">${last ? `最新の体重 <strong>${fmtKg(last.kg)}kg</strong> <span class="muted">（${shortDate(last.date)}）</span>` : '<span class="muted">体重はまだ記録されていません</span>'}</p>
        </div>
      </section>
      <section class="card">
        <h2>記録する</h2>
        ${quickGrid()}
        <div class="btn-row" style="margin-top:8px">
          <button type="button" class="btn sm" data-action="add-weight">⚖️ 体重を記録</button>
          <button type="button" class="btn sm" data-action="add-care">💉 予防・通院を記録</button>
        </div>
      </section>
      <section class="card">
        <h2>今日の記録 <span class="muted small">${jpDate(todayStr())}</span></h2>
        ${logRows(logsOf(dog.id, todayStr()))}
      </section>
      <section class="card">
        <h2>近い予定 <button type="button" class="btn sm" data-action="goto" data-tab="care">すべて見る</button></h2>
        ${soon.length ? upcomingRows(soon) : '<p class="empty">60日以内の予定はありません</p>'}
      </section>`;
  },

  logs(dog) {
    const isToday = ui.logDate === todayStr();
    return `
      <div class="date-nav">
        <button type="button" class="btn" data-action="log-prev" aria-label="前の日">‹</button>
        <input type="date" id="logDate" value="${ui.logDate}" max="${todayStr()}" aria-label="日付">
        <button type="button" class="btn" data-action="log-next" aria-label="次の日"${isToday ? ' disabled' : ''}>›</button>
        <button type="button" class="btn" data-action="log-today"${isToday ? ' disabled' : ''}>今日</button>
      </div>
      <section class="card">
        <h2>${jpDate(ui.logDate)} の記録</h2>
        ${logRows(logsOf(dog.id, ui.logDate))}
      </section>
      <section class="card">
        <h2>この日に追加</h2>
        ${quickGrid()}
      </section>`;
  },

  weight(dog) {
    const ws = weightsOf(dog.id);
    const last = ws[ws.length - 1], prev = ws[ws.length - 2];
    const diff = last && prev ? last.kg - prev.kg : null;
    const diffText = diff == null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${fmtKg(Math.abs(diff))}`;
    const ranges = [['3m', '3ヶ月'], ['1y', '1年'], ['all', '全期間']];
    const rows = ws.slice().reverse().map((w, i, a) => {
      const older = a[i + 1];
      const d = older ? w.kg - older.kg : null;
      return `<tr data-action="edit-weight" data-id="${esc(w.id)}" tabindex="0">
        <td>${jpDate(w.date)}${w.memo ? `<div class="muted small">${esc(w.memo)}</div>` : ''}</td>
        <td class="num"><strong>${fmtKg(w.kg)}</strong> kg</td>
        <td class="num muted small">${d == null ? '' : (d > 0 ? '+' : d < 0 ? '−' : '±') + fmtKg(Math.abs(d))}</td>
      </tr>`;
    }).join('');
    return `
      <div class="stats">
        <div class="stat"><div class="label">最新の体重</div><div class="value">${last ? fmtKg(last.kg) : '—'}<small>kg</small></div></div>
        <div class="stat"><div class="label">前回との差</div><div class="value">${diffText}<small>kg</small></div></div>
        <div class="stat"><div class="label">記録の数</div><div class="value">${ws.length}<small>件</small></div></div>
      </div>
      <section class="card">
        <h2>体重の推移（kg）
          <span class="seg" role="group" aria-label="表示期間">${ranges.map(([k, label]) =>
            `<button type="button" data-action="range" data-range="${k}" aria-pressed="${ui.weightRange === k}">${label}</button>`).join('')}</span>
        </h2>
        <div class="chart" id="weightChart"></div>
      </section>
      <button type="button" class="btn primary" data-action="add-weight" style="width:100%;margin-bottom:16px">＋ 体重を記録</button>
      <section class="card">
        <h2>記録一覧</h2>
        ${ws.length ? `<table class="data"><thead><tr><th>日付</th><th class="num">体重</th><th class="num">前回比</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">まだ記録がありません</p>'}
      </section>`;
  },

  care(dog) {
    const up = upcomingOf(dog.id);
    const history = state.cares.filter((c) => c.dogId === dog.id).sort((a, b) => b.date.localeCompare(a.date));
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const yearCost = history.filter((c) => c.date >= yearStart).reduce((s, c) => s + c.cost, 0);
    return `
      <button type="button" class="btn primary" data-action="add-care" style="width:100%;margin-bottom:16px">＋ 予防・通院を記録</button>
      <section class="card">
        <h2>次回の予定</h2>
        ${up.length ? upcomingRows(up) + '<p class="muted small" style="margin:8px 0 0">タップすると実施を記録できます</p>' : '<p class="empty">予定はありません。ワクチンや予防薬を記録すると、次回の目安が表示されます。</p>'}
      </section>
      <section class="card">
        <h2>履歴 ${yearCost ? `<span class="muted small">今年の費用 ¥${yearCost.toLocaleString('ja-JP')}</span>` : ''}</h2>
        ${history.length ? `<ul class="list">${history.map((c) => `
          <li><button type="button" class="row" data-action="edit-care" data-id="${esc(c.id)}">
            <span class="icon" aria-hidden="true">${CARE_KINDS[c.kind].icon}</span>
            <span class="body"><strong>${CARE_KINDS[c.kind].label}</strong>${esc(c.title)}${c.memo ? `<small>${esc(c.memo)}</small>` : ''}</span>
            <span class="side">${jpDate(c.date)}${c.cost ? `<br>¥${c.cost.toLocaleString('ja-JP')}` : ''}</span>
          </button></li>`).join('')}</ul>` : '<p class="empty">まだ記録がありません</p>'}
      </section>`;
  },

  settings() {
    return `
      <section class="card">
        <h2>わんちゃん</h2>
        ${state.dogs.length ? `<ul class="list">${state.dogs.map((d) => `
          <li><div class="row">
            <span class="icon" aria-hidden="true">🐶</span>
            <span class="body"><strong>${esc(d.name)}</strong><small>${[d.breed, ageText(d.birthday)].filter(Boolean).map(esc).join(' ・ ')}</small></span>
            <span class="btn-row">
              <button type="button" class="btn sm" data-action="edit-dog" data-id="${esc(d.id)}">編集</button>
              <button type="button" class="btn sm danger" data-action="delete-dog" data-id="${esc(d.id)}">削除</button>
            </span>
          </div></li>`).join('')}</ul>` : '<p class="empty">まだ登録されていません</p>'}
        <button type="button" class="btn" data-action="add-dog" style="margin-top:12px">＋ わんちゃんを追加</button>
      </section>
      <section class="card">
        <h2>データのバックアップ</h2>
        <p class="muted small" style="margin-top:0">記録はこの端末のブラウザ内にだけ保存されます。ブラウザのデータを消すと記録も消えるため、定期的にバックアップをおすすめします。</p>
        <div class="btn-row">
          <button type="button" class="btn" data-action="export">バックアップを保存</button>
          <button type="button" class="btn" data-action="import">バックアップから復元</button>
        </div>
      </section>
      <p class="muted small">このアプリは記録用です。気になる症状があるときは、早めに動物病院へ相談してください。</p>`;
  },
};

function onboarding() {
  return `
    <section class="card" style="text-align:center;padding:32px 16px">
      <div style="font-size:3rem" aria-hidden="true">🐕</div>
      <h2 style="display:block;font-size:1.2rem">わんヘルスへようこそ</h2>
      <p class="muted">体重・ごはん・散歩・体調、ワクチンや通院の予定を<br>まとめて記録できます。</p>
      <button type="button" class="btn primary" data-action="add-dog">わんちゃんを登録する</button>
    </section>`;
}

/* ---------- weight chart (SVG) ---------- */

function niceTicks(min, max, count = 4) {
  const span = (max - min) || Math.max(1, max * 0.1);
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step + 1e-9) * step;
  let hi = Math.ceil(max / step - 1e-9) * step;
  if (hi <= lo) hi = lo + step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return { ticks, lo, hi, decimals };
}

function mountChart(dog) {
  const box = $('#weightChart');
  if (!box) return;
  const from = ui.weightRange === 'all' ? '' : addMonths(todayStr(), ui.weightRange === '3m' ? -3 : -12);
  const pts = weightsOf(dog.id).filter((w) => w.date >= from);
  if (pts.length < 2) {
    box.innerHTML = `<p class="empty">この期間の記録が2件以上になるとグラフが表示されます</p>`;
    return;
  }

  const W = Math.max(280, box.clientWidth || 320), H = 220;
  const m = { t: 16, r: 58, b: 28, l: 38 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const time = (w) => parseDate(w.date).getTime();
  const t0 = time(pts[0]), t1 = time(pts[pts.length - 1]);
  const kgs = pts.map((p) => p.kg);
  const { ticks, lo, hi, decimals } = niceTicks(Math.min(...kgs), Math.max(...kgs));
  const x = (t) => m.l + ((t - t0) / (t1 - t0)) * pw;
  const y = (kg) => m.t + (1 - (kg - lo) / (hi - lo)) * ph;
  const P = pts.map((p) => ({ ...p, x: x(time(p)), y: y(p.kg) }));

  const multiYear = parseDate(pts[0].date).getFullYear() !== parseDate(pts[pts.length - 1].date).getFullYear();
  const xLabel = (t) => {
    const d = new Date(t);
    return multiYear ? `${String(d.getFullYear()).slice(2)}/${d.getMonth() + 1}/${d.getDate()}` : `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const nx = W < 420 ? 3 : 5;
  const xTicks = Array.from({ length: nx }, (_, i) => t0 + ((t1 - t0) * i) / (nx - 1));
  const lastP = P[P.length - 1];
  const showDots = P.length <= 40;

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(dog.name)}の体重の推移。${jpDate(pts[0].date)}の${fmtKg(pts[0].kg)}kgから${jpDate(lastP.date)}の${fmtKg(lastP.kg)}kgまで。">
      ${ticks.map((v) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis-text" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(decimals)}</text>`).join('')}
      ${xTicks.map((t, i) => `<text class="axis-text" x="${x(t)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle'}">${xLabel(t)}</text>`).join('')}
      <line class="cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
      <polyline class="line" points="${P.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>
      ${(showDots ? P : [lastP]).map((p) => `<circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"/>`).join('')}
      <circle class="dot hover-dot" r="6" visibility="hidden"/>
      <text class="last-label" x="${lastP.x + 9}" y="${lastP.y + 4}">${fmtKg(lastP.kg)}kg</text>
    </svg>
    <div class="tip" hidden></div>`;

  const svg = $('svg', box), cross = $('.cross', box), hov = $('.hover-dot', box), tip = $('.tip', box);
  const show = (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = P[0];
    for (const p of P) if (Math.abs(p.x - px) < Math.abs(best.x - px)) best = p;
    cross.setAttribute('x1', best.x); cross.setAttribute('x2', best.x);
    hov.setAttribute('cx', best.x); hov.setAttribute('cy', best.y);
    cross.setAttribute('visibility', 'visible'); hov.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.textContent = `${jpDate(best.date)}　${fmtKg(best.kg)}kg`;
    const half = tip.offsetWidth / 2;
    const left = Math.min(Math.max((best.x / W) * rect.width, half), rect.width - half);
    tip.style.left = `${left}px`;
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden'); hov.setAttribute('visibility', 'hidden'); tip.hidden = true;
  };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

/* ---------- render ---------- */

function render() {
  const dog = activeDog();
  const sw = $('#dogSwitcher');
  sw.hidden = state.dogs.length < 2;
  sw.innerHTML = state.dogs.map((d) => `<option value="${esc(d.id)}"${dog && d.id === dog.id ? ' selected' : ''}>${esc(d.name)}</option>`).join('');

  document.querySelectorAll('.tabbar button').forEach((b) => {
    if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  const view = $('#view');
  view.innerHTML = !dog && ui.tab !== 'settings' ? onboarding() : VIEWS[ui.tab](dog);
  if (dog && ui.tab === 'weight') mountChart(dog);
}

/* ---------- backup ---------- */

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wan-health-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(file) {
  try {
    const raw = JSON.parse(await file.text());
    if (!raw || !Array.isArray(raw.dogs)) throw new Error('形式が違います');
    const next = normalize(raw);
    if (!next.dogs.length) throw new Error('犬のデータがありません');
    if (state.dogs.length && !confirm(`現在のデータを、バックアップの内容（${next.dogs.map((d) => d.name).join('、')}）で置き換えます。よろしいですか？`)) return;
    state = next;
    ui.tab = 'home';
    commit('復元しました');
  } catch (e) {
    console.error(e);
    alert('バックアップファイルを読み込めませんでした。わんヘルスで保存したファイルか確認してください。');
  }
}

/* ---------- events ---------- */

const ACTIONS = {
  'add-dog': () => dogForm(null),
  'edit-dog': (el) => { const d = state.dogs.find((x) => x.id === el.dataset.id); if (d) dogForm(d); },
  'delete-dog': (el) => { const d = state.dogs.find((x) => x.id === el.dataset.id); if (d) deleteDog(d); },
  'add-log': (el, dog) => dog && LOG_TYPES[el.dataset.type] && logForm(dog, el.dataset.type, null),
  'edit-log': (el, dog) => { const l = state.logs.find((x) => x.id === el.dataset.id); if (l && dog) logForm(dog, l.type, l); },
  'add-weight': (el, dog) => dog && weightForm(dog, null),
  'edit-weight': (el, dog) => { const w = state.weights.find((x) => x.id === el.dataset.id); if (w && dog) weightForm(dog, w); },
  'add-care': (el, dog) => dog && careForm(dog, null, null),
  'edit-care': (el, dog) => { const c = state.cares.find((x) => x.id === el.dataset.id); if (c && dog) careForm(dog, c, null); },
  // 予定をタップ → 同じ種類・内容で「実施した記録」を新しく作る
  'done-care': (el, dog) => { const c = state.cares.find((x) => x.id === el.dataset.id); if (c && dog) careForm(dog, null, { kind: c.kind, title: c.title }); },
  'goto': (el) => { ui.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  'range': (el) => { ui.weightRange = el.dataset.range; render(); },
  'log-prev': () => { ui.logDate = addDays(ui.logDate, -1); render(); },
  'log-next': () => { if (ui.logDate < todayStr()) { ui.logDate = addDays(ui.logDate, 1); render(); } },
  'log-today': () => { ui.logDate = todayStr(); render(); },
  'export': exportData,
  'import': () => $('#importFile').click(),
};

$('#view').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el, activeDog());
});
$('#view').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.matches('tr[data-action]')) return;
  ACTIONS[e.target.dataset.action](e.target, activeDog());
});
$('#view').addEventListener('change', (e) => {
  if (e.target.id === 'logDate' && isDate(e.target.value)) {
    ui.logDate = e.target.value > todayStr() ? todayStr() : e.target.value;
    render();
  }
});
$('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  ui.tab = b.dataset.tab;
  render();
  window.scrollTo(0, 0);
});
$('#dogSwitcher').addEventListener('change', (e) => {
  state.activeDogId = e.target.value;
  save();
  render();
});
$('#importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) importData(file);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const dog = activeDog(); if (dog && ui.tab === 'weight') mountChart(dog); }, 150);
});

render();

/* ---------- PWA（Webサーバーから開いたときだけ有効） ---------- */

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.error('オフライン対応を有効にできませんでした', e));
}
// ブラウザが記録を自動的に消してしまわないよう、保存の永続化を依頼する
if (navigator.storage && navigator.storage.persist && location.protocol.startsWith('http')) {
  navigator.storage.persist().catch(() => {});
}
