# The Rising Writer ✍️

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-33.2.0-47848F?logo=electron)
![Claude AI](https://img.shields.io/badge/Claude_AI-Sonnet_4-6366f1)
![Status](https://img.shields.io/badge/status-active_development-success)

**Un editor de escritura creativa potenciado por IA, diseñado para escritores que necesitan una herramienta simple, poderosa y accesible.**

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Roadmap](#-roadmap) • [Contribuir](#-contribuir)

</div>

---

## 📖 ¿Qué es The Rising Writer?

**The Rising Writer** es un editor de escritura de novelas ligero y enfocado, que integra inteligencia artificial para asistirte en tu proceso creativo. A diferencia de las costosas herramientas comerciales, este proyecto es **100% gratuito y de código abierto**.

Diseñado pensando en escritores que necesitan:
- ✨ Un espacio limpio y sin distracciones para escribir
- 🤖 Asistencia de IA contextual para mejorar su prosa
- 📁 Gestión avanzada de proyectos con múltiples archivos y metadatos
- 🎭 Control de tramas, personajes y relaciones entre escenas
- 💰 Una alternativa gratuita a software de escritura de pago

---

## 🎯 Características

### 📂 Gestión de Proyectos
- **Explorador de archivos integrado** con árbol de carpetas expandible
- **Crear, renombrar y eliminar** archivos y carpetas
- **Mover archivos entre carpetas** con interfaz intuitiva
- **Sistema de marcado de directorios**: clasifica carpetas como Capítulos 📚, Personajes 👤, Tramas 🎭, Worldbuilding 🌍, Papelera 🗑️ u Otros 📂
- **project.json**: archivo de proyecto que centraliza toda la configuración, metadatos y estadísticas
- Soporte para archivos `.txt` y `.md`

### ✏️ Editor Potente
- **Sistema de pestañas** para tener múltiples archivos abiertos simultáneamente
- **Interfaz minimalista** con fuente serif optimizada para lectura
- **Formato de texto básico**: negrita, cursiva, subrayado
- **Inserción de caracteres especiales**: «», —, ""
- **Buscar y reemplazar** con opciones de mayúsculas/minúsculas y palabras completas
- **Atajos de teclado** para flujo de trabajo rápido (`Cmd+S` para guardar)
- **Contador de palabras** en tiempo real

### 🔲 Vista Split
- **Panel derecho** para consultar ficheros de referencia mientras escribes
- **Renderizado markdown** con secciones colapsables por `##` headings
- **Secciones colapsables por separadores** (`---`) en ficheros `.txt`
- **Panel de metadatos** en el split para capítulos, escenas y tramas

### 🎭 Sistema de Metadatos

#### Metadatos de Capítulo y Escena
Al hacer clic derecho → **Metadatos** sobre cualquier carpeta de capítulo o fichero de escena:
- **👤 Personajes** que participan en la escena/capítulo (selección múltiple con etiquetas)
- **🎭 Tramas** que se tocan en la escena/capítulo (selección múltiple con etiquetas)
- **↩ Escena anterior** y **↪ Escena siguiente** en la línea narrativa (selección única)
- **📊 Estadísticas de palabras** por escena (solo en capítulos)

#### 🔗 Relaciones de Escena *(nuevo)*
Sección colapsable en los metadatos de escena para modelar narrativas no lineales:
- **Relaciones anteriores**: múltiples escenas que convergen en esta (tramas paralelas, flashbacks, clímax)
- **Relaciones posteriores**: múltiples escenas en las que esta desemboca
- Cada relación almacena la ruta completa de la escena para futuros cruces de datos

#### 🎭 Metadatos de Trama *(nuevo)*
Al abrir cualquier fichero dentro de la carpeta de Tramas, el panel de metadatos se abre automáticamente con:
- **Estado**: Pendiente ⏳ / En curso 🔄 / Cerrada ✅
- **Personajes involucrados** en la trama (selección múltiple con etiquetas)
- **Escena de inicio** y **Escena de fin** (con ruta completa para análisis futuros)
- **Iconos de estado en el árbol de archivos**: cada fichero de trama muestra su estado de un vistazo

### 📤 Exportación
- **Exportar a Word (.docx)** cualquier carpeta de capítulo o carpeta marcada
- **Exportar a EPUB** con estructura de libro completa

### 🤖 Asistente de IA con Claude
Integración completa con la API de Claude de Anthropic para:

- **Corrección ortotipográfica** — Limpia errores sin cambiar tu estilo
- **Búsqueda de sinónimos** — Encuentra la palabra perfecta
- **Mejora de redacción** — Sugerencias para pulir tu prosa
- **Expansión de descripciones** — Desarrolla escenas y pasajes

**Panel flotante no intrusivo** que muestra sugerencias de la IA sin interrumpir tu flujo creativo.

### 📊 Control de Costes
- **Tracking automático** de uso de tokens y costes
- **Estadísticas detalladas** con totales acumulados
- **Precios personalizables** para adaptarse a tu plan de API
- **Log de transacciones** para auditoría completa

### 🎨 Diseño Cuidado
- **Tema oscuro elegante** que reduce fatiga visual
- **Sistema de modales reutilizables** para todas las acciones
- **Menús contextuales** para acceso rápido a funciones
- **Indicadores visuales** de estado y progreso

---

## 🚀 Instalación

### Requisitos Previos

- **Node.js** 18+ ([descargar aquí](https://nodejs.org/))
- **Una API key de Anthropic** ([obtenerla aquí](https://console.anthropic.com/))

### Pasos de Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/Respawn84/TheRisingWriter.git
cd TheRisingWriter
```

2. **Instala dependencias**
```bash
npm install
```

3. **Configura tu API key**

Crea un archivo `.env` en la raíz del proyecto:
```env
ANTHROPIC_API_KEY=tu_clave_api_aquí
```

4. **Ejecuta la aplicación**
```bash
npm start
```

Para desarrollo con recarga automática:
```bash
npm run dev
```

---

## 💡 Uso

### Primeros Pasos

1. **Abre tu proyecto**: Haz clic en el botón 📂 para seleccionar la carpeta de tu novela
2. **Marca tus directorios**: Clic derecho sobre una carpeta → *Marcar como...* para clasificarla (Capítulos, Personajes, Tramas…)
3. **Crea o abre archivos**: Usa el botón 📄 o el menú contextual
4. **Escribe**: Guarda con `Cmd+S` (Mac) o `Ctrl+S` (Windows/Linux)

### Gestión de Metadatos

**Metadatos de escena o capítulo:**
1. Clic derecho sobre un fichero de escena o carpeta de capítulo
2. Selecciona **Metadatos**
3. Añade personajes, tramas, escena anterior/siguiente y relaciones
4. Haz clic en **Guardar metadatos**

**Metadatos de trama:**
1. Abre cualquier fichero dentro de tu carpeta de Tramas — el panel aparece automáticamente
2. Selecciona el estado (Pendiente/En curso/Cerrada), personajes involucrados y escenas de inicio/fin
3. El icono en el árbol de archivos se actualiza al guardar

**Relaciones de escena** (narrativas no lineales):
1. Abre los metadatos de una escena
2. Despliega la sección **🔗 Relaciones de escena**
3. Añade múltiples escenas en *Relaciones anteriores* y *Relaciones posteriores*

### Usando el Asistente de IA

1. **Selecciona texto** en tu editor
2. **Haz clic derecho** para abrir el menú contextual
3. **Elige una acción de IA**:
   - 📝 Corregir ortotipografía
   - 🔍 Buscar sinónimos
   - ✨ Mejorar redacción
   - 📏 Expandir descripción
4. **Revisa la sugerencia** en el panel flotante
5. **Aplica o copia** la sugerencia a tu texto

### Vista Split

- **Abrir referencia**: Clic derecho sobre cualquier fichero → *Abrir en split derecho*
- **Ver metadatos**: Clic derecho → *Metadatos* (capítulos, escenas y tramas)
- **Cerrar**: Botón ✕ en el encabezado del panel

---

## 🛠️ Stack Tecnológico

- **[Electron](https://www.electronjs.org/)** 33.2.0 — Framework multiplataforma
- **CommonJS** — Sistema de módulos para máxima compatibilidad
- **[@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)** — Integración oficial con Claude
- **[marked](https://marked.js.org/)** — Renderizado de Markdown en el split
- **Vanilla JavaScript** — Sin frameworks adicionales para mantener ligereza

### Arquitectura Modular

```
renderer/
├── state.js           # Estado global compartido
├── projectManager.js  # Carga/guardado de project.json y marcado de directorios
├── fileSystem.js      # Árbol de archivos y navegación
├── tabs.js            # Sistema de pestañas
├── split.js           # Panel split y renderizado de ficheros de referencia
├── metadata.js        # Panel de metadatos de capítulo y escena
├── tramaMetadata.js   # Panel de metadatos de trama (estado, personajes, inicio/fin)
├── editor.js          # Lógica del editor principal
├── modals.js          # Sistema de modales
├── newFile.js         # Creación de archivos y capítulos
├── moveFile.js        # Mover archivos y carpetas
├── findReplace.js     # Buscar y reemplazar
├── exportDoc.js       # Exportación a Word (.docx)
├── exportEpub.js      # Exportación a EPUB
├── aiPanel.js         # Integración con Claude AI
└── app.js             # Orquestador principal
```

### Estructura del project.json

```json
{
  "version": "1.0",
  "proyecto": { "titulo", "autor", "saga", "rutaPortada", ... },
  "configuracion": {
    "directorios": {
      "capitulos": { "ruta": "...", "compilar": true },
      "personajes": { "ruta": "...", "compilar": false },
      "tramas":     { "ruta": "...", "compilar": false },
      "mundo":      { "ruta": "...", "compilar": false },
      "papelera":   { "ruta": "...", "compilar": false },
      "otros":      [{ "ruta": "...", "mostrar": true }]
    },
    "estadisticas": { "capitulos": { "[ruta]": { "escenas", "palabras", ... } } }
  },
  "metadatos": {
    "[ruta/escena.txt]": {
      "personajes": [],
      "tramas": [],
      "escenaAnterior": "",
      "escenaSiguiente": "",
      "relacionesAnteriores": [],
      "relacionesPosteriores": []
    }
  },
  "metadatosTramas": {
    "[ruta/trama.txt]": {
      "estado": "pendiente | en_curso | cerrada",
      "personajes": [],
      "escenaInicio": "",
      "escenaFin": ""
    }
  }
}
```

---

## 🗺️ Roadmap

### ✅ Implementado
- [x] Sistema de archivos completo (crear, renombrar, mover, borrar)
- [x] Editor con formato básico y caracteres especiales
- [x] Sistema de pestañas para múltiples archivos
- [x] Vista split con renderizado Markdown y secciones colapsables
- [x] Integración Claude API (corrección, sinónimos, mejora, expansión)
- [x] Tracking de costes de API
- [x] Exportación a Word (.docx) y EPUB
- [x] Sistema de proyecto con marcado de directorios y project.json
- [x] Panel de metadatos de capítulo y escena (personajes, tramas, escena anterior/siguiente)
- [x] Buscar y reemplazar
- [x] Estadísticas de palabras por capítulo
- [x] **Metadatos de trama** con estado, personajes y escenas de inicio/fin
- [x] **Iconos de estado de trama** en el árbol de archivos
- [x] **Relaciones de escena** (anteriores y posteriores, multi-selección)

### 🔮 Futuro
- [ ] Gráfico de tramas y escenas (visualización de relaciones)
- [ ] Selector de tramas en metadatos de escena vinculado a metadatosTramas
- [ ] Auto-guardado configurable
- [ ] Historial de conversaciones con IA
- [ ] Modo claro y temas personalizables
- [ ] Sistema de plugins
- [ ] Sincronización en la nube (opcional)

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Este proyecto está en desarrollo activo y hay muchas formas de ayudar:

### Cómo Contribuir

1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre un Pull Request**

### Reglas de Código

- **Mantén módulos pequeños**: 200-300 líneas máximo por archivo
- **Usa CommonJS**: `require()` y `module.exports` (no ESM)
- **Sigue el estilo existente**: Consistencia es clave
- **Sin comentarios obvios**: Solo documenta el *por qué*, no el *qué*

### Áreas que Necesitan Ayuda

- 📝 Mejora de prompts para Claude
- 🎨 Refinamiento de UI/UX
- 🐛 Reportar y corregir bugs
- 📚 Documentación y tutoriales
- 🌍 Traducciones (actualmente solo español)

---

## 🤖 Sobre la IA

Este proyecto utiliza **Claude Sonnet 4** de Anthropic, una de las IAs más avanzadas para procesamiento de lenguaje natural. La integración está diseñada para:

- **Respetar tu voz**: Las sugerencias mantienen tu estilo único
- **Ser contextual**: Entiende el contexto de tu escritura
- **Minimizar costes**: Usa solo los tokens necesarios
- **Ser transparente**: Tracking completo de uso y costes

> **Nota**: Necesitas tu propia API key de Anthropic. El servicio tiene coste, pero es muy accesible (centavos por capítulo típicamente).

---

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License** - consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- **[Anthropic](https://www.anthropic.com/)** por crear Claude, la IA que potencia las funciones inteligentes
- **La comunidad de Electron** por el excelente framework
- **Todos los escritores** que necesitan herramientas accesibles para crear

---

## 📧 Contacto

¿Preguntas, sugerencias o problemas?

- **Issues**: [GitHub Issues](https://github.com/Respawn84/TheRisingWriter/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/Respawn84/TheRisingWriter/discussions)

---

<div align="center">

**Hecho con ❤️ por escritores, para escritores**

*Con la asistencia de Claude AI en el desarrollo*

⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub

</div>
