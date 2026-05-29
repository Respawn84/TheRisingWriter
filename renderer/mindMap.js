// ====================================
// MIND MAP
// Vista de mapa mental encastrada en el área del editor
// Capítulos → Escenas → Personajes
// SVG puro con pan y zoom
// ====================================

// --- Constantes de layout ---
const MM = {
  NODE_W: 170,
  NODE_H: 38,
  GAP_Y: 12,
  GAP_CHAPTER: 36,
  GAP_SCENE: 18,
  COL_GAP: 210,
  COL_START: 60,
  CURVE: 60,
  COLORS: {
    chapter:   { fill: '#1e3a5f', stroke: '#4a9eff', text: '#93c5fd' },
    scene:     { fill: '#1e293b', stroke: '#64748b', text: '#cbd5e1' },
    character: { fill: '#1a2e1a', stroke: '#4ade80', text: '#86efac' },
    edge:      '#334155'
  }
};

// --- Estado de transformación del mapa ---
let mmTranslate = { x: 80, y: 60 };
let mmScale = 1;
let mmDragging = false;
let mmDragStart = { x: 0, y: 0 };
let mmDragOrigin = { x: 0, y: 0 };
let mmActive = false;

// ====================================
// CARGA DE DATOS
// ====================================

async function buildMindMapData() {
  if (!state.projectData) return [];

  const capitulosRuta = state.projectData.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosRuta) return [];

  const personajesRuta = state.projectData.configuracion?.directorios?.personajes?.ruta;

  const capEntries = await window.electronAPI.readDirectory(capitulosRuta);
  const chapters = capEntries.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));

  // Índice nombre→path de ficheros de personajes
  let charFileIndex = {};
  if (personajesRuta) {
    try {
      const charEntries = await window.electronAPI.readDirectory(personajesRuta);
      charEntries.forEach(e => {
        if (!e.isDirectory) {
          const base = e.name.replace(/\.[^.]+$/, '');
          charFileIndex[base.toLowerCase()] = e.path;
        }
      });
    } catch { /* directorio vacío o no configurado */ }
  }

  const nodes = [];

  for (const chapter of chapters) {
    const chapterNode = {
      label: chapter.name,
      type: 'chapter',
      path: chapter.path,
      isDirectory: true,
      children: []
    };

    try {
      const sceneEntries = await window.electronAPI.readDirectory(chapter.path);
      const scenes = sceneEntries
        .filter(e => !e.isDirectory && e.name.endsWith('.txt'))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const scene of scenes) {
        const sceneNode = {
          label: scene.name.replace(/\.txt$/i, ''),
          type: 'scene',
          path: scene.path,
          isDirectory: false,
          children: []
        };

        const meta = state.projectData.metadatos?.[scene.path];
        const personajes = meta?.personajes || [];

        for (const nombre of personajes) {
          sceneNode.children.push({
            label: nombre,
            type: 'character',
            path: charFileIndex[nombre.toLowerCase()] || null,
            isDirectory: false,
            children: []
          });
        }

        chapterNode.children.push(sceneNode);
      }
    } catch { /* capítulo vacío */ }

    nodes.push(chapterNode);
  }

  return nodes;
}

// ====================================
// LAYOUT — árbol horizontal L→R
// ====================================

