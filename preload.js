const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Sistema de archivos
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  createFolder: (path, name) => ipcRenderer.invoke('create-folder', path, name),
  createFile: (filePath, fileName) => ipcRenderer.invoke('create-file', filePath, fileName),
  renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', oldPath, newName),
  deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
  moveItem: (itemPath, destinationFolder) => ipcRenderer.invoke('move-item', itemPath, destinationFolder),
  listFolders: (dirPath) => ipcRenderer.invoke('list-folders', dirPath),
  
   // === PROJECT MANAGEMENT ===
  exportToDocx: (capitulosPath) => ipcRenderer.invoke('export-to-docx', capitulosPath),
  exportToEpub: (params) => ipcRenderer.invoke('export-to-epub', params),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  loadOrCreateProject: (dirPath) => ipcRenderer.invoke('load-or-create-project', dirPath),
  saveProjectJson: (jsonPath, data) => ipcRenderer.invoke('save-project-json', jsonPath, data),
  markDirectory: (jsonPath, dirPath, tipo) => ipcRenderer.invoke('mark-directory', jsonPath, dirPath, tipo),
  unmarkDirectory: (jsonPath, dirPath) => ipcRenderer.invoke('unmark-directory', jsonPath, dirPath),
  getDirectoryType: (jsonPath, dirPath) => ipcRenderer.invoke('get-directory-type', jsonPath, dirPath),
  
  // Claude AI
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  callClaude: (params) => ipcRenderer.invoke('call-claude', params),
  
  // Pricing y stats
  getPricing: () => ipcRenderer.invoke('get-pricing'),
  savePricing: (pricing) => ipcRenderer.invoke('save-pricing', pricing),
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  
  // Estadísticas de capítulo
  calculateChapterStats: (folderPath) => ipcRenderer.invoke('calculate-chapter-stats', folderPath),

  // Último fichero abierto
  saveLastFile: (filePath) => ipcRenderer.invoke('save-last-file', filePath),

  // Eventos del main
  onProjectFolderOpened: (callback) => ipcRenderer.on('project-folder-opened', (_, path) => callback(path)),
  onProjectFileOpened: (callback) => ipcRenderer.on('project-file-opened', (_, path) => callback(path)),
  onRestoreSession: (callback) => ipcRenderer.on('restore-session', (_, data) => callback(data)),
  onSaveFile: (callback) => ipcRenderer.on('save-file', callback),
  onShowUsageStats: (callback) => ipcRenderer.on('show-usage-stats', callback),
  onShowFindReplace: (callback) => ipcRenderer.on('show-find-replace', callback),
  onExportEpub: (callback) => ipcRenderer.on('export-epub', callback),
  onNewProject: (callback) => ipcRenderer.on('new-project', callback),
  createNewProject: (params) => ipcRenderer.invoke('create-new-project', params)
});
