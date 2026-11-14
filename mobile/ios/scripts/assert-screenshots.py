#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path


def screenshot_names(directory):
    pngs = {file.resolve() for file in directory.rglob('*') if file.is_file() and file.suffix.lower() == '.png'}
    print(f'{directory}: {len(pngs)} PNG screenshots')
    names = {file.stem for file in pngs}

    def visit(value, parent):
        if isinstance(value, list):
            for item in value:
                visit(item, parent)
        elif isinstance(value, dict):
            exported = value.get('exportedFileName')
            if isinstance(exported, str) and (parent / exported).resolve() in pngs:
                suggested = value.get('suggestedHumanReadableName')
                if isinstance(suggested, str):
                    names.add(suggested)
            for item in value.values():
                visit(item, parent)

    for manifest in directory.rglob('manifest.json'):
        visit(json.loads(manifest.read_text()), manifest.parent)
    return names


def assert_screenshots(directory, features, tests_directory=None):
    names = screenshot_names(directory)
    if not features or features == 'none':
        return
    if features != 'all':
        if tests_directory is None:
            tests_directory = Path(__file__).resolve().parent.parent / 'CryBotTests'
        classes = set()
        for source in tests_directory.rglob('*.swift'):
            classes.update(name.lower() for name in re.findall(
                r'\bclass\s+([A-Za-z0-9]+)SnapshotTests\b', source.read_text()))
        missing = []
        for feature in features.split(','):
            feature = feature.strip()
            if feature.lower() not in classes:
                print(f'Warning: no {feature}SnapshotTests class; skipping snapshot requirement', file=sys.stderr)
            elif not any(name.lower().startswith(feature.lower() + '-') for name in names):
                missing.append(feature)
        if missing:
            raise ValueError('Selected snapshot classes produced no PNG screenshots: ' + ', '.join(missing))
        return
    if not names:
        raise ValueError('Selected snapshots produced no PNG screenshots')
    found = set()
    for name in names:
        found.update(re.findall(r'(harness-basic-(?:se|16|promax)-(?:light|dark)(?:-axl)?)(?=$|[._ ])', name))
    expected = {f'harness-basic-{size}-{mode}{suffix}' for size in ('se', '16', 'promax')
                for mode in ('light', 'dark') for suffix in ('', '-axl')}
    missing = expected - found
    if missing:
        raise ValueError('Missing harness screenshots: ' + ', '.join(sorted(missing)))
    print('All 12 harness-basic screenshots are present')


def assert_launch_screenshots(directory, devices):
    missing = []
    for device in devices:
        destination = directory / f'CryBotUITests-{device}'
        if not any(name.startswith('harness-launch-') for name in screenshot_names(destination)):
            missing.append(str(destination))
    if missing:
        raise ValueError('Missing harness-launch screenshots: ' + ', '.join(missing))
    print('All required devices have harness-launch screenshots')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    parser.add_argument('features')
    parser.add_argument('--tests-directory', type=Path)
    parser.add_argument('--require-launch', nargs='+', default=[])
    args = parser.parse_args()
    try:
        assert_screenshots(args.directory, args.features, args.tests_directory)
        if args.require_launch:
            assert_launch_screenshots(args.directory, args.require_launch)
    except (ValueError, OSError) as error:
        sys.exit(str(error))
