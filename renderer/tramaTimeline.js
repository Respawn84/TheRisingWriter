// ====================================
// TRAMA TIMELINE
// Vista de temporalidad de escenas por trama
// Segmentos verticales por trama, chips de escena en orden de lectura
// SVG puro con pan y zoom
// ====================================

const TL = {
  LABEL_W: 155,
  COL_W: 175,
  CHIP_W: 145,
  CHIP_H: 32,
  ROW_H: 50,
  HEADER_H: 48,
  SEP_H: 30,
  START_X: 14,
  START_Y: 12,
};

const TL_PALETTE = [
  { fill: '#1e3a5f', stroke: '#4a9eff', text: '#93c5fd' },
  { fill: '#2d1b3d', stroke: '#a855f7', text: '#d8b4fe' },
  { fill: '#1a2e1a', stroke: '#4ade80', text: '#86efac' },
  { fill: '#3d1a1a', stroke: '#f87171', text: '#fca5a5' },
  { fill: '#2d2a0e', stroke: '#facc15', text: '#fde68a' },
  { fill: '#1a2d2d', stroke: '#2dd4bf', text: '#99f6e4' },
  { fill: '#2d1e0e', stroke: '#fb923c', text: '#fed7aa' },
  { fill: '#1e1e2d', stroke: '#818cf8', text: '#c7d2fe' },
];

let tlTranslate = { x: 40, y: 40 };
let tlScale = 1;
let tlDragging = false;
let tlDragStart = { x: 0, y: 0 };
let tlDragOrigin = { x: 0, y: 0 };
let tlActive = false;

// ====================================
// CARGA DE DATOS
// ====================================

async function buildTimelineData() {
  if (!state.projectData) return { rows: [], segments: [] };

  const capitulosRuta = state.projectData.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosRuta) return { rows: [], segments: [] };

  const tramasRuta = state.projectData.configuracion?.directorios?.tramas?.ruta;

  // Índice nombre de trama → path de fichero
  const tramaFileIndex = {};
  if (tramasRuta) {
    try {
      const tramaEntries = await window.electronAPI.readDirectory(tramasRuta);
      tramaEntries.forEach(e => {
        if (!e.isDirectory) {
          const key = e.name.replace(/\.[^.]+$/, '').replace(/^\d+-/, '');
          tramaFileIndex[key] = e.path;
        }
      });
    } catch { /* directorio vacío o no configurado */ }
  }

  const capEntries = await window.electronAPI.readDirectory(capitulosRuta);
  const chapters = capEntries
    .filter(e => e.isDirectory)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const rows = [];
  const segments = [];
  const segmentMap = {}; // tramaName → index en segments

  for (const chapter of chapters) {
    let sceneEntries;
    try {
      sceneEntries = await window.electronAPI.readDirectory(chapter.path);
    } catch { continue; }

    const scenes = sceneEntries
      .filter(e => !e.isDirectory && e.name.endsWith('.txt'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (scenes.length === 0) continue;

    rows.push({ type: 'chapter', label: chapter.name });

    for (const scene of scenes) {
      const meta = getByPath(state.projectData.metadatos, scene.path);
      const tramas = meta?.tramas || [];

      rows.push({
        type: 'scene',
        label: scene.name.replace(/\.txt$/i, ''),
        path: scene.path,
        tramas,
      });

      for (const tramaName of tramas) {
        if (segmentMap[tramaName] === undefined) {
          segmentMap[tramaName] = segments.length;
          segments.push({
            name: tramaName,
            columnIndex: segments.length,
            filePath: tramaFileIndex[tramaName] || null,
          });
        }
      }
    }
  }

  return { rows, segments };
}

// ====================================
// LAYOUT
// ====================================

function computeTimelineLayout(rows, segments) {
  let cursor = TL.START_Y + TL.HEADER_H;

  for (const row of rows) {
    row.y = cursor;
    cursor += row.type === 'chapter' ? TL.SEP_H : TL.ROW_H;
  }

  // Rango vertical de la línea de cada segmento
  for (const seg of segments) {
    const segRows = rows.filter(r => r.type === 'scene' && r.tramas.includes(seg.name));
    if (segRows.length > 0) {
      const chipOffsetY = (TL.ROW_H - TL.CHIP_H) / 2 + TL.CHIP_H / 2;
      seg.lineTop    = segRows[0].y + chipOffsetY;
      seg.lineBottom = segRows[segRows.length - 1].y + chipOffsetY;
    }
  }
}

// ====================================
// RENDERIZADO SVG
// ====================================

function tlEscapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tlTruncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return tlEscapeXml(text);
  return tlEscapeXml(text.slice(0, max - 1)) + '…';
}

