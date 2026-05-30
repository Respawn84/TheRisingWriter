const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

let mainWindow;

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 }, // centrados en sidebar-traffic-zone de 52px
    backgroundColor: isMac ? '#00000000' : '#1e1e1e',
    transparent: isMac,
    ...(isMac && {
      vibrancy: 'under-window',
      visualEffectState: 'active'
    })
  });

  mainWindow.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    const props = await readProperties();
    const lastProject = props.lastProject;
    const lastFile = props.lastFile || null;

    if (lastProject) {
      try {
        await fs.access(lastProject);
        mainWindow.webContents.send('restore-session', { projectPath: lastProject, filePath: lastFile });
      } catch {
        // El proyecto ya no existe en disco, ignorar
      }
    }
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nuevo proyecto...',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow.webContents.send('new-project')
        },
        { type: 'separator' },
        {
          label: 'Abrir carpeta...',
          accelerator: 'CmdOrCtrl+O',
          click: openProjectFolder
        },
        {
          label: 'Abrir proyecto...',
          accelerator: 'CmdOrCtrl+P',
          click: openProjectFile
        },
        {
          label: 'Cerrar proyecto',
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => mainWindow.webContents.send('close-project')
        },
        { type: 'separator' },
        {
          label: 'Guardar',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('save-file')
        },
        { type: 'separator' },
        {
          label: 'Exportar a ePub...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('export-epub')
        },
        { type: 'separator' },
        {
          label: 'Configuración...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('show-app-settings')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
        { type: 'separator' },
        {
          label: 'Buscar y Reemplazar...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('show-find-replace')
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'toggleDevTools', label: 'Herramientas' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' }
      ]
    },
    {
      label: 'IA',
      submenu: [
        {
          label: 'Estadísticas...',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => mainWindow.webContents.send('show-usage-stats')
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openProjectFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta del proyecto'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const projectPath = result.filePaths[0];
    await saveLastProject(projectPath);
    mainWindow.webContents.send('project-folder-opened', projectPath);
  }
}

async function openProjectFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Seleccionar fichero del proyecto',
  },
  [{ name: 'Fichero de Proyecto', extensions: ['json'] }] //Filtro de extensiones
);

  if (!result.canceled && result.filePaths.length > 0) {
    const projectPath = result.filePaths[0];
    await saveLastProject(projectPath);
    mainWindow.webContents.send('project-file-opened', projectPath);
  }
}

// === IPC HANDLERS - SISTEMA DE ARCHIVOS ===

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const filteredEntries = entries.filter(e => !e.name.startsWith('.'));
    
    const items = await Promise.all(
      filteredEntries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size: stats.size,
          modified: stats.mtime
        };
      })
    );

    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error leyendo directorio:', error);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta'
  });

  return result.canceled ? { success: false } : { success: true, path: result.filePaths[0] };
});

