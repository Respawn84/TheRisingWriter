# GUÍA COMPLETA: Certificados Desde Cero

## 🎯 OBJETIVO
Crear e instalar certificados de firma de código limpios para The Rising Writer.

---

## ✅ CHECKLIST COMPLETO

### FASE 1: LIMPIAR CERTIFICADOS ANTIGUOS

- [ ] Abrir "Acceso a Llaveros" (Keychain Access)
- [ ] Ir a "Inicio de sesión" → "Mis certificados"
- [ ] Eliminar todos los "Developer ID Application: TECNAX..."
- [ ] Eliminar las claves privadas asociadas
- [ ] Verificar: `security find-identity -v -p codesigning`
- [ ] Debe mostrar: "0 valid identities found"

---

### FASE 2: CREAR CSR (Certificate Signing Request)

- [ ] Abrir "Acceso a Llaveros"
- [ ] Menú: Keychain Access → Certificate Assistant → Request a Certificate...
- [ ] Rellenar:
  - Email: tu_email@example.com
  - Common Name: TECNAX TECNOLOGIAS SL
  - CA Email: (dejar vacío)
  - Request: "Saved to disk"
  - Key pair info: ✓ Marcar
- [ ] Configurar:
  - Key Size: 2048 bits
  - Algorithm: RSA
- [ ] Guardar como: CertificateSigningRequest.certSigningRequest
- [ ] Ubicación: Escritorio o Documentos

---

### FASE 3: CREAR CERTIFICADO EN APPLE DEVELOPER

- [ ] Ir a: https://developer.apple.com/account/
- [ ] Login con cuenta de TECNAX TECNOLOGIAS SL
- [ ] Ir a: Certificates, Identifiers & Profiles
- [ ] Clic en "Certificates" → botón "+"
- [ ] Seleccionar: "Developer ID Application"
- [ ] Subir: CertificateSigningRequest.certSigningRequest
- [ ] Descargar: developerID_application.cer

---

### FASE 4: INSTALAR CERTIFICADO

- [ ] Doble clic en developerID_application.cer
- [ ] Seleccionar keychain: "login" (Inicio de sesión)
- [ ] Clic en "Add" (Agregar)
- [ ] Buscar el certificado en Keychain Access
- [ ] Doble clic en el certificado
- [ ] Pestaña "Access Control" (Control de acceso)
- [ ] Seleccionar: "Allow all applications to access this item"
- [ ] Guardar cambios

---

### FASE 5: VERIFICAR Y CONFIGURAR

- [ ] Ejecutar: `security find-identity -v -p codesigning`
- [ ] Copiar el hash (40 caracteres)
- [ ] Editar: `/Users/daniel/Documents/TheRisingWriter/build.sh`
- [ ] Línea 21: Pegar el hash en `CERT_HASH="AQUI"`
- [ ] Guardar build.sh

---

### FASE 6: COMPILAR

- [ ] Ejecutar: `cd /Users/daniel/Documents/TheRisingWriter`
- [ ] Ejecutar: `./build.sh`
- [ ] Verificar que diga: "✓ Certificado encontrado"
- [ ] Verificar: "✓ Firma ARM64 exitosa"
- [ ] Verificar: "✓ Firma Intel exitosa"
- [ ] Verificar: "✅ Firmada con Developer ID"

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Problema: "0 valid identities found" después de instalar

**Causa**: El certificado no se instaló en el keychain correcto.

**Solución**:
1. Eliminar el certificado
2. Volver a hacer doble clic en developerID_application.cer
3. Asegurarse de seleccionar "login" (no "System")

---

### Problema: "unable to access keychain"

**Causa**: codesign no tiene permiso para usar el certificado.

**Solución**:
1. Doble clic en el certificado
2. Pestaña "Access Control"
3. "Allow all applications to access this item"

---

### Problema: "ERRSSEC_INTERNAL_ERROR" al firmar

**Causa**: La clave privada no está correctamente enlazada.

**Solución**:
1. Eliminar certificado Y clave privada
2. Volver a crear el CSR
3. Volver a descargar e instalar el certificado

---

### Problema: El portal de Apple no tiene "Developer ID Application"

**Causa**: Tu cuenta no tiene el Apple Developer Program activo.

**Solución**:
1. Verificar que tengas Apple Developer Program ($99/año)
2. No es suficiente con Apple Developer (gratis)
3. Contactar con el administrador de TECNAX TECNOLOGIAS SL

---

## 📞 RECURSOS

- Portal de desarrollador: https://developer.apple.com/account/
- Documentación: https://developer.apple.com/support/code-signing/
- Soporte: https://developer.apple.com/contact/

---

## ✨ RESULTADO ESPERADO

Al ejecutar `./build.sh`, deberías ver:

```
🔐 Verificando certificado...
✓ Certificado encontrado: D6478E21...

📦 Compilando versión ARM64...
✓ Firma ARM64 exitosa

🔍 Verificando firma ARM64...
Identifier=com.danielrespawn.therisingwriter
Authority=Developer ID Application: TECNAX TECNOLOGIAS SL (CGWKGZ4SV7)
TeamIdentifier=CGWKGZ4SV7

📦 Compilando versión Intel (x64)...
✓ Firma Intel exitosa

🔍 Verificando firma Intel...
Identifier=com.danielrespawn.therisingwriter
Authority=Developer ID Application: TECNAX TECNOLOGIAS SL (CGWKGZ4SV7)
TeamIdentifier=CGWKGZ4SV7

✅ Build completado - 2 versiones

[ARM64]
  ✅ Firmada con Developer ID
  📋 Identifier: com.danielrespawn.therisingwriter
  🏢 Team: CGWKGZ4SV7

[Intel]
  ✅ Firmada con Developer ID
  📋 Identifier: com.danielrespawn.therisingwriter
  🏢 Team: CGWKGZ4SV7

Listo para subir a GitHub Releases! 🚀
```

---

## 🎉 ¡ÉXITO!

Si ves el resultado anterior, tus aplicaciones están:
- ✅ Correctamente firmadas
- ✅ Listas para distribuir
- ✅ Verificables por Gatekeeper de macOS
- ✅ Listas para notarización (opcional)

---

**Última actualización**: 2024-12-29
**Proyecto**: The Rising Writer v1.0.0
