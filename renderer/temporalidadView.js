// ====================================
// VISTA DE TEMPORALIDAD
// Eje vertical ordinal de días + swimlanes verticales de tramas
// Cada escena se duplica en el carril de cada una de sus tramas
// SVG puro con pan y zoom
// ====================================

const TV = {
  AXIS_W: 120,     // ancho de la columna del eje de días
  COL_W: 180,      // ancho de cada carril de trama
  CHIP_W: 156,     // ancho del chip de escena
  CHIP_H: 34,      // alto del chip de escena
  ROW_H: 42,       // alto de una sub-fila dentro de una banda
  BAND_PAD: 10,    // relleno vertical de cada banda de día
  GAP_H: 26,       // alto del separador entre bandas (lleva el salto real)
  HEADER_H: 48,    // alto de las cabeceras de trama
  START_X: 14,
  START_Y: 12,
};

// Conversión explícita de unidades a días.
// Decisión de diseño: mes = 30 días, año = 365 días.
const TV_UNIDAD_DIAS = {
  horas: 1 / 24,
  dias: 1,
  meses: 30,
  anios: 365,
};

const TV_PALETTE = [
  { fill: '#1e3a5f', stroke: '#4a9eff', text: '#93c5fd' },
  { fill: '#2d1b3d', stroke: '#a855f7', text: '#d8b4fe' },
  { fill: '#1a2e1a', stroke: '#4ade80', text: '#86efac' },
  { fill: '#3d1a1a', stroke: '#f87171', text: '#fca5a5' },
  { fill: '#2d2a0e', stroke: '#facc15', text: '#fde68a' },
  { fill: '#1a2d2d', stroke: '#2dd4bf', text: '#99f6e4' },
  { fill: '#2d1e0e', stroke: '#fb923c', text: '#fed7aa' },
  { fill: '#1e1e2d', stroke: '#818cf8', text: '#c7d2fe' },
  { fill: '#3d1a30', stroke: '#f472b6', text: '#fbcfe8' },
  { fill: '#16304d', stroke: '#38bdf8', text: '#bae6fd' },
  { fill: '#26301a', stroke: '#a3e635', text: '#d9f99d' },
  { fill: '#301a26', stroke: '#fb7185', text: '#fecdd3' },
  { fill: '#1d2b3a', stroke: '#67e8f9', text: '#cffafe' },
  { fill: '#2b2438', stroke: '#c084fc', text: '#e9d5ff' },
];

const TV_SIN_TRAMA = '— sin trama —';

const TV_NO_TRAMA = { fill: '#1e293b', stroke: '#475569', text: '#94a3b8' };

let tvTranslate = { x: 40, y: 20 };
let tvScale = 1;
let tvDragging = false;
let tvDragStart = { x: 0, y: 0 };
let tvDragOrigin = { x: 0, y: 0 };
let tvActive = false;

// ====================================
// CARGA Y RESOLUCIÓN DE DATOS
// ====================================

// Lee todas las escenas en orden de lectura (capítulo → escena)
async function tvReadScenes() {
  const capitulosRuta = state.projectData?.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosRuta) return [];

  const capEntries = await window.electronAPI.readDirectory(capitulosRuta);
  const chapters = capEntries
    .filter(e => e.isDirectory)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const scenes = [];

  for (const chapter of chapters) {
    let sceneEntries;
    try {
      sceneEntries = await window.electronAPI.readDirectory(chapter.path);
    } catch { continue; }

    const chapterScenes = sceneEntries
      .filter(e => !e.isDirectory && e.name.endsWith('.txt'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const scene of chapterScenes) {
      const meta = getByPath(state.projectData.metadatos, scene.path) || {};
      scenes.push({
        path: canonPath(scene.path),
        label: scene.name.replace(/\.txt$/i, ''),
        chapter: chapter.name,
        chapterShort: tvChapterShort(chapter.name),
        tramas: meta.tramas || [],
        temporalidad: meta.temporalidad || null,
      });
    }
  }

  return scenes;
}

// "Capítulo 5 - Preparación" → "C5"
function tvChapterShort(chapterName) {
  const m = chapterName.match(/(\d+)/);
  return m ? `C${m[1]}` : chapterName.slice(0, 4);
}