function computeLayout(chapters) {
  const colX = [
    MM.COL_START,
    MM.COL_START + MM.NODE_W + MM.COL_GAP,
    MM.COL_START + (MM.NODE_W + MM.COL_GAP) * 2
  ];

  let cursor = 0;

  for (const chapter of chapters) {
    const chapterTop = cursor;

    if (chapter.children.length === 0) {
      chapter.x = colX[0];
      chapter.y = cursor;
      cursor += MM.NODE_H + MM.GAP_Y;
    } else {
      for (const scene of chapter.children) {
        const sceneTop = cursor;

        if (scene.children.length === 0) {
          scene.x = colX[1];
          scene.y = cursor;
          cursor += MM.NODE_H + MM.GAP_Y;
        } else {
          for (const char of scene.children) {
            char.x = colX[2];
            char.y = cursor;
            cursor += MM.NODE_H + MM.GAP_Y;
          }
          const sceneBottom = cursor - MM.GAP_Y;
          scene.x = colX[1];
          scene.y = sceneTop + (sceneBottom - sceneTop) / 2 - MM.NODE_H / 2;
        }

        cursor += MM.GAP_SCENE;
      }

      const chapterBottom = cursor - MM.GAP_SCENE;
      chapter.x = colX[0];
      chapter.y = chapterTop + (chapterBottom - chapterTop) / 2 - MM.NODE_H / 2;
    }

    cursor += MM.GAP_CHAPTER;
  }

  return cursor;
}

// ====================================
// RENDERIZADO SVG
// ====================================

function svgNode(node) {
  const hasFile = !!node.path;
  // Personaje sin fichero asociado: colores atenuados para indicar que no es clicable
  let c = MM.COLORS[node.type];
  if (node.type === 'character' && !hasFile) {
    c = { fill: '#111a11', stroke: '#2d5a2d', text: '#4a7a4a' };
  }

  const clickable = hasFile ? 'style="cursor:pointer"' : 'style="opacity:0.55"';
  const pathAttr = hasFile
    ? `data-path="${node.path.replace(/"/g, '&quot;')}" data-is-dir="${node.isDirectory}"`
    : '';

  return `
    <g class="mm-node" ${clickable} ${pathAttr} data-type="${node.type}">
      <rect x="${node.x}" y="${node.y}"
            width="${MM.NODE_W}" height="${MM.NODE_H}" rx="8"
            fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>
      <text x="${node.x + MM.NODE_W / 2}" y="${node.y + MM.NODE_H / 2 + 5}"
            text-anchor="middle" fill="${c.text}"
            font-size="12"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
        ${svgTruncate(node.label, 22)}
      </text>
    </g>`;
}

function svgEdge(parent, child) {
  const x1 = parent.x + MM.NODE_W;
  const y1 = parent.y + MM.NODE_H / 2;
  const x2 = child.x;
  const y2 = child.y + MM.NODE_H / 2;
  const cx1 = x1 + MM.CURVE;
  const cx2 = x2 - MM.CURVE;
  return `<path d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}"
               fill="none" stroke="${MM.COLORS.edge}" stroke-width="1.5" opacity="0.6"/>`;
}

