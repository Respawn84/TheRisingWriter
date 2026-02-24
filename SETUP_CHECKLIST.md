# Resumen de Cambios - Sistema de Compilación

## ✨ Archivos Creados

1. **build.sh** - Script principal de compilación (ARM64 + Intel)
2. **setup.sh** - Script de configuración inicial
3. **BUILD_INSTRUCTIONS.md** - Documentación completa de compilación
4. **assets/README.md** - Guía para crear el icono
5. **package.json** - Actualizado con electron-builder y configuración

## 📋 Checklist de Setup

### Paso 1: Dar permisos a los scripts ✅
```bash
cd /Users/daniel/Documents/TheRisingWriter
chmod +x setup.sh
chmod +x build.sh
```

### Paso 2: Ejecutar setup inicial ✅
```bash
./setup.sh
```

Esto instalará:
- electron-builder
- Todas las dependencias
- Configurará permisos

### Paso 3: Configurar certificado de firma 🔐
```bash
# 1. Obtener hash del certificado
security find-identity -v -p codesigning

# 2. Copiar el hash (40 caracteres hexadecimales)

# 3. Editar build.sh y actualizar esta línea:
CERT_HASH="TU_HASH_DE_40_CARACTERES"
```

**IMPORTANTE**: El hash que tienes en el script es del proyecto DOSBox:
```
D6478E21984B8434CB892AD937329CB8DB42F9FF
```

Si es el mismo certificado, déjalo así. Si no, actualízalo.

### Paso 4: Crear icono (Opcional) 🎨
```bash
# Si no tienes icono aún, puedes:
# 1. Crear uno más tarde
# 2. Usar el icono por defecto de Electron
# 3. Crear un placeholder:
touch assets/icon.icns
```

Ver `assets/README.md` para más detalles.

### Paso 5: Primera compilación 🚀
```bash
# Compilación completa (ARM64 + Intel)
./build.sh

# O por arquitectura individual:
npm run build:arm64  # Solo Apple Silicon
npm run build:x64    # Solo Intel
```

## 📦 Resultado Esperado

Después de compilar, en la carpeta `dist/` encontrarás:

```
dist/
├── mac-arm64/
│   └── The Rising Writer.app          (Firmada)
├── mac/
│   └── The Rising Writer.app          (Firmada)
├── TheRisingWriter-1.0.0-arm64.dmg   (Listo para distribución)
└── TheRisingWriter-1.0.0-x64.dmg     (Listo para distribución)
```

## 🔍 Verificación

```bash
# Verificar que las apps estén firmadas
codesign -dv "dist/mac-arm64/The Rising Writer.app"
codesign -dv "dist/mac/The Rising Writer.app"

# Verificar que puedan ejecutarse
open "dist/mac-arm64/The Rising Writer.app"
```

## ⚡ Comandos Rápidos

```bash
# Desarrollo
npm start          # Ejecutar en modo desarrollo

# Compilación
./build.sh         # Build completo (ARM64 + Intel firmados)
npm run build      # Alias de ./build.sh

# Limpieza
rm -rf dist/       # Eliminar builds anteriores
rm -rf node_modules/ && npm install  # Reinstalar dependencias
```

## 🆘 Solución de Problemas Comunes

### "Permission denied" al ejecutar build.sh
```bash
chmod +x build.sh
```

### "electron-builder: command not found"
```bash
npm install electron-builder --save-dev
```

### Error en firma: "No identity found"
- Verifica que tengas un certificado válido
- Actualiza el hash en `build.sh`
- Comprueba: `security find-identity -v -p codesigning`

### DMG no se crea
- Asegúrate de que las apps en `dist/mac-arm64/` y `dist/mac/` existen
- Verifica permisos de escritura en la carpeta `dist/`

### "Cannot find module '@anthropic-ai/sdk'"
```bash
npm install
```

## 📝 Notas Importantes

1. **Certificado**: Usa el mismo hash que en DOSBox Launcher si es el mismo certificado
2. **Icono**: Opcional para las primeras versiones
3. **Versión**: Actualiza en `package.json` antes de cada release
4. **GitHub**: Sube ambos DMGs (ARM64 y x64) en cada release

## 🎯 Próximos Pasos Sugeridos

1. Ejecutar `./setup.sh`
2. Hacer un build de prueba con `./build.sh`
3. Verificar que las apps firmadas funcionen
4. Crear un release en GitHub con los DMGs

## 📚 Documentación Adicional

- **BUILD_INSTRUCTIONS.md** - Guía detallada de compilación
- **assets/README.md** - Cómo crear el icono
- **package.json** - Configuración de electron-builder

---

**¿Listo para compilar?**
```bash
./setup.sh && ./build.sh
```
