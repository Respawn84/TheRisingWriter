// === EXPORTAR A WORD ===

// Exportar carpeta de capítulos a .docx
async function exportFolderToDocx(folderPath) {
  showNotification('Exportando a Word...');

  const result = await window.electronAPI.exportToDocx(folderPath);

  if (result.canceled) {
    return; // El usuario canceló el diálogo
  }

  if (result.success) {
    const fileName = nameFromPath(result.path);
    showNotification(`✓ Exportado: ${fileName}`);
  } else {
    showNotification(`Error al exportar: ${result.error}`);
  }
}

// Configurar listener para el menú contextual
function setupExportDocListeners() {
  // El listener del menú contextual ya está en fileSystem.js,
  // solo necesitamos que la función esté disponible globalmente
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportFolderToDocx, setupExportDocListeners };
}
