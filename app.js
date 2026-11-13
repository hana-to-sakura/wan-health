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
  photo:   { label: '写真',     icon: '📷', photoRequired: true },
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

// 診療明細の区分
const ITEM_CATS = {
  exam:  { label: '診察', icon: '🩺' },
  test:  { label: '検査', icon: '🧪' },
  treat: { label: '処置・注射', icon: '💉' },
  med:   { label: '薬', icon: '💊' },
  other: { label: 'その他', icon: '📎' },
};
const MAX_CARE_ITEMS = 60;

// 血液検査の項目。単位は一般的な表記の目安（病院によって異なる）
const LAB_ITEMS = [
  ['wbc', '白血球数 (WBC)', '/µL'], ['rbc', '赤血球数 (RBC)', '万/µL'], ['hgb', 'ヘモグロビン (HGB)', 'g/dL'],
  ['hct', 'ヘマトクリット (HCT)', '%'], ['plt', '血小板数 (PLT)', '万/µL'],
  ['tp', '総蛋白 (TP)', 'g/dL'], ['alb', 'アルブミン (ALB)', 'g/dL'],
  ['alt', 'ALT (GPT)', 'U/L'], ['ast', 'AST (GOT)', 'U/L'], ['alp', 'ALP', 'U/L'], ['ggt', 'GGT', 'U/L'],
  ['bun', '尿素窒素 (BUN)', 'mg/dL'], ['cre', 'クレアチニン (CRE)', 'mg/dL'],
  ['glu', '血糖 (GLU)', 'mg/dL'], ['tcho', '総コレステロール (T-Cho)', 'mg/dL'], ['tg', '中性脂肪 (TG)', 'mg/dL'],
  ['tbil', '総ビリルビン (T-Bil)', 'mg/dL'], ['ca', 'カルシウム (Ca)', 'mg/dL'], ['ip', 'リン (IP)', 'mg/dL'],
  ['na', 'ナトリウム (Na)', 'mEq/L'], ['k', 'カリウム (K)', 'mEq/L'], ['cl', 'クロール (Cl)', 'mEq/L'],
  ['crp', 'CRP', 'mg/dL'],
  ['glob', 'グロブリン (GLOB)', 'g/dL'], ['amy', 'アミラーゼ (AMY)', 'U/L'], ['lip', 'リパーゼ (LIP)', 'U/L'],
  ['ck', 'CK (CPK)', 'U/L'], ['ldh', 'LDH', 'U/L'], ['nh3', 'アンモニア (NH3)', 'µg/dL'], ['sdma', 'SDMA', 'µg/dL'],
  ['mcv', 'MCV', 'fL'], ['mch', 'MCH', 'pg'], ['mchc', 'MCHC', 'g/dL'], ['rdw', 'RDW（赤血球分布幅）', '%'],
  ['ret', '網赤血球% (%RETIC)', '%'], ['retn', '網赤血球数 (RETIC)', 'K/µL'],
  ['neu', '好中球数 (NEU)', 'K/µL'], ['lym', 'リンパ球数 (LYM)', 'K/µL'], ['mono', '単球数 (MONO)', 'K/µL'],
  ['eos', '好酸球数 (EOS)', 'K/µL'], ['baso', '好塩基球数 (BASO)', 'K/µL'],
  ['neu_p', '好中球% (%NEU)', '%'], ['lym_p', 'リンパ球% (%LYM)', '%'], ['mono_p', '単球% (%MONO)', '%'],
  ['eos_p', '好酸球% (%EOS)', '%'], ['baso_p', '好塩基球% (%BASO)', '%'],
  ['mpv', 'MPV（平均血小板容積）', 'fL'], ['pdw', 'PDW（血小板分布幅）', 'fL'], ['pct', 'PCT（血小板クリット）', 'fL'],
];
// AIがキーを付けなかった項目を、用紙の項目名（略号）から対応づけるための別名
const LAB_ALIASES = {
  ...Object.fromEntries(LAB_ITEMS.map(([key]) => [key.toUpperCase(), key])),
  GPT: 'alt', GOT: 'ast', CREA: 'cre', 'T-CHO': 'tcho', CHOL: 'tcho', 'T-BIL': 'tbil', PHOS: 'ip',
  AMYL: 'amy', LIPA: 'lip', CPK: 'ck', HB: 'hgb', PCV: 'hct', 'γ-GTP': 'ggt', 'Γ-GTP': 'ggt',
  '%RETIC': 'ret', RETIC: 'retn', RET: 'ret',
  '%NEU': 'neu_p', '%LYM': 'lym_p', '%MONO': 'mono_p', '%EOS': 'eos_p', '%BASO': 'baso_p',
};
function labKeyFromName(name) {
  const token = String(name).replace(/％/g, '%').trim().toUpperCase().split(/[\s(（:：]+/)[0];
  return Object.prototype.hasOwnProperty.call(LAB_ALIASES, token) ? LAB_ALIASES[token] : '';
}
const LAB_BY_KEY = Object.fromEntries(LAB_ITEMS.map(([key, label, unit]) => [key, { label, unit }]));

// ふりかえりで「気になるサイン」として拾う記録
const CONCERN_VALUES = { meal: ['食べなかった', '少しだけ'], poop: ['下痢', '血が混じる'], pee: ['血が混じる'] };
const isConcern = (l) => (l.type === 'symptom' ? l.value !== '元気' : (CONCERN_VALUES[l.type] || []).includes(l.value));

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

/* ---------- photos (IndexedDB) ----------
 * 写真は容量が大きいので localStorage ではなく IndexedDB に保存する。
 * state 側には写真のIDだけを持つ（dog.photoId / log.photoIds）。
 */

const MAX_LOG_PHOTOS = 4;
let dbPromise;
function photoDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('wan-health', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('photos');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}
function photoTx(mode, fn) {
  return photoDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode);
    const req = fn(tx.objectStore('photos'));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = tx.onabort = () => reject(tx.error);
  }));
}
const photoPut = (id, blob) => photoTx('readwrite', (s) => s.put(blob, id));
const photoGet = (id) => photoTx('readonly', (s) => s.get(id));

const photoUrls = new Map();     // id -> object URL（表示用キャッシュ）
const photoPending = new Map();
function forgetPhotoUrl(id) {
  if (photoUrls.has(id)) { URL.revokeObjectURL(photoUrls.get(id)); photoUrls.delete(id); }
}
function photoDel(ids) {
  if (!ids || !ids.length) return Promise.resolve();
  ids.forEach(forgetPhotoUrl);
  return photoTx('readwrite', (s) => { ids.forEach((id) => s.delete(id)); })
    .catch((e) => console.error('写真の削除に失敗しました', e));
}
function photoClear() {
  [...photoUrls.keys()].forEach(forgetPhotoUrl);
  return photoTx('readwrite', (s) => s.clear());
}
function photoUrl(id) {
  if (photoUrls.has(id)) return Promise.resolve(photoUrls.get(id));
  if (!photoPending.has(id)) {
    photoPending.set(id, photoGet(id).then((blob) => {
      photoPending.delete(id);
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      photoUrls.set(id, url);
      return url;
    }, (e) => { photoPending.delete(id); console.error(e); return ''; }));
  }
  return photoPending.get(id);
}

// 表示用の <img>。URLが未取得なら data-photo を付けておき、hydratePhotos が後から埋める
function photoImg(id, alt) {
  const url = photoUrls.get(id);
  return `<img alt="${esc(alt || '')}" ${url ? `src="${url}"` : `data-photo="${esc(id)}"`}>`;
}
function hydratePhotos(root) {
  root.querySelectorAll('img[data-photo]').forEach((img) => {
    const id = img.dataset.photo;
    img.removeAttribute('data-photo');
    photoUrl(id).then((url) => {
      if (url) img.src = url;
      else img.alt = '写真が見つかりません';
    });
  });
}

// 端末の容量を圧迫しないよう、保存前に縮小してJPEGにする
async function resizeImage(file, maxSide) {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = src; });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('画像を変換できませんでした');
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
}

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});
function dataUrlToBlob(s) {
  const m = typeof s === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  } catch (e) { return null; }
}

