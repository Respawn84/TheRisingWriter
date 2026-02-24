#!/bin/bash

# Script de configuración inicial
# Ejecuta esto UNA VEZ después de clonar el repositorio

echo "======================================"
echo "  The Rising Writer - Setup Inicial"
echo "======================================"
echo ""

cd /Users/daniel/Documents/TheRisingWriter

echo "📦 Instalando dependencias..."
npm install
echo "✓ Dependencias instaladas"
echo ""

echo "🔧 Dando permisos de ejecución a build.sh..."
chmod +x build.sh
echo "✓ Permisos configurados"
echo ""

echo "======================================"
echo "  ✅ Setup completado"
echo "======================================"
echo ""
echo "Próximos pasos:"
echo "1. Configura tu archivo .env con ANTHROPIC_API_KEY"
echo "2. Revisa BUILD_INSTRUCTIONS.md para compilar"
echo "3. Ejecuta: npm start (para desarrollo)"
echo "4. Ejecuta: ./build.sh (para compilar DMGs)"
echo ""
