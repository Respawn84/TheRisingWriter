// ====================================
// ÁRBOL GENEALÓGICO
// Swimlanes horizontales con label editable a la izquierda.
// Cards de persona editables y arrastrables. Matrimonios múltiples
// y linajes "bastardos" (cada unión puede iniciar su propio linaje).
// Datos persistidos en projectData.genealogia. SVG con pan y zoom.
// ====================================

const GEN = {
  LABEL_W: 160,
  SW_H: 150,        // alto de cada swimlane
  CARD_W: 150,
  CARD_H: 56,
  CARD_GAP: 34,     // separación horizontal en layout automático
  START_X: 14,
  START_Y: 12,
  MIN_WIDTH: 900,
};

const GEN_PALETTE = [
  { fill: '#1e3a5f', stroke: '#4a9eff', text: '#bfdbfe' },
  { fill: '#2d1b3d', stroke: '#a855f7', text: '#e9d5ff' },
  { fill: '#1a2e1a', stroke: '#4ade80', text: '#bbf7d0' },
  { fill: '#3d1a1a', stroke: '#f87171', text: '#fecaca' },
  { fill: '#2d2a0e', stroke: '#facc15', text: '#fef08a' },
  { fill: '#1a2d2d', stroke: '#2dd4bf', text: '#99f6e4' },
  { fill: '#2d1e0e', stroke: '#fb923c', text: '#fed7aa' },
  { fill: '#1e1e2d', stroke: '#818cf8', text: '#c7d2fe' },
];

let genTranslate = { x: 20, y: 20 };
let genScale = 1;
let genDragging = false;          // pan del lienzo
let genDragStart = { x: 0, y: 0 };
let genDragOrigin = { x: 0, y: 0 };
let genActive = false;

let genCardDrag = null;           // { id, moved } arrastre de card
let genPersonajeFiles = null;     // cache de ficheros de personaje para vínculo

// ====================================
// DATOS Y PERSISTENCIA
// ====================================

function genGetData() {
  if (!state.projectData) return null;
  if (!state.projectData.genealogia) {
    state.projectData.genealogia = {
      swimlanes: [],
      linajes: [],
      personas: [],
      relaciones: [],
    };
  }
  const g = state.projectData.genealogia;
  g.swimlanes = g.swimlanes || [];
  g.linajes = g.linajes || [];
  g.personas = g.personas || [];
  g.relaciones = g.relaciones || [];
  return g;
}

async function genSave() {
  if (!state.projectJsonPath || !state.projectData) return;
  await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
}

function genId(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function genEnsureBaseData(g) {
  if (g.linajes.length === 0) {
    g.linajes.push({ id: genId('lin'), nombre: 'Linaje principal', colorIndex: 0 });
  }
  if (g.swimlanes.length === 0) {
    g.swimlanes.push({ id: genId('sw'), label: 'Generación 1' });
  }
}

function genLinajeColor(linajeId) {
  const g = genGetData();
  const lin = g.linajes.find(l => l.id === linajeId);
  const idx = lin ? (lin.colorIndex % GEN_PALETTE.length) : 0;
  return GEN_PALETTE[idx];
}

function genNextColorIndex(g) {
  return g.linajes.length % GEN_PALETTE.length;
}

// ====================================
// LAYOUT
// ====================================

function genSwimlaneY(g, swimlaneId) {
  const idx = g.swimlanes.findIndex(s => s.id === swimlaneId);
  const i = idx < 0 ? 0 : idx;
  return GEN.START_Y + i * GEN.SW_H;
}

function genComputeLayout(g) {
  // Asignar x automática a quien no tenga posición guardada.
  for (const sw of g.swimlanes) {
    const enLane = g.personas.filter(p => p.swimlaneId === sw.id);
    let nextX = GEN.LABEL_W + 30;
    // respetar las x existentes para no solapar
    const usadas = enLane.filter(p => typeof p.x === 'number').map(p => p.x);
    if (usadas.length) nextX = Math.max(nextX, Math.max(...usadas) + GEN.CARD_W + GEN.CARD_GAP);
    for (const p of enLane) {
      if (typeof p.x !== 'number') {
        p.x = nextX;
        nextX += GEN.CARD_W + GEN.CARD_GAP;
      }
    }
  }
}

function genTotalWidth(g) {
  let max = GEN.MIN_WIDTH;
  for (const p of g.personas) {
    const right = (p.x || 0) + GEN.CARD_W + 60;
    if (right > max) max = right;
  }
  return max;
}

function genCardCenter(g, persona) {
  const y = genSwimlaneY(g, persona.swimlaneId) + GEN.SW_H / 2;
  return { x: (persona.x || 0) + GEN.CARD_W / 2, y };
}

// ====================================
// RENDER
// ====================================

function genEscapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function genTruncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return genEscapeXml(text);
  return genEscapeXml(text.slice(0, max - 1)) + '…';
}