function renderTimelineSVG(rows, segments) {
  const X0 = TL.START_X + TL.LABEL_W;
  let out = '';

  // Cabeceras de columna (nombre de trama)
  for (const seg of segments) {
    const c = TL_PALETTE[seg.columnIndex % TL_PALETTE.length];
    const hx = X0 + seg.columnIndex * TL.COL_W + (TL.COL_W - TL.CHIP_W) / 2;
    const hy = TL.START_Y;
    const hh = TL.HEADER_H - 8;
    const interact = seg.filePath
      ? `data-path="${tlEscapeXml(seg.filePath)}" data-type="trama" style="cursor:pointer"`
      : `data-type="trama"`;
    out += `
      <g class="tl-node" ${interact}>
        <rect x="${hx}" y="${hy}" width="${TL.CHIP_W}" height="${hh}" rx="8"
              fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>
        <text x="${hx + TL.CHIP_W / 2}" y="${hy + hh / 2 + 5}"
              text-anchor="middle" fill="${c.text}" font-size="12" font-weight="600"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
          ${tlTruncate(seg.name, 18)}
        </text>
      </g>`;
  }

  // Líneas verticales de segmento
  for (const seg of segments) {
    if (seg.lineTop === undefined) continue;
    const c = TL_PALETTE[seg.columnIndex % TL_PALETTE.length];
    const lx = X0 + seg.columnIndex * TL.COL_W + TL.COL_W / 2;
    out += `<line x1="${lx}" y1="${seg.lineTop}" x2="${lx}" y2="${seg.lineBottom}"
                  stroke="${c.stroke}" stroke-width="2" opacity="0.35"/>`;
  }

  // Filas
  const totalW = TL.START_X + TL.LABEL_W + segments.length * TL.COL_W;

  for (const row of rows) {
    if (row.type === 'chapter') {
      const lineY = row.y + TL.SEP_H / 2;
      out += `
        <line x1="${TL.START_X}" y1="${lineY}" x2="${totalW}" y2="${lineY}"
              stroke="#334155" stroke-width="1" opacity="0.5"/>
        <text x="${TL.START_X + 4}" y="${lineY - 4}"
              fill="#64748b" font-size="11" font-weight="600"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
          ${tlEscapeXml(row.label)}
        </text>`;
    } else {
      // Etiqueta izquierda de la escena (clicable)
      const ly = row.y + (TL.ROW_H - TL.CHIP_H) / 2;
      out += `
        <g class="tl-node" data-path="${tlEscapeXml(row.path)}" data-type="scene" style="cursor:pointer">
          <rect x="${TL.START_X}" y="${ly}" width="${TL.LABEL_W - 10}" height="${TL.CHIP_H}" rx="6"
                fill="#1e293b" stroke="#334155" stroke-width="1"/>
          <text x="${TL.START_X + 8}" y="${ly + TL.CHIP_H / 2 + 4}"
                fill="#94a3b8" font-size="11"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
            ${tlTruncate(row.label, 20)}
          </text>
        </g>`;

      // Chips de trama
      for (const tramaName of row.tramas) {
        const seg = segments.find(s => s.name === tramaName);
        if (!seg) continue;
        const c = TL_PALETTE[seg.columnIndex % TL_PALETTE.length];
        const cx = X0 + seg.columnIndex * TL.COL_W + (TL.COL_W - TL.CHIP_W) / 2;
        const cy = row.y + (TL.ROW_H - TL.CHIP_H) / 2;
        out += `
          <g class="tl-node" data-path="${tlEscapeXml(row.path)}" data-type="scene" style="cursor:pointer">
            <rect x="${cx}" y="${cy}" width="${TL.CHIP_W}" height="${TL.CHIP_H}" rx="6"
                  fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>
            <text x="${cx + TL.CHIP_W / 2}" y="${cy + TL.CHIP_H / 2 + 4}"
                  text-anchor="middle" fill="${c.text}" font-size="11"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
              ${tlTruncate(row.label, 18)}
            </text>
          </g>`;
      }
    }
  }

  return out;
}

