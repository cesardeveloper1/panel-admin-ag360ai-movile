import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('release', Path(__file__).parents[1] / 'android-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def test_reruns_and_next_runs_have_increasing_codes(self):
        codes = [release.version({'GITHUB_RUN_NUMBER': run, 'GITHUB_RUN_ATTEMPT': attempt})[0]
                 for run, attempt in [('1', '1'), ('1', '2'), ('2', '1')]]
        self.assertEqual(sorted(set(codes)), codes)
        self.assertGreater(codes[0], 1)

    def test_version_limits(self):
        for run, attempt in [('0', '1'), ('1', '100'), ('21000000', '1')]:
            with self.assertRaises(ValueError):
                release.version({'GITHUB_RUN_NUMBER': run, 'GITHUB_RUN_ATTEMPT': attempt})

    def test_missing_configuration_does_not_write_signing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(ValueError, 'ANDROID_UPLOAD_KEYSTORE_BASE64'):
                release.prepare({}, root)
            self.assertFalse((root / 'android').exists())

    def test_properties_preserve_special_password_characters(self):
        self.assertEqual(release.property_value(' a:b=c\\d\ne'), '\\ a\\:b\\=c\\\\d\\ne')
        self.assertEqual(release.property_value('é🔑'), '\\u00e9\\ud83d\\udd11')

    def test_rejects_wrong_endpoints_or_unsigned_bundle(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / 'app.aab'
            for signed, extra, expected in [(True, '', None), (False, '', 'not signed'),
                                             (True, '10.0.2.2:5000', 'development endpoint')]:
                with zipfile.ZipFile(bundle, 'w') as archive:
                    if signed:
                        archive.writestr('META-INF/UPLOAD.RSA', b'test signature presence')
                    archive.writestr('base/assets/public/assets/index.js', ' '.join(release.PUBLIC_URLS) + extra)
                if expected:
                    with self.assertRaisesRegex(ValueError, expected):
                        release.verify(bundle)
                else:
                    release.verify(bundle)


if __name__ == '__main__':
    unittest.main()