function genRenderSVG(g) {
  const totalW = genTotalWidth(g);
  let bands = '';
  let lines = '';
  let cards = '';

  // Bandas (swimlanes) con label izquierdo
  g.swimlanes.forEach((sw, i) => {
    const y = GEN.START_Y + i * GEN.SW_H;
    const bandFill = i % 2 === 0 ? '#0f172a' : '#111c30';
    bands += `
      <g class="gen-band" data-swimlane="${genEscapeXml(sw.id)}">
        <rect x="${GEN.START_X}" y="${y}" width="${totalW}" height="${GEN.SW_H}"
              fill="${bandFill}" stroke="#1e293b" stroke-width="1"/>
        <rect x="${GEN.START_X}" y="${y}" width="${GEN.LABEL_W}" height="${GEN.SW_H}"
              fill="#152033" stroke="#1e293b" stroke-width="1"/>
        <foreignObject x="${GEN.START_X + 6}" y="${y + 6}" width="${GEN.LABEL_W - 12}" height="${GEN.SW_H - 12}">
          <div xmlns="http://www.w3.org/1999/xhtml" class="gen-lane-label"
               data-swimlane="${genEscapeXml(sw.id)}" title="Doble clic para editar">${genEscapeXml(sw.label)}</div>
        </foreignObject>
      </g>`;
  });

  // Relaciones: línea de matrimonio + nudo + filiaciones
  for (const rel of g.relaciones) {
    const a = g.personas.find(p => p.id === rel.personaA);
    const b = g.personas.find(p => p.id === rel.personaB);
    if (!a || !b) continue;
    const c = genLinajeColor(rel.linajeId);
    const ca = genCardCenter(g, a);
    const cb = genCardCenter(g, b);
    const dash = rel.bastardo ? `stroke-dasharray="6 5"` : '';

    // Línea entre cónyuges
    lines += `<line x1="${ca.x}" y1="${ca.y}" x2="${cb.x}" y2="${cb.y}"
                    stroke="${c.stroke}" stroke-width="2.5" opacity="0.85" ${dash}/>`;

    // Nudo de unión (punto medio): origen de descendencia y clic para hijos
    const knotX = (ca.x + cb.x) / 2;
    const knotY = (ca.y + cb.y) / 2;
    const hijos = g.personas.filter(p => p.relacionPadresId === rel.id);
    for (const h of hijos) {
      const ch = genCardCenter(g, h);
      const midY = (knotY + (ch.y - GEN.CARD_H / 2)) / 2;
      lines += `<path d="M ${knotX} ${knotY} V ${midY} H ${ch.x} V ${ch.y - GEN.CARD_H / 2}"
                      fill="none" stroke="${c.stroke}" stroke-width="2" opacity="0.7" ${dash}/>`;
    }
    const knotLabel = rel.bastardo ? '⚭*' : '⚭';
    lines += `
      <g class="gen-knot" data-rel="${genEscapeXml(rel.id)}" style="cursor:pointer">
        <circle cx="${knotX}" cy="${knotY}" r="11" fill="#0f172a" stroke="${c.stroke}" stroke-width="2"/>
        <text x="${knotX}" y="${knotY + 4}" text-anchor="middle" fill="${c.text}" font-size="12">${knotLabel}</text>
      </g>`;
  }

  // Cards de persona
  for (const p of g.personas) {
    const c = genLinajeColor(p.linajeId);
    const x = p.x || 0;
    const y = genSwimlaneY(g, p.swimlaneId) + (GEN.SW_H - GEN.CARD_H) / 2;
    const linkIcon = p.personajePath ? '🔗' : '';
    const fechas = p.fechas ? genTruncate(p.fechas, 22) : '';
    cards += `
      <g class="gen-card" data-id="${genEscapeXml(p.id)}" transform="translate(${x},${y})" style="cursor:grab">
        <rect x="0" y="0" width="${GEN.CARD_W}" height="${GEN.CARD_H}" rx="8"
              fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>
        <text x="10" y="22" fill="${c.text}" font-size="13" font-weight="600"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${genTruncate(p.nombre || 'Sin nombre', 18)}</text>
        <text x="10" y="40" fill="${c.text}" font-size="10.5" opacity="0.85"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${fechas}</text>
        <text x="${GEN.CARD_W - 14}" y="20" font-size="11">${linkIcon}</text>
      </g>`;
  }

  return bands + lines + cards;
}