// ====================================
// MOSTRAR / OCULTAR
// ====================================

function showTimelineView() {
  document.getElementById('timeline-resizer').classList.remove('hidden');
  document.getElementById('timeline-panel').classList.remove('hidden');
  tlActive = true;
  document.getElementById('btn-timeline')?.classList.add('active');
}

function hideTimelineView() {
  document.getElementById('timeline-resizer').classList.add('hidden');
  document.getElementById('timeline-panel').classList.add('hidden');
  tlActive = false;
  document.getElementById('btn-timeline')?.classList.remove('active');
}

// ====================================
// ABRIR TIMELINE
// ====================================

async function openTimeline() {
  if (!state.projectData) {
    showNotification('No hay proyecto abierto', true);
    return;
  }

  if (tlActive) {
    hideTimelineView();
    return;
  }

  showTimelineView();

  const container = document.getElementById('timeline-container');
  container.innerHTML = `<div class="tl-loading"><div class="spinner"></div><p>Construyendo línea temporal…</p></div>`;

  tlTranslate = { x: 40, y: 40 };
  tlScale = 1;

  const { rows, segments } = await buildTimelineData();

  const sceneRows = rows.filter(r => r.type === 'scene');

  if (sceneRows.length === 0) {
    container.innerHTML = `<div class="tl-empty">No hay capítulos con escenas configurados.<br>Asegúrate de tener el directorio de capítulos configurado.</div>`;
    return;
  }

  if (segments.length === 0) {
    container.innerHTML = `<div class="tl-empty">No hay tramas asignadas a las escenas.<br>Asigna tramas desde el panel de metadatos de cada escena.</div>`;
    return;
  }

  computeTimelineLayout(rows, segments);
  const svgContent = renderTimelineSVG(rows, segments);

  container.innerHTML = `
    <svg id="timeline-svg" width="100%" height="100%"
         xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f172a"/>
      <g id="timeline-scene" transform="translate(${tlTranslate.x},${tlTranslate.y}) scale(${tlScale})">
        ${svgContent}
      </g>
    </svg>`;

  setupTimelineInteraction();
}

// ====================================
// INTERACCIÓN: pan, zoom, clic
// ====================================

function applyTimelineTransform() {
  const scene = document.getElementById('timeline-scene');
  if (scene) {
    scene.setAttribute('transform', `translate(${tlTranslate.x},${tlTranslate.y}) scale(${tlScale})`);
  }
}

function setupTimelineInteraction() {
  const svg = document.getElementById('timeline-svg');
  if (!svg) return;

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.15, tlScale * delta));
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    tlTranslate.x = mx - (mx - tlTranslate.x) * (newScale / tlScale);
    tlTranslate.y = my - (my - tlTranslate.y) * (newScale / tlScale);
    tlScale = newScale;
    applyTimelineTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tl-node')) return;
    tlDragging = true;
    tlDragStart = { x: e.clientX, y: e.clientY };
    tlDragOrigin = { ...tlTranslate };
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', onTimelineMouseMove);
  window.addEventListener('mouseup', onTimelineMouseUp);

  svg.style.cursor = 'grab';

  svg.addEventListener('click', async (e) => {
    const nodeEl = e.target.closest('.tl-node');
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

function onTimelineMouseMove(e) {
  if (!tlDragging) return;
  tlTranslate.x = tlDragOrigin.x + (e.clientX - tlDragStart.x);
  tlTranslate.y = tlDragOrigin.y + (e.clientY - tlDragStart.y);
  applyTimelineTransform();
}

function onTimelineMouseUp() {
  if (!tlDragging) return;
  tlDragging = false;
  const svg = document.getElementById('timeline-svg');
  if (svg) svg.style.cursor = 'grab';
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupTramaTimelineListeners() {
  document.getElementById('btn-timeline')?.addEventListener('click', openTimeline);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tlActive) hideTimelineView();
  });

  const resizer = document.getElementById('timeline-resizer');
  const panel   = document.getElementById('timeline-panel');
  const MIN_H   = 120;
  const MAX_H   = () => window.innerHeight - 160;

  const savedH = parseInt(localStorage.getItem('timelineHeight'));
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
      localStorage.setItem('timelineHeight', panel.offsetHeight);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });
}
