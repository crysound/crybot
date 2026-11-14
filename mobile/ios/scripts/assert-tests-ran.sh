#!/usr/bin/env bash
set -euo pipefail
result=${1:?Usage: assert-tests-ran.sh RESULT.xcresult [--required]}
summary=$(mktemp)
trap 'rm -f "$summary"' EXIT
xcrun xcresulttool get test-results summary --path "$result" >"$summary"
python3 - "$summary" "$result" "${2:-}" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    data = json.load(source)
def count(key):
    value = data.get(key, 0)
    if type(value) is not int or value < 0:
        raise SystemExit('Invalid test count: ' + key)
    return value
executed = sum(count(key) for key in ('passedTests', 'failedTests', 'expectedFailures'))
skipped = count('skippedTests')
print(f'{sys.argv[2]}: {executed} tests executed; {skipped} tests skipped')
if sys.argv[3] in ('--required', 'required') and executed == 0:
    raise SystemExit('Selected tests did not execute')
PY