// ====================================
// MOSTRAR / OCULTAR
// ====================================

function genShowView() {
  document.getElementById('genealogy-resizer').classList.remove('hidden');
  document.getElementById('genealogy-panel').classList.remove('hidden');
  genActive = true;
  document.getElementById('btn-genealogy')?.classList.add('active');
}

function genHideView() {
  document.getElementById('genealogy-resizer').classList.add('hidden');
  document.getElementById('genealogy-panel').classList.add('hidden');
  genActive = false;
  genCloseEditor();
  genCloseLinajeManager();
  genCloseMenu();
  document.getElementById('btn-genealogy')?.classList.remove('active');
}

// ====================================
// ABRIR / RENDER COMPLETO
// ====================================

async function openGenealogy() {
  if (!state.projectData) {
    showNotification('No hay proyecto abierto', true);
    return;
  }
  if (genActive) {
    genHideView();
    return;
  }
  genShowView();
  genPersonajeFiles = null;
  genTranslate = { x: 20, y: 20 };
  genScale = 1;
  genRenderAll();
}

function genRenderAll() {
  const g = genGetData();
  if (!g) return;
  genEnsureBaseData(g);
  genComputeLayout(g);

  const container = document.getElementById('genealogy-container');
  const svgContent = genRenderSVG(g);

  container.innerHTML = `
    <svg id="genealogy-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0b1220"/>
      <g id="genealogy-scene" transform="translate(${genTranslate.x},${genTranslate.y}) scale(${genScale})">
        ${svgContent}
      </g>
    </svg>`;

  genSetupInteraction();
}

function genApplyTransform() {
  const scene = document.getElementById('genealogy-scene');
  if (scene) {
    scene.setAttribute('transform', `translate(${genTranslate.x},${genTranslate.y}) scale(${genScale})`);
  }
}

// ====================================
// INTERACCIÓN: pan, zoom, drag de cards, clic
// ====================================

function genScreenToScene(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left - genTranslate.x) / genScale,
    y: (clientY - rect.top - genTranslate.y) / genScale,
  };
}

