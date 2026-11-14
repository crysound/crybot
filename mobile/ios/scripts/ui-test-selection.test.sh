#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
script="$root/mobile/ios/scripts/ui-test-selection.sh"
run() { printf '%s\n' "$@" | "$script"; }
assert_eq() { [[ "$1" == "$2" ]] || { echo "expected [$2], got [$1]" >&2; exit 1; }; }
out=$(run mobile/ios/CryBot/Features/Inbox/View.swift); assert_eq "$(sed -n '1p' <<<"$out")" Inbox; assert_eq "$(sed -n '2p' <<<"$out")" ""
out=$(run mobile/ios/CryBotTests/Inbox/InboxSnapshotTests.swift); assert_eq "$(sed -n '1p' <<<"$out")" Inbox
out=$(run mobile/ios/CryBot/App/App.swift); assert_eq "$(sed -n '1p' <<<"$out")" all; assert_eq "$(sed -n '2p' <<<"$out")" ""
out=$(run mobile/ios/CryBotTests/Support/SnapshotCase.swift); assert_eq "$(sed -n '1p' <<<"$out")" all
out=$(run docs/readme.md); assert_eq "$(sed -n '1p' <<<"$out")" ""; assert_eq "$(sed -n '2p' <<<"$out")" ""
out=$(run mobile/ios/CryBot/Features/Inbox/View.swift mobile/ios/CryBotUITests/Inbox/InboxFlowTests.swift); assert_eq "$(sed -n '1p' <<<"$out")" Inbox
echo "ui-test-selection: ok"
