#!/usr/bin/env bash
# Android widget uygulamasını derler ve sitenin public klasörüne kopyalar.
# Gerekenler: JDK 17+, Gradle 8.13+, Android SDK (platforms;android-35, build-tools;35.0.0)
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
echo "sdk.dir=$SDK" > local.properties
gradle --no-daemon -q assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../public/two-of-us-widget.apk
echo "APK: public/two-of-us-widget.apk ($(du -h ../public/two-of-us-widget.apk | cut -f1))"