function genSetupInteraction() {
  const svg = document.getElementById('genealogy-svg');
  if (!svg) return;

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.2, genScale * delta));
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    genTranslate.x = mx - (mx - genTranslate.x) * (newScale / genScale);
    genTranslate.y = my - (my - genTranslate.y) * (newScale / genScale);
    genScale = newScale;
    genApplyTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', (e) => {
    genCloseMenu();
    const cardEl = e.target.closest('.gen-card');
    if (cardEl) {
      // Inicio de arrastre de card
      genCardDrag = { id: cardEl.dataset.id, moved: false, startX: e.clientX, startY: e.clientY };
      svg.style.cursor = 'grabbing';
      return;
    }
    if (e.target.closest('.gen-knot') || e.target.closest('.gen-lane-label')) return;
    // Pan del lienzo
    genDragging = true;
    genDragStart = { x: e.clientX, y: e.clientY };
    genDragOrigin = { ...genTranslate };
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', genOnMouseMove);
  window.addEventListener('mouseup', genOnMouseUp);

  svg.style.cursor = 'grab';

  // Clic simple en nudo de matrimonio → menú de relación
  svg.addEventListener('click', (e) => {
    const knot = e.target.closest('.gen-knot');
    if (knot) {
      genOpenRelMenu(knot.dataset.rel, e.clientX, e.clientY);
    }
  });

  // Doble clic: card → editor; label → edición inline
  svg.addEventListener('dblclick', (e) => {
    const cardEl = e.target.closest('.gen-card');
    if (cardEl) {
      genOpenEditor(cardEl.dataset.id);
      return;
    }
  });

  // Menú contextual sobre card
  svg.addEventListener('contextmenu', (e) => {
    const cardEl = e.target.closest('.gen-card');
    if (cardEl) {
      e.preventDefault();
      genOpenCardMenu(cardEl.dataset.id, e.clientX, e.clientY);
    }
  });

  // Edición inline de labels de swimlane
  document.querySelectorAll('.gen-lane-label').forEach(el => {
    el.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      genEditLaneLabel(el.dataset.swimlane);
    });
  });
}

function genOnMouseMove(e) {
  if (genCardDrag) {
    const g = genGetData();
    const p = g.personas.find(pp => pp.id === genCardDrag.id);
    if (!p) return;
    if (!genCardDrag.moved) {
      const dx = Math.abs(e.clientX - genCardDrag.startX);
      const dy = Math.abs(e.clientY - genCardDrag.startY);
      if (dx < 3 && dy < 3) return;
      genCardDrag.moved = true;
    }
    const svg = document.getElementById('genealogy-svg');
    const pt = genScreenToScene(svg, e.clientX, e.clientY);
    p.x = Math.max(GEN.LABEL_W + 10, Math.round(pt.x - GEN.CARD_W / 2));
    // swimlane según y
    const idx = Math.floor((pt.y - GEN.START_Y) / GEN.SW_H);
    const clamped = Math.max(0, Math.min(g.swimlanes.length - 1, idx));
    p.swimlaneId = g.swimlanes[clamped].id;
    genRedrawScene(g);
    return;
  }
  if (!genDragging) return;
  genTranslate.x = genDragOrigin.x + (e.clientX - genDragStart.x);
  genTranslate.y = genDragOrigin.y + (e.clientY - genDragStart.y);
  genApplyTransform();
}

async function genOnMouseUp() {
  const svg = document.getElementById('genealogy-svg');
  if (genCardDrag) {
    const moved = genCardDrag.moved;
    genCardDrag = null;
    if (svg) svg.style.cursor = 'grab';
    if (moved) await genSave();
    return;
  }
  if (!genDragging) return;
  genDragging = false;
  if (svg) svg.style.cursor = 'grab';
}

// Redibuja solo el contenido de la escena sin recrear el SVG ni perder transform.
function genRedrawScene(g) {
  const scene = document.getElementById('genealogy-scene');
  if (!scene) return;
  genComputeLayout(g);
  scene.innerHTML = genRenderSVG(g);
  // re-enlazar labels (los nodos se recrearon)
  document.querySelectorAll('.gen-lane-label').forEach(el => {
    el.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      genEditLaneLabel(el.dataset.swimlane);
    });
  });
}

// ====================================
// EDICIÓN DE LABEL DE SWIMLANE
// ====================================

function genEditLaneLabel(swimlaneId) {
  const g = genGetData();
  const sw = g.swimlanes.find(s => s.id === swimlaneId);
  if (!sw) return;
  const el = document.querySelector(`.gen-lane-label[data-swimlane="${CSS.escape(swimlaneId)}"]`);
  if (!el) return;
  el.contentEditable = 'true';
  el.classList.add('editing');
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const selsel = window.getSelection();
  selsel.removeAllRanges();
  selsel.addRange(range);

  const commit = async () => {
    el.contentEditable = 'false';
    el.classList.remove('editing');
    const val = el.textContent.trim();
    sw.label = val || sw.label;
    el.removeEventListener('blur', commit);
    el.removeEventListener('keydown', onKey);
    await genSave();
    genRedrawScene(g);
  };
  const onKey = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
    if (ev.key === 'Escape') { el.textContent = sw.label; el.blur(); }
  };
  el.addEventListener('blur', commit);
  el.addEventListener('keydown', onKey);
}

