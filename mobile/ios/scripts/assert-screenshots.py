#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


def assert_screenshots(directory, features):
    pngs = {file.resolve() for file in directory.rglob('*') if file.is_file() and file.suffix.lower() == '.png'}
    print(f'{directory}: {len(pngs)} PNG screenshots; selection={features!r}')
    if not features or features == 'none':
        return
    if not pngs:
        raise ValueError('Selected snapshots produced no PNG screenshots')
    if features != 'all':
        return
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
    found = set()
    for name in names:
        found.update(re.findall(r'(harness-basic-(?:se|16|promax)-(?:light|dark)(?:-axl)?)(?=$|[._ ])', name))
    expected = {f'harness-basic-{size}-{mode}{suffix}' for size in ('se', '16', 'promax')
                for mode in ('light', 'dark') for suffix in ('', '-axl')}
    missing = expected - found
    if missing:
        raise ValueError('Missing harness screenshots: ' + ', '.join(sorted(missing)))
    print('All 12 harness-basic screenshots are present')


if __name__ == '__main__':
    try:
        assert_screenshots(Path(sys.argv[1]), sys.argv[2])
    except (ValueError, OSError) as error:
        sys.exit(str(error))
