// === GIT ===

let gitHasChanges = false;

const GIT_STATUS_LABELS = {
  'M': 'Modificado',
  'A': 'Añadido',
  'D': 'Borrado',
  'R': 'Renombrado',
  'C': 'Copiado',
  'U': 'Conflicto',
  '??': 'Nuevo'
};

function gitStatusLabel(status) {
  const trimmed = status.trim();
  return GIT_STATUS_LABELS[trimmed] || trimmed || '?';
}

async function prepareGitCommitModal() {
  const loading = document.getElementById('git-commit-loading');
  const errorEl = document.getElementById('git-commit-error');
  const content = document.getElementById('git-commit-content');
  const noChanges = document.getElementById('git-commit-nochanges');
  const changesWrap = document.getElementById('git-commit-changes-wrap');
  const messageInput = document.getElementById('input-git-message');
  const btnCommit = document.getElementById('btn-git-commit-push');

  loading.classList.remove('hidden');
  errorEl.classList.add('hidden');
  content.classList.add('hidden');
  messageInput.value = '';
  gitHasChanges = false;
  btnCommit.disabled = true;

  if (!state.projectRootPath) {
    loading.classList.add('hidden');
    errorEl.textContent = 'No hay proyecto abierto.';
    errorEl.classList.remove('hidden');
    return;
  }

  const result = await window.electronAPI.gitStatus(state.projectRootPath);
  loading.classList.add('hidden');

  if (!result.success) {
    errorEl.textContent = result.error || 'No se pudo leer el estado de git en esta carpeta.';
    errorEl.classList.remove('hidden');
    return;
  }

  content.classList.remove('hidden');

  if (result.changes.length === 0) {
    noChanges.classList.remove('hidden');
    changesWrap.classList.add('hidden');
    return;
  }

  noChanges.classList.add('hidden');
  changesWrap.classList.remove('hidden');
  gitHasChanges = true;
  btnCommit.disabled = false;

  const list = document.getElementById('git-commit-changes');
  list.innerHTML = result.changes.map(c => `
    <div class="git-change-row">
      <span class="git-change-status">${gitStatusLabel(c.status)}</span>
      <span class="git-change-file">${escapeHtml(c.file)}</span>
    </div>
  `).join('');

  setTimeout(() => messageInput.focus(), 100);
}

async function submitGitCommitAndPush() {
  const errorEl = document.getElementById('git-commit-error');
  const btnCommit = document.getElementById('btn-git-commit-push');
  const messageInput = document.getElementById('input-git-message');

  errorEl.classList.add('hidden');

  if (gitHasChanges && !messageInput.value.trim()) {
    errorEl.textContent = 'Escribe un mensaje de commit.';
    errorEl.classList.remove('hidden');
    messageInput.focus();
    return;
  }

  btnCommit.disabled = true;
  btnCommit.textContent = 'Sincronizando...';

  const result = await window.electronAPI.gitCommitAndPush(state.projectRootPath, messageInput.value.trim());

  btnCommit.textContent = 'Commit y Push';

  if (!result.success) {
    errorEl.textContent = result.error || 'Error al sincronizar con git.';
    errorEl.classList.remove('hidden');
    btnCommit.disabled = false;
    return;
  }

  closeModal('modal-git-commit');
  showNotification(result.committed ? '✓ Commit y push realizados' : '✓ Push realizado');
}

async function handleGitPull() {
  if (!state.projectRootPath) {
    showErrorNotification('No hay proyecto abierto');
    return;
  }

  showNotification('Actualizando desde el repositorio...');
  const result = await window.electronAPI.gitPull(state.projectRootPath);

  if (!result.success) {
    showErrorNotification(`Error al hacer pull: ${result.error}`);
    return;
  }

  if (/already up.to.date/i.test(result.output)) {
    showNotification('Ya estabas al día ✓');
  } else {
    showNotification('✓ Pull completado');
    await loadProject(state.projectRootPath);
  }
}

function setupGitListeners() {
  window.electronAPI.onShowGitCommit(() => openModal('modal-git-commit'));
  window.electronAPI.onGitPullRequest(handleGitPull);
  document.getElementById('btn-git-commit-push').addEventListener('click', submitGitCommitAndPush);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { prepareGitCommitModal, submitGitCommitAndPush, handleGitPull, setupGitListeners };
}