function svgTruncate(text, max) {
  if (text.length <= max) return escapeXml(text);
  return escapeXml(text.slice(0, max - 1)) + '…';
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMindMapSVG(chapters) {
  let edges = '';
  let nodes = '';

  for (const chapter of chapters) {
    nodes += svgNode(chapter);
    for (const scene of chapter.children) {
      edges += svgEdge(chapter, scene);
      nodes += svgNode(scene);
      for (const char of scene.children) {
        edges += svgEdge(scene, char);
        nodes += svgNode(char);
      }
    }
  }

  return { edges, nodes };
}

// ====================================
// MOSTRAR / OCULTAR
// ====================================

function showEditorView() {
  document.getElementById('tab-bar').classList.remove('hidden');
  document.getElementById('editors-wrapper').classList.remove('hidden');
  document.getElementById('format-bar').classList.remove('hidden');
  document.getElementById('mindmap-panel').classList.add('hidden');
  mmActive = false;
  // Restaurar estado del botón
  document.getElementById('btn-mindmap')?.classList.remove('active');
}

function showMindMapView() {
  document.getElementById('tab-bar').classList.add('hidden');
  document.getElementById('editors-wrapper').classList.add('hidden');
  document.getElementById('format-bar').classList.add('hidden');
  document.getElementById('mindmap-panel').classList.remove('hidden');
  mmActive = true;
  document.getElementById('btn-mindmap')?.classList.add('active');
}

// ====================================
// ABRIR MAPA
// ====================================

async function openMindMap() {
  if (!state.projectData) {
    showNotification('No hay proyecto abierto', true);
    return;
  }

  // Toggle: si ya está activo, volver al editor
  if (mmActive) {
    showEditorView();
    return;
  }

  showMindMapView();

  // Spinner mientras carga
  const container = document.getElementById('mindmap-container');
  container.innerHTML = `<div class="mindmap-loading"><div class="spinner"></div><p>Construyendo mapa…</p></div>`;

  // Reset transform
  mmTranslate = { x: 80, y: 60 };
  mmScale = 1;

  const chapters = await buildMindMapData();

  if (chapters.length === 0) {
    container.innerHTML = `<div class="mindmap-empty">No hay capítulos con contenido para mostrar.<br>Asegúrate de tener el directorio de capítulos configurado.</div>`;
    return;
  }

  const totalHeight = computeLayout(chapters);
  const { edges, nodes } = renderMindMapSVG(chapters);

  container.innerHTML = `
    <svg id="mindmap-svg" width="100%" height="100%"
         xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f172a"/>
      <g id="mindmap-scene" transform="translate(${mmTranslate.x},${mmTranslate.y}) scale(${mmScale})">
        <g>${edges}</g>
        <g>${nodes}</g>
      </g>
    </svg>`;

  setupMindMapInteraction();
}

// ====================================
// INTERACCIÓN: pan, zoom, clic
// ====================================

function applyMindMapTransform() {
  const scene = document.getElementById('mindmap-scene');
  if (scene) {
    scene.setAttribute('transform', `translate(${mmTranslate.x},${mmTranslate.y}) scale(${mmScale})`);
  }
}

function setupMindMapInteraction() {
  const svg = document.getElementById('mindmap-svg');
  if (!svg) return;

  // Zoom con rueda centrado en cursor
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.15, mmScale * delta));
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mmTranslate.x = mx - (mx - mmTranslate.x) * (newScale / mmScale);
    mmTranslate.y = my - (my - mmTranslate.y) * (newScale / mmScale);
    mmScale = newScale;
    applyMindMapTransform();
  }, { passive: false });

  // Pan con drag del fondo
  svg.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mm-node')) return;
    mmDragging = true;
    mmDragStart = { x: e.clientX, y: e.clientY };
    mmDragOrigin = { ...mmTranslate };
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', onMindMapMouseMove);
  window.addEventListener('mouseup', onMindMapMouseUp);

  svg.style.cursor = 'grab';

  // Clic en nodos
  svg.addEventListener('click', async (e) => {
    const nodeEl = e.target.closest('.mm-node[data-path]');
    if (!nodeEl) return;

    const filePath = nodeEl.dataset.path;
    const type = nodeEl.dataset.type;
    const label = nodeEl.querySelector('text')?.textContent?.trim() || '';

    if (type === 'chapter') {
      // Capítulo → metadatos en split derecho
      const item = { name: label, path: filePath, isDirectory: true };
      openChapterMetadataPanel(item);
    } else if (type === 'scene') {
      // Escena → abrir en split derecho (el mapa permanece visible)
      await openInSplit({ name: label, path: filePath });
    } else if (type === 'character') {
      // Personaje → abrir en split derecho (el mapa sigue visible)
      await openInSplit({ name: label, path: filePath });
    }
  });
}

function onMindMapMouseMove(e) {
  if (!mmDragging) return;
  mmTranslate.x = mmDragOrigin.x + (e.clientX - mmDragStart.x);
  mmTranslate.y = mmDragOrigin.y + (e.clientY - mmDragStart.y);
  applyMindMapTransform();
}

function onMindMapMouseUp() {
  if (!mmDragging) return;
  mmDragging = false;
  const svg = document.getElementById('mindmap-svg');
  if (svg) svg.style.cursor = 'grab';
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupMindMapListeners() {
  document.getElementById('btn-mindmap')?.addEventListener('click', openMindMap);

  // Volver al editor con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mmActive) showEditorView();
  });
}
