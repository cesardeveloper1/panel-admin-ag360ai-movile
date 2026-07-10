---
name: build-agiliza360-apk
description: Builds and refreshes the Agiliza360 mobile debug APK after code changes. Use when editing agiliza360-mobile, Capacitor/Android, Ionic UI, or when the user asks for APK, installable build, or desktop Agiliza360-debug.apk.
---

# Build Agiliza360 Debug APK

## When to run

After **any meaningful change** in `agiliza360-mobile` (UI, logic, assets, i18n, Capacitor config), rebuild the APK and copy it to the Desktop unless the user explicitly says not to.

## Output

| Artifact | Path |
|----------|------|
| Desktop (instalar en teléfono) | `C:\Users\Sebastian\Desktop\Agiliza360-debug.apk` |
| Gradle output | `android/app/build/outputs/apk/debug/app-debug.apk` |

## Build (preferred — WSL / agent)

```bash
bash scripts/build-debug-apk.sh
```

Pipeline: `npm run assets:brand` → `npm run build` → `npx cap sync android` → `./gradlew assembleDebug` → copy to Desktop.

Si cambia el logo en `src/assets/`, ejecutar `npm run assets:brand` (regenera iconos Android, splash y favicon).

## Build (Windows — usuario en CMD/PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-debug-apk.ps1
```

Requires **JDK 21** at `C:\Program Files\Android\Android Studio\jbr`.  
If `JAVA_HOME is not set`, the user must use the script above (no `gradlew.bat` directo sin JAVA_HOME).

## Environment

| Variable | WSL | Windows |
|----------|-----|---------|
| JAVA_HOME | `/usr/lib/jvm/java-21-openjdk` | `C:\Program Files\Android\Android Studio\jbr` |
| ANDROID_HOME / SDK | `/mnt/c/Users/Sebastian/Android/Sdk` | `C:\Users\Sebastian\Android\Sdk` |

`android/local.properties` must stay UTF-8:

```
sdk.dir=/mnt/c/Users/Sebastian/Android/Sdk
```

## Agent checklist

1. Run `bash scripts/build-debug-apk.sh` from repo root.
2. Confirm `BUILD SUCCESSFUL` and Desktop file updated (`ls -lh` ~5 MB).
3. Tell the user: **APK lista en el Escritorio** → `Agiliza360-debug.apk`.

## Failures

| Error | Fix |
|-------|-----|
| `invalid source release: 21` | Use JDK 21, not 17 |
| `JAVA_HOME is not set` (Windows) | Run `build-debug-apk.ps1`, not raw `gradlew.bat` |
| Gradle download timeout (Windows) | Script copies cache from WSL if available; or re-run from WSL |
| `npm run build` fails | Fix TS/CSS first; check UTF-16 files on `/mnt/c/` |

## Do not

- Assume `npm run build && cap sync` generates the APK — **Gradle assembleDebug is required**.
- Commit `Agiliza360-debug.apk` unless the user asks.
