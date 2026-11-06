#!/bin/sh
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Downloads and unpacks the matching foodai_orderingagent.xcframework into
# ios/Frameworks/ when absent or when the cached XCFramework version differs
# from the target iOS SDK version.

set -eu

DEFAULT_IOS_SDK_VERSION="0.7.0"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PACKAGE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ "${1:-}" != "" ]; then
  TARGET_VERSION="$1"
elif [ "${FOODAI_IOS_SDK_VERSION:-}" != "" ]; then
  TARGET_VERSION="$FOODAI_IOS_SDK_VERSION"
else
  TARGET_VERSION="$DEFAULT_IOS_SDK_VERSION"
fi

if [ -z "$TARGET_VERSION" ]; then
  echo "Error: Unable to determine target Food AI iOS SDK version." >&2
  exit 1
fi

FRAMEWORKS_DIR="${FOODAI_IOS_FRAMEWORKS_DIR:-$PACKAGE_ROOT/ios/Frameworks}"
XCFRAMEWORK_DIR="$FRAMEWORKS_DIR/foodai_orderingagent.xcframework"
VERSION_FILE="$FRAMEWORKS_DIR/.foodai_ios_sdk_version"
SLICE_PLIST="$XCFRAMEWORK_DIR/ios-arm64/foodai_orderingagent.framework/Info.plist"
ZIP_PATH="$FRAMEWORKS_DIR/foodai_orderingagent.xcframework.zip"
DOWNLOAD_URL="${FOODAI_IOS_XCFRAMEWORK_URL:-https://dl.google.com/food-ordering-ai-agent/v${TARGET_VERSION}/foodai_orderingagent_xcframework/foodai_orderingagent_xcframework.xcframework.zip}"

read_plist_version() {
  plist_path="$1"
  if [ ! -f "$plist_path" ]; then
    return 0
  fi
  if [ -x /usr/libexec/PlistBuddy ]; then
    /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$plist_path" 2>/dev/null || true
  elif command -v plutil >/dev/null 2>&1; then
    plutil -extract CFBundleShortVersionString raw -o - "$plist_path" 2>/dev/null || true
  fi
}

CACHED_VERSION=""
if [ -d "$XCFRAMEWORK_DIR" ] && [ -f "$SLICE_PLIST" ]; then
  PLIST_VERSION=$(read_plist_version "$SLICE_PLIST" | tr -d '[:space:]')
  if [ -n "$PLIST_VERSION" ]; then
    CACHED_VERSION="$PLIST_VERSION"
  fi
  if [ -f "$VERSION_FILE" ]; then
    MARKER_VERSION=$(tr -d '[:space:]' < "$VERSION_FILE")
    if [ -z "$CACHED_VERSION" ]; then
      CACHED_VERSION="$MARKER_VERSION"
    elif [ "$MARKER_VERSION" != "$CACHED_VERSION" ]; then
      # Marker and embedded slice Info.plist disagree; force a clean download.
      CACHED_VERSION=""
    fi
  fi
fi

if [ ! -d "$XCFRAMEWORK_DIR" ] || [ ! -f "$SLICE_PLIST" ] || [ "$CACHED_VERSION" != "$TARGET_VERSION" ]; then
  rm -rf "$XCFRAMEWORK_DIR" "$VERSION_FILE" "$ZIP_PATH"
  mkdir -p "$FRAMEWORKS_DIR"
  curl -fsSL "$DOWNLOAD_URL" -o "$ZIP_PATH"
  unzip -q -o "$ZIP_PATH" -d "$FRAMEWORKS_DIR"
  rm -f "$ZIP_PATH"
  if [ ! -d "$XCFRAMEWORK_DIR" ] || [ ! -f "$SLICE_PLIST" ]; then
    echo "Error: Archive from $DOWNLOAD_URL did not contain $SLICE_PLIST." >&2
    exit 1
  fi
  printf '%s\n' "$TARGET_VERSION" > "$VERSION_FILE"
elif [ ! -f "$VERSION_FILE" ]; then
  printf '%s\n' "$TARGET_VERSION" > "$VERSION_FILE"
fi
