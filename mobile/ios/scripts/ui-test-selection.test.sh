#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
mkdir -p "$fixture/mobile/ios/scripts" "$fixture/mobile/ios/CryBotUITests/Chat"
cp "$root/mobile/ios/scripts/ui-test-selection.sh" "$fixture/mobile/ios/scripts/"
script="$fixture/mobile/ios/scripts/ui-test-selection.sh"
assert_scope() {
  expected=$1
  shift
  "$script" "$@" > "$fixture/actual"
  printf '%s\n' "$expected" > "$fixture/expected"
  diff -u "$fixture/expected" "$fixture/actual"
}
assert_scope $'Inbox\n' mobile/ios/CryBot/Features/Inbox/View.swift
assert_scope $'Inbox\n' mobile/ios/CryBotTests/Inbox/InboxSnapshotTests.swift
assert_scope $'Inbox\n' mobile/ios/CryBotUITests/Inbox/InboxFlowTests.swift
assert_scope $'Chat\n-only-testing:CryBotUITests/ChatFlowTests' mobile/ios/CryBotUITests/Chat/ChatFlowTests.swift
assert_scope $'Chat,Inbox\n-only-testing:CryBotUITests/ChatFlowTests' mobile/ios/CryBot/Features/Inbox/View.swift mobile/ios/CryBot/Features/Chat/View.swift mobile/ios/CryBotTests/Chat/Tests.swift
for path in CryBot/App/App.swift CryBot/Store/Store.swift CryBot/Design/Theme.swift CryBot/Strings/ServerText.swift \
  CryBot/AppDelegate.swift CryBot/Assets.xcassets/Icon.imageset/Contents.json CryBot/en.lproj/Localizable.strings \
  CryBot/zh-Hant.lproj/InfoPlist.strings CryBot/ViewController.swift CryBot/WatchSync.swift Shared/WatchContract.swift \
  CryBotTests/Support/SnapshotCase.swift CryBotTests/Shell/Tests.swift CryBotUITests/Support/ScreenshotCase.swift \
  CryBotUITests/Shell/Tests.swift CryBotTests/Placeholder.swift CryBotUITests/Placeholder.swift \
  CryBotWatch/App.swift CryBotWatchTests/Test.swift Packages/CryKit/Package.swift project.yml Package.resolved \
  scripts/ui-test-selection.sh scripts/README.md scripts/nested/check.py; do
  assert_scope $'all\n' "mobile/ios/$path"
done
assert_scope $'all\n' mobile/ios/CryBot/Features/Inbox/View.swift mobile/ios/Shared/WatchContract.swift
assert_scope $'none\n' docs/readme.md
assert_scope $'all\n' .github/workflows/mobile.yml
assert_scope $'all\n' .github/workflows/ios-nightly.yml
for prefix in CryBot/Features CryBotTests CryBotUITests; do
  for name in 'Two Words' '收件箱' 'Café' 'Chat-Extra' 'Chat_Extra' 'Chat,Inbox'; do
    assert_scope $'all\n' "mobile/ios/$prefix/$name/View.swift"
  done
done
assert_scope $'Inbox\n' 'mobile/ios/CryBot/Features/Inbox/子目录/View with spaces.swift'
printf 'mobile/ios/CryBot/Features/Inbox/View.swift\n' | "$script" > "$fixture/actual"
printf 'Inbox\n\n' > "$fixture/expected"
diff -u "$fixture/expected" "$fixture/actual"
printf '' | "$script" > "$fixture/actual"
printf 'none\n\n' > "$fixture/expected"
diff -u "$fixture/expected" "$fixture/actual"
"$script" --help > "$fixture/help"
for text in Usage stdin 'two lines' 'only-testing' 'all' 'Examples'; do
  grep -q "$text" "$fixture/help"
done
echo 'ui-test-selection: ok (isolated paths, feature flow directory, shared files, pipeline paths, ASCII feature names, spaces, Unicode, none, stdin, help)'
