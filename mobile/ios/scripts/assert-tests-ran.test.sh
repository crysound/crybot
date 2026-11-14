#!/usr/bin/env bash
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/assert-tests-ran.sh"
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
cat > "$fixture/xcrun" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == 'xcresulttool get test-results summary --path fixture.xcresult' ]]
cat "$FAKE_SUMMARY"
MOCK
chmod +x "$fixture/xcrun"
export PATH="$fixture:$PATH" FAKE_SUMMARY="$fixture/summary.json"
check() {
  expected=$1
  json=$2
  shift 2
  printf '%s\n' "$json" > "$FAKE_SUMMARY"
  status=0
  bash "$script" fixture.xcresult "$@" > "$fixture/log" 2>&1 || status=$?
  if [[ "$status" != "$expected" ]]; then cat "$fixture/log"; exit 1; fi
}
check 0 '{"totalTestCount":0,"passedTests":0,"skippedTests":0}'
check 1 '{"totalTestCount":0,"passedTests":0,"skippedTests":0}' --required
check 1 '{"totalTestCount":12,"passedTests":0,"failedTests":0,"expectedFailures":0,"skippedTests":12}' --required
grep -q '0 tests executed; 12 tests skipped' "$fixture/log"
check 0 '{"totalTestCount":12,"passedTests":0,"skippedTests":12}'
check 0 '{"passedTests":3,"failedTests":2,"expectedFailures":1,"skippedTests":4}' --required
grep -q '6 tests executed; 4 tests skipped' "$fixture/log"
check 0 '{"expectedFailures":1}' --required
check 0 '{"failedTests":1}' --required
check 1 '{"totalTestCount":10}' --required
check 1 '{"passedTests":-1}' --required
check 1 'not json' --required
rm "$FAKE_SUMMARY"
if bash "$script" fixture.xcresult --required > "$fixture/log" 2>&1; then exit 1; fi
echo 'assert-tests-ran: ok (executed/skipped counts, required, malformed/missing summary)'
