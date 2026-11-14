#!/usr/bin/env python3
import importlib.util
import contextlib
import io
import json
import os
import shutil
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
        self.scripts = self.root / 'mobile/ios/scripts'
        self.scripts.mkdir(parents=True)
        for name in ('export-screenshots.sh', 'assert-screenshots.py'):
            shutil.copy2(SCRIPTS / name, self.scripts / name)
        self.tests = self.root / 'mobile/ios/CryBotTests'
        self.tests.mkdir()

    def snapshot_class(self, feature):
        (self.tests / f'{feature}.swift').write_text(f'final class {feature}SnapshotTests: SnapshotCase {{}}')

    def png(self, name):
        path = self.root / name
        path.write_bytes(b'\x89PNG\r\n\x1a\n')
        return path

    def test_existing_snapshot_class_requires_its_own_png(self):
        self.snapshot_class('Inbox')
        self.snapshot_class('Chat')
        module.assert_screenshots(self.root, '')
        module.assert_screenshots(self.root, 'none')
        with self.assertRaisesRegex(ValueError, 'no PNG'):
            module.assert_screenshots(self.root, 'Inbox', self.tests)
        self.png('inbox-list.png')
        module.assert_screenshots(self.root, 'inbox', self.tests)
        with self.assertRaisesRegex(ValueError, 'no PNG screenshots: Chat'):
            module.assert_screenshots(self.root, 'Inbox,Chat', self.tests)

    def test_missing_snapshot_class_warns_without_requiring_png(self):
        (self.tests / 'Inbox.swift').write_text('final class InboxTests: XCTestCase {}')
        warning = io.StringIO()
        with contextlib.redirect_stderr(warning):
            module.assert_screenshots(self.root, 'Inbox', self.tests)
        self.assertIn('Warning: no InboxSnapshotTests class', warning.getvalue())

    def test_export_without_snapshot_class_warns_and_succeeds(self):
        result = self.root / 'CryBotTests.xcresult'
        result.mkdir()
        executable = self.root / 'xcrun'
        executable.write_text(r'''#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *'get test-results summary'* ]]; then
  printf '%s\n' '{"passedTests":1}'
else
  mkdir -p "$7"
fi
''')
        executable.chmod(0o755)
        result = subprocess.run(['bash', str(self.scripts / 'export-screenshots.sh'),
                                 str(self.root / 'screenshots'), 'Inbox', str(result)],
                                env={**os.environ, 'PATH': f'{self.root}:{os.environ["PATH"]}'},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Warning: no InboxSnapshotTests class', result.stderr)

    def test_export_without_xcresult_reports_test_not_run(self):
        result = subprocess.run(['bash', str(self.scripts / 'export-screenshots.sh'),
                                 str(self.root / 'screenshots'), 'Inbox'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('测试未运行（编译或启动失败），见上一步日志', result.stderr)
        self.assertNotIn('0 PNG', result.stderr)

    def test_export_with_no_executed_tests_reports_test_not_run(self):
        result_bundle = self.root / 'CryBotTests.xcresult'
        result_bundle.mkdir()
        executable = self.root / 'xcrun'
        executable.write_text(r'''#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' '{"passedTests":0,"failedTests":0,"expectedFailures":0,"skippedTests":1}'
''')
        executable.chmod(0o755)
        result = subprocess.run(['bash', str(self.scripts / 'export-screenshots.sh'),
                                 str(self.root / 'screenshots'), 'Inbox', str(result_bundle)],
                                env={**os.environ, 'PATH': f'{self.root}:{os.environ["PATH"]}'},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('测试未运行（编译或启动失败），见上一步日志', result.stderr)
        self.assertNotIn('0 PNG', result.stderr)

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
        self.snapshot_class('Inbox')
        executable = self.root / 'xcrun'
        executable.write_text(r'''#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *'get test-results summary'* ]]; then
  printf '%s\n' '{"passedTests":1}'
  exit 0
fi
if [[ "$5" == *CryBotUITests.xcresult ]]; then
  printf '\211PNG\r\n\032\n' > "$7/harness-launch.png"
fi
''')
        executable.chmod(0o755)
        app = self.root / 'CryBotTests.xcresult'
        ui = self.root / 'CryBotUITests.xcresult'
        app.mkdir()
        ui.mkdir()
        result = subprocess.run(['bash', str(self.scripts / 'export-screenshots.sh'), str(self.root / 'screenshots'),
                                 'Inbox', str(app), str(ui)],
                                env={**os.environ, 'PATH': f'{self.root}:{os.environ["PATH"]}'},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertTrue((self.root / 'screenshots/CryBotUITests/harness-launch.png').exists())
        self.assertIn('no PNG', result.stderr)

    def test_export_failure_still_attempts_remaining_results(self):
        executable = self.root / 'xcrun'
        executable.write_text('''#!/usr/bin/env bash
if [[ "$*" == *'get test-results summary'* ]]; then
  printf '%s\\n' '{"passedTests":1}'
  exit 0
fi
printf '%s\\n' "$*" >> "$EXPORT_LOG"
exit 1
''')
        executable.chmod(0o755)
        first = self.root / 'failed.xcresult'
        second = self.root / 'passed.xcresult'
        first.mkdir()
        second.mkdir()
        log = self.root / 'calls.log'
        result = subprocess.run(['bash', str(self.scripts / 'export-screenshots.sh'), str(self.root / 'screenshots'),
                                 'all', str(first), str(second)],
                                env={**os.environ, 'PATH': f'{self.root}:{os.environ["PATH"]}', 'EXPORT_LOG': str(log)},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(log.read_text().splitlines()), 2)
        self.assertIn('no PNG', result.stderr)

    def test_selected_feature_uses_manifest_names_only_for_existing_pngs(self):
        self.snapshot_class('Inbox')
        png = self.png('opaque.png')
        (self.root / 'manifest.json').write_text(json.dumps([{
            'exportedFileName': png.name, 'suggestedHumanReadableName': 'inbox-list-16-light.png'
        }]))
        module.assert_screenshots(self.root, 'Inbox', self.tests)
        png.unlink()
        with self.assertRaisesRegex(ValueError, 'no PNG'):
            module.assert_screenshots(self.root, 'Inbox', self.tests)

    def test_launch_requires_each_device_and_accepts_manifest_names(self):
        devices = ['iPhone16', 'iPhoneSE', 'iPhoneProMax']
        for device in devices:
            directory = self.root / f'CryBotUITests-{device}'
            directory.mkdir()
            self.png(f'CryBotUITests-{device}/opaque.png')
            (directory / 'manifest.json').write_text(json.dumps([{
                'exportedFileName': 'opaque.png',
                'suggestedHumanReadableName': f'harness-launch-{device}-light.png'
            }]))
        module.assert_launch_screenshots(self.root, devices)
        for device in devices:
            png = self.root / f'CryBotUITests-{device}/opaque.png'
            png.unlink()
            self.png(f'CryBotUITests-{device}/unrelated.png')
            with self.assertRaisesRegex(ValueError, f'Missing harness-launch.*CryBotUITests-{device}'):
                module.assert_launch_screenshots(self.root, devices)
            self.png(f'CryBotUITests-{device}/opaque.png')

    def test_launch_cli_fails_when_a_device_directory_is_absent(self):
        for device in ('iPhone16', 'iPhoneSE'):
            (self.root / f'CryBotUITests-{device}').mkdir()
            self.png(f'CryBotUITests-{device}/harness-launch-{device}-light.png')
        result = subprocess.run([sys.executable, str(self.scripts / 'assert-screenshots.py'), str(self.root),
                                 'none', '--require-launch', 'iPhone16', 'iPhoneSE', 'iPhoneProMax'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('Missing harness-launch screenshots:', result.stderr)
        self.assertIn('CryBotUITests-iPhoneProMax', result.stderr)


if __name__ == '__main__':
    unittest.main()
