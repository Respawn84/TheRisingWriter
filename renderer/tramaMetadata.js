// === PANEL DE METADATOS DE TRAMA ===

function isTramaFile(filePath) {
  const tramasRuta = state.projectData?.configuracion?.directorios?.tramas?.ruta;
  if (!tramasRuta || !filePath) return false;
  return filePath.startsWith(tramasRuta + '/');
}

function getTramaMetadata(filePath) {
  if (!state.projectData) return { estado: 'pendiente', personajes: [], escenaInicio: '', escenaFin: '' };
  if (!state.projectData.metadatosTramas) state.projectData.metadatosTramas = {};
  return state.projectData.metadatosTramas[filePath] || { estado: 'pendiente', personajes: [], escenaInicio: '', escenaFin: '' };
}

function getTramaEstadoIcon(estado) {
  switch (estado) {
    case 'en_curso': return '🔄';
    case 'cerrada': return '✅';
    default: return '⏳';
  }
}

function getTramaEstadoLabel(estado) {
  switch (estado) {
    case 'en_curso': return 'En curso';
    case 'cerrada': return 'Cerrada';
    default: return 'Pendiente';
  }
}

async function openTramaMetadataPanel(file) {
  cancelPendingMetadataRender();
  const gen = state.metaLoadGen;

  state.splitMetadataFolder = file.path;
  state.splitMetadataItem = file;
  state.splitFile = null;
  hideBackToMetadataButton();

  if (!state.splitActive) {
    state.splitActive = true;
    showSplit();
  }

  document.getElementById('split-file-name').textContent = `🎭 ${file.name}`;

  const editorRef = document.getElementById('editor-reference');
  editorRef.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">Cargando metadatos...</div>';

  const [personajesItems, allScenes] = await Promise.all([
    loadPersonajesItems(),
    loadAllScenes()
  ]);

  if (state.metaLoadGen !== gen) return;

  const existing = getTramaMetadata(file.path);

  editorRef.innerHTML = renderTramaMetadataPanel(existing, personajesItems, allScenes);

  setupTramaMetadataListeners(file.path);
}

function renderTramaMetadataPanel(existing, personajesItems, allScenes) {
  function sceneOptions(selected) {
    return `<option value="">— Ninguna —</option>` +
      allScenes.map(s =>
        `<option value="${escapeAttr(s.path)}"${s.path === selected ? ' selected' : ''}>${escapeHtml(s.label)}</option>`
      ).join('');
  }

  function comboOptions(items, placeholder) {
    return `<option value="">${escapeHtml(placeholder)}</option>` +
      items.map(p => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`).join('');
  }

  function tagsHtml(items) {
    return (items || []).map(item =>
      `<span class="meta-tag" data-value="${escapeAttr(item)}">${escapeHtml(item)}<button class="meta-tag-remove" data-value="${escapeAttr(item)}" title="Eliminar">×</button></span>`
    ).join('');
  }

  const estadoOpts = [
    { value: 'pendiente', label: '⏳ Pendiente' },
    { value: 'en_curso',  label: '🔄 En curso' },
    { value: 'cerrada',   label: '✅ Cerrada'  }
  ].map(o =>
    `<option value="${o.value}"${existing.estado === o.value ? ' selected' : ''}>${o.label}</option>`
  ).join('');

  return `
<div class="meta-panel">

  <div class="meta-section">
    <div class="meta-section-title">📊 Estado de la trama</div>
    <select id="trama-estado" class="meta-select meta-select-full">
      ${estadoOpts}
    </select>
  </div>

  <div class="meta-section">
    <div class="meta-section-title">👤 Personajes involucrados</div>
    <div class="meta-combo-row">
      <select id="trama-personajes-combo" class="meta-select">
        ${comboOptions(personajesItems, personajesItems.length ? 'Selecciona personaje...' : 'Sin carpeta Personajes')}
      </select>
      <button id="trama-add-personaje" class="meta-btn-add" ${!personajesItems.length ? 'disabled' : ''}>+ Añadir</button>
    </div>
    <div id="trama-personajes-list" class="meta-tag-list">
      ${tagsHtml(existing.personajes)}
    </div>
  </div>

  <div class="meta-section">
    <div class="meta-section-title">▶ Escena de inicio</div>
    <select id="trama-escena-inicio" class="meta-select meta-select-full">
      ${sceneOptions(existing.escenaInicio || '')}
    </select>
  </div>

  <div class="meta-section">
    <div class="meta-section-title">⏹ Escena de fin</div>
    <select id="trama-escena-fin" class="meta-select meta-select-full">
      ${sceneOptions(existing.escenaFin || '')}
    </select>
  </div>

  <div class="meta-actions">
    <button id="trama-btn-save" class="btn-primary">💾 Guardar metadatos</button>
  </div>

</div>`;
}

function setupTramaMetadataListeners(filePath) {
  document.getElementById('trama-add-personaje')?.addEventListener('click', () => {
    const combo = document.getElementById('trama-personajes-combo');
    const value = combo.value;
    if (!value) return;
    const list = document.getElementById('trama-personajes-list');
    if (isAlreadyInList(list, value)) return;
    list.appendChild(createMetaTag(value));
    combo.value = '';
  });

  document.getElementById('trama-personajes-list')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('meta-tag-remove')) {
      e.target.closest('.meta-tag').remove();
    }
  });

  document.getElementById('trama-btn-save')?.addEventListener('click', () => {
    saveTramaMetadata(filePath);
  });
}

async function saveTramaMetadata(filePath) {
  if (!state.projectData || !state.projectJsonPath) return;

  if (!state.projectData.metadatosTramas) state.projectData.metadatosTramas = {};

  const estado = document.getElementById('trama-estado')?.value || 'pendiente';
  const personajes = Array.from(document.querySelectorAll('#trama-personajes-list .meta-tag'))
    .map(el => el.dataset.value);
  const escenaInicio = document.getElementById('trama-escena-inicio')?.value || '';
  const escenaFin = document.getElementById('trama-escena-fin')?.value || '';

  state.projectData.metadatosTramas[filePath] = { estado, personajes, escenaInicio, escenaFin };

  const result = await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  if (result.success) {
    showNotification('Metadatos de trama guardados');
    updateTramaFileIcon(filePath, estado);
  } else {
    showNotification('Error al guardar metadatos de trama');
  }
}

// Actualiza el icono del archivo en el árbol sin recargar todo el árbol
function updateTramaFileIcon(filePath, estado) {
  const el = document.querySelector(`.file-item[data-path="${CSS.escape(filePath)}"]`);
  if (!el) return;
  const iconEl = el.querySelector('.trama-estado-icon');
  if (iconEl) iconEl.textContent = getTramaEstadoIcon(estado);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isTramaFile, openTramaMetadataPanel, getTramaEstadoIcon, getTramaMetadata };
}
