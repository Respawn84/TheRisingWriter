// === EDITOR ===

// Guardar archivo actual
async function saveCurrentFile() {
  if (!state.currentFile) return;
  
  const content = document.getElementById('editor').value;
  const result = await window.electronAPI.saveFile(state.currentFile, content);
  
  if (result.success) {
    state.currentFileContent = content;
    markUnsavedChanges(false);
    showNotification('Archivo guardado');
  }
}

// Formatear texto
function formatText(before, after) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.substring(start, end);
  const formatted = before + selected + after;
  editor.value = editor.value.substring(0, start) + formatted + editor.value.substring(end);
  editor.selectionStart = start + before.length;
  editor.selectionEnd = end + before.length;
  editor.focus();
    // Marcar cambios
  markUnsavedChanges(true);
}

// Insertar texto
function insertText(text) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  editor.value = editor.value.substring(0, start) + text + editor.value.substring(start);
  editor.focus();
  // Marcar cambios
  markUnsavedChanges(true);
}

// Acciones básicas del menú contextual
function handleBasicAction(action) {
  const editor = document.getElementById('editor');
  if (action === 'copiar') {
    navigator.clipboard.writeText(state.selectedText);
  } else if (action === 'cortar') {
    navigator.clipboard.writeText(state.selectedText);
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + editor.value.substring(end);
  } else if (action === 'pegar') {
    navigator.clipboard.readText().then(text => {
      const start = editor.selectionStart;
      editor.value = editor.value.substring(0, start) + text + editor.value.substring(start);
       markUnsavedChanges(true);
    });
  }
}

// Configurar menú contextual del editor
function setupEditorContextMenu() {
  const editor = document.getElementById('editor');
  const menu = document.getElementById('context-menu');
  
  editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selection = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    if (!selection) return;
    
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.classList.remove('hidden');
    
    state.selectedText = selection;
  });
  
  document.addEventListener('click', hideContextMenu);
  
  menu.querySelectorAll('.menu-item[data-action]').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      hideContextMenu();
      
      if (['copiar', 'cortar', 'pegar'].includes(action)) {
        handleBasicAction(action);
      } else {
        await callClaude(action);
      }
    });
  });
}

// Configurar listeners del editor
function setupEditorListeners() {
  // Botón guardar
  document.getElementById('btn-save').addEventListener('click', saveCurrentFile);
  
  // Botones de formato
  document.getElementById('btn-bold').addEventListener('click', () => formatText('**', '**'));
  document.getElementById('btn-italic').addEventListener('click', () => formatText('_', '_'));
  document.getElementById('btn-underline').addEventListener('click', () => formatText('<u>', '</u>'));
  
  // Comillas especiales
  document.getElementById('btn-quotes-latina').addEventListener('click', () => insertText('« »'));
  document.getElementById('btn-quotes-raya').addEventListener('click', () => insertText('—'));
  document.getElementById('btn-quotes-normal').addEventListener('click', () => insertText('"'));
  
  // Atajo Cmd+S / Ctrl+S
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentFile();
    }
  });
  
  // Menú contextual
  setupEditorContextMenu();
  // Detectar cambios
  detectEditorChanges();
}

// Detectar cambios en el editor
function detectEditorChanges() {
  const editor = document.getElementById('editor');
  
  editor.addEventListener('input', () => {
    if (!state.currentFile) return;
    
    const currentContent = editor.value;
    const hasChanges = currentContent !== state.currentFileContent;
    
    if (hasChanges !== state.hasUnsavedChanges) {
      markUnsavedChanges(hasChanges);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveCurrentFile,
    formatText,
    insertText,
    setupEditorListeners
  };
}
