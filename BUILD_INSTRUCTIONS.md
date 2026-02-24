# The Rising Writer - Build Instructions

## 📋 Requisitos Previos

1. **Node.js y npm** instalados
2. **Certificado de firma de código de Apple** (Developer ID Application)
3. **Xcode Command Line Tools** instalados

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
cd /Users/daniel/Documents/TheRisingWriter
npm install
```

Esto instalará:
- `electron` (v33.2.0)
- `electron-builder` (v25.1.8)
- `@anthropic-ai/sdk` (v0.20.0)
- `dotenv` (v16.4.0)

### 2. Configurar certificado de firma

Edita `build.sh` y actualiza el hash del certificado:

```bash
# Encuentra tu certificado:
security find-identity -v -p codesigning

# Copia el hash (40 caracteres) y actualiza esta línea en build.sh:
CERT_HASH="TU_HASH_AQUI"
```

### 3. Crear icono de aplicación

El icono debe estar en: `assets/icon.icns`

Para crear un `.icns` desde un PNG:
1. Crea un PNG de 1024x1024px
2. Usa una herramienta como [Image2Icon](https://img2icnsapp.com/) o:

```bash
# Usando iconutil (macOS)
mkdir icon.iconset
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
mv icon.icns assets/
```

**IMPORTANTE**: Si no tienes un icono aún, crea un placeholder temporal:
```bash
# Crear un icono placeholder simple
touch assets/icon.icns
```

## 🚀 Compilar Aplicación

### Opción 1: Script automático (RECOMENDADO)

```bash
cd /Users/daniel/Documents/TheRisingWriter

# Dar permisos de ejecución al script (solo la primera vez)
chmod +x build.sh

# Ejecutar compilación completa
./build.sh
```

Este script:
1. Limpia builds anteriores
2. Compila versión ARM64
3. Firma la versión ARM64
4. Crea DMG ARM64
5. Compila versión Intel (x64)
6. Firma la versión Intel
7. Crea DMG Intel
8. Verifica las firmas

### Opción 2: Compilación manual

**Solo ARM64:**
```bash
npm run build:arm64
```

**Solo Intel (x64):**
```bash
npm run build:x64
```

**Ambas arquitecturas:**
```bash
npm run build:all
```

## 📦 Archivos Generados

Después de la compilación encontrarás:

```
dist/
├── mac-arm64/
│   └── The Rising Writer.app
├── mac/
│   └── The Rising Writer.app
├── TheRisingWriter-1.0.0-arm64.dmg
└── TheRisingWriter-1.0.0-x64.dmg
```

## ✅ Verificar Firma

```bash
# Verificar firma ARM64
codesign -dv dist/mac-arm64/The\ Rising\ Writer.app

# Verificar firma Intel
codesign -dv dist/mac/The\ Rising\ Writer.app

# Verificar que puede ejecutarse
spctl -a -v dist/mac-arm64/The\ Rising\ Writer.app
```

## 🐛 Solución de Problemas

### Error: "No se puede firmar"
- Verifica que el hash del certificado sea correcto
- Asegúrate de que el certificado esté válido: `security find-identity -v`

### Error: "No se puede crear DMG"
- Verifica que las apps en `dist/mac-arm64/` y `dist/mac/` existan
- Asegúrate de tener permisos de escritura en la carpeta `dist/`

### Warnings durante la firma
- Los warnings son normales y el script continúa
- Si la verificación final muestra "Authority", la firma es válida

### Error: "electron-builder no encontrado"
```bash
npm install electron-builder --save-dev
```

## 📤 Publicar en GitHub Releases

1. Crea un nuevo release en GitHub
2. Sube los dos DMGs:
   - `TheRisingWriter-1.0.0-arm64.dmg` (Apple Silicon)
   - `TheRisingWriter-1.0.0-x64.dmg` (Intel)
3. Incluye las notas de versión

## 🔄 Actualizar Versión

Antes de crear un nuevo build:

1. Actualiza la versión en `package.json`:
```json
{
  "version": "1.0.1"
}
```

2. Actualiza la versión en `build.sh` (líneas de hdiutil create):
```bash
"dist/TheRisingWriter-1.0.1-arm64.dmg"
"dist/TheRisingWriter-1.0.1-x64.dmg"
```

## 📝 Notas

- **ARM64**: Para Macs con chip M1/M2/M3 (Apple Silicon)
- **x64**: Para Macs con procesador Intel
- El script desactiva `CSC_IDENTITY_AUTO_DISCOVERY` para evitar conflictos
- La firma manual con `codesign` es más confiable que la automática de electron-builder
- Los DMGs se crean con compresión UDZO (optimizado)

## 🆘 Ayuda

Para más información sobre electron-builder:
https://www.electron.build/

Para problemas de firma en macOS:
https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
