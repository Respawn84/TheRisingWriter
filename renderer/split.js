// === SPLIT VERTICAL ===

// Oculta el botón "← Volver a metadatos" (disponible globalmente)
function hideBackToMetadataButton() {
  document.getElementById('btn-back-to-metadata')?.classList.add('hidden');
}

// Toggle split vertical
function toggleSplit() {
  state.splitActive = !state.splitActive;
  
  if (state.splitActive) {
    showSplit();
  } else {
    hideSplit();
  }
}

// Mostrar split
function showSplit() {
  const editorMain = document.getElementById('editor-main');
  const editorSplit = document.getElementById('editor-split');
  const btnToggle = document.getElementById('btn-toggle-split');
  
  editorMain.classList.add('split-active');
  editorSplit.classList.remove('hidden');
  btnToggle.textContent = '⫿'; // Icono diferente cuando activo
  btnToggle.title = 'Cerrar split';
  
  // Si hay archivo en split, cargarlo
  if (state.splitFile) {
    loadSplitFile(state.splitFile);
  }
}

// Ocultar split
function hideSplit() {
  const editorMain = document.getElementById('editor-main');
  const editorSplit = document.getElementById('editor-split');
  const btnToggle = document.getElementById('btn-toggle-split');

  editorMain.classList.remove('split-active');
  editorSplit.classList.add('hidden');
  btnToggle.textContent = '⫽';
  btnToggle.title = 'Split vertical';

  state.splitFile = null;
  hideBackToMetadataButton();
}

// Abrir archivo en split derecho
async function openInSplit(file) {
  cancelPendingMetadataRender(); // cancela cualquier carga de metadatos en vuelo
  hideBackToMetadataButton();
  state.splitFile = file.path;
  
  // Activar split si no está activo
  if (!state.splitActive) {
    state.splitActive = true;
    showSplit();
  } else {
    loadSplitFile(file.path);
  }
}

// Cargar archivo en editor de split
async function loadSplitFile(filePath) {
  const editor = document.getElementById('editor-reference');
  const fileName = document.getElementById('split-file-name');

  const result = await window.electronAPI.readFile(filePath);

  if (result.success) {
    const isMd = filePath.toLowerCase().endsWith('.md');
    editor.innerHTML = isMd
      ? renderMarkdownSections(result.content)
      : renderCollapsibleSections(result.content);
    fileName.textContent = `📄 ${filePath.split('/').pop()}`;
    showNotification(`Referencia cargada: ${filePath.split('/').pop()}`);
  } else {
    showNotification(`Error al leer referencia`);
    editor.innerHTML = '<p class="split-error">Error al cargar archivo</p>';
  }
}

// Wrapper seguro para marked.parse — degrada a texto plano si la librería no está cargada
function mdParse(text) {
  if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
    return marked.parse(text);
  }
  return `<pre>${escapeHtml(text)}</pre>`;
}

// Renderizado para ficheros .md: colapsables por ## headings
function renderMarkdownSections(text) {
  const lines = text.split('\n');
  const h2Re = /^##\s+(.+)/;

  // Encontrar índices de headings ##
  const sections = [];
  let currentSection = null;

  lines.forEach((line, i) => {
    const match = line.match(h2Re);
    if (match) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: match[1].trim(), startLine: i + 1, lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      // Contenido antes del primer ##
      if (!sections._preamble) sections._preamble = [];
      sections._preamble.push(line);
    }
  });
  if (currentSection) sections.push(currentSection);

  let html = '';

  // Preámbulo (antes del primer ##) renderizado como md sin colapsable
  if (sections._preamble && sections._preamble.length) {
    const preamble = sections._preamble.join('\n').trim();
    if (preamble) html += `<div class="split-plain split-md">${mdParse(preamble)}</div>`;
  }

  // Cada sección colapsable
  for (const section of sections) {
    if (!Array.isArray(section.lines)) continue;
    const body = section.lines.join('\n').trim();
    html += `<details class="split-section">
  <summary class="split-summary">${escapeHtml(section.title)}</summary>
  <div class="split-body split-md">${body ? mdParse(body) : ''}</div>
</details>`;
  }

  return html || `<div class="split-plain split-md">${mdParse(text)}</div>`;
}

// Renderizado para ficheros de texto: colapsables por líneas de guiones
function renderCollapsibleSections(text) {
  const lines = text.split('\n');
  const separatorRe = /^-{3,}\s*$/;

  const sepIndices = [];
  lines.forEach((line, i) => {
    if (separatorRe.test(line)) sepIndices.push(i);
  });

  if (sepIndices.length === 0) {
    return `<pre class="split-plain">${escapeHtml(text)}</pre>`;
  }

  let html = '';

  // Texto antes del primer separador
  if (sepIndices[0] > 0) {
    const before = lines.slice(0, sepIndices[0]).join('\n').trim();
    if (before) html += `<pre class="split-plain">${escapeHtml(before)}</pre>`;
  }

  for (let s = 0; s < sepIndices.length; s++) {
    const sepIdx = sepIndices[s];
    const nextSepIdx = sepIndices[s + 1] !== undefined ? sepIndices[s + 1] : lines.length;

    let titleIdx = sepIdx + 1;
    while (titleIdx < nextSepIdx && lines[titleIdx].trim() === '') titleIdx++;
    if (titleIdx >= nextSepIdx) continue;

    const title = lines[titleIdx].trim();
    const bodyLines = lines.slice(titleIdx + 1, nextSepIdx);
    while (bodyLines.length && bodyLines[0].trim() === '') bodyLines.shift();
    while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();
    const body = bodyLines.join('\n');

    html += `<details class="split-section">
  <summary class="split-summary">${escapeHtml(title)}</summary>
  <pre class="split-body">${escapeHtml(body)}</pre>
</details>`;
  }

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Cerrar split
function closeSplit() {
  state.splitActive = false;
  hideSplit();
}

// Configurar listeners de split
function setupSplitListeners() {
  document.getElementById('btn-toggle-split').addEventListener('click', toggleSplit);
  document.getElementById('btn-close-split').addEventListener('click', closeSplit);

  document.getElementById('btn-back-to-metadata').addEventListener('click', () => {
    const item = state.splitMetadataItem;
    hideBackToMetadataButton();
    if (!item) return;

    if (item.isDirectory) {
      openChapterMetadataPanel(item);
    } else if (isTramaFile(item.path)) {
      openTramaMetadataPanel(item);
    } else {
      openSceneMetadataPanel(item);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    toggleSplit, openInSplit, closeSplit,
    setupSplitListeners
  };
}