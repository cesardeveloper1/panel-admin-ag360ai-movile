#!/usr/bin/env bash
# Build Agiliza360 debug APK from WSL and copy to Windows Desktop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
BUILT_APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
DESKTOP_APK="/mnt/c/Users/Sebastian/Desktop/Agiliza360-debug.apk"

export ANDROID_HOME="/mnt/c/Users/Sebastian/Android/Sdk"

if [[ -x /usr/lib/jvm/java-21-openjdk/bin/java ]]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
elif [[ -d "/mnt/c/Program Files/Android/Android Studio/jbr" ]]; then
  JBR_LINK="/tmp/ag360-jbr"
  ln -sfn "/mnt/c/Program Files/Android/Android Studio/jbr" "$JBR_LINK"
  export JAVA_HOME="$JBR_LINK"
else
  echo "ERROR: JDK 21 no encontrado. Instala openjdk-21 en WSL o Android Studio en Windows." >&2
  exit 1
fi

cd "$ROOT"
echo ">> npm run assets:brand"
"/mnt/c/Program Files/nodejs/node.exe" scripts/generate-brand-assets.mjs 2>/dev/null || npm run assets:brand
echo ">> npm run build"
npm run build
echo ">> npx cap sync android"
npx cap sync android

cd "$ANDROID_DIR"
echo ">> ./gradlew assembleDebug (JAVA_HOME=$JAVA_HOME)"
./gradlew assembleDebug --no-daemon

cp -f "$BUILT_APK" "$DESKTOP_APK"
ls -lh "$DESKTOP_APK"
echo "OK: $DESKTOP_APK"
