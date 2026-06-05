// === REVISIÓN ORTOTIPOGRÁFICA DE LA ESCENA (con diff) ===

// Texto corregido que devolvió la IA (referencia, antes de ediciones del usuario).
let sceneReviewCorrected = '';

// Lanza la revisión de toda la escena activa.
async function reviewScene() {
  const editor = document.getElementById('editor');
  const original = editor.value;

  if (!getActiveTab()) {
    showNotification('No hay ninguna escena abierta', true);
    return;
  }
  if (!original.trim()) {
    showNotification('La escena está vacía', true);
    return;
  }
  if (!state.aiConnected) {
    showNotification('IA no configurada', true);
    return;
  }

  // Preparar el modal en estado "cargando".
  const loading = document.getElementById('scene-review-loading');
  const errorEl = document.getElementById('scene-review-error');
  const content = document.getElementById('scene-review-content');
  loading.classList.remove('hidden');
  errorEl.classList.add('hidden');
  content.classList.add('hidden');
  openModal('modal-scene-review');

  const result = await window.electronAPI.callClaude({
    selectedText: original,
    action: 'corregir',
    maxTokens: 8000
  });

  loading.classList.add('hidden');

  if (!result.success) {
    errorEl.textContent = `Error: ${result.error}`;
    errorEl.classList.remove('hidden');
    return;
  }

  const corrected = result.response;
  sceneReviewCorrected = corrected;

  const ops = computeWordDiff(original, corrected);
  renderDiff(ops);
  document.getElementById('scene-review-result').value = corrected;
  content.classList.remove('hidden');
}

// Diff por palabras (LCS). Devuelve ops {type:'equal'|'removed'|'added', text}.
function computeWordDiff(original, corrected) {
  // Tokeniza conservando los espacios como tokens propios.
  const a = original.split(/(\s+)/).filter(t => t !== '');
  const b = corrected.split(/(\s+)/).filter(t => t !== '');
  const n = a.length;
  const m = b.length;

  // Tabla LCS en un array plano (n+1)*(m+1).
  const w = m + 1;
  const dp = new Int32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j]
        ? dp[(i + 1) * w + (j + 1)] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)]);
    }
  }

  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'equal', text: a[i] });
      i++; j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) {
      ops.push({ type: 'removed', text: a[i] });
      i++;
    } else {
      ops.push({ type: 'added', text: b[j] });
      j++;
    }
  }
  while (i < n) { ops.push({ type: 'removed', text: a[i] }); i++; }
  while (j < m) { ops.push({ type: 'added', text: b[j] }); j++; }

  return ops;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Pinta el original (con eliminaciones) y el corregido (con adiciones).
function renderDiff(ops) {
  let leftHtml = '';
  let rightHtml = '';
  for (const op of ops) {
    const safe = escapeHtml(op.text);
    if (op.type === 'equal') {
      leftHtml += safe;
      rightHtml += safe;
    } else if (op.type === 'removed') {
      leftHtml += `<span class="diff-removed">${safe}</span>`;
    } else if (op.type === 'added') {
      rightHtml += `<span class="diff-added">${safe}</span>`;
    }
  }
  document.getElementById('diff-original').innerHTML = leftHtml;
  document.getElementById('diff-corrected').innerHTML = rightHtml;
}

// Vuelca el resultado editable al editor.
function applySceneReview() {
  const editor = document.getElementById('editor');
  const resultText = document.getElementById('scene-review-result').value;

  editor.value = resultText;
  markTabAsModified();
  updateWordCount();
  closeModal('modal-scene-review');
  showNotification('Correcciones aplicadas');
}

function setupSceneReviewListeners() {
  document.getElementById('btn-review-scene').addEventListener('click', reviewScene);
  document.getElementById('btn-apply-scene-review').addEventListener('click', applySceneReview);

  // Scroll sincronizado entre las cajas Original y Corregido. Un único lock
  // compartido evita el rebote cuando un scroll programático dispara el otro.
  const original = document.getElementById('diff-original');
  const corrected = document.getElementById('diff-corrected');
  let syncing = false;
  const link = (source, target) => {
    source.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      // Proporcional, para alinear aunque las columnas tengan alturas distintas.
      const max = source.scrollHeight - source.clientHeight;
      const ratio = max > 0 ? source.scrollTop / max : 0;
      target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
      requestAnimationFrame(() => { syncing = false; });
    });
  };
  link(original, corrected);
  link(corrected, original);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    reviewScene,
    computeWordDiff,
    renderDiff,
    applySceneReview,
    setupSceneReviewListeners
  };
}
