// === REPARAR PROYECTO ===
//
// Antes de que renombrar/mover/borrar migrasen project.json, esas operaciones
// dejaban referencias apuntando a rutas que ya no existen (el síntoma clásico:
// el panel de metadatos de un capítulo deja de abrirse porque
// directorios.capitulos.ruta señala al nombre viejo). Esto reengancha lo que
// se pueda de ese daño antiguo y purga la caché de frecuencia de palabras.
//
// El reemparejamiento va en fases, de más fiable a menos, y siempre exige que
// la candidata sea ÚNICA y que no la haya reclamado ya una fase anterior:
//   1. mismo nombre exacto
//   2. mismo nombre ignorando el prefijo de orden "NN-"
//   3. carpetas: se deducen de dónde han acabado sus escenas
// Lo que no encaja se deja intacto y se lista: nunca se adivina.

// Resultado del último análisis, para que "Aplicar" no tenga que recalcular.
let repairReport = null;

function stripOrderPrefix(name) {
  return name.replace(/^\d+-/, '');
}

// Los nombres se indexan en forma compuesta para que "Capítulo" descompuesto
// y compuesto caigan en la misma casilla (ver canonPath en projectManager.js).
function normalizeName(name) {
  return name.normalize('NFC');
}

// Recorre el proyecto entero y devuelve todas las rutas que existen en disco.
async function listRealPaths(rootPath) {
  const found = [];
  const pending = [rootPath];

  while (pending.length) {
    const dir = pending.pop();
    let items;
    try {
      items = await window.electronAPI.readDirectory(dir);
    } catch {
      continue;
    }
    for (const item of items) {
      found.push(item.path);
      if (item.isDirectory) pending.push(item.path);
    }
  }

  return found;
}

// Todas las rutas que project.json cita, vengan de donde vengan.
function collectReferencedPaths() {
  const data = state.projectData;
  const refs = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value) refs.add(value);
  };

  const dirs = data.configuracion?.directorios || {};
  ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'].forEach(tipo => add(dirs[tipo]?.ruta));
  (dirs.otros || []).forEach(otro => add(otro?.ruta));

  (data.configuracion?.ordenCarpetas || []).forEach(add);
  Object.keys(data.configuracion?.estadisticas?.capitulos || {}).forEach(add);

  Object.keys(data.metadatos || {}).forEach(add);
  Object.values(data.metadatos || {}).forEach(meta => {
    add(meta?.escenaAnterior);
    add(meta?.escenaSiguiente);
    (meta?.relacionesAnteriores || []).forEach(add);
    (meta?.relacionesPosteriores || []).forEach(add);
    add(meta?.temporalidad?.escenaRef);
  });

  Object.keys(data.metadatosTramas || {}).forEach(add);
  Object.values(data.metadatosTramas || {}).forEach(meta => {
    add(meta?.escenaInicio);
    add(meta?.escenaFin);
  });

  (data.genealogia?.personas || []).forEach(persona => add(persona?.personajePath));

  return refs;
}

// Campos de los metadatos de una escena que apuntan a OTRA escena.
// temporalidad.escenaRef va aparte: ahí la autorreferencia no es un error,
// es la forma de decir "soy el origen de la línea temporal".
const SCENE_REF_FIELDS = [
  { key: 'escenaAnterior',        label: 'Escena anterior',    lista: false },
  { key: 'escenaSiguiente',       label: 'Escena siguiente',   lista: false },
  { key: 'relacionesAnteriores',  label: 'Relación anterior',  lista: true  },
  { key: 'relacionesPosteriores', label: 'Relación posterior', lista: true  },
];

