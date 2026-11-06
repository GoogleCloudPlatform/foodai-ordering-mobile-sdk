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

# Google Cloud Food Ordering AI Agent — React Native SDK (`@google-cloud/foodai-ordering-react-native`)

The `@google-cloud/foodai-ordering-react-native` plugin provides a unified TypeScript and React Native interface over the native **Google Cloud Food Ordering AI Agent** headless mobile SDKs (`v0.7.0`) for Android (`com.google.android.foodorderingaiagent:foodorderingaiagent`) and iOS (`foodai_orderingagent.xcframework`).

It handles low-latency bidirectional gRPC streaming, native acoustic echo cancellation (AEC), voice activity detection (VAD), real-time speech transcripts, agent audio playback, client execution delegates (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, `loyalty`, and `authTokenRequest`), conversational store selection, promotional offers, and structured cart state synchronization (`Order` / `UpdatedOrderState`) while letting your React Native application own 100% of the UI.

---

## Architecture Overview

Built for **React Native `>=0.76.0` (New Architecture / TurboModules + Codegen `EventEmitter`)** — including React Native `0.82+` / `0.83`, where the New Architecture is mandatory.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                   Merchant React Native Application                       │
│   Custom TSX Cart UI, FoodOrderingDelegate (POS/Loyalty/Checkout), Auth   │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│              @google-cloud/foodai-ordering-react-native                   │
│      FoodOrderingClient (TurboModule Spec + Codegen EventEmitters)        │
└──────────────────┬─────────────────────────────────────┬──────────────────┘
                   │ Android                             │ iOS
                   ▼                                     ▼
┌─────────────────────────────────────┐ ┌───────────────────────────────────┐
│     FoodOrderingModule (Kotlin)     │ │ FoodOrderingModule (ObjC++/Swift) │
│    extends NativeFoodOrderingSpec   │ │  extends NativeFoodOrderingSpec   │
│  com.google.android.foodordering    │ │       foodai_orderingagent        │
│    aiagent.FoodOrderingClient       │ │     FoodOrderingClient.shared     │
│    (AAR: foodorderingaiagent 0.7.0) │ │     (XCFramework: v0.7.0)         │
└─────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 1. Installation

### Option A: Install from GitHub Release Tarball

```bash
npm install https://github.com/GoogleCloudPlatform/foodai-ordering-mobile-sdk/releases/download/v0.7.0/google-cloud-foodai-ordering-react-native-0.7.0.tgz
```

### Option B: Install from npm (when published)

```bash
npm install @google-cloud/foodai-ordering-react-native
```

---

## 2. Platform Configuration

### Android Setup