// ====================================
// MENÚ CONTEXTUAL
// ====================================

function genCloseMenu() {
  document.getElementById('gen-context-menu')?.remove();
}

function genBuildMenu(items, clientX, clientY) {
  genCloseMenu();
  const menu = document.createElement('div');
  menu.id = 'gen-context-menu';
  menu.className = 'gen-context-menu';
  for (const it of items) {
    if (it.sep) {
      const s = document.createElement('div');
      s.className = 'gen-menu-sep';
      menu.appendChild(s);
      continue;
    }
    const btn = document.createElement('button');
    btn.className = 'gen-menu-item';
    btn.textContent = it.label;
    btn.addEventListener('click', async () => {
      genCloseMenu();
      await it.action();
    });
    menu.appendChild(btn);
  }
  document.body.appendChild(menu);
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = clientX, top = clientY;
  if (left + mw > window.innerWidth) left = window.innerWidth - mw - 8;
  if (top + mh > window.innerHeight) top = window.innerHeight - mh - 8;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';

  setTimeout(() => {
    const close = (ev) => {
      if (!ev.target.closest('#gen-context-menu')) {
        genCloseMenu();
        document.removeEventListener('mousedown', close);
      }
    };
    document.addEventListener('mousedown', close);
  }, 0);
}

function genOpenCardMenu(personaId, clientX, clientY) {
  const g = genGetData();
  const p = g.personas.find(pp => pp.id === personaId);
  if (!p) return;
  genBuildMenu([
    { label: '✎ Editar persona', action: () => genOpenEditor(personaId) },
    { label: '💍 Añadir cónyuge (nuevo linaje)', action: () => genAddSpouse(personaId) },
    { sep: true },
    { label: '🗑 Borrar persona', action: () => genDeletePersona(personaId) },
  ], clientX, clientY);
}

function genOpenRelMenu(relId, clientX, clientY) {
  const g = genGetData();
  const rel = g.relaciones.find(r => r.id === relId);
  if (!rel) return;
  genBuildMenu([
    { label: '👶 Añadir hijo/a', action: () => genAddChild(relId) },
    { label: '🎨 Editar linaje', action: () => genOpenLinajeManager(rel.linajeId) },
    { label: rel.bastardo ? '◇ Marcar como linaje principal' : '◆ Marcar como linaje bastardo',
      action: () => genToggleBastardo(relId) },
    { sep: true },
    { label: '🗑 Eliminar matrimonio', action: () => genDeleteRelacion(relId) },
  ], clientX, clientY);
}

// ====================================
// OPERACIONES DE DATOS
// ====================================

async function genAddSwimlane() {
  const g = genGetData();
  genEnsureBaseData(g);
  g.swimlanes.push({ id: genId('sw'), label: `Generación ${g.swimlanes.length + 1}` });
  await genSave();
  genRenderAll();
}

async function genAddPersona() {
  const g = genGetData();
  genEnsureBaseData(g);
  const persona = {
    id: genId('per'),
    nombre: 'Nueva persona',
    fechas: '',
    nota: '',
    linajeId: g.linajes[0].id,
    swimlaneId: g.swimlanes[0].id,
    personajePath: '',
  };
  g.personas.push(persona);
  await genSave();
  genRenderAll();
  genOpenEditor(persona.id);
}

