#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'HELP'
Usage: ui-test-selection.sh [changed-file ...]
With no arguments, read repository-relative paths, one per line, from stdin.
Outputs exactly two lines:
  1. Comma-separated snapshot feature names, all, or empty for no selection.
  2. Space-separated -only-testing:CryBotUITests/<Feature>FlowTests arguments,
     only for features whose CryBotUITests/<Feature>/ directory exists.
CryBot/Features/<Feature>/ and feature test directories select that feature.
Shared app/test sources, resources, Packages and project/lock changes select all.
Support and Shell are shared, not features. Unrelated paths select nothing.
For all, line 2 is empty; callers must run -only-testing:CryBotUITests.
Examples:
  ui-test-selection.sh mobile/ios/CryBot/Features/Inbox/View.swift
  git diff --name-only BASE HEAD | ui-test-selection.sh
HELP
  exit 0
fi
if (($# == 0)); then
  while IFS= read -r path || [[ -n "$path" ]]; do
    [[ -z "$path" ]] || set -- "$@" "$path"
  done
fi
features=""
all=false
for path in "$@"; do
  path="${path#./}"
  case "$path" in
    mobile/ios/CryBot/Features/*/*|mobile/ios/CryBotTests/*/*|mobile/ios/CryBotUITests/*/*)
      name="${path#mobile/ios/}"
      name="${name#CryBot/Features/}"; name="${name#CryBotTests/}"; name="${name#CryBotUITests/}"
      name="${name%%/*}"
      if [[ "$name" == Support || "$name" == Shell ]]; then all=true
      else features+="$name"$'\n'; fi ;;
    mobile/ios/CryBot/*|mobile/ios/CryBotTests/*|mobile/ios/CryBotUITests/*|mobile/ios/Shared/*|mobile/ios/CryBotWatch/*|mobile/ios/CryBotWatchTests/*|mobile/ios/Packages/*|mobile/ios/project.yml|mobile/ios/Package.resolved)
      all=true ;;
  esac
done
flow_args=""
features_line=""
if $all; then
  features_line=all
else
  sorted=$(printf '%s' "$features" | awk 'NF && !seen[tolower($0)]++ {print $0}' | sort -f)
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    features_line+="${features_line:+,}$name"
    if [[ -d "$ROOT/mobile/ios/CryBotUITests/$name" ]]; then
      flow_args+="${flow_args:+ }-only-testing:CryBotUITests/${name}FlowTests"
    fi
  done <<< "$sorted"
fi
printf '%s\n' "$features_line" "$flow_args"