// Diagnóstico de integridad de las referencias entre escenas.
// No repara: enumera. Lo que el reenganche vaya a arreglar se marca como tal,
// para distinguir el daño que se cura solo del que hay que tocar a mano.
function analyzeSceneReferences(realSet, mapping, capitulosRuta) {
  const metadatos = state.projectData?.metadatos || {};

  const esEscena = (ruta) => {
    const c = canonPath(ruta);
    if (!realSet.has(c) || !/\.txt$/i.test(c)) return false;
    return capitulosRuta ? pathMatches(c, capitulosRuta) : true;
  };

  // Motivo por el que una referencia no es válida, o null si lo es.
  const motivoDe = (valor) => {
    const c = canonPath(valor);
    if (!realSet.has(c)) return 'la escena referenciada ya no existe';
    if (!esEscena(c))    return 'apunta a algo que no es una escena';
    return null;
  };

  // Cadenas de temporalidad circulares: sin raíz, el día absoluto no se puede
  // calcular y la vista de temporalidad no puede situar la escena.
  const refTemporal = {};
  for (const [ruta, meta] of Object.entries(metadatos)) {
    const ref = canonPath(meta?.temporalidad?.escenaRef || '');
    refTemporal[canonPath(ruta)] = (!ref || ref === canonPath(ruta)) ? null : ref;
  }
  const enCiclo = new Set();
  for (const inicio of Object.keys(refTemporal)) {
    const vistas = new Set();
    let cur = inicio;
    while (cur && refTemporal[cur] !== undefined && refTemporal[cur] !== null) {
      if (vistas.has(cur)) { enCiclo.add(inicio); break; }
      vistas.add(cur);
      cur = refTemporal[cur];
    }
  }

  const issues = [];

  for (const [rutaEscena, meta] of Object.entries(metadatos)) {
    if (!meta) continue;
    const canon = canonPath(rutaEscena);
    const problemas = [];

    // La propia entrada puede haber quedado colgando de un renombrado
    if (!realSet.has(canon)) {
      problemas.push({
        campo: 'Entrada de metadatos',
        valor: canon,
        motivo: 'el fichero de la escena ya no existe',
        reparable: mapping.has(rutaEscena),
      });
    }

    for (const { key, label, lista } of SCENE_REF_FIELDS) {
      const valores = lista ? (meta[key] || []) : [meta[key]];
      for (const valor of valores) {
        if (typeof valor !== 'string' || !valor) continue;
        let motivo = motivoDe(valor);
        if (!motivo && canonPath(valor) === canon) motivo = 'se apunta a sí misma';
        if (!motivo) continue;
        problemas.push({ campo: label, valor, motivo, reparable: mapping.has(valor) });
      }
    }

    const refTemp = meta.temporalidad?.escenaRef;
    if (typeof refTemp === 'string' && refTemp && canonPath(refTemp) !== canon) {
      const motivo = motivoDe(refTemp);
      if (motivo) {
        problemas.push({
          campo: 'Temporalidad',
          valor: refTemp,
          motivo,
          reparable: mapping.has(refTemp),
        });
      }
    }

    if (enCiclo.has(canon)) {
      problemas.push({
        campo: 'Temporalidad',
        valor: '',
        motivo: 'cadena temporal circular: la escena no se puede situar en el tiempo',
        reparable: false,
      });
    }

    if (problemas.length > 0) issues.push({ scenePath: canon, problemas });
  }

  return issues.sort((a, b) => a.scenePath.localeCompare(b.scenePath, undefined, { numeric: true }));
}