async function genAddSpouse(personaId) {
  const g = genGetData();
  const p = g.personas.find(pp => pp.id === personaId);
  if (!p) return;
  // Nuevo linaje propio para esta unión
  const linaje = { id: genId('lin'), nombre: `Linaje de ${p.nombre}`, colorIndex: genNextColorIndex(g) };
  g.linajes.push(linaje);
  const spouse = {
    id: genId('per'),
    nombre: 'Cónyuge',
    fechas: '',
    nota: '',
    linajeId: linaje.id,
    swimlaneId: p.swimlaneId,
    x: (p.x || GEN.LABEL_W + 30) + GEN.CARD_W + GEN.CARD_GAP,
    personajePath: '',
  };
  g.personas.push(spouse);
  g.relaciones.push({
    id: genId('rel'),
    personaA: p.id,
    personaB: spouse.id,
    linajeId: linaje.id,
    bastardo: false,
  });
  await genSave();
  genRenderAll();
  genOpenEditor(spouse.id);
}

async function genAddChild(relId) {
  const g = genGetData();
  const rel = g.relaciones.find(r => r.id === relId);
  if (!rel) return;
  const a = g.personas.find(p => p.id === rel.personaA);
  // Swimlane inferior al de los padres; crear si no existe
  const parentIdx = g.swimlanes.findIndex(s => s.id === (a ? a.swimlaneId : g.swimlanes[0].id));
  let childIdx = parentIdx + 1;
  if (childIdx >= g.swimlanes.length) {
    g.swimlanes.push({ id: genId('sw'), label: `Generación ${g.swimlanes.length + 1}` });
    childIdx = g.swimlanes.length - 1;
  }
  const child = {
    id: genId('per'),
    nombre: 'Hijo/a',
    fechas: '',
    nota: '',
    linajeId: rel.linajeId,
    swimlaneId: g.swimlanes[childIdx].id,
    relacionPadresId: rel.id,
    personajePath: '',
  };
  g.personas.push(child);
  await genSave();
  genRenderAll();
  genOpenEditor(child.id);
}

async function genToggleBastardo(relId) {
  const g = genGetData();
  const rel = g.relaciones.find(r => r.id === relId);
  if (!rel) return;
  rel.bastardo = !rel.bastardo;
  await genSave();
  genRenderAll();
}

async function genDeleteRelacion(relId) {
  const g = genGetData();
  g.relaciones = g.relaciones.filter(r => r.id !== relId);
  // Los hijos de esa unión pierden el vínculo de filiación
  g.personas.forEach(p => { if (p.relacionPadresId === relId) delete p.relacionPadresId; });
  await genSave();
  genRenderAll();
}

async function genDeletePersona(personaId) {
  const g = genGetData();
  g.personas = g.personas.filter(p => p.id !== personaId);
  // Relaciones que la incluían
  const relsAfectadas = g.relaciones.filter(r => r.personaA === personaId || r.personaB === personaId);
  const relIds = new Set(relsAfectadas.map(r => r.id));
  g.relaciones = g.relaciones.filter(r => !relIds.has(r.id));
  g.personas.forEach(p => { if (relIds.has(p.relacionPadresId)) delete p.relacionPadresId; });
  await genSave();
  genCloseEditor();
  genRenderAll();
}

// ====================================
// GESTOR DE LINAJES (popover)
// ====================================

function genCloseLinajeManager() {
  document.getElementById('gen-linaje-popover')?.remove();
}

function genLinajeUsage(g, linajeId) {
  const personas = g.personas.filter(p => p.linajeId === linajeId).length;
  const relaciones = g.relaciones.filter(r => r.linajeId === linajeId).length;
  return personas + relaciones;
}

