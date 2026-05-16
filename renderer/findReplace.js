// === BUSCAR Y REEMPLAZAR ===

let findMatches = [];
let currentMatchIndex = -1;

// Preparar modal de buscar y reemplazar
function prepareFindReplaceModal() {
  const findInput = document.getElementById('input-find');
  const replaceInput = document.getElementById('input-replace');
  const errorDiv = document.getElementById('find-error');
  const resultsDiv = document.getElementById('find-results');
  const countSpan = document.getElementById('find-count');
  
  // Resetear valores
  findInput.value = '';
  replaceInput.value = '';
  document.getElementById('check-case-sensitive').checked = false;
  document.getElementById('check-whole-word').checked = false;
  errorDiv.classList.add('hidden');
  resultsDiv.classList.add('hidden');
  
  findMatches = [];
  currentMatchIndex = -1;
  document.getElementById('btn-find-next').classList.add('hidden');

  // Pre-llenar con texto seleccionado si existe
  if (state.selectedText && state.selectedText.length > 0) {
    findInput.value = state.selectedText;
    // NO ejecutar búsqueda automática - usuario debe presionar "Buscar"
  }
  
  setTimeout(() => findInput.focus(), 100);
}

// Realizar búsqueda
function performFind() {
  const editor = document.getElementById('editor');
  const findText = document.getElementById('input-find').value;
  const errorDiv = document.getElementById('find-error');
  const resultsDiv = document.getElementById('find-results');
  const countSpan = document.getElementById('find-count');
  
  errorDiv.classList.add('hidden');
  
  if (!findText) {
    resultsDiv.classList.add('hidden');
    findMatches = [];
    return;
  }
  
  if (!state.currentFile) {
    errorDiv.textContent = 'No hay archivo abierto';
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    return;
  }
  
  const content = editor.value;
  const caseSensitive = document.getElementById('check-case-sensitive').checked;
  const wholeWord = document.getElementById('check-whole-word').checked;
  
  // Buscar coincidencias
  findMatches = [];
  let searchText = findText;
  let searchContent = content;
  
  if (!caseSensitive) {
    searchText = searchText.toLowerCase();
    searchContent = searchContent.toLowerCase();
  }
  
  let startIndex = 0;
  while (true) {
    const index = searchContent.indexOf(searchText, startIndex);
    if (index === -1) break;
    
    // Verificar palabra completa si está activado
    if (wholeWord) {
      const beforeChar = index > 0 ? content[index - 1] : ' ';
      const afterChar = index + findText.length < content.length ? content[index + findText.length] : ' ';
      const isWordBoundary = /\W/.test(beforeChar) && /\W/.test(afterChar);
      
      if (!isWordBoundary) {
        startIndex = index + 1;
        continue;
      }
    }
    
    findMatches.push(index);
    startIndex = index + 1;
  }
  
  // Mostrar resultados
  resultsDiv.classList.remove('hidden');
  countSpan.textContent = `${findMatches.length} coincidencia${findMatches.length !== 1 ? 's' : ''}`;
  
  if (findMatches.length > 0) {
    currentMatchIndex = 0;
    highlightMatch();
  }

  // Mostrar botón Siguiente solo si hay más de un resultado
  const btnNext = document.getElementById('btn-find-next');
  if (findMatches.length > 1) {
    btnNext.classList.remove('hidden');
  } else {
    btnNext.classList.add('hidden');
  }
}

// Resaltar coincidencia actual
function highlightMatch() {
  if (currentMatchIndex < 0 || currentMatchIndex >= findMatches.length) return;

  const editor = document.getElementById('editor');
  const findText = document.getElementById('input-find').value;
  const matchIndex = findMatches[currentMatchIndex];

  const targetScrollTop = calcScrollTopForChar(editor, matchIndex);

  editor.focus({ preventScroll: true });
  editor.setSelectionRange(matchIndex, matchIndex + findText.length);

  // requestAnimationFrame aplica nuestro scroll DESPUÉS del auto-scroll
  // que dispara setSelectionRange, evitando que lo sobreescriba
  requestAnimationFrame(() => {
    editor.scrollTop = targetScrollTop;
  });
}

// Retorna el scrollTop necesario para centrar charIndex en el viewport,
// usando un div espejo que replica el layout exacto del textarea.
function calcScrollTopForChar(editor, charIndex) {
  const style = window.getComputedStyle(editor);

  const mirror = document.createElement('div');
  mirror.style.cssText = [
    'position:absolute', 'top:-9999px', 'left:-9999px', 'visibility:hidden',
    `width:${editor.clientWidth}px`,
    `padding:${style.padding}`,
    `font-size:${style.fontSize}`,
    `font-family:${style.fontFamily}`,
    `line-height:${style.lineHeight}`,
    'white-space:pre-wrap',
    'word-wrap:break-word',
    'overflow-wrap:break-word',
    'box-sizing:border-box',
  ].join(';');

  mirror.textContent = editor.value.substring(0, charIndex);

  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const markerTop = marker.offsetTop;
  document.body.removeChild(mirror);

  return Math.max(0, markerTop - editor.clientHeight / 2);
}