// Analiza sin tocar nada: qué está roto y qué se puede reenganchar.
async function analyzeProjectRepair() {
  const rootPath = state.projectRootPath || state.projectPath;
  if (!state.projectData || !state.projectJsonPath || !rootPath) return null;

  // project.json guarda rutas canónicas, así que el índice de lo que existe en
  // disco también, o toda ruta sana parecería huérfana solo por la forma.
  const realPaths = (await listRealPaths(rootPath)).map(canonPath);
  const realSet = new Set(realPaths);

  // Índices por nombre para buscar candidatas
  const byName = new Map();
  const byLoose = new Map();
  for (const p of realPaths) {
    const name = normalizeName(nameFromPath(p));
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(p);
    const loose = stripOrderPrefix(name);
    if (!byLoose.has(loose)) byLoose.set(loose, []);
    byLoose.get(loose).push(p);
  }

  // Solo son huérfanas las rutas dentro del proyecto que ya no existen
  const orphans = [...collectReferencedPaths()]
    .filter(p => pathMatches(p, rootPath) && !realSet.has(canonPath(p)))
    .sort();

  const mapping = new Map();   // rutaVieja -> { newPath, motivo }
  const claimed = new Set();   // rutas reales ya asignadas

  const matchPhase = (index, keyFor, motivo) => {
    for (const oldPath of orphans) {
      if (mapping.has(oldPath)) continue;
      const hits = (index.get(keyFor(normalizeName(nameFromPath(oldPath)))) || []).filter(p => !claimed.has(p));
      if (hits.length !== 1) continue;
      mapping.set(oldPath, { newPath: hits[0], motivo });
      claimed.add(hits[0]);
    }
  };

  matchPhase(byName, name => name, 'mismo nombre');
  matchPhase(byLoose, stripOrderPrefix, 'mismo nombre sin el prefijo de orden');

  // Una carpeta huérfana se deduce de dónde han ido a parar sus escenas
  for (const oldPath of orphans) {
    if (mapping.has(oldPath)) continue;
    const destinos = new Set();
    for (const [hijo, { newPath }] of mapping) {
      if (pathMatches(hijo, oldPath) && hijo !== oldPath) destinos.add(parentPathOf(newPath));
    }
    if (destinos.size === 1) {
      mapping.set(oldPath, { newPath: [...destinos][0], motivo: 'deducida de sus escenas' });
    }
  }

  // Una huérfana cuyo destino YA existe como clave válida no se reengancha:
  // es un resto de un renombrado viejo que la entrada buena ya sustituyó. Se
  // descarta, pero conviene decirlo aparte para no vender un reenganche falso.
  const keyedContainers = [
    state.projectData.metadatos,
    state.projectData.metadatosTramas,
    state.projectData.configuracion?.estadisticas?.capitulos
  ].filter(Boolean);

  const duplicates = [];
  for (const [oldPath, info] of [...mapping]) {
    const collides = keyedContainers.some(obj =>
      Object.prototype.hasOwnProperty.call(obj, oldPath) &&
      Object.prototype.hasOwnProperty.call(obj, info.newPath)
    );
    if (!collides) continue;
    duplicates.push({ oldPath, newPath: info.newPath });
    mapping.delete(oldPath);
  }

  const unresolved = orphans
    .filter(p => !mapping.has(p) && !duplicates.some(d => d.oldPath === p))
    .map(oldPath => {
      const hits = byLoose.get(stripOrderPrefix(normalizeName(nameFromPath(oldPath)))) || [];
      return {
        oldPath,
        motivo: hits.length === 0
          ? 'no existe nada con ese nombre'
          : `su candidata ya la reclamó otra referencia (${hits.map(nameFromPath).join(', ')})`
      };
    });

  // Frecuencia de palabras: caché que se recalcula sola bajo demanda
  const capitulos = state.projectData.configuracion?.estadisticas?.capitulos || {};
  const wordFreqChapters = Object.keys(capitulos)
    .filter(p => capitulos[p] && (
      capitulos[p].frecuenciaPalabras !== undefined ||
      capitulos[p].frecuenciaCalculado !== undefined ||
      capitulos[p].frecuenciaMinLetras !== undefined
    ));

  const sceneRefIssues = analyzeSceneReferences(
    realSet,
    mapping,
    state.projectData.configuracion?.directorios?.capitulos?.ruta
  );

  return { rootPath, mapping, duplicates, unresolved, wordFreqChapters, sceneRefIssues };
}

