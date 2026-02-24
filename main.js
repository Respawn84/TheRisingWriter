const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
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
        { type: 'separator' },
        {
          label: 'Guardar',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('save-file')
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
    mainWindow.webContents.send('project-folder-opened', result.filePaths[0]);
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
    mainWindow.webContents.send('project-file-opened', result.filePaths[0]);
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
    if (dirPath.endsWith('.json')) {
      // Si se pasa un fichero JSON directamente, usar esa ruta
      dirPath = dirPath;
    }else{
      // Si se pasa una carpeta, usar project.json dentro de esa carpeta
      dirPath = path.join(dirPath, 'project.json');
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
          fechaPrevista: ""
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

// === APP LIFECYCLE ===

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
