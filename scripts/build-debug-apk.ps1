# Build Agiliza360 debug APK and copy to Desktop.
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AndroidDir = Join-Path $ProjectRoot 'android'
$DesktopApk = Join-Path $env:USERPROFILE 'Desktop\Agiliza360-debug.apk'
$BuiltApk = Join-Path $AndroidDir 'app\build\outputs\apk\debug\app-debug.apk'

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\Sebastian\Android\Sdk'

# Completar cache de Gradle si la descarga quedo a medias (timeout 10s del wrapper).
$gradleDist = Join-Path $env:USERPROFILE '.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj'
$gradleZip = Join-Path $gradleDist 'gradle-8.14.3-all.zip'
if (-not (Test-Path $gradleZip)) {
  $wslZip = '\\wsl.localhost\Ubuntu\root\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3-all.zip'
  if (Test-Path $wslZip) {
    Write-Host ">> Copiando Gradle cache desde WSL"
    New-Item -ItemType Directory -Force -Path $gradleDist | Out-Null
    Copy-Item $wslZip $gradleZip -Force
    New-Item -ItemType File -Force -Path (Join-Path $gradleDist 'gradle-8.14.3-all.zip.ok') | Out-Null
  }
}

if (-not (Test-Path $env:JAVA_HOME)) {
  throw "JAVA_HOME no encontrado: $($env:JAVA_HOME). Instala Android Studio o JDK 21."
}
if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "ANDROID_HOME no encontrado: $($env:ANDROID_HOME)"
}

Push-Location $ProjectRoot
try {
  Write-Host '>> npm run assets:brand'
  npm run assets:brand

  Write-Host '>> npm run build'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build fallo con codigo $LASTEXITCODE" }

  Write-Host '>> npx cap sync android'
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "cap sync fallo con codigo $LASTEXITCODE" }

  Push-Location $AndroidDir
  try {
    Write-Host '>> gradlew assembleDebug'
    & .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "assembleDebug fallo con codigo $LASTEXITCODE" }
  } finally {
    Pop-Location
  }

  if (-not (Test-Path $BuiltApk)) {
    throw "APK no generada en $BuiltApk"
  }

  Copy-Item -Force $BuiltApk $DesktopApk
  $sizeMb = [math]::Round((Get-Item $DesktopApk).Length / 1MB, 2)
  Write-Host "OK: $DesktopApk ($sizeMb MB)"
} finally {
  Pop-Location
}
