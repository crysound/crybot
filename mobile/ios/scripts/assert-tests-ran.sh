#!/usr/bin/env bash
set -euo pipefail
# Usage: assert-tests-ran.sh RESULT.xcresult [--required]
result=${1:?xcresult path required}
required=false
[[ "${2:-}" == "--required" || "${2:-}" == required ]] && required=true
summary=$(mktemp)
trap 'rm -f "$summary"' EXIT
xcrun xcresulttool get test-results summary --path "$result" >"$summary"
count=$(python3 - "$summary" <<'PY'
import json, sys
data=json.load(open(sys.argv[1]))
for key in ("totalTestCount", "executedTestCount", "testsCount"):
    value=data.get(key)
    if isinstance(value, (int, float)):
        print(int(value)); break
else:
    print(0)
PY
)
echo "${result}: ${count} tests executed"
if $required && (( count == 0 )); then echo "Selected tests did not execute" >&2; exit 1; fi
