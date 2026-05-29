# The Rising Writer ✍️

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-33.2.0-47848F?logo=electron)
![Claude AI](https://img.shields.io/badge/Claude_AI-Sonnet_4-6366f1)
![Status](https://img.shields.io/badge/status-active_development-success)

**El editor de escritura creativa que siempre quisiste tener — gratis, potente y con IA integrada.**

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Roadmap](#-roadmap) • [Contribuir](#-contribuir)

</div>

---

## 📖 ¿Qué es The Rising Writer?

**The Rising Writer** es un editor de novelas hecho con cariño para escritores que se toman en serio su obra. Combina un espacio de escritura limpio y sin distracciones con herramientas de organización de nivel profesional y la inteligencia de Claude AI — todo en una app de escritorio gratuita y de código abierto.

¿Cansado de pagar por software que tiene el 90% de funciones que no usas? ¿O de usar un bloc de notas sin ninguna? **This is the middle ground you've been looking for** 🎯

- ✨ Escribe sin ruido visual, con todo a mano cuando lo necesitas
- 🗺️ Visualiza el **mapa mental** de tus capítulos, escenas y personajes
- 📊 Controla la **temporalidad de tus tramas** en una sola vista
- 🤖 Pide ayuda a Claude cuando te quedes atascado
- 💸 100% gratuito. Sin suscripciones. Sin sorpresas.

---

## 🎯 Características

### 📂 Gestión de Proyectos

- **Explorador de archivos integrado** con árbol de carpetas expandible
- **Crear, renombrar, mover y eliminar** archivos y carpetas con total comodidad
- **Sistema de marcado de directorios**: clasifica tus carpetas como Capítulos 📚, Personajes 👤, Tramas 🎭, Worldbuilding 🌍, Papelera 🗑️ u Otros 📂
- **project.json**: un único archivo centraliza toda la configuración, metadatos y estadísticas del proyecto
- Soporte para archivos `.txt` y `.md`

### ✏️ Editor Potente y Limpio

- **Sistema de pestañas** para tener múltiples escenas abiertas al mismo tiempo
- **Interfaz minimalista** con fuente serif optimizada para lectura larga
- **Formato de texto** básico: negrita, cursiva, subrayado
- **Inserción de caracteres especiales**: «», —, ""
- **Buscar y reemplazar** con opciones de mayúsculas/minúsculas y palabras completas
- **Contador de palabras** en tiempo real
- Guarda con `Cmd+S` / `Ctrl+S` — como siempre

### 🔲 Vista Split

Abre cualquier fichero de referencia en el panel derecho mientras escribes en el izquierdo:

- **Renderizado Markdown** limpio con secciones colapsables por `##` headings
- **Secciones colapsables** en ficheros `.txt` (separadas por `---`)
- **Panel de metadatos** integrado en el split para capítulos, escenas y tramas

### 🗺️ Mapa Mental de Capítulos *(¡nuevo!)*

Pulsa el botón 🗺️ en el sidebar y contempla tu novela desde las alturas. El mapa mental genera automáticamente un **árbol visual interactivo** con todos tus capítulos, las escenas que contienen y los personajes que aparecen en cada una.

- **Pan y zoom** con el ratón para explorar proyectos grandes sin perder el norte
- **Panel redimensionable** que convive con el editor — no tienes que salir de tu flujo
- **Clic en cualquier nodo** para abrirlo al instante: capítulos en el panel de metadatos, escenas en el editor, personajes en el split
- Se construye a partir de tus metadatos reales: si lo tienes anotado, aparece

### 📊 Línea Temporal de Tramas *(¡nuevo!)*

¿Tres tramas en paralelo? ¿Flashbacks? ¿Saltos temporales? No hay problema. El botón 📊 despliega una **vista de temporalidad** que muestra tus tramas como segmentos verticales de colores con las escenas de cada una como chips, **en el orden exacto de lectura**.

El algoritmo es inteligente: lee las escenas capítulo a capítulo y va descubriendo las tramas según aparecen por primera vez — exactamente como las vive el lector. Cada trama nueva genera su columna a la altura en la que nace en la historia.

- Un color único por trama, fácil de distinguir de un vistazo
- La línea vertical conecta todas las escenas de cada trama
- Clic en un chip de escena para abrirla en el editor
- Clic en la cabecera de la trama para ver sus metadatos en el split
- Panel redimensionable con pan y zoom, igual que el mapa mental

### 🎭 Sistema de Metadatos

#### Metadatos de Capítulo y Escena

Clic derecho → **Metadatos** sobre cualquier carpeta de capítulo o escena:

- **👤 Personajes** que participan (selección múltiple con etiquetas)
- **🎭 Tramas** que se tocan en la escena (selección múltiple)
- **↩ Escena anterior** y **↪ Escena siguiente** en la línea narrativa
- **🔗 Relaciones de escena**: modela narrativas no lineales con múltiples escenas que convergen o divergen
- **📊 Estadísticas de palabras** por escena

#### 🎭 Metadatos de Trama

Al abrir cualquier fichero de trama el panel aparece automáticamente:

- **Estado**: Pendiente ⏳ / En curso 🔄 / Cerrada ✅
- **Personajes involucrados** en la trama
- **Escena de inicio** y **Escena de fin**
- El icono de estado se refleja en tiempo real en el árbol de archivos

### 📤 Exportación

- **Exportar a Word (.docx)** cualquier capítulo con un clic
- **Exportar a EPUB** con estructura de libro completa y metadatos del proyecto

### 🤖 Asistente de IA con Claude

Selecciona texto, clic derecho y elige tu acción:

- **📝 Corrección ortotipográfica** — Limpia sin tocar tu voz
- **🔍 Sinónimos** — Encuentra la palabra exacta
- **✨ Mejora de redacción** — Sugerencias para pulir la prosa
- **📏 Expansión** — Desarrolla una escena o descripción

El panel flotante de sugerencias no interrumpe tu escritura. Aplica, ignora o copia — tú decides.

### 💰 Control de Costes de API

- **Tracking automático** de tokens y costes en cada llamada
- **Estadísticas acumuladas** con log completo de transacciones
- **Precios personalizables** para adaptarte a tu plan de API

---

## 🚀 Instalación

### Requisitos

- **Node.js** 18+ ([descargar aquí](https://nodejs.org/))
- **Una API key de Anthropic** ([obtenerla aquí](https://console.anthropic.com/))

### Pasos

```bash
# 1. Clona el repositorio
git clone https://github.com/Respawn84/TheRisingWriter.git
cd TheRisingWriter

# 2. Instala dependencias
npm install

# 3. Configura tu API key
echo "ANTHROPIC_API_KEY=tu_clave_aquí" > .env

# 4. ¡Arranca!
npm start
```

Para desarrollo con recarga automática:
```bash
npm run dev
```

---

## 💡 Uso

### Primeros Pasos

1. **Abre tu proyecto** — Botón 📂 o menú *Archivo → Abrir carpeta*
2. **Marca tus directorios** — Clic derecho sobre una carpeta → *Marcar como...* (Capítulos, Personajes, Tramas…)
3. **Crea archivos** — Botón 📄 o menú contextual → *Nuevo archivo / Nuevo capítulo*
4. **Escribe** — Guarda con `Cmd+S` (Mac) o `Ctrl+S` (Windows/Linux)

### El Mapa Mental

1. Añade personajes a tus escenas desde el panel de metadatos
2. Pulsa 🗺️ en la cabecera del sidebar
3. Explora con rueda (zoom) y arrastre (mover)
4. Pulsa Escape o vuelve a pulsar 🗺️ para cerrar

### La Línea Temporal de Tramas

1. Asigna tramas a tus escenas desde el panel de metadatos
2. Pulsa 📊 en la cabecera del sidebar
3. Verás tus tramas como columnas verticales de colores, con las escenas en orden de lectura
4. Pulsa Escape o vuelve a pulsar 📊 para cerrar

### Usando el Asistente de IA

1. Selecciona el texto que quieres mejorar
2. Clic derecho en el editor → elige una acción de IA
3. Lee la sugerencia en el panel flotante
4. **Aplicar** para reemplazar el texto o **Copiar** para decidir después

---

## 🛠️ Stack Tecnológico

- **[Electron](https://www.electronjs.org/)** 33.2.0 — App de escritorio multiplataforma
- **[@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)** — Integración oficial con Claude
- **[marked](https://marked.js.org/)** — Renderizado de Markdown en el split
- **Vanilla JavaScript + SVG** — Sin frameworks, ligero y rápido

### Arquitectura Modular

```
renderer/
├── state.js            # Estado global compartido
├── app.js              # Orquestador principal
├── projectManager.js   # Carga/guardado de project.json y marcado de directorios
├── fileSystem.js       # Árbol de archivos y navegación
├── tabs.js             # Sistema de pestañas
├── editor.js           # Lógica del editor principal
├── split.js            # Panel split y renderizado de ficheros de referencia
├── metadata.js         # Panel de metadatos de capítulo y escena
├── tramaMetadata.js    # Panel de metadatos de trama (estado, personajes, inicio/fin)
├── mindMap.js          # 🗺️  Mapa mental: árbol Capítulos → Escenas → Personajes
├── tramaTimeline.js    # 📊  Línea temporal de tramas en orden de lectura
├── modals.js           # Sistema de modales
├── newFile.js          # Creación de archivos y capítulos
├── moveFile.js         # Mover archivos y carpetas
├── findReplace.js      # Buscar y reemplazar
├── exportDoc.js        # Exportación a Word (.docx)
├── exportEpub.js       # Exportación a EPUB
└── aiPanel.js          # Integración con Claude AI
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
      "mundo":      { "ruta": "...", "compilar": false }
    }
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
- [x] Integración Claude AI (corrección, sinónimos, mejora, expansión)
- [x] Tracking de costes de API
- [x] Exportación a Word (.docx) y EPUB
- [x] Sistema de proyecto con marcado de directorios y project.json
- [x] Panel de metadatos de capítulo y escena
- [x] Metadatos de trama con estado, personajes y escenas de inicio/fin
- [x] Relaciones de escena (anteriores y posteriores)
- [x] Iconos de estado de trama en el árbol de archivos
- [x] Buscar y reemplazar
- [x] Estadísticas de palabras por capítulo
- [x] **🗺️ Mapa mental** de capítulos, escenas y personajes (SVG interactivo con pan/zoom)
- [x] **📊 Línea temporal de tramas** en orden de lectura (segmentos verticales con pan/zoom)

### 🔮 En el horizonte

- [ ] Auto-guardado configurable
- [ ] Historial de conversaciones con IA por escena
- [ ] Modo claro y temas personalizables
- [ ] Sincronización de metadatos con el gráfico de tramas
- [ ] Sistema de plugins

---

## 🤝 Contribuir

¡Las contribuciones son muy bienvenidas! El proyecto está en desarrollo activo y siempre hay algo interesante por hacer.

### Cómo Contribuir

1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre un Pull Request**

### Convenciones de Código

- Módulos pequeños (200-300 líneas máximo)
- CommonJS: `require()` y `module.exports` (no ESM)
- Vanilla JS, sin frameworks adicionales
- Documenta el *por qué*, no el *qué*

### ¿Por Dónde Empezar?

- 📝 Mejora de prompts para Claude
- 🎨 Refinamiento de UI/UX
- 🐛 Reportar y corregir bugs
- 📚 Documentación y tutoriales

---

## 🤖 Sobre la IA

Este proyecto usa **Claude Sonnet 4** de Anthropic. La integración está diseñada para:

- **Respetar tu voz**: las sugerencias se adaptan a tu estilo
- **Ser contextual**: entiende qué tipo de texto estás escribiendo
- **Minimizar costes**: solo los tokens necesarios, nada más
- **Ser transparente**: tracking completo de uso y costes

> **Nota sobre costes**: Necesitas tu propia API key de Anthropic. Típicamente, usar la IA en un capítulo completo cuesta céntimos — muy lejos de las suscripciones de las herramientas comerciales.

---

## 📄 Licencia

**MIT License** — consulta [LICENSE](LICENSE) para más detalles. Haz con él lo que quieras.

---

## 🙏 Agradecimientos

- **[Anthropic](https://www.anthropic.com/)** por crear Claude
- **La comunidad de Electron** por el framework
- **Todos los escritores** que necesitan herramientas accesibles para crear historias que importan

---

<div align="center">

**Hecho con ❤️ por escritores, para escritores**

*Con la asistencia de Claude AI en el desarrollo*

⭐ Si este proyecto te resulta útil, una estrella en GitHub lo dice todo

</div>
