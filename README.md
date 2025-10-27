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
- 📁 Gestión simple de proyectos con múltiples archivos
- 💰 Una alternativa gratuita a software de escritura de pago

---

## 🎯 Características

### 📂 Gestión de Proyectos
- **Explorador de archivos integrado** con árbol de carpetas expandible
- **Crear, renombrar y eliminar** archivos y carpetas
- **Mover archivos entre carpetas** con interfaz intuitiva
- Soporte para archivos de texto plano (`.txt`, `.md`, etc.)

### ✏️ Editor Potente
- **Interfaz minimalista** con fuente serif optimizada para lectura
- **Formato de texto básico**: negrita, cursiva, subrayado
- **Inserción de comillas especiales**: «», —, ""
- **Atajos de teclado** para flujo de trabajo rápido (`Cmd+S` para guardar)

### 🤖 Asistente de IA con Claude
Integración completa con la API de Claude de Anthropic para:

- **Corrección ortotipográfica** - Limpia errores sin cambiar tu estilo
- **Búsqueda de sinónimos** - Encuentra la palabra perfecta
- **Mejora de redacción** - Sugerencias para pulir tu prosa
- **Expansión de descripciones** - Desarrolla escenas y pasajes

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
git clone https://github.com/tu-usuario/the-rising-writer.git
cd the-rising-writer
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
2. **Crea o abre archivos**: Usa el botón 📄 para crear nuevos archivos o haz clic en archivos existentes
3. **Escribe**: El editor guardará automáticamente con `Cmd+S` (Mac) o `Ctrl+S` (Windows/Linux)

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

### Gestión de Archivos

- **Nuevo archivo**: Botón 📄 en la barra lateral
- **Nueva carpeta**: Botón ➕ en la barra lateral
- **Renombrar/Mover/Borrar**: Clic derecho en cualquier archivo o carpeta

---

## 🛠️ Stack Tecnológico

- **[Electron](https://www.electronjs.org/)** 33.2.0 - Framework multiplataforma
- **CommonJS** - Sistema de módulos para máxima compatibilidad
- **[@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)** - Integración oficial con Claude
- **Vanilla JavaScript** - Sin frameworks adicionales para mantener ligereza

### Arquitectura Modular

El proyecto está organizado en módulos pequeños y mantenibles:

```
renderer/
├── state.js       # Estado global compartido
├── fileSystem.js  # Gestión del árbol de archivos
├── editor.js      # Lógica del editor
├── modals.js      # Sistema de modales
├── newFile.js     # Creación de archivos
├── moveFile.js    # Mover archivos/carpetas
├── aiPanel.js     # Integración con IA
└── app.js         # Orquestador principal
```

---

## 🗺️ Roadmap

### ✅ Implementado
- [x] Sistema de archivos completo
- [x] Editor con formato básico
- [x] Integración Claude API
- [x] Tracking de costes
- [x] Crear y mover archivos

### 🔄 En Desarrollo
- [ ] Contador de palabras/caracteres
- [ ] Indicador de cambios no guardados
- [ ] Auto-guardado configurable
- [ ] Búsqueda en archivos (Ctrl+F)

### 🔮 Futuro
- [ ] Historial de conversaciones con IA
- [ ] Modo claro y temas personalizables
- [ ] Sistema de plugins
- [ ] Sincronización en la nube (opcional)
- [ ] Estadísticas de escritura avanzadas
- [ ] Soporte para más formatos (PDF, DOCX)

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

- **Mantén módulos pequeños**: 200-250 líneas máximo por archivo
- **Usa CommonJS**: `require()` y `module.exports` (no ESM)
- **Comenta tu código**: Especialmente lógica compleja
- **Sigue el estilo existente**: Consistencia es clave

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

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/the-rising-writer/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/tu-usuario/the-rising-writer/discussions)

---

<div align="center">

**Hecho con ❤️ por escritores, para escritores**

*Con la asistencia de Claude AI en el desarrollo*

⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub

</div>
