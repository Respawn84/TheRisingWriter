#!/bin/bash

# Build script SIMPLE - Sin firma de Apple
# Porque el sistema de certificados de Apple es una mierda

echo "======================================"
echo "  The Rising Writer - Build"
echo "  Sin firma (fuck Apple's $99)"
echo "======================================"
echo ""

cd /Users/daniel/Documents/TheRisingWriter

# Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf dist
echo "✓ Limpieza completada"
echo ""

# ============= ARM64 =============
echo "📦 Compilando versión ARM64..."
export CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --mac --arm64 --dir
if [ $? -ne 0 ]; then
    echo "❌ Error en compilación ARM64"
    exit 1
fi

echo "💿 Creando DMG ARM64..."
hdiutil create -volname "The Rising Writer" \
  -srcfolder "dist/mac-arm64/The Rising Writer.app" \
  -ov -format UDZO \
  "dist/TheRisingWriter-1.0.0-arm64.dmg" >/dev/null 2>&1
echo "✓ DMG ARM64 creado"
echo ""

# ============= INTEL (x64) =============
echo "📦 Compilando versión Intel (x64)..."
npx electron-builder --mac --x64 --dir
if [ $? -ne 0 ]; then
    echo "❌ Error en compilación Intel"
    exit 1
fi

echo "💿 Creando DMG Intel..."
hdiutil create -volname "The Rising Writer" \
  -srcfolder "dist/mac/The Rising Writer.app" \
  -ov -format UDZO \
  "dist/TheRisingWriter-1.0.0-x64.dmg" >/dev/null 2>&1
echo "✓ DMG Intel creado"
echo ""

echo "======================================"
echo "  ✅ Build completado"
echo "======================================"
echo ""
echo "Archivos generados:"
ls -lh dist/*.dmg 2>/dev/null
echo ""
echo "Listos para subir a GitHub Releases"
echo ""
