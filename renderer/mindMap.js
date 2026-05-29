// ====================================
// MIND MAP
// Vista de mapa mental: capítulos → escenas → personajes
// SVG puro con pan y zoom
// ====================================

// --- Constantes de layout ---
const MM = {
  NODE_W: 170,
  NODE_H: 38,
  GAP_Y: 12,        // espacio vertical entre nodos hermanos
  GAP_CHAPTER: 36,  // espacio extra entre capítulos
  GAP_SCENE: 18,    // espacio extra entre escenas
  COL_GAP: 210,     // distancia horizontal entre columnas
  COL_START: 60,    // x inicial de la primera columna
  CURVE: 60,        // curvatura de las líneas bézier
  COLORS: {
    chapter:   { fill: '#1e3a5f', stroke: '#4a9eff', text: '#93c5fd' },
    scene:     { fill: '#1e293b', stroke: '#64748b', text: '#cbd5e1' },
    character: { fill: '#1a2e1a', stroke: '#4ade80', text: '#86efac' },
    edge:      '#334155'
  }
};

// --- Estado del mapa ---
let mmTranslate = { x: 60, y: 60 };
let mmScale = 1;
let mmDragging = false;
let mmDragStart = { x: 0, y: 0 };
let mmDragOrigin = { x: 0, y: 0 };

// ====================================
// CARGA DE DATOS
// ====================================