// Resuelve el día absoluto de cada escena siguiendo la cadena de escenaRef.
// Convenciones:
//   - sin escenaRef, o escenaRef == la propia escena → es una raíz;
//     su día absoluto es directamente su cantidad.
//   - en otro caso → día(escenaRef) + cantidad.
// Devuelve { resolved, unresolved } donde unresolved lleva el motivo.
function tvResolveDays(scenes) {
  const byPath = {};
  scenes.forEach(s => { byPath[s.path] = s; });

  const refOf = {};
  const deltaOf = {};

  for (const s of scenes) {
    const t = s.temporalidad;
    if (!t) { refOf[s.path] = undefined; deltaOf[s.path] = null; continue; }

    const ref = canonPath(t.escenaRef || '');
    const factor = TV_UNIDAD_DIAS[t.unidad] ?? 1;
    const cantidad = Number(t.cantidad);

    deltaOf[s.path] = Number.isFinite(cantidad) ? cantidad * factor : 0;
    refOf[s.path] = (!ref || ref === s.path) ? null : ref;
  }

  const absDay = {};
  const failed = {};

  function resolve(path, stack) {
    if (absDay[path] !== undefined) return absDay[path];
    if (failed[path]) return null;

    if (deltaOf[path] === null) { failed[path] = 'sin temporalidad'; return null; }
    if (stack.has(path))        { failed[path] = 'referencia circular'; return null; }

    const ref = refOf[path];
    let value;

    if (ref === null) {
      value = deltaOf[path];
    } else {
      if (!byPath[ref]) { failed[path] = 'escena de referencia inexistente'; return null; }
      stack.add(path);
      const parent = resolve(ref, stack);
      stack.delete(path);
      if (parent === null) { failed[path] = 'cadena rota'; return null; }
      value = parent + deltaOf[path];
    }

    absDay[path] = Math.round(value * 10000) / 10000;
    return absDay[path];
  }

  const resolved = [];
  const unresolved = [];

  for (const s of scenes) {
    const v = resolve(s.path, new Set());
    if (v === null) unresolved.push({ ...s, motivo: failed[s.path] || 'no resuelta' });
    else resolved.push({ ...s, day: v });
  }

  return { resolved, unresolved };
}

// Construye bandas ordinales (una por día distinto) y carriles de trama.
async function buildTemporalidadData() {
  if (!state.projectData) return { bands: [], lanes: [], unresolved: [], total: 0 };

  const tramasRuta = state.projectData.configuracion?.directorios?.tramas?.ruta;

  // Índice nombre de trama → path de fichero (para abrir en el split)
  const tramaFileIndex = {};
  if (tramasRuta) {
    try {
      const entries = await window.electronAPI.readDirectory(tramasRuta);
      entries.forEach(e => {
        if (!e.isDirectory) {
          const key = e.name.replace(/\.[^.]+$/, '').replace(/^\d+-/, '');
          tramaFileIndex[key] = e.path;
        }
      });
    } catch { /* directorio vacío o no configurado */ }
  }

  const scenes = await tvReadScenes();
  const { resolved, unresolved } = tvResolveDays(scenes);

  // Orden temporal: día absoluto, y a igualdad el orden de lectura (índice original)
  const readIndex = {};
  scenes.forEach((s, i) => { readIndex[s.path] = i; });
  resolved.sort((a, b) => (a.day - b.day) || (readIndex[a.path] - readIndex[b.path]));

  // Carriles: en orden de primera aparición temporal
  const lanes = [];
  const laneMap = {};
  let usesNoTrama = false;

  for (const s of resolved) {
    if (s.tramas.length === 0) { usesNoTrama = true; continue; }
    for (const name of s.tramas) {
      if (laneMap[name] === undefined) {
        laneMap[name] = lanes.length;
        lanes.push({ name, index: lanes.length, filePath: tramaFileIndex[name] || null });
      }
    }
  }

  if (usesNoTrama) {
    laneMap[TV_SIN_TRAMA] = lanes.length;
    lanes.push({ name: TV_SIN_TRAMA, index: lanes.length, filePath: null, isNoTrama: true });
  }

  // Bandas: una por día distinto
  const bands = [];
  let current = null;

  for (const s of resolved) {
    if (!current || current.day !== s.day) {
      current = { day: s.day, cells: {}, scenes: [] };
      bands.push(current);
    }
    // La fila dentro de la banda es propiedad de la escena, no del carril:
    // así todos sus duplicados quedan alineados horizontalmente.
    s.rowIndex = current.scenes.length;
    current.scenes.push(s);

    // Duplicación: la escena entra en el carril de cada una de sus tramas
    const names = s.tramas.length > 0 ? s.tramas : [TV_SIN_TRAMA];
    for (const name of names) {
      const li = laneMap[name];
      if (li === undefined) continue;
      if (!current.cells[li]) current.cells[li] = [];
      current.cells[li].push(s);
    }
  }

  return { bands, lanes, unresolved, total: scenes.length };
}

