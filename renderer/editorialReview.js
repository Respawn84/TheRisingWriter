// === REVISIÓN PRE-EDITORIAL (muletillas, adverbios, verbos auxiliares...) ===
//
// El análisis se dispara en segundo plano al guardar la escena (ver
// analyzeSceneInBackground, llamada sin await desde saveCurrentFile en
// editor.js) — nunca al abrir el panel, para no repetir el timeout de
// esperar a la IA que ya sufre "Revisar Escena" en el clic del botón.
//
// Categorías literales/mecánicas se detectan con regex en JS (instantáneo,
// no depende de ningún proveedor). Solo "verbos auxiliares" requiere
// criterio lingüístico real y usa el proveedor configurado en IA →
// Configuración (Claude u Ollama), igual que el corrector:
// - Con Ollama: automático en segundo plano al guardar (gratis, local).
// - Con Claude: requiere un clic explícito del usuario en el panel, para no
//   facturar la API en cada guardado sin que el usuario lo pida.

// Orden = prioridad al resolver solapes de resaltado (la primera categoría
// que reclama un rango de texto se queda con él).
const EDITORIAL_CATEGORIES = [
  { key: 'verbosAuxiliares', label: 'Verbos auxiliares', className: 'eh-cat-auxiliares' },
  { key: 'muletillas', label: 'Muletillas críticas', className: 'eh-cat-muletillas' },
  { key: 'gerundios', label: 'Gerundios perezosos', className: 'eh-cat-gerundios' },
  { key: 'adverbiosMente', label: 'Adverbios en "-mente"', className: 'eh-cat-adverbios' },
  { key: 'adjetivosDebiles', label: 'Adjetivos débiles', className: 'eh-cat-adjetivos' }
];

const REGEX_PATTERNS = {
  adverbiosMente: [/\b\w+mente\b/gi],
  muletillas: [
    /\bde (?:manera|modo) que\b/gi,
    /\bpoco a poco\b/gi,
    /\bempezó a\s+\w+(?:ar|er|ir)\b/gi,
    /\bpodía\s+(?:ver|sentir|notar)\b/gi
  ],
  gerundios: [
    /\biba caminando\b/gi,
    /\bestaba pensando\b/gi
  ],
  adjetivosDebiles: [
    /\bmuy\b/gi,
    /\bbastante\b/gi,
    /\balgo\b/gi
  ]
};

// path -> { snapshot, categories: {key:[{index,length,text}]}, verbosAuxiliares:{status,items,error} }
const editorialReviewCache = new Map();

