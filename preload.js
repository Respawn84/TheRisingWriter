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
  
  // Claude AI
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  callClaude: (params) => ipcRenderer.invoke('call-claude', params),
  
  // Pricing y stats
  getPricing: () => ipcRenderer.invoke('get-pricing'),
  savePricing: (pricing) => ipcRenderer.invoke('save-pricing', pricing),
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  
  // Eventos del main
  onProjectFolderOpened: (callback) => ipcRenderer.on('project-folder-opened', (_, path) => callback(path)),
  onSaveFile: (callback) => ipcRenderer.on('save-file', callback),
  onShowUsageStats: (callback) => ipcRenderer.on('show-usage-stats', callback)
});