1. **JDK 17 Requirement**: Ensure `JAVA_HOME` points to **JDK 17** before running Gradle / `npm run android` (on macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`).

2. **Configure `android/build.gradle`**: In your host application's root `android/build.gradle`, ensure `minSdkVersion` is at least **`24`** and add the public Food AI Android SDK Maven repository (`https://us-maven.pkg.dev/food-ai-prod-services/android-sdk`) so Gradle can resolve `com.google.android.foodorderingaiagent:foodorderingaiagent:0.7.0` and its transitive dependencies (no authentication plugin or credentials required):
   ```groovy
   buildscript {
     ext {
       minSdkVersion = 24
       compileSdkVersion = 36
       targetSdkVersion = 36
       foodAiAndroidSdkVersion = "0.7.0"
     }
   }

   allprojects {
     repositories {
       google()
       mavenCentral()
       maven {
         url "https://us-maven.pkg.dev/food-ai-prod-services/android-sdk"
       }
     }
   }
   ```

3. **Dependencies & Permissions**: Starting in `0.7.0`, neither the native Android SDK AAR nor `@google-cloud/foodai-ordering-react-native` requires `coreLibraryDesugaringEnabled` on `minSdkVersion 24+`. The plugin automatically resolves `com.google.android.foodorderingaiagent:foodorderingaiagent:${foodAiAndroidSdkVersion}` along with all transitive Maven dependencies from its published POM, and merges `android.permission.RECORD_AUDIO`, `android.permission.INTERNET`, and `android.permission.ACCESS_NETWORK_STATE`. Ensure your app's `MainActivity` subclasses `ReactActivity` (which subclasses `ComponentActivity`) so `foodOrderingClient.requestMicrophonePermission()` can present the runtime permission prompt.

### iOS Setup

1. **Minimum iOS Deployment Target**: Ensure your `ios/Podfile` targets `min_ios_version_supported` (**iOS `15.1`** or higher):
   ```ruby
   platform :ios, min_ios_version_supported
   ```

2. **Install CocoaPods**: Run `pod install` inside your `ios/` directory. `FoodaiOrderingReactNative.podspec` (`s.prepare_command` -> `scripts/fetch-ios-sdk.sh`) automatically downloads `foodai_orderingagent.xcframework` (`v0.7.0`) from `https://dl.google.com/food-ordering-ai-agent/` when missing or when a cached framework's version differs from `0.7.0` (you can also invoke `npx foodai-fetch-ios-sdk` manually at any time).
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Microphone Usage Description**: Add `NSMicrophoneUsageDescription` to your app's `ios/<YourApp>/Info.plist`:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Allow microphone access to place your order by voice.</string>
   ```

4. **Upgrading / Stale XCFramework Troubleshooting**: If Xcode reports missing symbols or enum cases after upgrading `@google-cloud/foodai-ordering-react-native`, verify the cached `CFBundleShortVersionString` and clear stale CocoaPods and Xcode module caches:
   ```bash
   # 1. Inspect the cached XCFramework slice version (expected: "0.7.0"):
   plutil -p node_modules/@google-cloud/foodai-ordering-react-native/ios/Frameworks/foodai_orderingagent.xcframework/ios-arm64/foodai_orderingagent.framework/Info.plist | grep CFBundleShortVersionString

   # 2. Force a clean re-fetch and clear Pods + DerivedData caches:
   rm -rf node_modules/@google-cloud/foodai-ordering-react-native/ios/Frameworks/foodai_orderingagent.xcframework
   npx foodai-fetch-ios-sdk
   rm -rf ios/Pods ios/build ~/Library/Developer/Xcode/DerivedData/*
   cd ios && pod install && cd ..
   ```

5. **Xcode 26+ Troubleshooting (`{fmt}` `consteval` Error)**: Newer Apple Clang in Xcode 26+ rejects `{fmt}`'s `consteval` format string constructors under C++20 (`Pods/fmt/include/fmt/format-inl.h: Call to consteval function 'fmt::basic_format_string...' is not a constant expression`). If you build with Xcode 26+, set `CLANG_CXX_LANGUAGE_STANDARD = 'c++17'` for the `fmt` pod target in your `ios/Podfile` `post_install` hook:
   ```ruby
   post_install do |installer|
     react_native_post_install(
       installer,
       config[:reactNativePath],
       :mac_catalyst_enabled => false
     )

     installer.pods_project.targets.each do |target|
       if target.name == 'fmt'
         target.build_configurations.each do |build_config|
           build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
         end
       end
     end
   end
   ```

---

## 3. Implementing `FoodOrderingDelegate` & Quick Start Example (TSX)

The host application implements `FoodOrderingDelegate` and registers it via `foodOrderingClient.setDelegate(delegate)` (or passes `delegate` directly in `foodOrderingClient.initialize({ ..., delegate })`).

Whenever the Food Ordering AI Agent requests an auth token or invokes a client execution callback (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, or `loyalty`), the plugin invokes your async TypeScript delegate method and returns the response to the ordering stream. If an optional callback is omitted, the SDK uses `sessionConfig.userInfo.paymentInfo` for `finalizeOrder`, `{ success: false }` for `orderPrices`, `submitOrder`, and `orderStatus`, and the native SDK's unregistered-handler response for `handleLoyalty`.

```tsx
// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, View } from 'react-native';
import {
  foodOrderingClient,
  type FinalizeOrderRequest,
  type FinalizeOrderResponse,
  type FoodOrderingClientAuthToken,
  type FoodOrderingDelegate,
  type FoodOrderingServiceEvent,
  type LoyaltyRequest,
  type LoyaltyResponse,
  type Order,
  type OrderItem,
  type OrderPricesRequest,
  type OrderPricesResponse,
  type OrderStatusRequest,
  type OrderStatusResponse,
  type SubmitOrderRequest,
  type SubmitOrderResponse,
} from '@google-cloud/foodai-ordering-react-native';

export function VoiceOrderingScreen(): React.JSX.Element {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string>('store-1234');
  const [transcript, setTranscript] = useState<string>('');
  const [agentMessage, setAgentMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [order, setOrder] = useState<Order | undefined>(undefined);

  useEffect(() => {
    const delegate: FoodOrderingDelegate = {
      async handleAuthTokenRequest(): Promise<FoodOrderingClientAuthToken> {
        const response = await fetch('https://api.example.com/foodai/token');
        const data = await response.json();
        return {
          token: data.accessToken,
          expiry: data.expiresAtIso8601,
        };
      },

      async handleOrderPrices(
        request: OrderPricesRequest
      ): Promise<OrderPricesResponse> {
        const res = await fetch('https://api.example.com/pos/calculate-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: request.order }),
        });
        const priceData = await res.json();
        return {
          success: true,
          orderPriceInfo: priceData.orderPriceInfo,
        };
      },

      async handleFinalizeOrder(
        _request: FinalizeOrderRequest
      ): Promise<FinalizeOrderResponse> {
        return {
          paymentFlowEnabled: true,
          paymentInfo: {
            paymentMethod: 'PAYMENT_METHOD_CREDIT_CARD',
            creditCardLastFourDigits: '4242',
          },
        };
      },

      async handleSubmitOrder(
        request: SubmitOrderRequest
      ): Promise<SubmitOrderResponse> {
        const res = await fetch('https://api.example.com/pos/submit-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        const data = await res.json();
        return {
          success: res.ok,
          externalOrderId: data.externalOrderId,
          estimatedReadyDuration: { seconds: 300 },
        };
      },

      async handleOrderStatus(
        _request: OrderStatusRequest
      ): Promise<OrderStatusResponse> {
        return { success: true };
      },

      async handleLoyalty(request: LoyaltyRequest): Promise<LoyaltyResponse> {
        const res = await fetch('https://api.example.com/loyalty/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        // Return `{}` for guest sessions during customer identification, or populate
        // `loyaltyMetadata` / `clientExecutionStatus` based on your loyalty backend.
        return (await res.json()) as LoyaltyResponse;
      },

      handleAudioLevel(level: number): void {
        setAudioLevel(level);
      },

      handleEvent(event: FoodOrderingServiceEvent): void {
        switch (event.type) {
          case 'sessionStarted':
            setSessionId(event.sessionId);
            break;
          case 'orderUpdate':
            if (event.updatedOrderState.order) {
              setOrder(event.updatedOrderState.order);
            }
            break;
          case 'agentEvent':
            if (event.agentEvent.type === 'STORE_CHANGE') {
              setStoreId(event.agentEvent.store);
            }
            break;
          case 'speechRecognition':
            setTranscript(event.speechRecognition.transcript);
            break;
          case 'agentText':
            setAgentMessage(event.text);
            break;
          case 'sessionEnded':
            setSessionId(null);
            if (event.endSession.type === 'REQUESTED_STORE_SELECTION') {
              // Present native/RN store picker UI to let the customer select a store.
            }
            break;
          case 'error':
            console.error('FoodOrderingClient error:', event.code, event.message);
            break;
        }
      },
    };

    async function setupClient() {
      foodOrderingClient.setDelegate(delegate);
      await foodOrderingClient.initialize({
        gcpProjectName: 'my-foodai-gcp-project',
        location: 'global',
        brand: 'my-brand',
        logLevel: 'ERROR',
      });
    }

    void setupClient();

    return () => {
      void foodOrderingClient.endSession(false);
    };
  }, []);

  const handleStartOrdering = async () => {
    const granted = await foodOrderingClient.requestMicrophonePermission();
    if (!granted) {
      return;
    }

    const activeSessionId = await foodOrderingClient.startSession({
      storeId,
      daypartId: 'lunch',
      userInfo: {
        preferredName: 'Alex',
        location: {
          coordinates: { latitude: 37.422, longitude: -122.084 },
          captureTime: { seconds: Math.floor(Date.now() / 1000) },
        },
        savedDeliveryAddress: {
          address: {
            regionCode: 'US',
            postalCode: '94043',
            administrativeArea: 'CA',
            locality: 'Mountain View',
            addressLines: ['1600 Amphitheatre Pkwy'],
          },
        },
      },
      featureGate: {
        updatedOrderStateEnabled: true,
        revampedPaymentFlowEnabled: true,
        storeSelectionEnabled: true,
        offersAndLoyaltyEnabled: true,
      },
    });
    setSessionId(activeSessionId);
  };

  const handleStopOrdering = async () => {
    await foodOrderingClient.endSession(true);
    setSessionId(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>
        Voice Ordering ({sessionId ? 'Active' : 'Idle'}) — Store: {storeId} — Mic:{' '}
        {audioLevel.toFixed(2)}
      </Text>
      <View style={{ marginVertical: 12 }}>
        {!sessionId ? (
          <Button title="Start Voice Order" onPress={handleStartOrdering} />
        ) : (
          <Button title="End Session" onPress={handleStopOrdering} />
        )}
      </View>
      <Text>You said: {transcript}</Text>
      <Text>Agent: {agentMessage}</Text>
      <FlatList<OrderItem>
        data={order?.items ?? []}
        keyExtractor={(item, idx) => item.uid ?? `${item.itemId}-${idx}`}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8 }}>
            <Text>
              {item.quantity}x {item.displayName}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
```

---

## 4. `FoodOrderingDelegate` Reference

| Delegate Callback | Request / Input | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `handleAuthTokenRequest()` | *(none)* | `Promise<FoodOrderingClientAuthToken \| string>` | Called when the native client connects or reconnects to the ordering stream. |
| `handleFinalizeOrder?(request)` | `FinalizeOrderRequest` | `Promise<FinalizeOrderResponse>` | Called when the agent requests to finalize the order (`paymentFlowEnabled`, `paymentInfo`, `totalAmountDue`, `orderPriceInfo`). Defaults to `sessionConfig.userInfo.paymentInfo` if omitted. |
| `handleOrderPrices?(request)` | `OrderPricesRequest` (`{ order }`) | `Promise<OrderPricesResponse>` | Called when the agent requests subtotal, tax, discount, fees, tip, and total price calculation (`{ success, orderPriceInfo }`). Defaults to `{ success: false }` if omitted. |
| `handleSubmitOrder?(request)` | `SubmitOrderRequest` (`{ paymentInfo?: SubmitOrderPaymentInfo, loyaltyInfo, tip }`) | `Promise<SubmitOrderResponse>` | Called when the agent requests to submit the order to the POS (`{ success, estimatedReadyDuration, externalOrderId }`), where `SubmitOrderPaymentInfo` is the only payment model carrying `creditCardCvv`. Defaults to `{ success: false }` if omitted. |
| `handleOrderStatus?(request)` | `OrderStatusRequest` | `Promise<OrderStatusResponse>` | Called when the agent requests order status (`{ success }`). Defaults to `{ success: false }` if omitted. |
| `handleLoyalty?(request)` | `LoyaltyRequest` | `Promise<LoyaltyResponse>` | Called when the agent triggers customer identification, promo/loyalty code application, reward redemption, point redemption, or loyalty removal. Return `{}` for guest sessions during identification, or populate `clientExecutionStatus` for provider rejections. |
| `handleAudioLevel?(audioLevel)` | `number` (`0.0..1.0`) | `void` | Called with normalized microphone audio levels during active recording. |
| `handleEvent?(event)` | `FoodOrderingServiceEvent` | `void` | Unified callback receiving all `OrderResponse` events (`sessionStarted`, `orderUpdate`, `speechRecognition`, `agentText`, `suggestedOptions`, `recommendedOrders`, `agentEvent`, `turnCompleted`, `interruptionSignal`, `sessionEnded`, `sessionLifecycle`, `error`). |

---

## 5. `FoodOrderingClient` Methods

| Method | Description |
| :--- | :--- |
| `initialize(config: FoodOrderingClientConfig)` | Configures the native SDK (`gcpProjectName`, `location`, `brand`, optional `logLevel` (`'DEBUG' \| 'INFO' \| 'WARNING' \| 'ERROR' \| 'NONE'`, default `'ERROR'`), and `delegate`). |
| `setDelegate(delegate: FoodOrderingDelegate)` | Registers the `FoodOrderingDelegate` implementation for all client execution callbacks, auth token requests, audio levels, and stream events. |
| `requestMicrophonePermission()` | Checks and requests OS microphone permission (`Promise<boolean>`). |
| `startSession(config: OrderingSessionConfig)` | Starts a voice ordering session (`storeId`, `userInfo` including `location`, `initialOrder`, `featureGate` including `storeSelectionEnabled` & `offersAndLoyaltyEnabled`) and resolves with the active `sessionId` (`Promise<string>`). Preserves mid-session `STORE_CHANGE` stores automatically across background/foreground reconnects. |
| `sendText(text: string)` | Sends a text utterance to the active ordering session (commands sent while connecting are queued and sent once connected). |
| `updateOrderState(order: Order)` | Pushes a client-side `Order` state update (e.g., from a touch UI cart edit) to the ordering agent. |
| `sendCustomizedInput(input)` | Sends a `CustomizedInput` (`{ parameters: Record<string, string> }` or flat key-value map) to the active ordering session. |
| `pauseMicrophone()` / `resumeMicrophone()` | Pauses or resumes microphone capture while keeping the ordering session open. |
| `endSession(waitUntilComplete?)` | Ends the ordering session and stops audio capture and playback. |
| `release()` | Stops any active session, releases native SDK resources, and removes all active event and delegate listeners. |
| `onSessionStarted` / `onOrderUpdate` / `onSessionEnded` / `onTurnCompleted` / `onError` / `onSpeechRecognition` / `onAgentText` / `onSuggestedOptions` / `onRecommendedOrders` / `onAgentEvent` / `onInterruptionSignal` / `onSessionLifecycle` / `onAudioLevel` | Individual typed `FoodOrderingSubscription` helpers (can be used alongside or instead of `delegate.handleEvent`). |

---

## 6. Key `0.7.0` Models & Migration Notes

- **Discriminated `AgentEvent` Union**: `AgentEvent` is now `{ type: 'RESTART_ORDER'; confirmationStep: boolean } | { type: 'STORE_CHANGE'; store: string } | { type: 'UNKNOWN' }`. Switch on `event.agentEvent.type` instead of checking `event.agentEvent.restartOrder`.
- **Structured `Timestamp` & `Duration`**: Time fields (`UserLocation.captureTime`, `OrderFulfillment.createTime`, `OrderFulfillment.targetFulfillmentTime`, `LoyaltyReward.expireTime`, and `SubmitOrderResponse.estimatedReadyDuration`) use `{ seconds: number; nanos?: number }`.
- **Store Selection & Store Hours**: Enable `featureGate: { storeSelectionEnabled: true }` and optionally pass `userInfo.location` to support conversational store search (`STORE_CHANGE`), manual store picker handoff (`endSession.type === 'REQUESTED_STORE_SELECTION'`), and closed-store schedules (`endSession.storeSchedule` when `endSession.type === 'STORE_CLOSED'`).
- **Suggested Offers & Loyalty Rewards**: Enable `featureGate: { offersAndLoyaltyEnabled: true }` to receive `suggestedOptions.suggestedOffers.offers` (`SuggestedOffer` containing either `loyaltyReward?: LoyaltyReward` or `discount?: Discount`) and handle loyalty actions via `delegate.handleLoyalty`.
- **Delegate-Only Auth Token Provisioning**: `FoodOrderingClientConfig.authToken`/`authTokenExpiry`, `authTokenProvider`, `setAuthToken()`, and `setAuthTokenProvider()` have been removed. Supply all OAuth2 / Bearer tokens on demand through `FoodOrderingDelegate.handleAuthTokenRequest()` (registered via `configure({ ..., delegate })` or `setDelegate(delegate)` before `startSession()`).
- **Forward-Compatible `UNKNOWN` Enum Fallbacks**: Unrecognized future server enum values map to `'UNKNOWN'` across all SDK enum unions rather than failing deserialization.

See the repository [CHANGELOG.md](https://github.com/GoogleCloudPlatform/foodai-ordering-mobile-sdk/blob/main/CHANGELOG.md) for full release notes across iOS, Android, and React Native.