const referencedPhotoIds = (s) => [
  ...s.dogs.map((d) => d.photoId).filter(Boolean),
  ...s.logs.flatMap((l) => l.photoIds),
  ...s.labs.flatMap((l) => l.photoIds),
  ...s.cares.flatMap((c) => c.photoIds),
];

/* ---------- state & storage ---------- */

function emptyState() {
  return { version: 1, dogs: [], activeDogId: null, weights: [], logs: [], cares: [], labs: [], labRefs: {} };
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
    photoId: str(d.photoId, 40),
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
      photoIds: (Array.isArray(l.photoIds) ? l.photoIds : [])
        .filter((p) => typeof p === 'string' && p).map((p) => p.slice(0, 40)).slice(0, MAX_LOG_PHOTOS),
    }))
    .filter((l) => ids.has(l.dogId) && l.date && Object.prototype.hasOwnProperty.call(LOG_TYPES, l.type));

  const cares = arr(raw.cares)
    .map((c) => ({
      id: str(c.id, 40) || uid(), dogId: str(c.dogId, 40), kind: str(c.kind, 20),
      title: str(c.title, 100), date: date(c.date), nextDate: date(c.nextDate),
      cost: Number.isFinite(Number(c.cost)) && Number(c.cost) > 0 ? Math.round(Number(c.cost)) : 0,
      memo: str(c.memo, 1000),
      items: arr(c.items).slice(0, MAX_CARE_ITEMS).map((it) => ({
        cat: Object.prototype.hasOwnProperty.call(ITEM_CATS, it.cat) ? it.cat : 'other',
        name: str(it.name, 80).trim(), qty: str(it.qty, 20).trim(),
        amount: Number.isFinite(Number(it.amount)) && Number(it.amount) > 0 ? Math.round(Number(it.amount)) : 0,
      })).filter((it) => it.name),
      photoIds: (Array.isArray(c.photoIds) ? c.photoIds : [])
        .filter((p) => typeof p === 'string' && p).map((p) => p.slice(0, 40)).slice(0, MAX_LOG_PHOTOS),
    }))
    .filter((c) => ids.has(c.dogId) && c.date && Object.prototype.hasOwnProperty.call(CARE_KINDS, c.kind));

  const photoList = (v, max) => (Array.isArray(v) ? v : [])
    .filter((p) => typeof p === 'string' && p).map((p) => p.slice(0, 40)).slice(0, max);
  const labNumbers = (v) => {
    const out = {};
    if (v && typeof v === 'object') {
      for (const [key] of LAB_ITEMS) {
        if (v[key] === '' || v[key] == null) continue;
        const n = Number(v[key]);
        if (Number.isFinite(n) && n >= 0) out[key] = n;
      }
    }
    return out;
  };
  const labs = arr(raw.labs)
    .map((l) => ({
      id: str(l.id, 40) || uid(), dogId: str(l.dogId, 40), date: date(l.date),
      memo: str(l.memo, 1000), photoIds: photoList(l.photoIds, MAX_LOG_PHOTOS), values: labNumbers(l.values),
    }))
    .filter((l) => ids.has(l.dogId) && l.date);
  const labRefs = {};
  if (raw.labRefs && typeof raw.labRefs === 'object') {
    for (const [key] of LAB_ITEMS) {
      const src = raw.labRefs[key];
      if (!src || typeof src !== 'object') continue;
      const lo = src.lo === '' || src.lo == null ? NaN : Number(src.lo);
      const hi = src.hi === '' || src.hi == null ? NaN : Number(src.hi);
      const ref = {};
      if (Number.isFinite(lo) && lo >= 0) ref.lo = lo;
      if (Number.isFinite(hi) && hi >= 0) ref.hi = hi;
      if ('lo' in ref || 'hi' in ref) labRefs[key] = ref;
    }
  }

  const activeDogId = ids.has(raw.activeDogId) ? raw.activeDogId : (dogs[0] ? dogs[0].id : null);
  return { version: 1, dogs, activeDogId, weights, logs, cares, labs, labRefs };
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
const ui = {
  tab: 'home', logDate: todayStr(), weightRange: '1y',
  logMode: 'day', reviewUnit: 'week', reviewAnchor: todayStr(),
  careMode: 'records', labItem: '',
};
const labsOf = (dogId) => state.labs.filter((l) => l.dogId === dogId).sort((a, b) => a.date.localeCompare(b.date));

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
  if (f.type === 'custom') return f.html;
  if (f.type === 'group') {
    return `<fieldset class="group"><legend>${esc(f.label)}</legend>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}
      <div class="grid2">${f.fields.map(fieldHtml).join('')}</div></fieldset>`;
  }
  if (f.type === 'photos') {
    return `<div class="field"><span class="field-label">${esc(f.label)}${f.required ? '' : ' <span class="muted small">任意</span>'}</span>
      <div class="photo-field" data-name="${f.name}">
        <div class="thumbs"></div>
        <button type="button" class="btn sm" data-role="pick">📷 写真を選ぶ</button>
        <input type="file" accept="image/*"${f.max > 1 ? ' multiple' : ''} hidden aria-label="${esc(f.label)}">
      </div>${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
  }
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
  return `<div class="field"><label for="${id}">${esc(f.label)}${f.required || f.plain ? '' : ' <span class="muted small">任意</span>'}</label>${control}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
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
  const photoFields = fields.filter((f) => f.type === 'photos')
    .map((f) => ({ f, ctl: mountPhotoField($(`.photo-field[data-name="${f.name}"]`, dlg), f) }));
  dlg.addEventListener('close', () => photoFields.forEach(({ ctl }) => ctl.discard()), { once: true });

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const values = {};
    for (const [k, v] of new FormData(form).entries()) values[k] = String(v).trim();
    for (const { f, ctl } of photoFields) {
      if (f.required && !ctl.count()) { toast('写真を選んでください'); return; }
    }
    busy = true;
    try {
      for (const { f, ctl } of photoFields) values[f.name] = await ctl.commit();
    } catch (err) {
      console.error(err);
      toast('写真を保存できませんでした（端末の空き容量をご確認ください）');
      busy = false;
      return;
    }
    busy = false;
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

// フォーム内の写真欄。選んだ写真は「保存」を押すまで IndexedDB に書かない
function mountPhotoField(wrap, f) {
  const items = (f.value || []).map((id) => ({ id, isNew: false }));
  const removed = [];
  const thumbs = $('.thumbs', wrap), pick = $('[data-role="pick"]', wrap), input = $('input', wrap);

  const draw = () => {
    thumbs.innerHTML = items.map((it, i) => `<span class="thumb">
      ${it.isNew ? `<img alt="" src="${it.url}">` : photoImg(it.id, '')}
      <button type="button" data-i="${i}" aria-label="この写真を外す">✕</button></span>`).join('');
    hydratePhotos(thumbs);
    pick.hidden = items.length >= f.max;
    pick.textContent = items.length ? '📷 写真を追加' : '📷 写真を選ぶ';
  };
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const [it] = items.splice(Number(b.dataset.i), 1);
    if (it.isNew) URL.revokeObjectURL(it.url);
    else removed.push(it.id);
    draw();
  });
  pick.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const files = [...input.files].slice(0, f.max - items.length);
    const skipped = input.files.length - files.length;
    input.value = '';
    pick.disabled = true;
    for (const file of files) {
      try {
        const blob = await resizeImage(file, f.maxSide || 1280);
        items.push({ id: uid(), isNew: true, blob, url: URL.createObjectURL(blob) });
      } catch (err) {
        console.error(err);
        toast('読み込めない画像がありました');
      }
    }
    pick.disabled = false;
    if (skipped > 0) toast(`写真は${f.max}枚までです`);
    draw();
  });
  draw();

  return {
    count: () => items.length,
    async commit() {
      for (const it of items) {
        if (!it.isNew) continue;
        await photoPut(it.id, it.blob);
        photoUrls.set(it.id, it.url);
        it.isNew = false;
      }
      await photoDel(removed.splice(0));
      return items.map((it) => it.id);
    },
    discard() {
      items.forEach((it) => { if (it.isNew) URL.revokeObjectURL(it.url); });
    },
  };
}

