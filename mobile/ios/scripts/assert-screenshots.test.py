#!/usr/bin/env python3
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('screenshots', SCRIPTS / 'assert-screenshots.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NAMES = [f'harness-basic-{size}-{mode}{suffix}' for size in ('se', '16', 'promax')
         for mode in ('light', 'dark') for suffix in ('', '-axl')]


class ScreenshotChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def png(self, name):
        path = self.root / name
        path.write_bytes(b'\x89PNG\r\n\x1a\n')
        return path

    def test_selection_requires_png(self):
        module.assert_screenshots(self.root, '')
        module.assert_screenshots(self.root, 'none')
        with self.assertRaisesRegex(ValueError, 'no PNG'):
            module.assert_screenshots(self.root, 'Inbox')
        self.png('inbox-list.png')
        module.assert_screenshots(self.root, 'Inbox')

    def test_all_requires_each_of_twelve_not_just_count(self):
        for name in NAMES:
            self.png(name + '.png')
        module.assert_screenshots(self.root, 'all')
        (self.root / (NAMES[0] + '.png')).unlink()
        self.png('unrelated.png')
        with self.assertRaisesRegex(ValueError, NAMES[0]):
            module.assert_screenshots(self.root, 'all')

    def test_manifest_maps_opaque_exported_names_to_real_files(self):
        attachments = []
        for index, name in enumerate(NAMES):
            file = self.png(f'opaque-{index}.png')
            attachments.append({'exportedFileName': file.name, 'suggestedHumanReadableName': name + '.png'})
        (self.root / 'manifest.json').write_text(json.dumps([{'testIdentifier': 'HarnessSnapshotTests', 'attachments': attachments}]))
        module.assert_screenshots(self.root, 'all')
        (self.root / 'opaque-0.png').unlink()
        with self.assertRaisesRegex(ValueError, NAMES[0]):
            module.assert_screenshots(self.root, 'all')

    def test_ui_attachment_cannot_hide_missing_selected_app_snapshots(self):
        executable = self.root / 'xcrun'
        executable.write_text(r'''#!/usr/bin/env bash
set -euo pipefail
if [[ "$5" == *CryBotUITests.xcresult ]]; then
  printf '\211PNG\r\n\032\n' > "$7/harness-launch.png"
fi
''')
        executable.chmod(0o755)
        app = self.root / 'CryBotTests.xcresult'
        ui = self.root / 'CryBotUITests.xcresult'
        app.mkdir()
        ui.mkdir()
        result = subprocess.run(['bash', str(SCRIPTS / 'export-screenshots.sh'), str(self.root / 'screenshots'),
                                 'Inbox', str(app), str(ui)],
                                env={**os.environ, 'PATH': f'{self.root}:{os.environ["PATH"]}'},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertTrue((self.root / 'screenshots/CryBotUITests/harness-launch.png').exists())
        self.assertIn('no PNG', result.stderr)

    def test_export_failure_still_attempts_remaining_results(self):
        executable = self.root / 'xcrun'
        executable.write_text('''#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$EXPORT_LOG"
exit 1
''')
        executable.chmod(0o755)
        first = self.root / 'failed.xcresult'
        second = self.root / 'passed.xcresult'
        first.mkdir()
        second.mkdir()
        log = self.root / 'calls.log'
        result = subprocess.run(['bash', str(SCRIPTS / 'export-screenshots.sh'), str(self.root / 'screenshots'),
                                 'all', str(first), str(second)],
                                env={**os.environ, 'PATH': f'{self.root}:{os.environ["PATH"]}', 'EXPORT_LOG': str(log)},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(log.read_text().splitlines()), 2)
        self.assertIn('no PNG', result.stderr)


if __name__ == '__main__':
    unittest.main()