// ====================================
// LAYOUT
// ====================================

function computeTemporalidadLayout(bands, lanes) {
  let cursor = TV.START_Y + TV.HEADER_H;

  bands.forEach((band, i) => {
    // Una fila por escena de la banda: los duplicados comparten fila
    band.rows = Math.max(1, band.scenes.length);
    band.y = cursor;
    band.h = band.rows * TV.ROW_H + TV.BAND_PAD * 2;
    cursor += band.h;

    // Separador con el salto real hacia la banda siguiente
    if (i < bands.length - 1) {
      band.gapY = cursor;
      band.gapDelta = bands[i + 1].day - band.day;
      cursor += TV.GAP_H;
    }
  });

  return cursor;
}

// ====================================
// FORMATO
// ====================================

function tvEscapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tvTruncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return tvEscapeXml(text);
  return tvEscapeXml(text.slice(0, max - 1)) + '…';
}

// Etiqueta de una banda: "Día 0", "Día +1", "Día -10", "Día +1 · 12 h"
function tvFormatDay(v) {
  const whole = Math.floor(v);
  const frac = v - whole;
  const sign = whole > 0 ? '+' : '';
  let label = `Día ${sign}${whole}`;
  if (frac > 0.001) label += ` · ${Math.round(frac * 24)} h`;
  return label;
}

// Salto entre bandas, en la unidad más legible
function tvFormatDelta(d) {
  if (d < 1)   return `${Math.round(d * 24)} h`;
  if (d < 60)  return `${tvTrimNum(d)} d`;
  if (d < 730) return `${tvTrimNum(d / 30)} meses`;
  return `${tvTrimNum(d / 365)} años`;
}

function tvTrimNum(n) {
  return String(Math.round(n * 10) / 10);
}

// ====================================
// RENDERIZADO SVG
// ====================================

