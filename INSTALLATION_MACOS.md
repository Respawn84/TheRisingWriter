# Instalación en macOS

## ⚡ Instalación Rápida (30 segundos)

1. Descarga el DMG apropiado
2. Abre el DMG
3. Arrastra la app a Aplicaciones
4. **Clic derecho** en la app → **Abrir**
5. Confirma **"Abrir"**

✅ **¡Listo!** Solo la primera vez.

---

## ❓ ¿Por qué macOS me advierte?

**No está firmada por Apple.**

Apple cobra $99/año por certificados de firma. Este es un proyecto gratuito y de código abierto sin presupuesto.

**¿Es seguro?**
- ✅ Código fuente público en GitHub
- ✅ Sin telemetría ni conexiones sospechosas
- ✅ Puedes revisarlo tú mismo antes de instalar

---

## 🔧 Solución de Problemas

### "No se puede abrir porque Apple no puede comprobar..."

**Solución:**
Clic derecho → **"Abrir"** (NO doble clic)

---

### "Archivo dañado, debes moverlo a la papelera"

**Solución:**
```bash
xattr -cr /Applications/The\ Rising\ Writer.app
```

---

### Ya intenté abrirla y no funcionó

**Solución:**
1. Preferencias del Sistema → Seguridad y Privacidad
2. Busca el mensaje sobre "The Rising Writer"
3. Clic en "Abrir de todas formas"

---

## 💻 Método Alternativo: Compilar

Si desconfías (comprensible):

```bash
git clone https://github.com/Respawn84/TheRisingWriter.git
cd TheRisingWriter
npm install
npm start
```

Revisa el código, compílalo tú mismo. 100% transparente.

---

## 📞 ¿Más Ayuda?

GitHub Issues: https://github.com/Respawn84/TheRisingWriter/issues