async function buildMindMapData() {
  if (!state.projectData) return [];

  const capitulosRuta = state.projectData.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosRuta) return [];

  const personajesRuta = state.projectData.configuracion?.directorios?.personajes?.ruta;

  // Leer capítulos (subcarpetas del directorio de capítulos)
  const capEntries = await window.electronAPI.readDirectory(capitulosRuta);
  const chapters = capEntries.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));

  // Índice de ficheros de personajes para encontrar paths al hacer clic
  let charFileIndex = {};
  if (personajesRuta) {
    try {
      const charEntries = await window.electronAPI.readDirectory(personajesRuta);
      charEntries.forEach(e => {
        if (!e.isDirectory) {
          const baseName = e.name.replace(/\.[^.]+$/, '');
          charFileIndex[baseName.toLowerCase()] = e.path;
        }
      });
    } catch { /* directorio de personajes vacío o no configurado */ }
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

    // Leer escenas (ficheros .txt dentro del capítulo)
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

        // Leer personajes de los metadatos
        const meta = state.projectData.metadatos?.[scene.path];
        const personajes = meta?.personajes || [];

        for (const nombre of personajes) {
          const charPath = charFileIndex[nombre.toLowerCase()] || null;
          sceneNode.children.push({
            label: nombre,
            type: 'character',
            path: charPath,
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
// Devuelve la altura total usada
// ====================================

function computeLayout(chapters) {
  const colX = [
    MM.COL_START,
    MM.COL_START + MM.NODE_W + MM.COL_GAP,
    MM.COL_START + (MM.NODE_W + MM.COL_GAP) * 2
  ];

  let cursor = 0; // posición Y actual

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
          // Centrar escena sobre sus personajes
          const sceneBottom = cursor - MM.GAP_Y;
          scene.x = colX[1];
          scene.y = sceneTop + (sceneBottom - sceneTop) / 2 - MM.NODE_H / 2;
        }

        cursor += MM.GAP_SCENE;
      }

      // Centrar capítulo sobre sus escenas
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
  const c = MM.COLORS[node.type];
  const nodeId = 'mm-node-' + btoa(encodeURIComponent(node.label + node.type)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const clickable = node.path ? 'style="cursor:pointer"' : '';
  const pathAttr = node.path ? `data-path="${node.path.replace(/"/g, '&quot;')}" data-is-dir="${node.isDirectory}"` : '';

  return `
    <g class="mm-node" ${clickable} ${pathAttr} data-type="${node.type}" id="${nodeId}">
      <rect x="${node.x}" y="${node.y}"
            width="${MM.NODE_W}" height="${MM.NODE_H}" rx="8"
            fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>
      <text x="${node.x + MM.NODE_W / 2}" y="${node.y + MM.NODE_H / 2 + 5}"
            text-anchor="middle"
            fill="${c.text}"
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
  const cx = x1 + MM.CURVE;
  const cx2 = x2 - MM.CURVE;

  return `<path d="M${x1},${y1} C${cx},${y1} ${cx2},${y2} ${x2},${y2}"
               fill="none" stroke="${MM.COLORS.edge}" stroke-width="1.5" opacity="0.6"/>`;
}

function svgTruncate(text, maxChars) {
  if (text.length <= maxChars) return escapeXml(text);
  return escapeXml(text.slice(0, maxChars - 1)) + '…';
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMindMapSVG(chapters, totalHeight) {
  const totalWidth = MM.COL_START + (MM.NODE_W + MM.COL_GAP) * 3 + 60;
  const svgH = Math.max(totalHeight + 120, 600);
  const svgW = Math.max(totalWidth, 800);

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

  return { svgW, svgH, edges, nodes };
}

// ====================================
// APERTURA Y CIERRE
// ====================================

async function openMindMap() {
  if (!state.projectData) {
    showNotification('No hay proyecto abierto', true);
    return;
  }

  const overlay = document.getElementById('mindmap-overlay');
  overlay.classList.remove('hidden');

  // Mostrar spinner mientras carga
  const container = document.getElementById('mindmap-container');
  container.innerHTML = `<div class="mindmap-loading"><div class="spinner"></div><p>Construyendo mapa…</p></div>`;

  // Reset transform
  mmTranslate = { x: 80, y: 80 };
  mmScale = 1;

  const chapters = await buildMindMapData();

  if (chapters.length === 0) {
    container.innerHTML = `<div class="mindmap-empty">No hay capítulos con contenido para mostrar.<br>Asegúrate de tener el directorio de capítulos configurado.</div>`;
    return;
  }

  const totalHeight = computeLayout(chapters);
  const { svgW, svgH, edges, nodes } = renderMindMapSVG(chapters, totalHeight);

  container.innerHTML = `
    <svg id="mindmap-svg" width="100%" height="100%"
         xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f172a"/>
      <g id="mindmap-scene" transform="translate(${mmTranslate.x},${mmTranslate.y}) scale(${mmScale})">
        <g id="mm-edges">${edges}</g>
        <g id="mm-nodes">${nodes}</g>
      </g>
    </svg>`;

  setupMindMapInteraction();
}

function closeMindMap() {
  document.getElementById('mindmap-overlay').classList.add('hidden');
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

  // Zoom con rueda
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.2, mmScale * delta));

    // Zoom centrado en el cursor
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
    if (e.target.closest('.mm-node')) return; // no arrastrar si es un nodo
    mmDragging = true;
    mmDragStart = { x: e.clientX, y: e.clientY };
    mmDragOrigin = { ...mmTranslate };
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!mmDragging) return;
    mmTranslate.x = mmDragOrigin.x + (e.clientX - mmDragStart.x);
    mmTranslate.y = mmDragOrigin.y + (e.clientY - mmDragStart.y);
    applyMindMapTransform();
  });

  window.addEventListener('mouseup', () => {
    if (mmDragging) {
      mmDragging = false;
      const svg = document.getElementById('mindmap-svg');
      if (svg) svg.style.cursor = 'grab';
    }
  });

  svg.style.cursor = 'grab';

  // Clic en nodos
  svg.addEventListener('click', async (e) => {
    const nodeEl = e.target.closest('.mm-node[data-path]');
    if (!nodeEl) return;

    const filePath = nodeEl.dataset.path;
    const isDir = nodeEl.dataset.isDir === 'true';
    const type = nodeEl.dataset.type;
    const label = nodeEl.querySelector('text')?.textContent?.trim();

    if (!filePath) {
      showNotification(`${label} — sin fichero asociado`);
      return;
    }

    closeMindMap();

    if (type === 'chapter') {
      // Abrir panel de metadatos del capítulo en split
      const item = { name: label, path: filePath, isDirectory: true };
      openChapterMetadataPanel(item);
    } else {
      // Abrir fichero en split derecho
      await openInSplit({ name: label, path: filePath });
    }
  });
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupMindMapListeners() {
  document.getElementById('btn-mindmap')?.addEventListener('click', openMindMap);
  document.getElementById('btn-close-mindmap')?.addEventListener('click', closeMindMap);

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('mindmap-overlay');
      if (overlay && !overlay.classList.contains('hidden')) closeMindMap();
    }
  });
}
