// === EXPORTAR A EPUB ===

async function exportNovelToEpub() {
  if (!state.projectData) {
    showNotification('No hay proyecto cargado');
    return;
  }

  const capitulosPath = state.projectData.configuracion.directorios.capitulos?.ruta;
  if (!capitulosPath) {
    showNotification('No hay carpeta de Capítulos configurada en el proyecto');
    return;
  }

  const metadata = {
    title: state.projectData.proyecto.titulo || 'Novela',
    author: state.projectData.proyecto.autor || '',
    rutaPortada: state.projectData.proyecto.rutaPortada || ''
  };

  showNotification('Exportando a ePub...');

  const result = await window.electronAPI.exportToEpub({ capitulosPath, metadata });

  if (result.canceled) return;

  if (result.success) {
    const fileName = result.path.split('/').pop();
    showNotification(`✓ Exportado: ${fileName}`);
  } else {
    showNotification(`Error al exportar: ${result.error}`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportNovelToEpub };
}
