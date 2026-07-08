# Configurar Ollama para The Rising Writer

Ollama te permite usar modelos de IA en local, **sin coste y sin conexión a internet**. The Rising Writer lo integra como alternativa a la API de Claude.

---

## ¿Qué necesitas?

- **macOS 12+** (Apple Silicon o Intel)
- **~3 GB de espacio libre** para el modelo recomendado (qwen2.5:3b)
- **~4 GB de RAM** disponibles (el modelo carga en memoria)

---

## 1. Instalar Ollama

Descarga el instalador oficial desde [ollama.com/download](https://ollama.com/download) y ejecuta el `.pkg`. También puedes instalarlo con Homebrew:

```bash
brew install ollama
```

Verifica la instalación:

```bash
ollama --version
```

---

## 2. Descargar un modelo

The Rising Writer funciona con modelos de la familia **Qwen 2.5 Instruct**. Los más usados:

| Modelo | Tamaño | RAM mínima | Calidad | Velocidad |
|--------|--------|------------|---------|-----------|
| `qwen2.5:3b-instruct` | ~2 GB | 4 GB | Buena | ⚡ Rápido |
| `qwen2.5:7b-instruct` | ~5 GB | 8 GB | Mejor | Moderado |

**Recomendado para empezar** (modelo por defecto en la app):

```bash
ollama pull qwen2.5:3b-instruct
```

Si tu Mac tiene 16 GB o más de RAM y quieres mejor calidad:

```bash
ollama pull qwen2.5:7b-instruct
```

Comprueba los modelos instalados en cualquier momento:

```bash
ollama list
```

---

## 3. Arrancar Ollama

Ollama necesita estar corriendo antes de usar la IA en la app. Tienes dos opciones:

**Opción A — Inicio automático (recomendado):**
Al instalar Ollama, la app nativa se añade a tus apps de inicio de sesión. Puedes verla y controlarla desde el icono de la barra de menú.

**Opción B — Arrancar manualmente desde terminal:**

```bash
ollama serve
```

Déjalo corriendo en una ventana de terminal mientras usas The Rising Writer.

Puedes verificar que está activo abriendo en el navegador: `http://localhost:11434` — si responde, está listo.

---

## 4. Configurar en The Rising Writer

1. Abre la app y ve a **IA → Configuración**
2. Selecciona **Ollama (local, gratis)** en el selector de proveedor
3. Ajusta los campos:
   - **URL**: `http://localhost:11434` (no toques esto salvo que uses un servidor remoto)
   - **Modelo**: el nombre exacto que devuelve `ollama list`, por ejemplo `qwen2.5:3b-instruct`
   - **Temperatura**: `0.20` por defecto — funciona bien para corrección y revisión
4. La app comprueba automáticamente si Ollama está activo y muestra los modelos disponibles
5. Haz clic en **Guardar**

El indicador en la barra inferior mostrará `IA: Ollama (qwen2.5:3b-instruct)` cuando la conexión sea correcta.

---

## 5. Temperatura — qué significa

El slider de temperatura controla el grado de variación en las respuestas:

| Valor | Comportamiento |
|-------|---------------|
| `0.0 – 0.2` | Muy determinista. Ideal para corrección ortotipográfica |
| `0.3 – 0.5` | Equilibrado. Bueno para revisión y mejora de texto |
| `0.6 – 1.0` | Creativo y variable. Útil para expansión y sinónimos |

Para **corrección y revisión**, mantén la temperatura cerca de `0.2`.

---

## Solución de problemas

**«Ollama no detectado. Arráncalo con: ollama serve»**
Ollama no está corriendo. Abre Terminal y ejecuta `ollama serve`, o abre la app Ollama desde tu carpeta de Aplicaciones.

**«Ollama error 404»**
El modelo escrito en la configuración no existe o tiene un nombre incorrecto. Comprueba con `ollama list` que el nombre coincide exactamente con lo que tienes en la app.

**La respuesta tarda mucho**
El modelo está cargando por primera vez en RAM (puede tardar 10-20 segundos). Las llamadas siguientes serán más rápidas.

**Respuestas con asteriscos o formato raro (`**palabra**`)**
La app limpia automáticamente el markdown de las respuestas. Si ves esto, actualiza a la última versión.

---

## Usar Claude y Ollama a la vez

Puedes cambiar de proveedor en cualquier momento desde **IA → Configuración**. Usa Ollama para el día a día y cambia a Claude cuando necesites más calidad en una tarea concreta. Cada proveedor guarda su propia configuración de modelo.
