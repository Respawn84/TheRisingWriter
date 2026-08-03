// === EDITOR Y FORMATO ===

// Guardar archivo actual
async function saveCurrentFile() {
  const tab = getActiveTab();
  if (!tab) return;
  
  const content = document.getElementById('editor').value;
  const result = await window.electronAPI.saveFile(tab.path, content);
  
  if (result.success) {
    state.currentFileContent = content;
    markTabAsSaved();
    showNotification('Guardado');
    // Sin await: la revisión pre-editorial corre en segundo plano y no debe
    // retrasar la sensación de "guardado" ni el timeout de Ollama al usuario.
    analyzeSceneInBackground(tab.path, content);
  } else {
    showNotification('Error al guardar');
  }
}

// Aplicar formato de texto
function formatText(before, after) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selectedText = editor.value.substring(start, end);
  
  if (!selectedText) return;
  
  const newText = before + selectedText + after;
  editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
  
  editor.selectionStart = start + before.length;
  editor.selectionEnd = end + before.length;
  editor.focus();
}

// Insertar texto en posición del cursor
function insertText(text) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  
  editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
  editor.selectionStart = editor.selectionEnd = start + text.length;
  editor.focus();
}

// Acciones básicas (copiar, cortar, pegar)
function handleBasicAction(action) {
  const editor = document.getElementById('editor');
  
  if (action === 'copiar') {
    const text = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    navigator.clipboard.writeText(text);
    showNotification('Copiado');
  } else if (action === 'cortar') {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value.substring(start, end);
    navigator.clipboard.writeText(text);
    editor.value = editor.value.substring(0, start) + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start;
    showNotification('Cortado');
  } else if (action === 'pegar') {
    navigator.clipboard.readText().then(text => {
      insertText(text);
    });
  }
}

// Menú contextual del editor
function setupEditorContextMenu() {
  const editor = document.getElementById('editor');
  const contextMenu = document.getElementById('context-menu');
  
  editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    state.selectedText = selectedText;
    
    // Filtrar opciones según tipo de elemento
      const menuItems = contextMenu.querySelectorAll('.menu-item');
      menuItems.forEach(item => {
        const action = item.dataset.action;
        const folderOnly = item.dataset.folderOnly === 'true';
        const fileOnly = item.dataset.fileOnly === 'true';
        
        if (folderOnly && !state.itemToRename.isDirectory) {
          item.style.display = 'none';
        } else if (fileOnly && state.itemToRename.isDirectory) {
          item.style.display = 'none';
        } else {
          item.style.display = 'flex';
        }
      });

    // Mostrar menú
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
  });
  
  // Cerrar menú al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = 'none';
    }
  });
  
  // Acciones del menú
  contextMenu.addEventListener('click', (e) => {
    const action = e.target.closest('.menu-item')?.dataset.action;
    if (!action) return;
    
    contextMenu.style.display = 'none';
    
    // Acciones básicas
    if (['copiar', 'cortar', 'pegar'].includes(action)) {
      handleBasicAction(action);
      return;
    }
    
    // Acciones IA
    if (state.selectedText && state.aiConnected) {
      callClaude(action);
    } else if (!state.aiConnected) {
      showNotification('IA no configurada');
    }
  });
}

// Actualizar contador de palabras
function updateWordCount() {
  const editor = document.getElementById('editor');
  const wordCountEl = document.getElementById('word-count');
  
  const text = editor.value.trim();
  if (!text) {
    wordCountEl.textContent = '0 palabras';
    return;
  }
  
  // Contar palabras (separadas por espacios/saltos de línea)
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  wordCountEl.textContent = `${words} palabra${words !== 1 ? 's' : ''}`;
}

// Configurar listeners del editor
function setupEditorListeners() {
  const editor = document.getElementById('editor');
  
  // Detectar cambios
  editor.addEventListener('input', () => {
    const tab = getActiveTab();
    if (tab && editor.value !== state.currentFileContent) {
      markTabAsModified();
    }
    updateWordCount();
  });
  
  // Guardar con Cmd+S
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentFile();
    }
  });
  
  // Botón guardar
  document.getElementById('btn-save').addEventListener('click', saveCurrentFile);
  
  // Botones de formato
  document.getElementById('btn-bold').addEventListener('click', () => formatText('**', '**'));
  document.getElementById('btn-italic').addEventListener('click', () => formatText('_', '_'));
  document.getElementById('btn-underline').addEventListener('click', () => formatText('<u>', '</u>'));
  
  // Botones de caracteres especiales
  document.getElementById('btn-quotes-latina').addEventListener('click', () => insertText('« »'));
  document.getElementById('btn-quotes-raya').addEventListener('click', () => insertText('—'));
  document.getElementById('btn-quotes-normal').addEventListener('click', () => insertText('"'));
  
  // Menú contextual
  setupEditorContextMenu();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { saveCurrentFile, formatText, insertText, updateWordCount, setupEditorListeners };
}