function genOpenLinajeManager(focusLinajeId) {
  const g = genGetData();
  if (!g) return;
  genEnsureBaseData(g);
  genCloseLinajeManager();
  genCloseMenu();

  const rows = g.linajes.map(lin => {
    const usage = genLinajeUsage(g, lin.id);
    const swatches = GEN_PALETTE.map((c, i) =>
      `<button class="gen-swatch ${i === (lin.colorIndex % GEN_PALETTE.length) ? 'selected' : ''}"
               data-color="${i}" style="background:${c.fill};border-color:${c.stroke}" title="Color ${i + 1}"></button>`
    ).join('');
    const delAttr = usage > 0
      ? `disabled title="En uso por ${usage} elemento(s)"`
      : `title="Eliminar linaje"`;
    return `
      <div class="gen-lin-row ${lin.id === focusLinajeId ? 'focus' : ''}" data-id="${genEscapeXml(lin.id)}">
        <div class="gen-lin-top">
          <input type="text" class="gen-lin-name" value="${genEscapeXml(lin.nombre)}" />
          <span class="gen-lin-usage">${usage}</span>
          <button class="gen-lin-del" ${delAttr}>🗑</button>
        </div>
        <div class="gen-lin-swatches">${swatches}</div>
      </div>`;
  }).join('');

  const pop = document.createElement('div');
  pop.id = 'gen-linaje-popover';
  pop.className = 'gen-linaje-popover';
  pop.innerHTML = `
    <div class="gen-editor-header">
      <span>Linajes / clanes</span>
      <button class="gen-editor-close" title="Cerrar">✕</button>
    </div>
    <div class="gen-lin-list">${rows}</div>
    <div class="gen-editor-actions">
      <button class="gen-btn-secondary" id="gen-lin-add">➕ Nuevo linaje</button>
      <button class="gen-btn-primary" id="gen-lin-done">Hecho</button>
    </div>`;

  document.getElementById('genealogy-panel').appendChild(pop);

  pop.querySelector('.gen-editor-close').addEventListener('click', genCloseLinajeManager);
  pop.querySelector('#gen-lin-done').addEventListener('click', genCloseLinajeManager);

  pop.querySelector('#gen-lin-add').addEventListener('click', async () => {
    g.linajes.push({ id: genId('lin'), nombre: `Linaje ${g.linajes.length + 1}`, colorIndex: genNextColorIndex(g) });
    await genSave();
    genRenderAll();
    genOpenLinajeManager(focusLinajeId);
  });

  pop.querySelectorAll('.gen-lin-row').forEach(row => {
    const linId = row.dataset.id;
    const lin = g.linajes.find(l => l.id === linId);
    if (!lin) return;

    const nameInput = row.querySelector('.gen-lin-name');
    nameInput.addEventListener('input', () => { lin.nombre = nameInput.value; });
    nameInput.addEventListener('change', async () => {
      lin.nombre = nameInput.value.trim() || lin.nombre;
      await genSave();
      genRenderAll();
    });

    row.querySelectorAll('.gen-swatch').forEach(sw => {
      sw.addEventListener('click', async () => {
        lin.colorIndex = parseInt(sw.dataset.color, 10);
        row.querySelectorAll('.gen-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        await genSave();
        genRenderAll();
      });
    });

    const del = row.querySelector('.gen-lin-del');
    if (!del.disabled) {
      del.addEventListener('click', async () => {
        g.linajes = g.linajes.filter(l => l.id !== linId);
        await genSave();
        genRenderAll();
        genOpenLinajeManager(focusLinajeId);
      });
    }
  });
}

// ====================================
// EDITOR DE PERSONA (popover)
// ====================================

function genCloseEditor() {
  document.getElementById('gen-editor-popover')?.remove();
}

async function genLoadPersonajeFiles() {
  if (genPersonajeFiles) return genPersonajeFiles;
  genPersonajeFiles = [];
  const ruta = state.projectData?.configuracion?.directorios?.personajes?.ruta;
  if (!ruta) return genPersonajeFiles;
  try {
    const entries = await window.electronAPI.readDirectory(ruta);
    genPersonajeFiles = entries
      .filter(e => !e.isDirectory)
      .map(e => ({ name: e.name.replace(/\.[^.]+$/, ''), path: e.path }));
  } catch { /* directorio no configurado o vacío */ }
  return genPersonajeFiles;
}

async function genOpenEditor(personaId) {
  const g = genGetData();
  const p = g.personas.find(pp => pp.id === personaId);
  if (!p) return;
  genCloseEditor();
  genCloseMenu();

  const personajes = await genLoadPersonajeFiles();

  const linajeOpts = g.linajes.map(l =>
    `<option value="${genEscapeXml(l.id)}" ${l.id === p.linajeId ? 'selected' : ''}>${genEscapeXml(l.nombre)}</option>`
  ).join('');

  const personajeOpts = ['<option value="">— Sin vínculo —</option>']
    .concat(personajes.map(f =>
      `<option value="${genEscapeXml(f.path)}" ${f.path === p.personajePath ? 'selected' : ''}>${genEscapeXml(f.name)}</option>`))
    .join('');

  const pop = document.createElement('div');
  pop.id = 'gen-editor-popover';
  pop.className = 'gen-editor-popover';
  pop.innerHTML = `
    <div class="gen-editor-header">
      <span>Editar persona</span>
      <button class="gen-editor-close" title="Cerrar">✕</button>
    </div>
    <label class="gen-field">
      <span>Nombre</span>
      <input type="text" id="gen-f-nombre" value="${genEscapeXml(p.nombre)}" />
    </label>
    <label class="gen-field">
      <span>Fechas / rango</span>
      <input type="text" id="gen-f-fechas" value="${genEscapeXml(p.fechas)}" placeholder="p. ej. 1242 – 1310" />
    </label>
    <label class="gen-field">
      <span>Linaje</span>
      <select id="gen-f-linaje">${linajeOpts}</select>
    </label>
    <label class="gen-field">
      <span>Vincular personaje</span>
      <select id="gen-f-personaje">${personajeOpts}</select>
    </label>
    <label class="gen-field">
      <span>Nota</span>
      <textarea id="gen-f-nota" rows="2">${genEscapeXml(p.nota)}</textarea>
    </label>
    <div class="gen-editor-actions">
      <button class="gen-btn-secondary" id="gen-f-cancel">Cancelar</button>
      <button class="gen-btn-primary" id="gen-f-save">Guardar</button>
    </div>`;

  document.getElementById('genealogy-panel').appendChild(pop);

  pop.querySelector('.gen-editor-close').addEventListener('click', genCloseEditor);
  pop.querySelector('#gen-f-cancel').addEventListener('click', genCloseEditor);
  pop.querySelector('#gen-f-save').addEventListener('click', async () => {
    p.nombre = pop.querySelector('#gen-f-nombre').value.trim() || 'Sin nombre';
    p.fechas = pop.querySelector('#gen-f-fechas').value.trim();
    p.linajeId = pop.querySelector('#gen-f-linaje').value;
    p.personajePath = pop.querySelector('#gen-f-personaje').value;
    p.nota = pop.querySelector('#gen-f-nota').value;
    await genSave();
    genCloseEditor();
    genRenderAll();
  });

  pop.querySelector('#gen-f-nombre').focus();
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupGenealogyListeners() {
  document.getElementById('btn-genealogy')?.addEventListener('click', openGenealogy);
  document.getElementById('gen-add-persona')?.addEventListener('click', genAddPersona);
  document.getElementById('gen-add-swimlane')?.addEventListener('click', genAddSwimlane);
  document.getElementById('gen-manage-linajes')?.addEventListener('click', () => genOpenLinajeManager());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && genActive) {
      if (document.getElementById('gen-editor-popover')) { genCloseEditor(); return; }
      if (document.getElementById('gen-linaje-popover')) { genCloseLinajeManager(); return; }
      if (document.getElementById('gen-context-menu')) { genCloseMenu(); return; }
      genHideView();
    }
  });

  const resizer = document.getElementById('genealogy-resizer');
  const panel = document.getElementById('genealogy-panel');
  if (!resizer || !panel) return;
  const MIN_H = 160;
  const MAX_H = () => window.innerHeight - 160;

  const savedH = parseInt(localStorage.getItem('genealogyHeight'));
  if (savedH && savedH >= MIN_H) panel.style.height = savedH + 'px';

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panel.offsetHeight;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(e) {
      const delta = startY - e.clientY;
      const newH = Math.min(MAX_H(), Math.max(MIN_H, startH + delta));
      panel.style.height = newH + 'px';
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('genealogyHeight', panel.offsetHeight);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