// Aplica el informe: reescribe las rutas reenganchadas y purga la frecuencia.
async function applyProjectRepair(report) {
  const data = state.projectData;
  if (!data || !state.projectJsonPath || !report) return 0;

  let changed = 0;

  // Las referencias sueltas a una huérpana duplicada sí se reapuntan a la
  // entrada buena; lo que se descarta es su clave, no su mención.
  const valueMap = new Map(report.mapping);
  for (const { oldPath, newPath } of report.duplicates) valueMap.set(oldPath, { newPath });
  const droppedKeys = new Set(report.duplicates.map(d => d.oldPath));

  const mapValue = (value) => {
    const hit = valueMap.get(value);
    if (!hit) return value;
    changed++;
    return hit.newPath;
  };
  const mapField = (obj, key) => {
    if (obj && typeof obj[key] === 'string') obj[key] = mapValue(obj[key]);
  };
  const mapList = (obj, key) => {
    if (obj && Array.isArray(obj[key])) obj[key] = obj[key].map(mapValue);
  };
  // Claves: las duplicadas se tiran (gana la entrada que ya era válida) y el
  // resto se reengancha.
  const mapKeys = (obj) => {
    if (!obj) return obj;
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (droppedKeys.has(key)) { changed++; continue; }
      const mapped = mapValue(key);
      if (mapped !== key && Object.prototype.hasOwnProperty.call(obj, mapped)) continue;
      out[mapped] = value;
    }
    return out;
  };

  const dirs = data.configuracion?.directorios || {};
  ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'].forEach(tipo => mapField(dirs[tipo], 'ruta'));
  (dirs.otros || []).forEach(otro => mapField(otro, 'ruta'));

  mapList(data.configuracion, 'ordenCarpetas');
  if (data.configuracion?.estadisticas?.capitulos) {
    data.configuracion.estadisticas.capitulos = mapKeys(data.configuracion.estadisticas.capitulos);
  }

  if (data.metadatos) {
    data.metadatos = mapKeys(data.metadatos);
    for (const meta of Object.values(data.metadatos)) {
      mapField(meta, 'escenaAnterior');
      mapField(meta, 'escenaSiguiente');
      mapList(meta, 'relacionesAnteriores');
      mapList(meta, 'relacionesPosteriores');
      mapField(meta.temporalidad, 'escenaRef');
    }
  }

  if (data.metadatosTramas) {
    data.metadatosTramas = mapKeys(data.metadatosTramas);
    for (const meta of Object.values(data.metadatosTramas)) {
      mapField(meta, 'escenaInicio');
      mapField(meta, 'escenaFin');
    }
  }

  (data.genealogia?.personas || []).forEach(persona => mapField(persona, 'personajePath'));

  // Purga de la frecuencia de palabras de todos los capítulos: es solo caché y
  // se recalcula desde el menú contextual del capítulo cuando haga falta.
  const capitulos = data.configuracion?.estadisticas?.capitulos || {};
  for (const stats of Object.values(capitulos)) {
    if (!stats) continue;
    let purged = false;
    for (const campo of ['frecuenciaPalabras', 'frecuenciaCalculado', 'frecuenciaMinLetras']) {
      if (stats[campo] !== undefined) { delete stats[campo]; purged = true; }
    }
    if (purged) changed++;
  }

  if (changed === 0) return 0;

  const result = await window.electronAPI.saveProjectJson(state.projectJsonPath, data);
  if (!result.success) {
    showNotification('Error al guardar el proyecto reparado');
    return 0;
  }

  state.hasMarkedDirs = hasMarkedDirectories();
  return changed;
}

// === MODAL ===

function escapeRepairHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Ruta relativa a la raíz del proyecto, para no llenar el modal de ruido
function relativeToRoot(fullPath, rootPath) {
  return pathMatches(fullPath, rootPath) ? fullPath.slice(rootPath.length + 1) : fullPath;
}