function renderTemporalidadSVG(bands, lanes, totalH) {
  const X0 = TV.START_X + TV.AXIS_W;
  const totalW = X0 + lanes.length * TV.COL_W;
  const FONT = `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"`;
  let out = '';

  // --- Cabeceras de carril (trama) ---
  for (const lane of lanes) {
    const c = lane.isNoTrama ? TV_NO_TRAMA : TV_PALETTE[lane.index % TV_PALETTE.length];
    const hx = X0 + lane.index * TV.COL_W + (TV.COL_W - TV.CHIP_W) / 2;
    const hy = TV.START_Y;
    const hh = TV.HEADER_H - 8;
    const interact = lane.filePath
      ? `data-path="${tvEscapeXml(lane.filePath)}" data-type="trama" style="cursor:pointer"`
      : `data-type="trama"`;

    out += `
      <g class="tv-node" ${interact}>
        <rect x="${hx}" y="${hy}" width="${TV.CHIP_W}" height="${hh}" rx="8"
              fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>
        <text x="${hx + TV.CHIP_W / 2}" y="${hy + hh / 2 + 5}"
              text-anchor="middle" fill="${c.text}" font-size="12" font-weight="600" ${FONT}>
          ${tvTruncate(lane.name, 19)}
        </text>
      </g>`;
  }

  // --- Fondo de carril, a lo alto de toda la vista ---
  for (const lane of lanes) {
    const c = lane.isNoTrama ? TV_NO_TRAMA : TV_PALETTE[lane.index % TV_PALETTE.length];
    const lx = X0 + lane.index * TV.COL_W;
    out += `<rect x="${lx}" y="${TV.START_Y + TV.HEADER_H}" width="${TV.COL_W}"
                  height="${totalH - TV.START_Y - TV.HEADER_H}"
                  fill="${c.stroke}" opacity="0.035"/>`;
    // Línea guía central del carril
    out += `<line x1="${lx + TV.COL_W / 2}" y1="${TV.START_Y + TV.HEADER_H}"
                  x2="${lx + TV.COL_W / 2}" y2="${totalH}"
                  stroke="${c.stroke}" stroke-width="1.5" opacity="0.18"/>`;
  }

  // --- Eje vertical de días ---
  const axisX = TV.START_X + TV.AXIS_W - 14;
  out += `<line x1="${axisX}" y1="${TV.START_Y + TV.HEADER_H}" x2="${axisX}" y2="${totalH}"
                stroke="#334155" stroke-width="2"/>`;

  // --- Bandas ---
  bands.forEach((band, i) => {
    // Fondo alterno de banda, para leer la fila de un vistazo
    if (i % 2 === 1) {
      out += `<rect x="${TV.START_X}" y="${band.y}" width="${totalW - TV.START_X}" height="${band.h}"
                    fill="#ffffff" opacity="0.02"/>`;
    }

    // Marca y etiqueta del día
    const midY = band.y + band.h / 2;
    out += `
      <circle cx="${axisX}" cy="${midY}" r="5" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
      <text x="${axisX - 14}" y="${midY + 4}" text-anchor="end"
            fill="#cbd5e1" font-size="12" font-weight="600" ${FONT}>
        ${tvEscapeXml(tvFormatDay(band.day))}
      </text>
      <text x="${axisX - 14}" y="${midY + 18}" text-anchor="end"
            fill="#475569" font-size="10" ${FONT}>
        ${band.scenes.length} ${band.scenes.length === 1 ? 'escena' : 'escenas'}
      </text>`;

    // Conector entre los duplicados de una misma escena, por debajo de los chips
    for (const scene of band.scenes) {
      if (scene.tramas.length < 2) continue;
      const idxs = scene.tramas
        .map(name => lanes.findIndex(l => l.name === name))
        .filter(i => i >= 0);
      if (idxs.length < 2) continue;

      const cy = band.y + TV.BAND_PAD + scene.rowIndex * TV.ROW_H + TV.ROW_H / 2;
      const x1 = X0 + Math.min(...idxs) * TV.COL_W + TV.COL_W / 2;
      const x2 = X0 + Math.max(...idxs) * TV.COL_W + TV.COL_W / 2;
      out += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}"
                    stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>`;
    }

    // Chips de escena, duplicados por cada trama
    for (const [laneIdxStr, list] of Object.entries(band.cells)) {
      const laneIdx = Number(laneIdxStr);
      const lane = lanes[laneIdx];
      if (!lane) continue;
      const c = lane.isNoTrama ? TV_NO_TRAMA : TV_PALETTE[lane.index % TV_PALETTE.length];
      const cx = X0 + laneIdx * TV.COL_W + (TV.COL_W - TV.CHIP_W) / 2;

      list.forEach((scene) => {
        const cy = band.y + TV.BAND_PAD + scene.rowIndex * TV.ROW_H + (TV.ROW_H - TV.CHIP_H) / 2;
        // Marca de escena compartida por varias tramas
        const multi = scene.tramas.length > 1
          ? `<circle cx="${cx + TV.CHIP_W - 10}" cy="${cy + 9}" r="6" fill="${c.stroke}" opacity="0.9"/>
             <text x="${cx + TV.CHIP_W - 10}" y="${cy + 12.5}" text-anchor="middle"
                   fill="#0f172a" font-size="8" font-weight="700" ${FONT}>${scene.tramas.length}</text>`
          : '';

        out += `
          <g class="tv-node" data-path="${tvEscapeXml(scene.path)}" data-type="scene" style="cursor:pointer">
            <title>${tvEscapeXml(scene.chapter)} · ${tvEscapeXml(scene.label)}${
              scene.tramas.length ? '\n' + tvEscapeXml(scene.tramas.join(' · ')) : ''}</title>
            <rect x="${cx}" y="${cy}" width="${TV.CHIP_W}" height="${TV.CHIP_H}" rx="6"
                  fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>
            <text x="${cx + 8}" y="${cy + TV.CHIP_H / 2 + 4}"
                  fill="${c.stroke}" font-size="9" font-weight="700" ${FONT}>
              ${tvEscapeXml(scene.chapterShort)}
            </text>
            <text x="${cx + 34}" y="${cy + TV.CHIP_H / 2 + 4}"
                  fill="${c.text}" font-size="11" ${FONT}>
              ${tvTruncate(scene.label, 16)}
            </text>
            ${multi}
          </g>`;
      });
    }

    // Separador con el salto temporal real hacia la banda siguiente
    if (band.gapY !== undefined) {
      const gy = band.gapY + TV.GAP_H / 2;
      out += `
        <line x1="${TV.START_X}" y1="${gy}" x2="${totalW}" y2="${gy}"
              stroke="#334155" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
        <rect x="${axisX - 46}" y="${gy - 9}" width="60" height="18" rx="9"
              fill="#0f172a" stroke="#334155" stroke-width="1"/>
        <text x="${axisX - 16}" y="${gy + 4}" text-anchor="middle"
              fill="#64748b" font-size="10" font-weight="600" ${FONT}>
          ↕ ${tvEscapeXml(tvFormatDelta(band.gapDelta))}
        </text>`;
    }
  });

  return out;
}

// ====================================
// MOSTRAR / OCULTAR
// ====================================

function showTemporalidadView() {
  document.getElementById('temporalidad-resizer').classList.remove('hidden');
  document.getElementById('temporalidad-panel').classList.remove('hidden');
  tvActive = true;
  document.getElementById('btn-temporalidad')?.classList.add('active');
}

function hideTemporalidadView() {
  document.getElementById('temporalidad-resizer').classList.add('hidden');
  document.getElementById('temporalidad-panel').classList.add('hidden');
  tvActive = false;
  document.getElementById('btn-temporalidad')?.classList.remove('active');
}

// ====================================
// ABRIR VISTA
// ====================================

async function openTemporalidadView() {
  if (!state.projectData) {
    showNotification('No hay proyecto abierto', true);
    return;
  }

  if (tvActive) {
    hideTemporalidadView();
    return;
  }

  showTemporalidadView();

  const container = document.getElementById('temporalidad-container');
  container.innerHTML = `<div class="tv-loading"><div class="spinner"></div><p>Calculando temporalidad…</p></div>`;

  tvTranslate = { x: 40, y: 20 };
  tvScale = 1;

  const { bands, lanes, unresolved, total } = await buildTemporalidadData();

  if (total === 0) {
    container.innerHTML = `<div class="tv-empty">No hay capítulos con escenas configurados.<br>Asegúrate de tener el directorio de capítulos configurado.</div>`;
    tvRenderStatus(0, 0, []);
    return;
  }

  if (bands.length === 0) {
    container.innerHTML = `<div class="tv-empty">Ninguna escena tiene una temporalidad resoluble.<br>Asigna la temporalidad desde el panel de metadatos de cada escena.</div>`;
    tvRenderStatus(0, total, unresolved);
    return;
  }

  const totalH = computeTemporalidadLayout(bands, lanes);
  const svgContent = renderTemporalidadSVG(bands, lanes, totalH);

  container.innerHTML = `
    <svg id="temporalidad-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f172a"/>
      <g id="temporalidad-scene" transform="translate(${tvTranslate.x},${tvTranslate.y}) scale(${tvScale})">
        ${svgContent}
      </g>
    </svg>`;

  tvRenderStatus(total - unresolved.length, total, unresolved);
  setupTemporalidadInteraction();
}

// Barra de estado: cobertura y escenas no resueltas
function tvRenderStatus(ok, total, unresolved) {
  const el = document.getElementById('temporalidad-status');
  if (!el) return;

  if (unresolved.length === 0) {
    el.innerHTML = `<span class="tv-status-ok">${ok}/${total} escenas situadas</span>
                    <span class="tv-status-note">mes = 30 d · año = 365 d</span>`;
    el.onclick = null;
    el.classList.remove('tv-status-clickable');
    return;
  }

  el.innerHTML = `<span class="tv-status-warn">⚠ ${unresolved.length} sin situar</span>
                  <span class="tv-status-ok">${ok}/${total} escenas situadas</span>
                  <span class="tv-status-note">mes = 30 d · año = 365 d</span>`;
  el.classList.add('tv-status-clickable');
  el.onclick = () => {
    const detalle = unresolved.map(u => `• ${u.chapterShort} ${u.label} — ${u.motivo}`).join('\n');
    showNotification(`Escenas sin situar:\n${detalle}`, true);
  };
}

// ====================================
// INTERACCIÓN: pan, zoom, clic
// ====================================

function applyTemporalidadTransform() {
  const scene = document.getElementById('temporalidad-scene');
  if (scene) {
    scene.setAttribute('transform', `translate(${tvTranslate.x},${tvTranslate.y}) scale(${tvScale})`);
  }
}

function setupTemporalidadInteraction() {
  const svg = document.getElementById('temporalidad-svg');
  if (!svg) return;

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.15, tvScale * delta));
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    tvTranslate.x = mx - (mx - tvTranslate.x) * (newScale / tvScale);
    tvTranslate.y = my - (my - tvTranslate.y) * (newScale / tvScale);
    tvScale = newScale;
    applyTemporalidadTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tv-node')) return;
    tvDragging = true;
    tvDragStart = { x: e.clientX, y: e.clientY };
    tvDragOrigin = { ...tvTranslate };
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', onTemporalidadMouseMove);
  window.addEventListener('mouseup', onTemporalidadMouseUp);

  svg.style.cursor = 'grab';

  svg.addEventListener('click', async (e) => {
    const nodeEl = e.target.closest('.tv-node');
    if (!nodeEl) return;

    const filePath = nodeEl.dataset.path;
    const type = nodeEl.dataset.type;

    if (type === 'scene' && filePath) {
      const fileName = nameFromPath(filePath);
      const file = { name: fileName, path: filePath };
      openTab(file);
      openSceneMetadataPanel(file);
      showNotification(`Escena cargada: ${fileName}`);
    } else if (type === 'trama' && filePath) {
      await openInSplit({ name: nameFromPath(filePath), path: filePath });
    }
  });
}

function onTemporalidadMouseMove(e) {
  if (!tvDragging) return;
  tvTranslate.x = tvDragOrigin.x + (e.clientX - tvDragStart.x);
  tvTranslate.y = tvDragOrigin.y + (e.clientY - tvDragStart.y);
  applyTemporalidadTransform();
}

function onTemporalidadMouseUp() {
  if (!tvDragging) return;
  tvDragging = false;
  const svg = document.getElementById('temporalidad-svg');
  if (svg) svg.style.cursor = 'grab';
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupTemporalidadViewListeners() {
  document.getElementById('btn-temporalidad')?.addEventListener('click', openTemporalidadView);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tvActive) hideTemporalidadView();
  });

  const resizer = document.getElementById('temporalidad-resizer');
  const panel   = document.getElementById('temporalidad-panel');
  if (!resizer || !panel) return;

  const MIN_H = 120;
  const MAX_H = () => window.innerHeight - 160;

  const savedH = parseInt(localStorage.getItem('temporalidadHeight'));
  if (savedH && savedH >= MIN_H) panel.style.height = savedH + 'px';

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panel.offsetHeight;

    resizer.classList.add('resizing');
    document.body.style.cursor     = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(e) {
      const delta = startY - e.clientY;
      const newH  = Math.min(MAX_H(), Math.max(MIN_H, startH + delta));
      panel.style.height = newH + 'px';
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      resizer.classList.remove('resizing');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      localStorage.setItem('temporalidadHeight', panel.offsetHeight);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });
}
