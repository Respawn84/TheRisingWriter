// ====================================
// NEW PROJECT
// Wizard para crear un nuevo proyecto
// ====================================

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'mi-proyecto';
}

function updateNewProjectPreview() {
  const folder = document.getElementById('new-project-folder').value.trim();
  const basePath = document.getElementById('new-project-path').value.trim();
  const preview = document.getElementById('new-project-preview');
  const previewText = document.getElementById('new-project-preview-text');

  if (!folder || !basePath) {
    preview.classList.add('hidden');
    return;
  }

  const jsonName = slugify(folder) + '.json';
  previewText.innerHTML = [
    `${basePath}/`,
    `└── <strong style="color:var(--text-primary)">${folder}/</strong>`,
    `    ├── capitulos/`,
    `    ├── personajes/`,
    `    ├── tramas/`,
    `    ├── mundo/`,
    `    └── ${jsonName}`
  ].join('<br>');
  preview.classList.remove('hidden');
}

function setupNewProjectListeners() {
  // Abrir modal desde evento del menú
  window.electronAPI.onNewProject(() => {
    openNewProjectModal();
  });

  // Abrir modal desde botón vacío del sidebar (si existe)
  document.getElementById('btn-open-empty')?.addEventListener('click', () => {
    // comportamiento original: abrir carpeta existente — no cambia
  });

  // Auto-rellenar nombre de carpeta al escribir el título
  document.getElementById('new-project-title')?.addEventListener('input', (e) => {
    const folderInput = document.getElementById('new-project-folder');
    // Solo auto-rellenar si el campo carpeta está vacío o coincide con el slug anterior
    const currentSlug = slugify(folderInput.dataset.lastAutoTitle || '');
    if (!folderInput.value || folderInput.value === currentSlug) {
      folderInput.value = slugify(e.target.value);
      folderInput.dataset.lastAutoTitle = e.target.value;
      updateNewProjectPreview();
    }
  });

  document.getElementById('new-project-folder')?.addEventListener('input', () => {
    updateNewProjectPreview();
  });

  // Seleccionar carpeta de destino
  document.getElementById('btn-select-project-path')?.addEventListener('click', async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (result?.success) {
      document.getElementById('new-project-path').value = result.path;
      updateNewProjectPreview();
    }
  });

  // Confirmar creación
  document.getElementById('btn-confirm-new-project')?.addEventListener('click', async () => {
    await confirmNewProject();
  });

  document.getElementById('new-project-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmNewProject();
  });
  document.getElementById('new-project-folder')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmNewProject();
  });
}

function openNewProjectModal() {
  // Limpiar campos
  document.getElementById('new-project-title').value = '';
  document.getElementById('new-project-author').value = '';
  document.getElementById('new-project-folder').value = '';
  document.getElementById('new-project-folder').dataset.lastAutoTitle = '';
  document.getElementById('new-project-path').value = '';
  document.getElementById('new-project-preview').classList.add('hidden');
  const err = document.getElementById('new-project-error');
  err.classList.add('hidden');
  err.textContent = '';

  openModal('modal-new-project');
  setTimeout(() => document.getElementById('new-project-title').focus(), 50);
}

async function confirmNewProject() {
  const titulo = document.getElementById('new-project-title').value.trim();
  const autor = document.getElementById('new-project-author').value.trim();
  const folderName = document.getElementById('new-project-folder').value.trim();
  const parentPath = document.getElementById('new-project-path').value.trim();
  const errDiv = document.getElementById('new-project-error');

  errDiv.classList.add('hidden');

  if (!titulo) {
    errDiv.textContent = 'El título es obligatorio.';
    errDiv.classList.remove('hidden');
    document.getElementById('new-project-title').focus();
    return;
  }
  if (!folderName) {
    errDiv.textContent = 'El nombre de carpeta es obligatorio.';
    errDiv.classList.remove('hidden');
    document.getElementById('new-project-folder').focus();
    return;
  }
  if (!parentPath) {
    errDiv.textContent = 'Selecciona dónde crear el proyecto.';
    errDiv.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-confirm-new-project');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  const result = await window.electronAPI.createNewProject({ parentPath, folderName, titulo, autor });

  btn.disabled = false;
  btn.textContent = 'Crear proyecto';

  if (!result.success) {
    errDiv.textContent = result.error;
    errDiv.classList.remove('hidden');
    return;
  }

  closeModal('modal-new-project');
  showNotification(`Proyecto "${titulo}" creado`);
  await loadProject(result.jsonPath);
}
