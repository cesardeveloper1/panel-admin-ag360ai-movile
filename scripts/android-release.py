"""Release helpers. Never print signing material or credentials."""
import base64
import os
from pathlib import Path
import sys
import zipfile

REQUIRED = (
    'ANDROID_UPLOAD_KEYSTORE_BASE64', 'ANDROID_UPLOAD_STORE_PASSWORD',
    'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD',
    'GOOGLE_PLAY_WORKLOAD_IDENTITY_PROVIDER', 'GOOGLE_PLAY_SERVICE_ACCOUNT',
)
PUBLIC_URLS = (
    'https://ssgg-production.up.railway.app/api/v3',
    'https://tradingtracker-back-prod-production.up.railway.app',
    'https://www.agiliza360.ai/privacidad',
    'https://www.agiliza360.ai/eliminar-cuenta',
)
FORBIDDEN_URLS = ('ssgg-develop.up.railway.app', '10.0.2.2:5000')


def property_value(value):
    escaped = ''.join('\\' + c if c in '\\:=#! ' else '\\n' if c == '\n'
                      else '\\r' if c == '\r' else c for c in value)
    # java.util.Properties.load(InputStream) expects Latin-1 plus Unicode escapes.
    result = ''
    for char in escaped:
        if ord(char) < 128:
            result += char
        else:
            encoded = char.encode('utf-16-be')
            result += ''.join('\\u' + encoded[i:i + 2].hex() for i in range(0, len(encoded), 2))
    return result


def prepare(env, root):
    missing = [name for name in REQUIRED if not env.get(name)]
    if missing:
        raise ValueError('Missing configuration: ' + ', '.join(missing))
    try:
        keystore = base64.b64decode(env['ANDROID_UPLOAD_KEYSTORE_BASE64'], validate=True)
    except ValueError:
        raise ValueError('Invalid ANDROID_UPLOAD_KEYSTORE_BASE64') from None
    if not keystore:
        raise ValueError('Empty ANDROID_UPLOAD_KEYSTORE_BASE64')
    folder = root / 'android' / 'signing'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'upload.p12').write_bytes(keystore)
    values = {
        'storeFile': 'signing/upload.p12',
        'storePassword': env['ANDROID_UPLOAD_STORE_PASSWORD'],
        'keyAlias': env['ANDROID_UPLOAD_KEY_ALIAS'],
        'keyPassword': env['ANDROID_UPLOAD_KEY_PASSWORD'],
    }
    (folder / 'upload.properties').write_text(
        ''.join(f'{key}={property_value(value)}\n' for key, value in values.items()),
        encoding='ascii',
    )
    for name in ('upload.p12', 'upload.properties'):
        (folder / name).chmod(0o600)


def version(env):
    run = int(env['GITHUB_RUN_NUMBER'])
    attempt = int(env['GITHUB_RUN_ATTEMPT'])
    # Reruns get a fresh code; the initial manually uploaded bundle uses code 1.
    if run < 1 or not 1 <= attempt <= 99:
        raise ValueError('Invalid GitHub run number or attempt')
    code = 10000 + run * 100 + attempt
    if code > 2100000000:
        raise ValueError('Android versionCode limit exceeded')
    return code, f'1.0.{run}.{attempt}'


def verify(bundle):
    with zipfile.ZipFile(bundle) as archive:
        names = archive.namelist()
        if not any(name.startswith('META-INF/') and name.endswith(('.RSA', '.EC', '.DSA')) for name in names):
            raise ValueError('The AAB is not signed')
        assets = b'\n'.join(archive.read(name) for name in names
                            if name.startswith('base/assets/public/') and name.endswith('.js'))
    for url in PUBLIC_URLS:
        if url.encode() not in assets:
            raise ValueError('Production bundle is missing public URL: ' + url)
    for url in FORBIDDEN_URLS:
        if url.encode() in assets:
            raise ValueError('Production bundle contains a development endpoint')


if __name__ == '__main__':
    try:
        command = sys.argv[1]
        if command == 'prepare':
            prepare(os.environ, Path.cwd())
        elif command == 'version':
            code, name = version(os.environ)
            print(f'ANDROID_VERSION_CODE={code}\nANDROID_VERSION_NAME={name}')
        elif command == 'verify':
            verify(Path(sys.argv[2]))
            print('Signed bundle contains the production endpoints and legal URLs.')
        else:
            raise ValueError('Unknown release command')
    except (ValueError, KeyError, IndexError, OSError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