function commit(msg) { save(); render(); if (msg) toast(msg); }

/* ---------- forms: dog ---------- */

function dogForm(dog) {
  const d = dog || {};
  openForm({
    title: dog ? 'プロフィールを編集' : 'わんちゃんを登録',
    fields: [
      { name: 'photo', label: '写真', type: 'photos', max: 1, maxSide: 640, value: d.photoId ? [d.photoId] : [] },
      { name: 'name', label: '名前', required: true, maxlength: 40, value: d.name },
      { name: 'breed', label: '犬種', maxlength: 60, value: d.breed, placeholder: '例：柴犬' },
      { name: 'birthday', label: '誕生日', type: 'date', max: todayStr(), value: d.birthday },
      { name: 'sex', label: '性別', type: 'select', value: d.sex || '', options: [['', '未設定'], ['male', '男の子'], ['female', '女の子']] },
      { name: 'neutered', label: '避妊・去勢', type: 'select', value: d.neutered ? '1' : '0', options: [['0', 'していない／未設定'], ['1', '済み']] },
      { name: 'hospital', label: 'かかりつけ病院', maxlength: 100, value: d.hospital },
      { name: 'notes', label: 'アレルギー・持病などのメモ', type: 'textarea', maxlength: 2000, value: d.notes },
    ],
    onSubmit(v) {
      const data = { name: v.name, breed: v.breed, birthday: v.birthday, sex: v.sex, neutered: v.neutered === '1', hospital: v.hospital, notes: v.notes, photoId: v.photo[0] || '' };
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
  photoDel([dog.photoId, ...[...state.logs, ...state.labs, ...state.cares].filter((l) => l.dogId === dog.id).flatMap((l) => l.photoIds)].filter(Boolean));
  state.dogs = state.dogs.filter((d) => d.id !== dog.id);
  for (const key of ['weights', 'logs', 'cares', 'labs']) state[key] = state[key].filter((r) => r.dogId !== dog.id);
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
  fields.push({ name: 'photos', label: '写真', type: 'photos', max: MAX_LOG_PHOTOS, required: !!def.photoRequired, value: l.photoIds || [], hint: `${MAX_LOG_PHOTOS}枚まで。保存時に自動で縮小されます。` });
  fields.push({ name: 'memo', label: 'メモ', type: 'textarea', value: l.memo, required: type === 'note' });

  openForm({
    title: `${def.icon} ${def.label}${log ? 'を編集' : 'を記録'}`,
    fields,
    onSubmit(v) {
      if (!isDate(v.date)) return false;
      const data = { date: v.date, time: v.time || '', value: v.value || '', memo: v.memo || '', photoIds: v.photos };
      if (log) Object.assign(log, data);
      else state.logs.push({ id: uid(), dogId: dog.id, type, ...data });
      commit('記録しました');
    },
    onDelete: log ? () => { photoDel(log.photoIds); state.logs = state.logs.filter((x) => x.id !== log.id); commit('削除しました'); } : null,
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
  let collectItems = () => (rec && rec.items) || [];
  openForm({
    title: rec ? '予防・通院の記録を編集' : '予防・通院を記録',
    fields: [
      { name: 'photos', label: '明細書・領収書の写真', type: 'photos', max: MAX_LOG_PHOTOS, maxSide: 2000, value: (rec && rec.photoIds) || [] },
      { type: 'custom', html: aiHtml('診療明細書') },
      { name: 'kind', label: '種類', type: 'select', value: c.kind || 'vet', options: Object.entries(CARE_KINDS).map(([k, v]) => [k, v.label]) },
      { name: 'title', label: '内容', maxlength: 100, value: c.title, placeholder: '例：薬の名前、診察内容、病院名' },
      { name: 'date', label: '実施日', type: 'date', required: true, max: todayStr(), value: (rec && rec.date) || todayStr() },
      { name: 'nextDate', label: '次回予定日', type: 'date', value: rec ? rec.nextDate : '', hint: 'ワクチンや予防薬は目安の日付が自動で入ります。病院の指示に合わせて変更してください。' },
      { name: 'cost', label: '費用（円）', type: 'number', min: 0, max: 9999999, step: 1, inputmode: 'numeric', value: (rec && rec.cost) || '' },
      {
        type: 'custom', html: `<div class="field"><span class="field-label">明細（診察内容・薬） <span class="muted small">任意</span></span>
          <div class="item-rows" data-role="items"></div>
          <button type="button" class="btn sm" data-role="add-item" style="align-self:flex-start">＋ 明細を追加</button>
          <span class="hint" data-role="items-sum"></span></div>`,
      },
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

      const role = (name) => $(`[data-role="${name}"]`, form);

      // 明細の行（区分・項目名・数量・金額）
      const rows = role('items');
      const rowHtml = (it) => `<div class="item-row">
        <select data-k="cat" aria-label="区分">${Object.entries(ITEM_CATS).map(([k, c]) => `<option value="${k}"${k === it.cat ? ' selected' : ''}>${c.label}</option>`).join('')}</select>
        <input type="text" data-k="name" aria-label="項目名" maxlength="80" placeholder="項目名・薬の名前" value="${esc(it.name)}">
        <button type="button" class="btn sm danger" data-role="del-item" aria-label="この明細を削除">✕</button>
        <input type="text" data-k="qty" aria-label="数量" maxlength="20" placeholder="数量" value="${esc(it.qty)}">
        <input type="number" data-k="amount" aria-label="金額（円）" min="0" max="9999999" step="1" inputmode="numeric" placeholder="金額（円）" value="${it.amount || ''}">
      </div>`;
      collectItems = () => [...rows.querySelectorAll('.item-row')].map((r) => {
        const get = (k) => $(`[data-k="${k}"]`, r).value.trim();
        return { cat: get('cat'), name: get('name'), qty: get('qty'), amount: Number(get('amount')) > 0 ? Math.round(Number(get('amount'))) : 0 };
      }).filter((it) => it.name).slice(0, MAX_CARE_ITEMS);
      const showSum = () => {
        const items = collectItems();
        role('items-sum').textContent = items.length ? `明細${items.length}件・合計 ${yen(items.reduce((s, it) => s + it.amount, 0))}` : '';
      };
      const setItems = (items) => { rows.innerHTML = items.map(rowHtml).join(''); showSum(); };
      rows.addEventListener('input', showSum);
      rows.addEventListener('click', (e) => {
        const b = e.target.closest('[data-role="del-item"]');
        if (b) { b.closest('.item-row').remove(); showSum(); }
      });
      role('add-item').addEventListener('click', () => {
        if (rows.children.length >= MAX_CARE_ITEMS) return;
        rows.insertAdjacentHTML('beforeend', rowHtml({ cat: 'med', name: '', qty: '', amount: 0 }));
        $('[data-k="name"]', rows.lastElementChild).focus();
      });
      setItems((rec && rec.items) || []);

      role('copy-prompt').addEventListener('click', async () => {
        toast((await copyText(carePrompt(), form)) ? '指示をコピーしました' : 'コピーできませんでした');
      });
      role('ai-import').addEventListener('click', () => {
        const parsed = parseCareReply(role('ai-text').value);
        if (!parsed) { role('ai-result').textContent = '読み取れる内容が見つかりませんでした。AIの返事をそのまま貼り付けてください。'; return; }
        if (parsed.date) el.date.value = parsed.date;
        if (parsed.kind) el.kind.value = parsed.kind;
        if (parsed.hospital && !el.title.value) el.title.value = parsed.hospital;
        if (parsed.total) el.cost.value = parsed.total;
        if (parsed.items.length) setItems(parsed.items);
        sync();
        role('ai-result').textContent = `${parsed.total ? `合計 ${yen(parsed.total)} を入力しました。` : '合計金額は読み取れませんでした。'}`
          + (parsed.items.length ? `明細${parsed.items.length}件を入力しました。` : '')
          + 'AIは読み間違えることがあるので、保存前に明細書と見比べて確認してください。';
        role('ai-text').value = '';
      });
    },
    onSubmit(v) {
      if (!isDate(v.date)) return false;
      if (v.nextDate && v.nextDate <= v.date) { toast('次回予定日は実施日より後にしてください'); return false; }
      const data = {
        kind: v.kind, title: v.title, date: v.date, nextDate: isDate(v.nextDate) ? v.nextDate : '',
        cost: Number(v.cost) > 0 ? Math.round(Number(v.cost)) : 0, memo: v.memo, photoIds: v.photos, items: collectItems(),
      };
      if (rec) Object.assign(rec, data);
      else state.cares.push({ id: uid(), dogId: dog.id, ...data });
      commit('記録しました');
    },
    onDelete: rec ? () => { photoDel(rec.photoIds); state.cares = state.cares.filter((x) => x.id !== rec.id); commit('削除しました'); } : null,
  });
}

/* ---------- forms: blood test ---------- */

// AIアプリ（Claude など）に貼り付けて使う、読み取り用の指示文
function labPrompt() {
  return `添付した犬の血液検査結果の画像を読み取り、次のJSONだけを答えてください。説明や前置きは不要です。

{"date":"検査日 YYYY-MM-DD（不明なら null）","items":[{"key":"下の一覧のキー（該当なしは null）","name":"用紙に書かれた項目名","value":数値,"unit":"単位","ref_low":基準値の下限（なければ null）,"ref_high":基準値の上限（なければ null）}]}

ルール:
- 数値は用紙に書かれたとおりに。単位の換算や丸めはしない。
- 「<0.3」のように不等号が付いた値は、value を文字列（例 "<0.3"）にする。
- 読み取れない、または自信がない項目は含めない。推測で埋めない。
- 用紙にある項目は、一覧にないものも key を null にしてすべて含める。

キーの一覧:
${LAB_ITEMS.map(([key, label]) => `${key}: ${label}`).join('\n')}`;
}

// AIの返事（JSONを含むテキスト）を検査値に変換する。貼り付けられた文字列は信用せず、数値と短い文字列だけ取り出す
function parseLabReply(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let data;
  try { data = JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
  if (!data || !Array.isArray(data.items)) return null;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const short = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, 40) : '');
  const out = { date: isDate(data.date) && data.date <= todayStr() ? data.date : '', values: {}, refs: {}, others: [] };
  for (const it of data.items.slice(0, 80)) {
    if (!it || typeof it !== 'object') continue;
    // 用紙の略号（%RETIC など）から決まるならそれを優先し、決まらないときだけAIが付けたキーを使う
    const key = (typeof it.name === 'string' && labKeyFromName(it.name))
      || (typeof it.key === 'string' && Object.prototype.hasOwnProperty.call(LAB_BY_KEY, it.key) ? it.key : '');
    const value = num(it.value);
    if (key && value != null && !(key in out.values)) {
      out.values[key] = value;
      const ref = {};
      if (num(it.ref_low) != null) ref.lo = it.ref_low;
      if (num(it.ref_high) != null) ref.hi = it.ref_high;
      if ((ref.lo != null || ref.hi != null) && !(ref.lo != null && ref.hi != null && ref.lo > ref.hi)) out.refs[key] = ref;
    } else if (short(it.name) && short(it.value)) {
      out.others.push(`${short(it.name)} ${short(it.value)}${short(it.unit)}`);
    }
  }
  return Object.keys(out.values).length || out.others.length ? out : null;
}

async function copyText(text, host) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // クリップボードAPIが使えない環境向け
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    host.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}

const aiHtml = (what) => `
  <details class="ai-read"><summary>AIで読み取る（任意）</summary><div class="ai-body">
    <p class="hint">Claude などのAIアプリに${what}の写真を読ませて、内容をまとめて入力できます。</p>
    <ol>
      <li>下のボタンで、読み取り用の指示をコピーします。</li>
      <li>AIアプリで${what}の写真を添付し、指示を貼り付けて送ります。</li>
      <li>返ってきた答えをコピーして、下の欄に貼り付けます。</li>
    </ol>
    <button type="button" class="btn sm" data-role="copy-prompt">読み取り用の指示をコピー</button>
    <textarea data-role="ai-text" aria-label="AIの返事を貼り付ける欄" placeholder="AIの返事をここに貼り付け"></textarea>
    <button type="button" class="btn sm" data-role="ai-import">貼り付けた内容を取り込む</button>
    <p class="hint" data-role="ai-result" role="status"></p>
  </div></details>`;
const LAB_AI_HTML = aiHtml('検査結果');

// 診療明細書・領収書の読み取り用の指示文
function carePrompt() {
  return `添付した動物病院の診療明細書（または領収書）の画像を読み取り、次のJSONだけを答えてください。説明や前置きは不要です。

{"date":"診療日 YYYY-MM-DD（不明なら null）","hospital":"病院名（不明なら null）","total":実際に支払った合計金額（税込・円・数値）,"kind":"下の一覧から最も近いキー","items":[{"category":"exam / test / treat / med / other のどれか","name":"明細の項目名（用紙の表記のまま）","quantity":"数量や日数（用紙の表記のまま。なければ null）","amount":金額（円・数値。なければ null）}]}

ルール:
- 明細の行は省略せず、用紙に書かれた順にすべて含める。薬は名前と用量を用紙の表記のまま書く。
- category は、exam=診察料など、test=検査、treat=処置・注射・点滴など、med=処方された薬、other=それ以外（消費税・値引きなど）。
- 金額は用紙に書かれたとおりに。合計は税込で、保険などの差し引きがあれば差し引き後の支払額にする。
- 読み取れない、または自信がない項目は含めない。推測で埋めない。

kind のキーの一覧:
${Object.entries(CARE_KINDS).map(([key, k]) => `${key}: ${k.label}`).join('\n')}`;
}

function parseCareReply(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let data;
  try { data = JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
  if (!data || typeof data !== 'object') return null;
  const money = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 9999999 ? Math.round(v) : 0);
  const short = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const out = {
    date: isDate(data.date) && data.date <= todayStr() ? data.date : '',
    hospital: short(data.hospital, 60),
    total: money(data.total),
    kind: typeof data.kind === 'string' && Object.prototype.hasOwnProperty.call(CARE_KINDS, data.kind) ? data.kind : '',
    items: (Array.isArray(data.items) ? data.items : []).slice(0, MAX_CARE_ITEMS)
      .filter((it) => it && typeof it === 'object' && short(it.name, 80))
      .map((it) => ({
        cat: typeof it.category === 'string' && Object.prototype.hasOwnProperty.call(ITEM_CATS, it.category) ? it.category : 'other',
        name: short(it.name, 80),
        qty: short(typeof it.quantity === 'number' ? String(it.quantity) : it.quantity, 20),
        amount: money(it.amount),
      })),
  };
  return out.total || out.items.length ? out : null;
}

function labForm(dog, rec) {
  const r = rec || { values: {}, photoIds: [] };
  let pendingRefs = {}; // AIが読み取った基準値。保存時に、未設定の項目だけ登録する
  openForm({
    onMount(form) {
      const el = (role) => $(`[data-role="${role}"]`, form);
      el('copy-prompt').addEventListener('click', async () => {
        toast((await copyText(labPrompt(), form)) ? '指示をコピーしました' : 'コピーできませんでした');
      });
      el('ai-import').addEventListener('click', () => {
        const parsed = parseLabReply(el('ai-text').value);
        if (!parsed) { el('ai-result').textContent = '読み取れる内容が見つかりませんでした。AIの返事をそのまま貼り付けてください。'; return; }
        if (parsed.date) form.elements.date.value = parsed.date;
        for (const [key, v] of Object.entries(parsed.values)) form.elements[`v_${key}`].value = v;
        if (parsed.others.length) {
          const memo = form.elements.memo;
          memo.value = `${memo.value ? `${memo.value}\n` : ''}その他の項目: ${parsed.others.join(' / ')}`.slice(0, 1000);
        }
        pendingRefs = Object.fromEntries(Object.entries(parsed.refs).filter(([key]) => !state.labRefs[key]));
        const nRef = Object.keys(pendingRefs).length;
        el('ai-result').textContent = `${Object.keys(parsed.values).length}項目を入力しました。`
          + (parsed.others.length ? `一覧にない${parsed.others.length}項目はメモに追記しました。` : '')
          + (nRef ? `基準値（${nRef}項目）は保存時に登録されます。` : '')
          + 'AIは読み間違えることがあるので、保存前に写真と見比べて確認してください。';
        el('ai-text').value = '';
      });
    },
    title: rec ? '血液検査を編集' : '血液検査を記録',
    fields: [
      { name: 'date', label: '検査日', type: 'date', required: true, max: todayStr(), value: r.date || todayStr() },
      { name: 'photos', label: '検査結果の写真', type: 'photos', max: MAX_LOG_PHOTOS, maxSide: 2000, value: r.photoIds, hint: '用紙を撮っておくと、あとで数値を見返せます。' },
      { type: 'custom', html: LAB_AI_HTML },
      {
        type: 'group', label: '検査値', hint: 'わかる項目だけ入力すればOKです。単位は用紙の表記に合わせてください。',
        fields: LAB_ITEMS.map(([key, label, unit]) => ({
          name: `v_${key}`, label, type: 'number', min: 0, step: 'any', inputmode: 'decimal', plain: true,
          placeholder: unit, value: r.values[key] == null ? '' : r.values[key],
        })),
      },
      { name: 'memo', label: 'メモ', type: 'textarea', value: r.memo },
    ],
    onSubmit(v) {
      if (!isDate(v.date)) return false;
      const values = {};
      for (const [key] of LAB_ITEMS) {
        const raw = v[`v_${key}`];
        if (raw !== '' && raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 0) values[key] = Number(raw);
      }
      if (!v.photos.length && !Object.keys(values).length) { toast('写真か検査値のどちらかを入れてください'); return false; }
      const data = { date: v.date, memo: v.memo, photoIds: v.photos, values };
      if (rec) Object.assign(rec, data);
      else state.labs.push({ id: uid(), dogId: dog.id, ...data });
      for (const [key, ref] of Object.entries(pendingRefs)) {
        if (!state.labRefs[key] && key in values) state.labRefs[key] = ref;
      }
      commit('記録しました');
    },
    onDelete: rec ? () => { photoDel(rec.photoIds); state.labs = state.labs.filter((x) => x.id !== rec.id); commit('削除しました'); } : null,
  });
}

function labRefForm() {
  openForm({
    title: '基準値を設定',
    fields: [{
      type: 'group', label: '基準値の範囲（下限・上限）',
      hint: '基準値は病院や検査機器によって違います。お手元の検査結果に書かれている範囲を入力してください。',
      fields: LAB_ITEMS.flatMap(([key, label]) => {
        const ref = state.labRefs[key] || {};
        const base = { type: 'number', min: 0, step: 'any', inputmode: 'decimal', plain: true };
        return [
          { ...base, name: `lo_${key}`, label: `${label} 下限`, value: ref.lo == null ? '' : ref.lo },
          { ...base, name: `hi_${key}`, label: `${label} 上限`, value: ref.hi == null ? '' : ref.hi },
        ];
      }),
    }],
    onSubmit(v) {
      const refs = {};
      for (const [key, label] of LAB_ITEMS) {
        const ref = {};
        if (v[`lo_${key}`] !== '' && Number.isFinite(Number(v[`lo_${key}`]))) ref.lo = Number(v[`lo_${key}`]);
        if (v[`hi_${key}`] !== '' && Number.isFinite(Number(v[`hi_${key}`]))) ref.hi = Number(v[`hi_${key}`]);
        if (ref.lo != null && ref.hi != null && ref.lo > ref.hi) { toast(`${label} の下限が上限より大きくなっています`); return false; }
        if (ref.lo != null || ref.hi != null) refs[key] = ref;
      }
      state.labRefs = refs;
      commit('基準値を保存しました');
    },
  });
}

// 基準値から外れていれば 'H' / 'L'
function labFlag(key, v) {
  const ref = state.labRefs[key];
  if (!ref || v == null) return '';
  if (ref.hi != null && v > ref.hi) return 'H';
  if (ref.lo != null && v < ref.lo) return 'L';
  return '';
}
const labFlagHtml = (flag) => (flag === 'H' ? ' <span class="badge soon">▲高</span>' : flag === 'L' ? ' <span class="badge soon">▼低</span>' : '');
function labRefText(key) {
  const ref = state.labRefs[key];
  if (!ref) return '—';
  return `${ref.lo == null ? '' : ref.lo}〜${ref.hi == null ? '' : ref.hi}`;
}

/* ---------- review (week / month) ---------- */

function periodOf(unit, anchor) {
  const d = parseDate(anchor);
  if (unit === 'week') {
    const start = addDays(anchor, -((d.getDay() + 6) % 7)); // 月曜はじまり
    return { start, end: addDays(start, 6) };
  }
  return { start: fmtDate(new Date(d.getFullYear(), d.getMonth(), 1)), end: fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}
function shiftAnchor(unit, anchor, n) {
  return unit === 'week' ? addDays(anchor, 7 * n) : addMonths(periodOf('month', anchor).start, n);
}
function periodLabel(unit, p) {
  const s = parseDate(p.start);
  return unit === 'week' ? `${s.getFullYear()}年 ${shortDate(p.start)}〜${shortDate(p.end)}` : `${s.getFullYear()}年${s.getMonth() + 1}月`;
}
function daysIn(p) {
  const out = [];
  for (let d = p.start; d <= p.end; d = addDays(d, 1)) out.push(d);
  return out;
}

function periodStats(dogId, p) {
  const logs = state.logs.filter((l) => l.dogId === dogId && l.date >= p.start && l.date <= p.end);
  const of = (type) => logs.filter((l) => l.type === type);
  const walks = of('walk'), meals = of('meal'), poops = of('poop');
  const days = {};
  for (const l of logs) {
    const d = days[l.date] || (days[l.date] = { count: 0, concern: false, walk: 0 });
    d.count += 1;
    if (isConcern(l)) d.concern = true;
    if (l.type === 'walk') d.walk += Number(l.value) || 0;
  }
  const ws = weightsOf(dogId);
  const inPeriod = ws.filter((w) => w.date >= p.start && w.date <= p.end).pop();
  const before = ws.filter((w) => w.date < p.start).pop();
  return {
    total: logs.length, days,
    walkMin: walks.reduce((s, l) => s + (Number(l.value) || 0), 0), walkCount: walks.length,
    mealCount: meals.length, mealFull: meals.filter((l) => l.value === '完食').length,
    poopCount: poops.length, poopGood: poops.filter((l) => l.value === '良好').length,
    concerns: logs.filter(isConcern).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    cost: state.cares.filter((c) => c.dogId === dogId && c.date >= p.start && c.date <= p.end).reduce((s, c) => s + c.cost, 0),
    weight: inPeriod ? inPeriod.kg : null,
    weightDiff: inPeriod && before ? inPeriod.kg - before.kg : null,
  };
}

const signed = (n, fmt) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt ? fmt(Math.abs(n)) : Math.abs(n)}`;
const yen = (n) => `¥${n.toLocaleString('ja-JP')}`;
const statTile = (label, value, unit, sub) => `<div class="stat"><div class="label">${label}</div>
  <div class="value">${value}${unit ? `<small>${unit}</small>` : ''}</div><div class="sub">${sub || '&nbsp;'}</div></div>`;
const seg = (action, current, opts, label, cls) => `<div class="seg ${cls || ''}" role="group" aria-label="${label}">${opts.map(([k, t]) =>
  `<button type="button" data-action="${action}" data-value="${k}" aria-pressed="${current === k}">${t}</button>`).join('')}</div>`;

function calendarHtml(p, stats, unit) {
  const today = todayStr();
  const lead = unit === 'month' ? (parseDate(p.start).getDay() + 6) % 7 : 0;
  const cells = daysIn(p).map((d) => {
    const info = stats.days[d];
    const day = parseDate(d).getDate();
    const label = `${shortDate(d)} ${info ? `記録${info.count}件${info.concern ? '、気になるサインあり' : ''}` : '記録なし'}`;
    return `<button type="button" class="cal-day${info ? ' has' : ''}${info && info.concern ? ' concern' : ''}${d === today ? ' today' : ''}"
      data-action="goto-day" data-date="${d}" aria-label="${label}"${d > today ? ' disabled' : ''}>
      <span>${day}</span>${info && info.concern ? '<b aria-hidden="true">!</b>' : ''}</button>`;
  }).join('');
  return `<div class="cal">${'月火水木金土日'.split('').map((w) => `<span class="cal-head">${w}</span>`).join('')}
    ${'<span></span>'.repeat(lead)}${cells}</div>
    <p class="muted small cal-legend"><span class="cal-key has"></span>記録あり　<span class="cal-key concern">!</span>気になるサインあり　タップでその日を開きます</p>`;
}

function reviewView(dog) {
  const unit = ui.reviewUnit;
  const p = periodOf(unit, ui.reviewAnchor);
  const s = periodStats(dog.id, p);
  const prev = periodStats(dog.id, periodOf(unit, shiftAnchor(unit, ui.reviewAnchor, -1)));
  const prevName = unit === 'week' ? '前週' : '前月';
  const isCurrent = p.end >= todayStr();
  const vs = (cur, old, u, fmt) => (prev.total ? `${prevName}比 ${signed(cur - old, fmt)}${u}` : '');
  return `
    <div class="date-nav">
      ${seg('review-unit', unit, [['week', '週'], ['month', '月']], '集計の単位')}
      <button type="button" class="btn" data-action="review-prev" aria-label="前の期間">‹</button>
      <strong class="period">${periodLabel(unit, p)}</strong>
      <button type="button" class="btn" data-action="review-next" aria-label="次の期間"${isCurrent ? ' disabled' : ''}>›</button>
    </div>
    <div class="stats">
      ${statTile('散歩', s.walkMin, '分', `${s.walkCount}回${prev.total ? `・${vs(s.walkMin, prev.walkMin, '分')}` : ''}`)}
      ${statTile('ごはん完食', s.mealCount ? Math.round((s.mealFull / s.mealCount) * 100) : '—', s.mealCount ? '%' : '', s.mealCount ? `${s.mealCount}回中${s.mealFull}回` : '記録なし')}
      ${statTile('うんち', s.poopCount, '回', s.poopCount ? `良好 ${s.poopGood}回` : '記録なし')}
      ${statTile('体重', s.weight == null ? '—' : fmtKg(s.weight), s.weight == null ? '' : 'kg', s.weightDiff == null ? '' : `期間前から ${signed(s.weightDiff, fmtKg)}kg`)}
      ${statTile('医療費', yen(s.cost), '', vs(s.cost, prev.cost, '円', (n) => n.toLocaleString('ja-JP')))}
      ${statTile('気になるサイン', s.concerns.length, '件', vs(s.concerns.length, prev.concerns.length, '件'))}
    </div>
    <section class="card">
      <h2>散歩時間（1日ごと・分）</h2>
      <div class="chart" id="walkChart"></div>
    </section>
    <section class="card">
      <h2>カレンダー</h2>
      ${calendarHtml(p, s, unit)}
    </section>
    <section class="card">
      <h2>気になるサイン</h2>
      ${s.concerns.length ? `<ul class="list">${s.concerns.map((l) => `
        <li><button type="button" class="row" data-action="edit-log" data-id="${esc(l.id)}">
          <span class="icon" aria-hidden="true">${LOG_TYPES[l.type].icon}</span>
          <span class="body"><strong>${LOG_TYPES[l.type].label}</strong>${esc(l.value)}${l.memo ? `<small>${esc(l.memo)}</small>` : ''}</span>
          <span class="side">${shortDate(l.date)}<br>${esc(l.time)}</span>
        </button></li>`).join('')}</ul>
        <p class="muted small" style="margin:8px 0 0">続くときや心配なときは、動物病院に相談してください。</p>`
        : '<p class="empty">この期間に気になる記録はありません</p>'}
    </section>`;
}

/* ---------- cost & blood test views ---------- */

function costMonths(dogId) {
  const first = periodOf('month', todayStr()).start;
  const months = Array.from({ length: 12 }, (_, i) => addMonths(first, i - 11).slice(0, 7));
  const totals = Object.fromEntries(months.map((m) => [m, 0]));
  for (const c of state.cares) {
    if (c.dogId === dogId && c.date.slice(0, 7) in totals) totals[c.date.slice(0, 7)] += c.cost;
  }
  return months.map((m) => ({ ym: m, total: totals[m] }));
}

function costView(dog) {
  const months = costMonths(dog.id);
  const sum12 = months.reduce((s, m) => s + m.total, 0);
  const year = String(new Date().getFullYear());
  const mine = state.cares.filter((c) => c.dogId === dog.id && c.cost > 0);
  const sumYear = mine.filter((c) => c.date.startsWith(year)).reduce((s, c) => s + c.cost, 0);
  const from = `${months[0].ym}-01`;
  const byKind = {};
  for (const c of mine.filter((x) => x.date >= from)) {
    const k = byKind[c.kind] || (byKind[c.kind] = { count: 0, total: 0 });
    k.count += 1; k.total += c.cost;
  }
  const kinds = Object.entries(byKind).sort((a, b) => b[1].total - a[1].total);
  return `
    <div class="stats">
      ${statTile(`${year}年の合計`, yen(sumYear), '', '')}
      ${statTile('直近12ヶ月', yen(sum12), '', '')}
      ${statTile('月あたり平均', yen(Math.round(sum12 / 12)), '', '直近12ヶ月')}
    </div>
    <section class="card">
      <h2>月ごとの医療費（円）</h2>
      <div class="chart" id="costChart"></div>
    </section>
    <section class="card">
      <h2>内訳 <span class="muted small">直近12ヶ月</span></h2>
      ${kinds.length ? `<table class="data"><thead><tr><th>種類</th><th class="num">回数</th><th class="num">金額</th></tr></thead><tbody>
        ${kinds.map(([k, v]) => `<tr><td>${CARE_KINDS[k].icon} ${CARE_KINDS[k].label}</td><td class="num">${v.count}回</td><td class="num"><strong>${yen(v.total)}</strong></td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">費用の記録がありません。予防・通院の記録に「費用」を入れると集計されます。</p>'}
    </section>
    <section class="card">
      <h2>月別の一覧</h2>
      ${sum12 ? `<table class="data"><thead><tr><th>月</th><th class="num">金額</th></tr></thead><tbody>
        ${months.slice().reverse().filter((m) => m.total).map((m) => `<tr><td>${m.ym.slice(0, 4)}年${Number(m.ym.slice(5))}月</td><td class="num">${yen(m.total)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">まだ記録がありません</p>'}
    </section>`;
}

function bloodView(dog) {
  const labs = labsOf(dog.id);
  const withData = LAB_ITEMS.filter(([key]) => labs.some((l) => l.values[key] != null));
  if (!withData.some(([key]) => key === ui.labItem)) ui.labItem = withData[0] ? withData[0][0] : '';
  const recent = labs.filter((l) => Object.keys(l.values).length).slice(-2).reverse(); // 最新, 前回
  const cell = (lab, key) => (lab && lab.values[key] != null ? `<strong>${lab.values[key]}</strong>${labFlagHtml(labFlag(key, lab.values[key]))}` : '—');
  const item = LAB_BY_KEY[ui.labItem];
  return `
    <button type="button" class="btn primary" data-action="add-lab" style="width:100%;margin-bottom:16px">＋ 血液検査を記録</button>
    ${withData.length ? `
    <section class="card">
      <h2>推移</h2>
      <select id="labItem" aria-label="グラフに表示する項目">${withData.map(([key, label, unit]) =>
        `<option value="${key}"${key === ui.labItem ? ' selected' : ''}>${esc(label)}（${esc(unit)}）</option>`).join('')}</select>
      <div class="chart" id="labChart" style="margin-top:12px"></div>
      ${state.labRefs[ui.labItem] ? `<p class="muted small" style="margin:8px 0 0"><span class="band-key"></span>設定した基準値の範囲（${labRefText(ui.labItem)} ${esc(item.unit)}）</p>` : ''}
    </section>
    <section class="card">
      <h2>検査値 <button type="button" class="btn sm" data-action="edit-refs">基準値を設定</button></h2>
      <div class="table-scroll"><table class="data"><thead><tr><th>項目</th>
        <th class="num">${recent[0] ? `最新<br>${shortDate(recent[0].date)}` : ''}</th>
        <th class="num">${recent[1] ? `前回<br>${shortDate(recent[1].date)}` : ''}</th>
        <th class="num">基準値</th></tr></thead><tbody>
        ${withData.map(([key, label, unit]) => `<tr><td>${esc(label)}<div class="muted small">${esc(unit)}</div></td>
          <td class="num">${cell(recent[0], key)}</td><td class="num">${cell(recent[1], key)}</td>
          <td class="num muted small">${labRefText(key)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted small" style="margin:8px 0 0">▲▼は、設定した基準値から外れている値です。結果の見方は、かかりつけの獣医師に確認してください。</p>
    </section>` : ''}
    <section class="card">
      <h2>検査の記録</h2>
      ${labs.length ? `<ul class="list">${labs.slice().reverse().map((l) => `
        <li><button type="button" class="row" data-action="edit-lab" data-id="${esc(l.id)}">
          <span class="icon" aria-hidden="true">🧪</span>
          <span class="body"><strong>${jpDate(l.date)}</strong><small>${Object.keys(l.values).length}項目${l.memo ? `　${esc(l.memo)}` : ''}</small></span>
          <span class="side">編集</span>
        </button>${l.photoIds.length ? `<div class="photo-strip">${l.photoIds.map((id) =>
          `<button type="button" class="photo-btn" data-action="view-photo" data-id="${esc(id)}" aria-label="検査結果の写真を大きく表示">${photoImg(id, '検査結果の写真')}</button>`).join('')}</div>` : ''}</li>`).join('')}</ul>`
        : '<p class="empty">まだ記録がありません。検査結果の用紙を撮影して、数値と一緒に残せます。</p>'}
    </section>`;
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
    </button>${l.photoIds.length ? `<div class="photo-strip">${l.photoIds.map((id) =>
      `<button type="button" class="photo-btn" data-action="view-photo" data-id="${esc(id)}" aria-label="写真を大きく表示">${photoImg(id, `${t.label}の写真`)}</button>`).join('')}</div>` : ''}</li>`;
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
        ${dog.photoId
          ? `<button type="button" class="dog-avatar" data-action="view-photo" data-id="${esc(dog.photoId)}" aria-label="写真を大きく表示">${photoImg(dog.photoId, `${dog.name}の写真`)}</button>`
          : '<div class="dog-avatar" aria-hidden="true">🐶</div>'}
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
    return seg('log-mode', ui.logMode, [['day', '日ごと'], ['review', 'ふりかえり']], '記録の表示', 'wide')
      + (ui.logMode === 'review' ? reviewView(dog) : VIEWS.logsDay(dog));
  },

  care(dog) {
    const body = ui.careMode === 'cost' ? costView(dog) : ui.careMode === 'blood' ? bloodView(dog) : VIEWS.careRecords(dog);
    return seg('care-mode', ui.careMode, [['records', '予防・通院'], ['cost', '医療費'], ['blood', '血液検査']], '表示の切り替え', 'wide') + body;
  },

  logsDay(dog) {
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

  careRecords(dog) {
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
            <span class="body"><strong>${CARE_KINDS[c.kind].label}</strong>${esc(c.title)}${c.memo ? `<small>${esc(c.memo)}</small>` : ''}${
              c.items.some((it) => it.cat === 'med') ? `<small>💊 ${c.items.filter((it) => it.cat === 'med').map((it) => esc(it.name)).join('、')}</small>` : ''}</span>
            <span class="side">${jpDate(c.date)}${c.cost ? `<br>¥${c.cost.toLocaleString('ja-JP')}` : ''}</span>
          </button>${c.items.length ? `<details class="care-items"><summary>明細 ${c.items.length}件</summary>
            <table class="data"><tbody>${c.items.map((it) => `<tr>
              <td><span aria-hidden="true">${ITEM_CATS[it.cat].icon}</span> <span class="muted small">${ITEM_CATS[it.cat].label}</span><div>${esc(it.name)}${it.qty ? ` <span class="muted small">× ${esc(it.qty)}</span>` : ''}</div></td>
              <td class="num">${it.amount ? yen(it.amount) : ''}</td></tr>`).join('')}</tbody></table></details>` : ''}${c.photoIds.length ? `<div class="photo-strip">${c.photoIds.map((id) =>
            `<button type="button" class="photo-btn" data-action="view-photo" data-id="${esc(id)}" aria-label="明細書の写真を大きく表示">${photoImg(id, '明細書の写真')}</button>`).join('')}</div>` : ''}</li>`).join('')}</ul>` : '<p class="empty">まだ記録がありません</p>'}
      </section>`;
  },

  settings() {
    return `
      <section class="card">
        <h2>わんちゃん</h2>
        ${state.dogs.length ? `<ul class="list">${state.dogs.map((d) => `
          <li><div class="row">
            <span class="icon${d.photoId ? ' has-photo' : ''}" aria-hidden="true">${d.photoId ? photoImg(d.photoId, '') : '🐶'}</span>
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
        <p class="muted small" style="margin-top:0">記録はこの端末のブラウザ内にだけ保存されます。ブラウザのデータを消すと記録も消えるため、定期的にバックアップをおすすめします。バックアップには写真も含まれます。</p>
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

// 画面にあるグラフ枠をすべて描画する（描画後・リサイズ時に呼ぶ）
function mountCharts(dog) {
  let box;
  if ((box = $('#weightChart'))) {
    const from = ui.weightRange === 'all' ? '' : addMonths(todayStr(), ui.weightRange === '3m' ? -3 : -12);
    lineChart(box, weightsOf(dog.id).filter((w) => w.date >= from).map((w) => ({ date: w.date, v: w.kg })), {
      name: `${dog.name}の体重`, unit: 'kg', labelUnit: 'kg', fmt: fmtKg,
      emptyText: 'この期間の記録が2件以上になるとグラフが表示されます',
    });
  }
  if ((box = $('#labChart')) && ui.labItem) {
    const byDate = new Map(); // 同じ日に複数あれば後の記録を使う
    for (const l of labsOf(dog.id)) if (l.values[ui.labItem] != null) byDate.set(l.date, l.values[ui.labItem]);
    const item = LAB_BY_KEY[ui.labItem];
    lineChart(box, [...byDate].map(([date, v]) => ({ date, v })), {
      name: `${dog.name}の${item.label}`, unit: ` ${item.unit}`, labelUnit: '', fmt: String,
      band: state.labRefs[ui.labItem], emptyText: 'この項目の記録が2回分以上になるとグラフが表示されます',
    });
  }
  if ((box = $('#walkChart'))) {
    const p = periodOf(ui.reviewUnit, ui.reviewAnchor);
    const stats = periodStats(dog.id, p);
    barChart(box, daysIn(p).map((d) => {
      const day = parseDate(d);
      return {
        v: stats.days[d] ? stats.days[d].walk : 0, tip: jpDate(d),
        x: ui.reviewUnit === 'week' ? '月火水木金土日'[(day.getDay() + 6) % 7] : (day.getDate() % 7 === 1 ? String(day.getDate()) : ''),
      };
    }), { name: '1日ごとの散歩時間', fmt: (v) => `${v}分`, emptyText: 'この期間に散歩の記録はありません' });
  }
  if ((box = $('#costChart'))) {
    barChart(box, costMonths(dog.id).map((m) => ({
      v: m.total, tip: `${m.ym.slice(0, 4)}年${Number(m.ym.slice(5))}月`, x: String(Number(m.ym.slice(5))),
    })), { name: '月ごとの医療費', fmt: yen, axisFmt: (v) => v.toLocaleString('ja-JP'), left: 54, emptyText: '直近12ヶ月に費用の記録はありません' });
  }
}

function barChart(box, bars, opt) {
  const maxV = Math.max(...bars.map((b) => b.v));
  if (!(maxV > 0)) { box.innerHTML = `<p class="empty">${esc(opt.emptyText)}</p>`; return; }
  const W = Math.max(280, box.clientWidth || 320), H = 180;
  const m = { t: 12, r: 6, b: 24, l: opt.left || 38 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b, base = m.t + ph;
  const { ticks, hi } = niceTicks(0, maxV, 3);
  const slot = pw / bars.length, bw = Math.min(24, Math.max(2, slot - 2));
  const y = (v) => m.t + (1 - v / hi) * ph;
  const axisFmt = opt.axisFmt || String;
  const barPath = (b, i) => {
    if (!(b.v > 0)) return '';
    const x0 = m.l + slot * i + (slot - bw) / 2, x1 = x0 + bw, top = Math.min(y(b.v), base - 1);
    const r = Math.min(4, bw / 2, base - top);
    return `<path class="bar" data-i="${i}" d="M${x0.toFixed(1)},${base} V${(top + r).toFixed(1)} Q${x0.toFixed(1)},${top.toFixed(1)} ${(x0 + r).toFixed(1)},${top.toFixed(1)} H${(x1 - r).toFixed(1)} Q${x1.toFixed(1)},${top.toFixed(1)} ${x1.toFixed(1)},${(top + r).toFixed(1)} V${base} Z"/>`;
  };
  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(opt.name)}の棒グラフ。最大は${esc(opt.fmt(maxV))}。">
      ${ticks.map((v) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis-text" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${axisFmt(v)}</text>`).join('')}
      ${bars.map((b, i) => (b.x ? `<text class="axis-text" x="${m.l + slot * (i + 0.5)}" y="${H - 7}" text-anchor="middle">${esc(b.x)}</text>` : '')).join('')}
      ${bars.map(barPath).join('')}
    </svg>
    <div class="tip" hidden></div>`;
  const svg = $('svg', box), tip = $('.tip', box);
  const show = (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.min(bars.length - 1, Math.max(0, Math.floor((px - m.l) / slot)));
    svg.querySelectorAll('.bar').forEach((el) => el.classList.toggle('on', Number(el.dataset.i) === i));
    tip.hidden = false;
    tip.textContent = `${bars[i].tip}　${opt.fmt(bars[i].v)}`;
    const half = tip.offsetWidth / 2;
    const cx = ((m.l + slot * (i + 0.5)) / W) * rect.width;
    tip.style.left = `${Math.min(Math.max(cx, half), rect.width - half)}px`;
  };
  const hide = () => { tip.hidden = true; svg.querySelectorAll('.bar.on').forEach((el) => el.classList.remove('on')); };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

// pts: [{ date, v }]（日付の昇順）。opt.band = { lo, hi } があれば基準範囲を帯で描く
function lineChart(box, pts, opt) {
  if (pts.length < 2) {
    box.innerHTML = `<p class="empty">${esc(opt.emptyText)}</p>`;
    return;
  }
  const band = opt.band || {};
  const fmt = opt.fmt;

  const W = Math.max(280, box.clientWidth || 320), H = 220;
  const m = { t: 16, r: 58, b: 28, l: 38 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const time = (w) => parseDate(w.date).getTime();
  const t0 = time(pts[0]), t1 = time(pts[pts.length - 1]);
  const extent = pts.map((p) => p.v).concat([band.lo, band.hi].filter((n) => n != null));
  const { ticks, lo, hi, decimals } = niceTicks(Math.min(...extent), Math.max(...extent));
  const x = (t) => m.l + ((t - t0) / (t1 - t0)) * pw;
  const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * ph;
  const P = pts.map((p) => ({ ...p, x: x(time(p)), y: y(p.v) }));
  const bandSvg = band.lo != null && band.hi != null
    ? `<rect class="band" x="${m.l}" y="${y(band.hi)}" width="${pw}" height="${Math.max(1, y(band.lo) - y(band.hi))}"/>`
    : [band.lo, band.hi].filter((n) => n != null).map((n) => `<line class="band-line" x1="${m.l}" x2="${W - m.r}" y1="${y(n)}" y2="${y(n)}"/>`).join('');

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
    <svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(opt.name)}の推移。${jpDate(pts[0].date)}の${esc(fmt(pts[0].v) + opt.unit)}から${jpDate(lastP.date)}の${esc(fmt(lastP.v) + opt.unit)}まで。">
      ${bandSvg}
      ${ticks.map((v) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis-text" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(decimals)}</text>`).join('')}
      ${xTicks.map((t, i) => `<text class="axis-text" x="${x(t)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle'}">${xLabel(t)}</text>`).join('')}
      <line class="cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
      <polyline class="line" points="${P.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>
      ${(showDots ? P : [lastP]).map((p) => `<circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"/>`).join('')}
      <circle class="dot hover-dot" r="6" visibility="hidden"/>
      <text class="last-label" x="${lastP.x + 9}" y="${lastP.y + 4}">${esc(fmt(lastP.v) + opt.labelUnit)}</text>
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
    tip.textContent = `${jpDate(best.date)}　${fmt(best.v)}${opt.unit}`;
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
  if (dog) mountCharts(dog);
  hydratePhotos(view);
}

function viewPhoto(id) {
  photoUrl(id).then((url) => {
    if (!url) { toast('写真が見つかりません'); return; }
    const dlg = $('#photoDialog');
    $('img', dlg).src = url;
    dlg.showModal();
  });
}

/* ---------- backup ---------- */

async function exportData() {
  const photos = {};
  try {
    for (const id of referencedPhotoIds(state)) {
      const b = await photoGet(id);
      if (b) photos[id] = await blobToDataUrl(b);
    }
  } catch (e) {
    console.error(e);
    toast('写真を読み出せなかったため、バックアップを中止しました');
    return;
  }
  const blob = new Blob([JSON.stringify({ ...state, photos })], { type: 'application/json' });
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
    // バックアップに入っている写真だけを復元し、入っていない写真への参照は外す
    const src = raw.photos && typeof raw.photos === 'object' ? raw.photos : {};
    const blobs = new Map();
    for (const id of referencedPhotoIds(next)) {
      const b = Object.prototype.hasOwnProperty.call(src, id) ? dataUrlToBlob(src[id]) : null;
      if (b) blobs.set(id, b);
    }
    next.dogs.forEach((d) => { if (!blobs.has(d.photoId)) d.photoId = ''; });
    [...next.logs, ...next.labs, ...next.cares].forEach((l) => { l.photoIds = l.photoIds.filter((id) => blobs.has(id)); });
    if (state.dogs.length && !confirm(`現在のデータ（写真を含む）を、バックアップの内容（${next.dogs.map((d) => d.name).join('、')}）で置き換えます。よろしいですか？`)) return;
    await photoClear();
    for (const [id, b] of blobs) await photoPut(id, b);
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
  'view-photo': (el) => viewPhoto(el.dataset.id),
  'log-mode': (el) => { ui.logMode = el.dataset.value === 'review' ? 'review' : 'day'; render(); },
  'review-unit': (el) => { ui.reviewUnit = el.dataset.value === 'month' ? 'month' : 'week'; render(); },
  'review-prev': () => { ui.reviewAnchor = shiftAnchor(ui.reviewUnit, ui.reviewAnchor, -1); render(); },
  'review-next': () => {
    const next = shiftAnchor(ui.reviewUnit, ui.reviewAnchor, 1);
    if (periodOf(ui.reviewUnit, next).start <= todayStr()) { ui.reviewAnchor = next; render(); }
  },
  'goto-day': (el) => { if (isDate(el.dataset.date)) { ui.logDate = el.dataset.date; ui.logMode = 'day'; render(); window.scrollTo(0, 0); } },
  'care-mode': (el) => { ui.careMode = ['cost', 'blood'].includes(el.dataset.value) ? el.dataset.value : 'records'; render(); },
  'add-lab': (el, dog) => dog && labForm(dog, null),
  'edit-lab': (el, dog) => { const l = state.labs.find((x) => x.id === el.dataset.id); if (l && dog) labForm(dog, l); },
  'edit-refs': () => labRefForm(),
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
  if (e.target.id === 'labItem' && LAB_BY_KEY[e.target.value]) {
    ui.labItem = e.target.value;
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
$('#photoDialog').addEventListener('click', (e) => e.currentTarget.close());
$('#importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) importData(file);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const dog = activeDog(); if (dog) mountCharts(dog); }, 150);
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
