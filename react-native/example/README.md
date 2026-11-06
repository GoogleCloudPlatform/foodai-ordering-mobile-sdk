<!--
  Copyright 2026 Google LLC

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# Food AI Ordering React Native SDK — Sample App (`example/`)

Minimal single-screen React Native (`0.83`, New Architecture) sample application demonstrating how to integrate `@google-cloud/foodai-ordering-react-native` (`file:..`) `v0.7.0` on Android and iOS.

---

## 1. Fill In Your Configuration (`src/config.ts`)

Configuration values (Google Cloud project, location, brand, store ID, and OAuth2 token fetching) are intentionally omitted from source control.

1. Copy [`src/config.example.ts`](./src/config.example.ts) to `src/config.ts` (`src/config.ts` is gitignored):
   ```bash
   cp src/config.example.ts src/config.ts
   ```
2. Open `src/config.ts` and replace the `<YOUR_...>` placeholders in `DEMO_APP_CONFIG`:
   | Placeholder | Description |
   | :--- | :--- |
   | `<YOUR_GCP_PROJECT_ID>` | `clientConfig.gcpProjectName`: Your Google Cloud project ID/name associated with the Food Ordering AI Agent. |
   | `<YOUR_GCP_LOCATION>` | `clientConfig.location`: Your Food Ordering AI Agent location (e.g. `'global'` or `'us-central1'`). |
   | `<YOUR_BRAND_ID>` | `clientConfig.brand`: Your configured Food AI brand identifier. |
   | `<YOUR_STORE_ID>` | `sessionConfig.storeId`: Store identifier where the order is being placed. |
   | `<YOUR_AUTH_TOKEN_URL>` | `AUTH_TOKEN_URL`: Your merchant backend endpoint (`https://...`) that mints a short-lived OAuth2 access token. `fetchAuthToken()` GETs it and expects JSON `{ "token": "...", "expiry": "<ISO 8601, optional>" }`. *(On Android 9+, release builds block cleartext `http://` traffic by default unless explicitly permitted by `android:networkSecurityConfig`, so use `https://` in release.)* |

---

## 2. Install & Run

### First-Time Setup: Generate iOS Xcode Project (If Not Yet Committed)

The Android Gradle wrapper (`android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`, `android/gradle/wrapper/gradle-wrapper.properties` targeting Gradle `9.0.0`) and debug keystore/resources from the React Native `0.83.0` template are already included in `example/android/`.

If `ios/FoodAiOrderingExample.xcodeproj` has not been committed yet, generate a clean React Native `0.83.0` template project once, copy `FoodAiOrderingExample.xcodeproj` into `react-native/example/ios/`, and commit it to the repository (`*.xcodeproj` is tracked in git, while `*.xcworkspace`, `Pods/`, and `xcuserdata/` remain gitignored):

```bash
npx @react-native-community/cli@latest init FoodAiOrderingExample --version 0.83.0 --skip-install --directory /tmp/rn-gen
cp -R /tmp/rn-gen/ios/FoodAiOrderingExample.xcodeproj react-native/example/ios/
rm -rf /tmp/rn-gen
```

### Install Dependencies

From the `react-native/` directory, install, test, and build the plugin first, then install the sample app dependencies:

```bash
# 1. Build the local plugin in react-native/
cd ..
npm install
npm test
npm run build

# 2. Install the sample app dependencies in react-native/example/
cd example
npm install
```

### Run on Android

React Native `0.83`'s Android build requires **JDK 17** (newer JDKs such as JDK 25 fail Gradle/Kotlin compilation). On macOS, point `JAVA_HOME` at JDK 17 before building:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

The sample app's [`android/build.gradle`](./android/build.gradle) sets `minSdkVersion = 24` (`compileSdkVersion = 36`, `targetSdkVersion = 36`, `kotlinVersion = "2.1.20"`, `foodAiAndroidSdkVersion = "0.7.0"`) and configures the public `https://us-maven.pkg.dev/food-ai-prod-services/android-sdk` Maven repository (no authentication credentials required). Starting in `0.7.0`, `coreLibraryDesugaringEnabled` is no longer required in `android/app/build.gradle`:

```bash
npm run android
```

### Run on iOS

Run `cd ios && pod install` explicitly before running `npm run ios` (`automaticPodsInstallation` is omitted from `react-native.config.js` so CocoaPods errors are not hidden by `run-ios`). The sample app's [`ios/Podfile`](./ios/Podfile) targets `min_ios_version_supported` (iOS `15.1+`), links `FoodaiOrderingReactNative` from `../..`, and runs `../../scripts/fetch-ios-sdk.sh` in `pre_install` to ensure `foodai_orderingagent.xcframework` (`v0.7.0`) is downloaded from `https://dl.google.com/food-ordering-ai-agent/` and any stale cached version is replaced:

```bash
cd ios && pod install && cd ..
npm run ios
```

#### Troubleshooting Stale iOS XCFramework or Xcode Caches

If Xcode reports missing `0.7.0` types or enum cases after upgrading from an earlier SDK version, verify the cached XCFramework slice version and clean `Pods`, `build`, and `DerivedData`:

```bash
# Check cached XCFramework version (expected: "0.7.0"):
plutil -p ../ios/Frameworks/foodai_orderingagent.xcframework/ios-arm64/foodai_orderingagent.framework/Info.plist | grep CFBundleShortVersionString

# Re-fetch XCFramework and clean Pods + Xcode build caches:
rm -rf ../ios/Frameworks/foodai_orderingagent.xcframework ios/Pods ios/build ~/Library/Developer/Xcode/DerivedData/FoodAiOrderingExample-*
sh ../scripts/fetch-ios-sdk.sh
cd ios && pod install && cd ..
```

### Using This Sample Outside the Repo

If you copy `example/` out as a standalone project outside of this repository:

1. Replace `"@google-cloud/foodai-ordering-react-native": "file:.."` in `package.json` by installing the GitHub Release tarball:
   ```bash
   npm install https://github.com/GoogleCloudPlatform/foodai-ordering-mobile-sdk/releases/download/v0.7.0/google-cloud-foodai-ordering-react-native-0.7.0.tgz
   ```
2. Replace `metro.config.js` and `react-native.config.js` with the standard React Native defaults (or remove the `..` parent-directory overrides in `metro.config.js`, `react-native.config.js`, `tsconfig.json`, and `ios/Podfile`'s `pod 'FoodaiOrderingReactNative', :path => '../..'`), as those overrides only exist to resolve the local `"file:.."` parent link inside this repo.

---

## 3. What the Demo Screen Shows (`src/App.tsx`)

- **Client Configuration & Delegate Setup**: Calls `foodOrderingClient.configure(...)` with a `FoodOrderingDelegate` implementing:
  - `handleAuthTokenRequest`: Invokes `fetchAuthToken()` from `src/config.ts`.
  - `handleOrderPrices`: Computes a stub POS subtotal, tax, and total from `request.order.items`.
  - `handleFinalizeOrder`: Returns `{ paymentFlowEnabled: true, paymentInfo: { paymentMethod: 'PAYMENT_METHOD_CREDIT_CARD', creditCardLastFourDigits: '4242' } }` (general `PaymentInfo` never includes a CVV field).
  - `handleSubmitOrder`: Reads `request.paymentInfo` (`SubmitOrderPaymentInfo`, the only payment type carrying `creditCardCvv`) and `request.tip`, logs redacted payment metadata without echoing raw CVVs, and returns `{ success: true, estimatedReadyDuration: { seconds: 300 }, externalOrderId: 'DEMO-POS-1001' }`.
  - `handleOrderStatus`: Returns `{ success: true }`.
  - `handleLoyalty`: Handles `LoyaltyRequest` categories (`IDENTIFY_CUSTOMER`, `ADD_CODE`, `ADD_REWARD`, `REDEEM_POINTS`, `REMOVE_LOYALTY`) while redacting customer identifiers in UI logs, returning sample `LoyaltyMetadata` with customer tier/points and a redeemable `LoyaltyReward`.
  - `handleAudioLevel`: Updates the live microphone input level bar (`0–100%`).
- **Session Lifecycle, Feature Gate Toggles & Store Selection**:
  - Interactive toggles (when idle) for `storeSelectionEnabled`, `offersAndLoyaltyEnabled`, and attaching a sample `UserLocation` (`userInfo.location`).
  - Tracks mid-session `agentEvent` (`STORE_CHANGE`, `RESTART_ORDER`, `UNKNOWN`) and updates the active store header dynamically.
  - Displays `endSession.storeSchedule` operating hours on `STORE_CLOSED` and store-picker guidance on `REQUESTED_STORE_SELECTION`.
- **Conversation, Suggested Options & Suggested Offers**: Shows real-time speech transcripts, agent responses, text utterance input, and clickable rows/chips for `suggestedOffers` (`LoyaltyReward` and `Discount`), `suggestedItems`, `suggestedModifiers`, and `suggestedActions`.
- **Live Cart (`Order` / `UpdatedOrderState`)**: Renders current line items, nested modifiers, signed-in loyalty customer summary, and subtotal/discount/tax/tip/total pricing.
- **`__DEV__` Debug Simulation Panel**: In debug builds (`__DEV__`), provides one-tap buttons (`Store Change`, `Restart Order`, `Unknown AgentEvent`, `Store Picker End`, `Store Closed + Hours`, `Suggested Offers`, `Loyalty Callback`, and `Order + Tip`) feeding synthetic typed `0.7.0` payloads directly into the sample app's event and `handleLoyalty` delegate handlers without a live backend connection.