// Reemplazar siguiente
function replaceNext() {
  const editor = document.getElementById('editor');
  const findText = document.getElementById('input-find').value;
  const replaceText = document.getElementById('input-replace').value;
  const errorDiv = document.getElementById('find-error');
  
  errorDiv.classList.add('hidden');
  
  if (!findText) {
    errorDiv.textContent = 'Ingresa el texto a buscar';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (findMatches.length === 0) {
    performFind();
    if (findMatches.length === 0) {
      errorDiv.textContent = 'No se encontraron coincidencias';
      errorDiv.classList.remove('hidden');
      return;
    }
  }
  
  if (currentMatchIndex >= 0 && currentMatchIndex < findMatches.length) {
    const matchIndex = findMatches[currentMatchIndex];
    const content = editor.value;
    
    // Reemplazar
    const newContent = content.substring(0, matchIndex) + 
                      replaceText + 
                      content.substring(matchIndex + findText.length);
    
    editor.value = newContent;
    state.currentFileContent = newContent;
    updateWordCount();
    
    // Actualizar índices de coincidencias restantes
    const diff = replaceText.length - findText.length;
    findMatches.splice(currentMatchIndex, 1);
    
    for (let i = currentMatchIndex; i < findMatches.length; i++) {
      findMatches[i] += diff;
    }
    
    // Actualizar contador
    const countSpan = document.getElementById('find-count');
    countSpan.textContent = `${findMatches.length} coincidencia${findMatches.length !== 1 ? 's' : ''}`;
    
    // Seleccionar siguiente si existe
    if (findMatches.length > 0) {
      if (currentMatchIndex >= findMatches.length) {
        currentMatchIndex = 0;
      }
      highlightMatch();
    } else {
      showNotification('Todas las coincidencias reemplazadas');
      currentMatchIndex = -1;
    }
  }
}

// Reemplazar todo
function replaceAll() {
  const editor = document.getElementById('editor');
  const findText = document.getElementById('input-find').value;
  const replaceText = document.getElementById('input-replace').value;
  const errorDiv = document.getElementById('find-error');
  
  errorDiv.classList.add('hidden');
  
  if (!findText) {
    errorDiv.textContent = 'Ingresa el texto a buscar';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (findMatches.length === 0) {
    performFind();
    if (findMatches.length === 0) {
      errorDiv.textContent = 'No se encontraron coincidencias';
      errorDiv.classList.remove('hidden');
      return;
    }
  }
  
  const count = findMatches.length;
  const caseSensitive = document.getElementById('check-case-sensitive').checked;
  const wholeWord = document.getElementById('check-whole-word').checked;
  
  let content = editor.value;
  let flags = 'g';
  if (!caseSensitive) flags += 'i';
  
  // Escapar caracteres especiales de regex
  let searchPattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Añadir límites de palabra si está activado
  if (wholeWord) {
    searchPattern = '\\b' + searchPattern + '\\b';
  }
  
  const regex = new RegExp(searchPattern, flags);
  const newContent = content.replace(regex, replaceText);
  
  editor.value = newContent;
  state.currentFileContent = newContent;
  updateWordCount();
  
  closeModal('modal-find-replace');
  showNotification(`${count} coincidencia${count !== 1 ? 's' : ''} reemplazada${count !== 1 ? 's' : ''}`);
  
  findMatches = [];
  currentMatchIndex = -1;
}

// Configurar listeners de buscar y reemplazar
function setupFindReplaceListeners() {
  const caseSensitiveCheck = document.getElementById('check-case-sensitive');
  const wholeWordCheck = document.getElementById('check-whole-word');
  
  // Los checkboxes solo actualizan su estado, no ejecutan búsqueda automática
  // El usuario debe presionar el botón "Buscar" manualmente
  
  document.getElementById('btn-find').addEventListener('click', performFind);

  document.getElementById('btn-find-next').addEventListener('click', () => {
    if (findMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % findMatches.length;
    const countSpan = document.getElementById('find-count');
    countSpan.textContent = `${currentMatchIndex + 1} / ${findMatches.length} coincidencia${findMatches.length !== 1 ? 's' : ''}`;
    highlightMatch();
  });

  document.getElementById('btn-replace-one').addEventListener('click', replaceNext);
  document.getElementById('btn-replace-all').addEventListener('click', replaceAll);
  
  // ESC para cerrar el modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-find-replace');
      if (!modal.classList.contains('hidden')) {
        closeModal('modal-find-replace');
        findMatches = [];
        currentMatchIndex = -1;
      }
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    prepareFindReplaceModal, 
    performFind, 
    replaceNext, 
    replaceAll, 
    setupFindReplaceListeners 
  };
}