async function openRepairProjectModal() {
  if (!state.projectData || !state.projectJsonPath) {
    showNotification('No hay proyecto cargado');
    return;
  }

  const body = document.getElementById('repair-project-body');
  const applyBtn = document.getElementById('btn-apply-repair');

  body.innerHTML = '<p class="repair-empty">Analizando el proyecto...</p>';
  applyBtn.disabled = true;
  openModal('modal-repair-project');

  repairReport = await analyzeProjectRepair();
  if (!repairReport) {
    body.innerHTML = '<p class="repair-empty">No se ha podido leer el proyecto.</p>';
    return;
  }

  const { rootPath, mapping, duplicates, unresolved, wordFreqChapters, sceneRefIssues } = repairReport;
  const rel = (p) => escapeRepairHtml(relativeToRoot(p, rootPath));
  let html = '';

  if (mapping.size > 0) {
    html += `<div class="repair-section">
      <div class="repair-section-title repair-ok">Se reengancharán ${mapping.size} referencias</div>
      <ul class="repair-list">` +
      [...mapping].map(([oldPath, { newPath, motivo }]) =>
        `<li><span class="repair-old">${rel(oldPath)}</span>
             <span class="repair-arrow">→</span>
             <span class="repair-new">${rel(newPath)}</span>
             <span class="repair-reason">${escapeRepairHtml(motivo)}</span></li>`
      ).join('') + `</ul></div>`;
  }

  if (duplicates.length > 0) {
    html += `<div class="repair-section">
      <div class="repair-section-title repair-warn">Se descartarán ${duplicates.length} entradas duplicadas</div>
      <p class="repair-note">Restos de renombrados antiguos: ya existe una entrada válida para el mismo fichero, que es la que se conserva.</p>
      <ul class="repair-list">` +
      duplicates.map(dup =>
        `<li><span class="repair-old">${rel(dup.oldPath)}</span>
             <span class="repair-reason">ya cubierta por ${rel(dup.newPath)}</span></li>`
      ).join('') + `</ul></div>`;
  }

  if (unresolved.length > 0) {
    html += `<div class="repair-section">
      <div class="repair-section-title repair-warn">${unresolved.length} sin reenganchar — se dejan como están</div>
      <ul class="repair-list">` +
      unresolved.map(u =>
        `<li><span class="repair-old">${rel(u.oldPath)}</span>
             <span class="repair-reason">${escapeRepairHtml(u.motivo)}</span></li>`
      ).join('') + `</ul></div>`;
  }

  if (sceneRefIssues.length > 0) {
    const totalProblemas = sceneRefIssues.reduce((n, i) => n + i.problemas.length, 0);
    const porArreglar = sceneRefIssues.reduce(
      (n, i) => n + i.problemas.filter(pr => !pr.reparable).length, 0);

    html += `<div class="repair-section">
      <div class="repair-section-title repair-warn">
        ${sceneRefIssues.length} escena(s) con referencias con problemas — ${totalProblemas} en total
      </div>
      <p class="repair-note">${
        porArreglar === 0
          ? 'Todas se reenganchan al aplicar los cambios.'
          : `${porArreglar} no se pueden reenganchar solas: corrígelas desde el panel de metadatos de cada escena.`
      }</p>
      <ul class="repair-list repair-scenes">` +
      sceneRefIssues.map(issue => `<li class="repair-scene">
          <div class="repair-scene-name">${rel(issue.scenePath)}</div>
          <ul class="repair-problems">` +
          issue.problemas.map(pr => `<li>
              <span class="repair-field">${escapeRepairHtml(pr.campo)}</span>
              ${pr.valor ? `<span class="repair-old">${rel(pr.valor)}</span>` : ''}
              <span class="repair-reason">${escapeRepairHtml(pr.motivo)}${
                pr.reparable ? ' · se reengancha al aplicar' : ''}</span>
            </li>`).join('') +
          `</ul>
        </li>`).join('') + `</ul></div>`;
  }

  if (wordFreqChapters.length > 0) {
    html += `<div class="repair-section">
      <div class="repair-section-title">Se borrará la frecuencia de palabras de ${wordFreqChapters.length} capítulo(s)</div>
      <p class="repair-note">Es solo caché: se recalcula desde el menú contextual del capítulo.</p>
    </div>`;
  }

  if (!html) {
    html = '<p class="repair-empty">El proyecto está sano: no hay referencias rotas ni caché de frecuencia que borrar.</p>';
  }

  body.innerHTML = html;
  applyBtn.disabled = mapping.size === 0 && duplicates.length === 0 && wordFreqChapters.length === 0;
}

async function confirmRepairProject() {
  if (!repairReport) return;

  const changed = await applyProjectRepair(repairReport);
  repairReport = null;
  closeModal('modal-repair-project');

  if (changed === 0) {
    showNotification('No había nada que reparar');
    return;
  }

  showNotification(`Proyecto reparado (${changed} cambios)`);
  // Recargar: el árbol se filtra por los directorios marcados, que pueden
  // acabar de cambiar de ruta.
  await reloadPreservingExpanded();
}

function setupRepairProjectListeners() {
  document.getElementById('btn-apply-repair')?.addEventListener('click', confirmRepairProject);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeProjectRepair,
    applyProjectRepair,
    openRepairProjectModal,
    confirmRepairProject,
    setupRepairProjectListeners
  };
}