function computeRegexMatches(text) {
  const categories = {};
  for (const key of Object.keys(REGEX_PATTERNS)) {
    const found = [];
    for (const pattern of REGEX_PATTERNS[key]) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m;
      while ((m = re.exec(text)) !== null) {
        found.push({ index: m.index, length: m[0].length, text: m[0] });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    found.sort((a, b) => a.index - b.index);
    categories[key] = found;
  }
  return categories;
}

// Ubica cada frase devuelta por el modelo dentro del texto original del lote
// (case-insensitive), descartando las que no aparecen literalmente — evita
// resaltar alucinaciones del modelo. `offset` es la posición del lote dentro
// del texto completo de la escena.
function locateMatchesInText(matches, text, offset) {
  const lowerText = text.toLowerCase();
  const located = [];
  const usedRanges = [];

  for (const phrase of matches) {
    if (!phrase || !phrase.trim()) continue;
    const lowerPhrase = phrase.toLowerCase();
    let searchFrom = 0;
    while (searchFrom <= lowerText.length) {
      const idx = lowerText.indexOf(lowerPhrase, searchFrom);
      if (idx === -1) break;
      const overlaps = usedRanges.some(([s, e]) => idx < e && idx + phrase.length > s);
      if (!overlaps) {
        located.push({ index: offset + idx, length: phrase.length, text: text.substr(idx, phrase.length) });
        usedRanges.push([idx, idx + phrase.length]);
        break;
      }
      searchFrom = idx + 1;
    }
  }
  return located;
}

// Trocea la escena por lotes de `fragmentLines` líneas (igual que
// correctSceneInBatches en sceneReview.js) y pide al proveedor configurado,
// lote a lote, que liste las perífrasis con verbos auxiliares que encuentre.
// Respeta sendMode ('full' = la escena entera en una sola llamada, igual que
// el corrector) tanto para Claude como para Ollama.
async function detectAuxiliaryVerbsInScene(fullText, config) {
  const lines = fullText.split('\n');
  const batchSize = config.sendMode === 'full' ? lines.length : (config.fragmentLines || 20);
  const totalBatches = Math.ceil(lines.length / batchSize);
  const allMatches = [];
  let charOffset = 0;

  for (let b = 0; b < totalBatches; b++) {
    const start = b * batchSize;
    const end = Math.min(start + batchSize, lines.length);
    const batchLines = lines.slice(start, end);
    const batchText = batchLines.join('\n');
    const batchOffset = charOffset;
    charOffset += batchText.length + (end < lines.length ? 1 : 0);

    if (!batchLines.some(l => l.trim())) continue;

    const result = await window.electronAPI.detectAuxiliaryVerbs({ text: batchText });
    if (!result.success) {
      return { success: false, error: result.error };
    }

    allMatches.push(...locateMatchesInText(result.matches, batchText, batchOffset));
  }

  return { success: true, items: allMatches };
}

// Lanzada sin await desde saveCurrentFile tras guardar con éxito.
async function analyzeSceneInBackground(path, content) {
  const categories = computeRegexMatches(content);
  const config = await window.electronAPI.getAIConfig();

  // Con Ollama el análisis es gratis y corre solo, como el resto del panel.
  // Con Claude cuesta dinero real por cada guardado, así que se deja en
  // 'manual' hasta que el usuario lo pida explícitamente desde el panel.
  const autoRun = state.aiConnected && config.provider !== 'claude';

  const entry = {
    snapshot: content,
    categories,
    verbosAuxiliares: !state.aiConnected
      ? { status: 'unavailable', items: [], error: null }
      : autoRun
        ? { status: 'loading', items: [], error: null }
        : { status: 'manual', items: [], error: null }
  };
  editorialReviewCache.set(path, entry);
  refreshEditorialPanelIfVisible(path);

  if (!autoRun) return;

  const result = await detectAuxiliaryVerbsInScene(content, config);

  // Si se guardó de nuevo mientras esperábamos, la cache ya tiene otra
  // entrada para este path: no pisamos el resultado más reciente.
  if (editorialReviewCache.get(path) !== entry) return;

  entry.verbosAuxiliares = result.success
    ? { status: 'done', items: result.items, error: null }
    : { status: 'error', items: [], error: result.error };
  refreshEditorialPanelIfVisible(path);
}

// Disparada por el botón "Analizar" del panel cuando el proveedor es Claude
// (o cualquier otro caso 'manual'): analiza el último snapshot guardado.
async function triggerManualAuxiliaryAnalysis() {
  const tab = getActiveTab();
  if (!tab) return;
  const entry = editorialReviewCache.get(tab.path);
  if (!entry) return;

  entry.verbosAuxiliares = { status: 'loading', items: [], error: null };
  renderEditorialPanel();

  const config = await window.electronAPI.getAIConfig();
  const result = await detectAuxiliaryVerbsInScene(entry.snapshot, config);

  if (editorialReviewCache.get(tab.path) !== entry) return;

  entry.verbosAuxiliares = result.success
    ? { status: 'done', items: result.items, error: null }
    : { status: 'error', items: [], error: result.error };
  renderEditorialPanel();
}

function escapeHtmlEditorial(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function refreshEditorialPanelIfVisible(path) {
  const tab = getActiveTab();
  if (!tab || tab.path !== path) return;
  renderEditorialPanel();
}

function renderCategoryBlock(cat, items) {
  const count = items.length;
  const itemsHtml = count > 0
    ? '<ul class="editorial-items">' + items.map(it => `<li>${escapeHtmlEditorial(it.text)}</li>`).join('') + '</ul>'
    : '';
  return `<div class="editorial-category">
    <div class="editorial-category-title">${cat.label} <span class="editorial-count">${count}</span></div>
    ${itemsHtml}
  </div>`;
}

function renderEditorialPanel() {
  const body = document.getElementById('editorial-review-body');
  const staleNotice = document.getElementById('editorial-review-stale');
  if (!body) return;

  const tab = getActiveTab();
  const entry = tab ? editorialReviewCache.get(tab.path) : null;

  if (!tab || !entry) {
    body.innerHTML = '<p class="editorial-empty">Sin datos — guarda la escena para analizarla.</p>';
    if (staleNotice) staleNotice.classList.add('hidden');
    clearEditorialHighlightOverlay();
    return;
  }

  const editor = document.getElementById('editor');
  const isStale = editor.value !== entry.snapshot;
  if (staleNotice) staleNotice.classList.toggle('hidden', !isStale);

  let html = '';
  for (const cat of EDITORIAL_CATEGORIES) {
    if (cat.key === 'verbosAuxiliares') {
      const aux = entry.verbosAuxiliares;
      if (aux.status === 'loading') {
        html += `<div class="editorial-category"><div class="editorial-category-title">${cat.label} <span class="editorial-loading-dot">analizando…</span></div></div>`;
      } else if (aux.status === 'unavailable') {
        html += `<div class="editorial-category"><div class="editorial-category-title">${cat.label} <span class="editorial-unavailable">IA no disponible</span></div></div>`;
      } else if (aux.status === 'manual') {
        html += `<div class="editorial-category">
          <div class="editorial-category-title">${cat.label}</div>
          <button type="button" class="editorial-manual-btn">Analizar</button>
          <p class="editorial-manual-hint">Usa la API de Claude — no se ejecuta automáticamente al guardar.</p>
        </div>`;
      } else if (aux.status === 'error') {
        html += `<div class="editorial-category"><div class="editorial-category-title">${cat.label} <span class="editorial-unavailable">Error: ${escapeHtmlEditorial(aux.error || '')}</span></div></div>`;
      } else {
        html += renderCategoryBlock(cat, aux.items);
      }
    } else {
      html += renderCategoryBlock(cat, entry.categories[cat.key] || []);
    }
  }
  body.innerHTML = html;

  const modal = document.getElementById('modal-editorial-review');
  const modalVisible = modal && !modal.classList.contains('hidden');
  if (!modalVisible || isStale) {
    clearEditorialHighlightOverlay();
  } else {
    renderEditorialHighlightOverlay(entry);
  }
}

function clearEditorialHighlightOverlay() {
  const overlay = document.getElementById('editorial-highlight-overlay');
  const editor = document.getElementById('editor');
  if (overlay) overlay.innerHTML = '';
  if (editor) editor.classList.remove('editorial-highlight-active');
}

function renderEditorialHighlightOverlay(entry) {
  const overlay = document.getElementById('editorial-highlight-overlay');
  const editor = document.getElementById('editor');
  if (!overlay || !editor) return;

  const text = entry.snapshot;
  const accepted = [];

  // Recorre categorías en orden de prioridad; un rango que se solape con uno
  // ya aceptado (de una categoría de mayor prioridad) se descarta en vez de
  // anidar spans.
  for (const cat of EDITORIAL_CATEGORIES) {
    const items = cat.key === 'verbosAuxiliares' ? entry.verbosAuxiliares.items : (entry.categories[cat.key] || []);
    const sorted = [...items].sort((a, b) => a.index - b.index);
    for (const it of sorted) {
      const start = it.index, end = it.index + it.length;
      const overlaps = accepted.some(a => start < a.end && end > a.start);
      if (!overlaps) accepted.push({ start, end, className: cat.className });
    }
  }
  accepted.sort((a, b) => a.start - b.start);

  let html = '';
  let cursor = 0;
  for (const r of accepted) {
    html += escapeHtmlEditorial(text.slice(cursor, r.start));
    html += `<span class="${r.className}">${escapeHtmlEditorial(text.slice(r.start, r.end))}</span>`;
    cursor = r.end;
  }
  html += escapeHtmlEditorial(text.slice(cursor));
  // Salto de línea final para que el overlay tenga la misma altura de scroll
  // que el textarea real (un textarea siempre reserva una línea más).
  overlay.innerHTML = html + '\n';

  editor.classList.add('editorial-highlight-active');
  overlay.scrollTop = editor.scrollTop;
  overlay.scrollLeft = editor.scrollLeft;
}

function toggleEditorialPanel() {
  const modal = document.getElementById('modal-editorial-review');
  if (modal.classList.contains('hidden')) {
    openModal('modal-editorial-review');
  } else {
    closeModal('modal-editorial-review');
    clearEditorialHighlightOverlay();
  }
}

function setupEditorialReviewListeners() {
  document.getElementById('btn-editorial-review').addEventListener('click', toggleEditorialPanel);
  document.getElementById('btn-editorial-clear').addEventListener('click', clearEditorialHighlightOverlay);

  // Delegado porque el contenido de #editorial-review-body se regenera en
  // cada render (el botón "Analizar" del modo manual no existe todavía aquí).
  document.getElementById('editorial-review-body').addEventListener('click', (e) => {
    if (e.target.matches('.editorial-manual-btn')) triggerManualAuxiliaryAnalysis();
  });

  const editor = document.getElementById('editor');

  // Mantiene el overlay alineado al hacer scroll en el editor.
  editor.addEventListener('scroll', () => {
    const overlay = document.getElementById('editorial-highlight-overlay');
    if (overlay) {
      overlay.scrollTop = editor.scrollTop;
      overlay.scrollLeft = editor.scrollLeft;
    }
  });

  // Si el usuario sigue escribiendo tras guardar, refleja el aviso de
  // "desactualizado" y retira el resaltado sin esperar a reabrir el panel.
  editor.addEventListener('input', () => {
    const modal = document.getElementById('modal-editorial-review');
    if (modal && !modal.classList.contains('hidden')) renderEditorialPanel();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeRegexMatches,
    locateMatchesInText,
    detectAuxiliaryVerbsInScene,
    analyzeSceneInBackground,
    triggerManualAuxiliaryAnalysis,
    renderEditorialPanel,
    toggleEditorialPanel,
    setupEditorialReviewListeners
  };
}
