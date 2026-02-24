# Icono de The Rising Writer

## 📋 Requisitos

El archivo debe ser: `icon.icns` (formato de icono de macOS)

## 🎨 Crear el Icono

### Opción 1: Usar Image2Icon (Recomendado)
1. Descarga [Image2Icon](https://img2icnsapp.com/)
2. Arrastra un PNG de 1024x1024px
3. Exporta como `icon.icns`
4. Guárdalo en esta carpeta (`assets/`)

### Opción 2: Usar iconutil (línea de comandos)

Ver instrucciones completas en `BUILD_INSTRUCTIONS.md`

## 🖼️ Diseño Sugerido

Para una aplicación de escritura, considera:
- Icono de una pluma estilizada
- Colores: negro/gris con detalles en azul o morado
- Fondo transparente o degradado sutil
- Estilo moderno, minimalista

## 📦 Herramientas Online

Si no tienes Photoshop/Illustrator:
- [Canva](https://www.canva.com/) - Crear el diseño
- [CloudConvert](https://cloudconvert.com/png-to-icns) - Convertir PNG a ICNS
- [IconGenerator](https://www.icongenerator.net/) - Crear todas las resoluciones

## ⚠️ Placeholder Temporal

Mientras no tengas un icono definitivo, electron-builder usará un icono genérico de Electron.

Para evitar errores durante el build, puedes crear un archivo vacío:
```bash
touch icon.icns
```

O usar el icono por defecto de Electron (no hacer nada).

## ✅ Verificar el Icono

Una vez creado:
```bash
# Ver información del icono
sips -g all icon.icns

# Ver preview
qlmanage -p icon.icns
```
