# Distribuir The Rising Writer vía Homebrew

## ¿Qué es Homebrew Cask?

Homebrew es el gestor de paquetes más popular para macOS. Los "casks" son aplicaciones GUI.

**Ventajas:**
- ✅ No requiere firma de Apple
- ✅ Instalación con un comando
- ✅ Actualizaciones automáticas
- ✅ Confianza de la comunidad Homebrew
- ✅ Completamente gratuito

---

## Pasos para Publicar en Homebrew

### 1. Crear el Cask

Archivo: `the-rising-writer.rb`

```ruby
cask "the-rising-writer" do
  version "1.0.0"
  sha256 "SHA256_DEL_DMG_ARM64"

  url "https://github.com/Respawn84/TheRisingWriter/releases/download/v#{version}/TheRisingWriter-#{version}-arm64.dmg"
  name "The Rising Writer"
  desc "Novel writing editor with AI assistance"
  homepage "https://github.com/Respawn84/TheRisingWriter"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "The Rising Writer.app"

  zap trash: [
    "~/Library/Application Support/the-rising-writer",
    "~/Library/Preferences/com.danielrespawn.therisingwriter.plist",
    "~/Library/Saved Application State/com.danielrespawn.therisingwriter.savedState",
  ]
end
```

### 2. Subir a Homebrew Cask

```bash
# Fork del repositorio homebrew-cask
gh repo fork homebrew/homebrew-cask

# Clonar tu fork
git clone https://github.com/TU_USUARIO/homebrew-cask.git
cd homebrew-cask

# Crear rama
git checkout -b the-rising-writer

# Añadir el cask
cp /path/to/the-rising-writer.rb Casks/t/the-rising-writer.rb

# Verificar
brew install --cask --dry-run the-rising-writer

# Commit y PR
git add Casks/t/the-rising-writer.rb
git commit -m "Add the-rising-writer 1.0.0"
git push origin the-rising-writer

# Crear Pull Request en GitHub
```

### 3. Instalación para Usuarios

Una vez aceptado el PR:

```bash
brew install --cask the-rising-writer
```

¡Así de simple! Sin advertencias de seguridad.

---

## Tap Personal (Alternativa Rápida)

Si no quieres esperar la aprobación de Homebrew oficial, crea tu propio tap:

```bash
# Crear repositorio: homebrew-the-rising-writer
# en tu cuenta de GitHub

# Estructura:
homebrew-the-rising-writer/
├── Casks/
│   └── the-rising-writer.rb
└── README.md

# Usuarios instalarán con:
brew tap respawn84/the-rising-writer
brew install --cask the-rising-writer
```

---

## Calcular SHA256 del DMG

```bash
shasum -a 256 dist/TheRisingWriter-1.0.0-arm64.dmg
```

Copia el hash resultante al archivo `.rb`

---

## Actualizar Versiones

```bash
# Para cada nueva versión:
1. Subir nuevo DMG a GitHub Releases
2. Calcular nuevo SHA256
3. Actualizar version y sha256 en el .rb
4. Crear PR en homebrew-cask

# O si es tu tap:
git add Casks/the-rising-writer.rb
git commit -m "Update to 1.0.1"
git push
```

---

## Ventajas de Homebrew

- ✅ Millones de usuarios de macOS lo usan
- ✅ No requiere certificado de Apple
- ✅ Actualizaciones con `brew upgrade`
- ✅ Desinstalación limpia con `brew uninstall`
- ✅ Los usuarios confían en Homebrew

---

## Documentación Oficial

- Homebrew Casks: https://docs.brew.sh/Cask-Cookbook
- Cómo contribuir: https://github.com/Homebrew/homebrew-cask/blob/master/CONTRIBUTING.md
- Verificar cask: https://docs.brew.sh/Acceptable-Casks