ipcMain.handle('create-folder', async (event, folderPath, folderName) => {
  try {
    const newPath = path.join(folderPath, folderName);
    await fs.mkdir(newPath, { recursive: false });
    return { success: true, path: newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-file', async (event, filePath, fileName) => {
  try {
    const newPath = path.join(filePath, fileName);
    await fs.writeFile(newPath, '', 'utf-8');
    return { success: true, path: newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-item', async (event, oldPath, newName) => {
  try {
    const newPath = path.join(path.dirname(oldPath), newName);
    await fs.rename(oldPath, newPath);
    return { success: true, path: newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-item', async (event, itemPath) => {
  try {
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory()) {
      await fs.rm(itemPath, { recursive: true, force: true });
    } else {
      await fs.unlink(itemPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('move-item', async (event, itemPath, destinationFolder) => {
  try {
    const fileName = path.basename(itemPath);
    const newPath = path.join(destinationFolder, fileName);
    
    if (path.dirname(itemPath) === destinationFolder) {
      return { success: false, error: 'El destino es el mismo que el origen' };
    }
    
    try {
      await fs.access(newPath);
      return { success: false, error: 'Ya existe un elemento con ese nombre en el destino' };
    } catch {
      // No existe, podemos mover
    }
    
    await fs.rename(itemPath, newPath);
    return { success: true, path: newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-folders', async (event, dirPath) => {
  try {
    const folders = [];
    
    // Función recursiva para obtener todas las carpetas
    async function scanDirectory(dir, level = 0) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const fullPath = path.join(dir, entry.name);
          const indent = '-'.repeat(level);
          folders.push({
            name: `${indent}📁 ${entry.name}`,
            path: fullPath,
            level
          });
          // Recursivamente escanear subcarpetas
          await scanDirectory(fullPath, level + 1);
        }
      }
    }
    
    // Agregar raíz primero
    folders.unshift({ name: '📁 Raíz del proyecto', path: dirPath, level: 0 });
    
    // Escanear todas las subcarpetas
    await scanDirectory(dirPath, 1);
    
    return folders;
  } catch (error) {
    console.error('Error listando carpetas:', error);
    return [];
  }
});


// === IPC HANDLERS - GESTION DE PROYECTOS ===
// Handler: Cargar o crear proyecto JSON
ipcMain.handle('load-or-create-project', async (event, dirPath) => {
  try {
    if (!dirPath.endsWith('.json')) {
      // Buscar cualquier .json en la raíz de la carpeta que tenga estructura de proyecto
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const jsonFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));
      let found = null;
      for (const f of jsonFiles) {
        try {
          const raw = await fs.readFile(path.join(dirPath, f.name), 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed.version && parsed.configuracion) { found = f.name; break; }
        } catch { /* ignorar ficheros JSON no válidos */ }
      }
      const projectName = path.basename(dirPath);
      dirPath = path.join(dirPath, found || `${projectName}.json`);
    }
    
    const jsonPath = dirPath; // Ahora se pasa directamente la ruta del fichero JSON
    // Intentar leer el JSON existente
    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      return { 
        success: true, 
        path: jsonPath, 
        data: data,
        existed: true 
      };
    } catch (readError) {
      // No existe, crear uno nuevo
      const emptyProject = {
        version: "1.0",
        proyecto: {
          titulo: "",
          autor: "",
          fecha: new Date().toISOString().split('T')[0],
          saga: "",
          fechaPrevista: "",
          rutaPortada: ""
        },
        configuracion: {
          directorios: {
            capitulos: { ruta: "", compilar: true },
            personajes: { ruta: "", compilar: false },
            tramas: { ruta: "", compilar: false },
            mundo: { ruta: "", compilar: false },
            papelera: { ruta: "", compilar: false },
            otros: []
          },
          compilarDirectorios: [],
          omitirEscenas: []
        }
      };
      
      await fs.writeFile(jsonPath, JSON.stringify(emptyProject, null, 2), 'utf-8');
      
      return { 
        success: true, 
        path: jsonPath, 
        data: emptyProject,
        existed: false 
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Calcular estadísticas de capítulo
ipcMain.handle('calculate-chapter-stats', async (event, folderPath) => {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const txtFiles = entries.filter(e => e.isFile() && !e.name.startsWith('.') && e.name.endsWith('.txt'));

    let totalWords = 0;
    for (const file of txtFiles) {
      const content = await fs.readFile(path.join(folderPath, file.name), 'utf-8');
      const trimmed = content.trim();
      totalWords += trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    }

    const scenes = txtFiles.length;
    const avgWordsPerScene = scenes > 0 ? Math.round(totalWords / scenes) : 0;

    return { success: true, scenes, totalWords, avgWordsPerScene };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Calcular frecuencia de palabras de un capítulo
ipcMain.handle('calculate-word-frequency', async (event, folderPath, minLetters = 4) => {
  try {
    const min = Math.max(1, Math.floor(minLetters));
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const txtFiles = entries
      .filter(e => e.isFile() && !e.name.startsWith('.') && e.name.endsWith('.txt'))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const freq = {};
    for (const file of txtFiles) {
      const content = await fs.readFile(path.join(folderPath, file.name), 'utf-8');
      const words = content
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s'-]/g, ' ')
        .split(/\s+/);
      for (const w of words) {
        const clean = w.replace(/^['-]+|['-]+$/g, '');
        if (clean.length >= min) {
          freq[clean] = (freq[clean] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([word, count]) => ({ word, count }));

    return { success: true, words: sorted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Crear nuevo proyecto con estructura de carpetas
ipcMain.handle('create-new-project', async (event, { parentPath, folderName, titulo, autor }) => {
  try {
    const projectPath = path.join(parentPath, folderName);

    // Verificar que no existe ya
    try {
      await fs.access(projectPath);
      return { success: false, error: 'Ya existe una carpeta con ese nombre en la ruta seleccionada.' };
    } catch { /* no existe, continuar */ }

    // Crear carpeta raíz y subcarpetas
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'capitulos'));
    await fs.mkdir(path.join(projectPath, 'personajes'));
    await fs.mkdir(path.join(projectPath, 'tramas'));
    await fs.mkdir(path.join(projectPath, 'mundo'));

    // Nombre del fichero JSON igual que la carpeta
    const jsonName = folderName.replace(/\s+/g, '-').toLowerCase() + '.json';
    const jsonPath = path.join(projectPath, jsonName);

    const projectData = {
      version: "1.0",
      proyecto: {
        titulo: titulo || folderName,
        autor: autor || "",
        fecha: new Date().toISOString().split('T')[0],
        saga: "",
        fechaPrevista: "",
        rutaPortada: ""
      },
      configuracion: {
        directorios: {
          capitulos: { ruta: path.join(projectPath, 'capitulos'), compilar: true },
          personajes: { ruta: path.join(projectPath, 'personajes'), compilar: false },
          tramas: { ruta: path.join(projectPath, 'tramas'), compilar: false },
          mundo: { ruta: path.join(projectPath, 'mundo'), compilar: false },
          papelera: { ruta: "", compilar: false },
          otros: []
        },
        compilarDirectorios: [],
        omitirEscenas: []
      },
      metadatos: {},
      metadatosTramas: {}
    };

    await fs.writeFile(jsonPath, JSON.stringify(projectData, null, 2), 'utf-8');

    return { success: true, jsonPath, projectPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Guardar último fichero abierto
ipcMain.handle('save-last-file', async (event, filePath) => {
  await saveLastFile(filePath);
  return { success: true };
});

// Handler: Guardar proyecto JSON
ipcMain.handle('save-project-json', async (event, jsonPath, data) => {
  try {
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Marcar directorio
ipcMain.handle('mark-directory', async (event, jsonPath, dirPath, tipo) => {
  try {
    // Leer JSON actual
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Actualizar directorio según tipo
    if (tipo === 'otro') {
      // Agregar a array de otros
      if (!data.configuracion.directorios.otros) {
        data.configuracion.directorios.otros = [];
      }
      
      // Verificar si ya existe
      const exists = data.configuracion.directorios.otros.find(d => d.ruta === dirPath);
      if (!exists) {
        data.configuracion.directorios.otros.push({
          ruta: dirPath,
          mostrar: true
        });
      }
    } else {
      // Actualizar tipo específico
      if (!data.configuracion.directorios[tipo]) {
        data.configuracion.directorios[tipo] = { ruta: "", compilar: false };
      }
      data.configuracion.directorios[tipo].ruta = dirPath;
    }
    
    // Guardar
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    
    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Desmarcar directorio
ipcMain.handle('unmark-directory', async (event, jsonPath, dirPath) => {
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Buscar y limpiar en tipos específicos
    const tipos = ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'];
    for (const tipo of tipos) {
      if (data.configuracion.directorios[tipo]?.ruta === dirPath) {
        data.configuracion.directorios[tipo].ruta = "";
      }
    }
    
    // Quitar de array otros
    if (data.configuracion.directorios.otros) {
      data.configuracion.directorios.otros = data.configuracion.directorios.otros.filter(
        d => d.ruta !== dirPath
      );
    }
    
    // Guardar
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    
    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler: Obtener tipo de directorio
ipcMain.handle('get-directory-type', async (event, jsonPath, dirPath) => {
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Buscar en tipos específicos
    const tipos = ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'];
    for (const tipo of tipos) {
      if (data.configuracion.directorios[tipo]?.ruta === dirPath) {
        return { success: true, type: tipo };
      }
    }
    
    // Buscar en otros
    if (data.configuracion.directorios.otros) {
      const found = data.configuracion.directorios.otros.find(d => d.ruta === dirPath);
      if (found) {
        return { success: true, type: 'otro' };
      }
    }
    
    return { success: true, type: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === IPC HANDLERS - CLAUDE AI ===

const PRICING_FILE = path.join(app.getPath('userData'), 'pricing.json');
const LOG_FILE = path.join(app.getPath('userData'), 'usage.log');
const PROPERTIES_FILE = path.join(
  app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname,
  'rising-writer.properties'
);

ipcMain.handle('get-api-key', () => {
  return process.env.ANTHROPIC_API_KEY || '';
});

ipcMain.handle('get-pricing', async () => {
  try {
    const data = await fs.readFile(PRICING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { inputPrice: 3.0, outputPrice: 15.0 };
  }
});

ipcMain.handle('save-pricing', async (event, pricing) => {
  try {
    await fs.writeFile(PRICING_FILE, JSON.stringify(pricing, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function calculateCost(inputTokens, outputTokens) {
  try {
    const { inputPrice, outputPrice } = JSON.parse(await fs.readFile(PRICING_FILE, 'utf-8'));
    return (inputTokens / 1000000) * inputPrice + (outputTokens / 1000000) * outputPrice;
  } catch {
    return (inputTokens / 1000000) * 3.0 + (outputTokens / 1000000) * 15.0;
  }
}

async function logTransaction(action, inputTokens, outputTokens, cost) {
  const tx = { timestamp: new Date().toISOString(), action, inputTokens, outputTokens, cost };
  try {
    await fs.appendFile(LOG_FILE, JSON.stringify(tx) + '\n');
  } catch (error) {
    console.error('Error logging:', error);
  }
}

ipcMain.handle('get-usage-stats', async () => {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf-8');
    const txs = data.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
    
    return {
      totalInputTokens: txs.reduce((s, t) => s + t.inputTokens, 0),
      totalOutputTokens: txs.reduce((s, t) => s + t.outputTokens, 0),
      totalCost: txs.reduce((s, t) => s + t.cost, 0),
      recentTransactions: txs.slice(-10).reverse()
    };
  } catch {
    return { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, recentTransactions: [] };
  }
});

ipcMain.handle('open-log-file', async () => {
  try {
    await shell.openPath(LOG_FILE);
  } catch (error) {
    console.error('Error abriendo log:', error);
  }
});

ipcMain.handle('call-claude', async (event, { selectedText, action }) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'API Key no configurada. Edita el archivo .env' };
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prompts = {
      corregir: `Corrige SOLO ortografía, puntuación y tipografía. NO cambies palabras ni estructura. Si no hay errores, devuelve el texto igual.\n\n${selectedText}\n\nTexto corregido:`,
      sinonimos: `Sugiere 5 sinónimos para "${selectedText}" en español. Solo lista numerada, sin explicaciones.`,
      mejorar: `Mejora este texto manteniendo el estilo:\n\n${selectedText}\n\nTexto mejorado:`,
      expandir: `Expande este texto con más detalles:\n\n${selectedText}\n\nTexto expandido:`
    };

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompts[action] || selectedText }]
    });

    const response = message.content[0].text.trim();
    const { input_tokens, output_tokens } = message.usage;
    const cost = await calculateCost(input_tokens, output_tokens);
    
    await logTransaction(action, input_tokens, output_tokens, cost);

    return { success: true, response, inputTokens: input_tokens, outputTokens: output_tokens, cost };
  } catch (error) {
    console.error('Error Claude:', error);
    return { success: false, error: error.message };
  }
});

// === EXPORT TO DOCX ===

ipcMain.handle('export-to-docx', async (event, capitulosPath) => {
  try {
    const { Document, Packer, Paragraph, HeadingLevel, PageBreak, TextRun } = require('docx');

    // Diálogo para guardar
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Exportar a Word',
      defaultPath: path.join(capitulosPath, '..', 'novela.docx'),
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    // Leer capítulos ordenados
    const capEntries = await fs.readdir(capitulosPath, { withFileTypes: true });
    const capDirs = capEntries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const children = [];

    for (const capDir of capDirs) {
      // Salto de página antes de cada capítulo (excepto el primero)
      if (children.length > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      // Título de capítulo - Heading 1
      children.push(new Paragraph({ text: capDir.name, heading: HeadingLevel.HEADING_1 }));

      // Leer escenas ordenadas
      const capPath = path.join(capitulosPath, capDir.name);
      const sceneEntries = await fs.readdir(capPath, { withFileTypes: true });
      const scenes = sceneEntries
        .filter(e => e.isFile() && !e.name.startsWith('.') && e.name.endsWith('.txt'))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneName = scene.name.replace(/^\d+-/, '').replace(/\.txt$/, '');

        // Nombre de escena - Heading 2
        children.push(new Paragraph({ text: sceneName, heading: HeadingLevel.HEADING_2 }));

        // Contenido de la escena
        const content = await fs.readFile(path.join(capPath, scene.name), 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          children.push(new Paragraph({ text: line.trim() }));
        }

        // Separador entre escenas (no después de la última)
        if (i < scenes.length - 1) {
          children.push(new Paragraph({ text: '* * *', alignment: 'center' }));
        }
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filePath, buffer);

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error exportando DOCX:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-image-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Seleccionar imagen de portada',
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
  });
  return result.canceled ? { success: false } : { success: true, path: result.filePaths[0] };
});

// === EXPORT TO EPUB ===

function escapeXml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function readChaptersForEpub(capitulosPath) {
  const capEntries = await fs.readdir(capitulosPath, { withFileTypes: true });
  const capDirs = capEntries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const chapters = [];

  for (const capDir of capDirs) {
    const capPath = path.join(capitulosPath, capDir.name);
    const sceneEntries = await fs.readdir(capPath, { withFileTypes: true });
    const sceneFiles = sceneEntries
      .filter(e => e.isFile() && !e.name.startsWith('.') && e.name.endsWith('.txt'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const scenes = [];
    for (const sceneFile of sceneFiles) {
      const sceneName = sceneFile.name.replace(/^\d+-/, '').replace(/\.txt$/, '');
      const content = await fs.readFile(path.join(capPath, sceneFile.name), 'utf-8');
      scenes.push({
        title: sceneName,
        paragraphs: content.split('\n').filter(l => l.trim())
      });
    }

    chapters.push({ title: capDir.name, scenes });
  }

  return chapters;
}

function getImageMediaType(ext) {
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  return types[ext.toLowerCase()] || 'image/jpeg';
}

async function buildEpubBuffer(chapters, { title, author, rutaPortada }) {
  const JSZip = require('jszip');
  const crypto = require('crypto');
  const zip = new JSZip();

  const bookId = `urn:uuid:${crypto.randomUUID()}`;
  const lang = 'es';
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const safeTitle = title || 'Novela';
  const safeAuthor = author || '';

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', compressionOptions: { level: 0 } });

  zip.file('META-INF/container.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
    '  <rootfiles>',
    '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>',
    '  </rootfiles>',
    '</container>'
  ].join('\n'));

  zip.file('OEBPS/Styles/stylesheet.css', [
    'body { font-family: Georgia, serif; margin: 5%; text-align: justify; line-height: 1.6; }',
    'h1 { text-align: center; margin-top: 3em; margin-bottom: 2em; font-size: 1.5em; page-break-before: always; }',
    'h2 { text-align: center; margin-top: 2em; margin-bottom: 1em; font-size: 1.1em; font-weight: normal; font-style: italic; }',
    'p { text-indent: 1.5em; margin: 0; }',
    'p.first { text-indent: 0; }',
    'p.separator { text-align: center; text-indent: 0; margin: 1em 0; }',
    '.cover-page { margin: 0; padding: 0; text-align: center; }',
    '.cover-page img { max-width: 100%; max-height: 100vh; display: block; margin: 0 auto; }'
  ].join('\n'));

  // --- Portada ---
  let hasCover = false;
  let coverFileName = '';
  let coverMediaType = '';

  if (rutaPortada) {
    try {
      const coverData = await fs.readFile(rutaPortada);
      const ext = path.extname(rutaPortada) || '.jpg';
      coverFileName = `cover${ext}`;
      coverMediaType = getImageMediaType(ext);
      zip.file(`OEBPS/Images/${coverFileName}`, coverData);

      zip.file('OEBPS/Text/cover.xhtml', [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE html>',
        `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">`,
        '<head>',
        '  <meta charset="UTF-8"/>',
        '  <title>Portada</title>',
        '  <link rel="stylesheet" type="text/css" href="../Styles/stylesheet.css"/>',
        '</head>',
        '<body class="cover-page">',
        `  <img src="../Images/${coverFileName}" alt="Portada"/>`,
        '</body>',
        '</html>'
      ].join('\n'));

      hasCover = true;
    } catch (e) {
      console.warn('No se pudo leer la imagen de portada:', e.message);
    }
  }

  // --- Capítulos ---
  const chapterRefs = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const fileId = `chapter${String(i + 1).padStart(3, '0')}`;
    const filePath = `Text/${fileId}.xhtml`;

    let bodyContent = `  <h1>${escapeXml(ch.title)}</h1>`;

    for (let si = 0; si < ch.scenes.length; si++) {
      const scene = ch.scenes[si];
      if (ch.scenes.length > 1) {
        bodyContent += `\n  <h2>${escapeXml(scene.title)}</h2>`;
      }
      for (let pi = 0; pi < scene.paragraphs.length; pi++) {
        const cssClass = pi === 0 ? ' class="first"' : '';
        bodyContent += `\n  <p${cssClass}>${escapeXml(scene.paragraphs[pi])}</p>`;
      }
      if (si < ch.scenes.length - 1) {
        bodyContent += '\n  <p class="separator">* * *</p>';
      }
    }

    zip.file(`OEBPS/${filePath}`, [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE html>',
      `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">`,
      '<head>',
      '  <meta charset="UTF-8"/>',
      `  <title>${escapeXml(ch.title)}</title>`,
      '  <link rel="stylesheet" type="text/css" href="../Styles/stylesheet.css"/>',
      '</head>',
      '<body>',
      bodyContent,
      '</body>',
      '</html>'
    ].join('\n'));

    chapterRefs.push({ id: fileId, href: filePath, title: ch.title });
  }

  // --- content.opf ---
  const coverManifestItems = hasCover ? [
    `    <item id="cover-image" href="Images/${coverFileName}" media-type="${coverMediaType}" properties="cover-image"/>`,
    '    <item id="cover" href="Text/cover.xhtml" media-type="application/xhtml+xml"/>'
  ] : [];

  const manifestItems = [
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '    <item id="stylesheet" href="Styles/stylesheet.css" media-type="text/css"/>',
    ...coverManifestItems,
    ...chapterRefs.map(c => `    <item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`)
  ].join('\n');

  const spineItems = [
    ...(hasCover ? ['    <itemref idref="cover" linear="no"/>'] : []),
    ...chapterRefs.map(c => `    <itemref idref="${c.id}"/>`)
  ].join('\n');

  const coverMeta = hasCover ? '\n    <meta name="cover" content="cover-image"/>' : '';

  zip.file('OEBPS/content.opf', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${lang}">`,
    '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
    `    <dc:identifier id="BookId">${bookId}</dc:identifier>`,
    `    <dc:title>${escapeXml(safeTitle)}</dc:title>`,
    `    <dc:creator>${escapeXml(safeAuthor)}</dc:creator>`,
    `    <dc:language>${lang}</dc:language>`,
    `    <meta property="dcterms:modified">${modified}</meta>${coverMeta}`,
    '  </metadata>',
    '  <manifest>',
    manifestItems,
    '  </manifest>',
    '  <spine toc="ncx">',
    spineItems,
    '  </spine>',
    '</package>'
  ].join('\n'));

  // --- toc.ncx ---
  const navPoints = chapterRefs.map((c, i) => [
    `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">`,
    `      <navLabel><text>${escapeXml(c.title)}</text></navLabel>`,
    `      <content src="${c.href}"/>`,
    `    </navPoint>`
  ].join('\n')).join('\n');

  zip.file('OEBPS/toc.ncx', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">',
    '  <head>',
    `    <meta name="dtb:uid" content="${bookId}"/>`,
    '    <meta name="dtb:depth" content="1"/>',
    '    <meta name="dtb:totalPageCount" content="0"/>',
    '    <meta name="dtb:maxPageNumber" content="0"/>',
    '  </head>',
    `  <docTitle><text>${escapeXml(safeTitle)}</text></docTitle>`,
    '  <navMap>',
    navPoints,
    '  </navMap>',
    '</ncx>'
  ].join('\n'));

  // --- nav.xhtml ---
  const navItems = chapterRefs.map(c => `      <li><a href="${c.href}">${escapeXml(c.title)}</a></li>`).join('\n');

  zip.file('OEBPS/nav.xhtml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE html>',
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">`,
    '<head>',
    '  <meta charset="UTF-8"/>',
    '  <title>Índice</title>',
    '</head>',
    '<body>',
    '  <nav epub:type="toc" id="toc">',
    '    <h1>Índice</h1>',
    '    <ol>',
    navItems,
    '    </ol>',
    '  </nav>',
    '</body>',
    '</html>'
  ].join('\n'));

  return await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

ipcMain.handle('export-to-epub', async (event, { capitulosPath, metadata }) => {
  try {
    const safeName = (metadata.title || 'novela').replace(/[/\\:*?"<>|]/g, '_');

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar a ePub',
      defaultPath: path.join(capitulosPath, '..', `${safeName}.epub`),
      filters: [{ name: 'Libro ePub', extensions: ['epub'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const chapters = await readChaptersForEpub(capitulosPath);
    const buffer = await buildEpubBuffer(chapters, metadata);
    await fs.writeFile(filePath, buffer);

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error exportando ePub:', error);
    return { success: false, error: error.message };
  }
});

// === ÚLTIMO PROYECTO Y FICHERO ===

async function readProperties() {
  try {
    const content = await fs.readFile(PROPERTIES_FILE, 'utf-8');
    const props = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=]+)=(.+)$/);
      if (match) props[match[1].trim()] = match[2].trim();
    }
    return props;
  } catch {
    return {};
  }
}

async function writeProperties(props) {
  try {
    const content = Object.entries(props).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    await fs.writeFile(PROPERTIES_FILE, content, 'utf-8');
  } catch (error) {
    console.error('Error guardando properties:', error);
  }
}

async function saveLastProject(projectPath) {
  const props = await readProperties();
  props.lastProject = projectPath;
  await writeProperties(props);
}

async function saveLastFile(filePath) {
  const props = await readProperties();
  props.lastFile = filePath;
  await writeProperties(props);
}

ipcMain.handle('clear-last-project', async () => {
  const props = await readProperties();
  delete props.lastProject;
  delete props.lastFile;
  await writeProperties(props);
  return { success: true };
});

// === APP SETTINGS ===

ipcMain.handle('get-app-settings', async () => {
  const props = await readProperties();
  return {
    // General
    autosaveMinutes:     parseInt(props.autosaveMinutes || '0', 10),
    wordFreqMinLetters:  parseInt(props.wordFreqMinLetters || '4', 10),
    // Panel de escritura
    editorBg:         props.editorBg         || '',
    editorColor:      props.editorColor      || '',
    editorFontFamily: props.editorFontFamily || '',
    editorFontSize:   props.editorFontSize   || '',
    editorLineHeight: props.editorLineHeight || '',
    editorPadding:    props.editorPadding    || '',
  };
});

ipcMain.handle('save-app-settings', async (_, settings) => {
  const props = await readProperties();

  // General
  if (settings.autosaveMinutes !== undefined) {
    props.autosaveMinutes = String(Math.max(0, Math.floor(settings.autosaveMinutes)));
  }
  if (settings.wordFreqMinLetters !== undefined) {
    props.wordFreqMinLetters = String(Math.max(1, Math.floor(settings.wordFreqMinLetters)));
  }

  // Panel de escritura — almacenar las claves si vienen en el objeto
  const editorKeys = ['editorBg', 'editorColor', 'editorFontFamily', 'editorFontSize', 'editorLineHeight', 'editorPadding'];
  for (const key of editorKeys) {
    if (settings[key] !== undefined) props[key] = String(settings[key]);
  }

  await writeProperties(props);
  return { success: true };
});

// === APP LIFECYCLE ===

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
