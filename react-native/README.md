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

The `@google-cloud/foodai-ordering-react-native` plugin provides a unified TypeScript and React Native interface over the native **Google Cloud Food Ordering AI Agent** headless mobile SDKs (`v0.6.0`) for Android (`com.google.android.foodorderingaiagent:foodorderingaiagent`) and iOS (`foodai_orderingagent.xcframework`).

It handles low-latency bidirectional gRPC streaming, native acoustic echo cancellation (AEC), voice activity detection (VAD), real-time speech transcripts, agent audio playback, client execution delegates (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, and `authTokenRequest`), and structured cart state synchronization (`Order` / `UpdatedOrderState`) while letting your React Native application own 100% of the UI.

---

## Architecture Overview

Built for **React Native `>=0.76.0` (New Architecture / TurboModules + Codegen `EventEmitter`)** — including React Native `0.82+` / `0.83`, where the New Architecture is mandatory.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                   Merchant React Native Application                       │
│   Custom TSX Cart UI, FoodOrderingDelegate (POS Pricing/Checkout), Auth   │
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
│ (Lorry AAR: foodorderingaiagent 0.6)│ │ (Lorry XCFramework: v0.6.0)       │
└─────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 1. Installation

### Option A: Install from GitHub Release Tarball

```bash
npm install https://github.com/GoogleCloudPlatform/foodai-ordering-mobile-sdk/releases/download/v0.6.0/google-cloud-foodai-ordering-react-native-0.6.0.tgz
```

### Option B: Install from npm (when published)

```bash
npm install @google-cloud/foodai-ordering-react-native
```

---

## 2. Platform Configuration

### Android Setup

1. **JDK 17 Requirement**: Ensure `JAVA_HOME` points to **JDK 17** before running Gradle / `npm run android` (on macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`).

2. **Configure `android/build.gradle`**: In your host application's root `android/build.gradle`, ensure `minSdkVersion` is at least **`24`** and configure the `https://dl.google.com/food-ordering-ai-agent/` Ivy repository so Gradle can resolve `com.google.android.foodorderingaiagent:foodorderingaiagent:0.6.0@aar`:
   ```groovy
   buildscript {
     ext {
       minSdkVersion = 24
       compileSdkVersion = 36
       targetSdkVersion = 36
       foodAiAndroidSdkVersion = "0.6.0"
     }
   }

   allprojects {
     repositories {
       google()
       mavenCentral()
       ivy {
         url "https://dl.google.com/food-ordering-ai-agent/"
         patternLayout {
           artifact "v[revision]/[artifact].[ext]"
           artifact "[revision]/[artifact].[ext]"
         }
         metadataSources {
           artifact()
         }
       }
     }
   }
   ```

3. **Enable Core Library Desugaring in `android/app/build.gradle`**: `com.google.android.foodorderingaiagent:foodorderingaiagent:0.6.0` declares `coreLibraryDesugaringEnabled=true` in its AAR metadata (`:app:checkDebugAarMetadata`). Enable core library desugaring in your host app's `android/app/build.gradle`:
   ```groovy
   android {
     compileOptions {
       coreLibraryDesugaringEnabled true
     }
   }

   dependencies {
     coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
   }
   ```

4. **Dependencies & Permissions**: The `@google-cloud/foodai-ordering-react-native` plugin automatically resolves `com.google.android.foodorderingaiagent:foodorderingaiagent:${foodAiAndroidSdkVersion}@aar`, declares its required external Maven dependencies, and merges `android.permission.RECORD_AUDIO`, `android.permission.INTERNET`, and `android.permission.ACCESS_NETWORK_STATE`. Ensure your app's `MainActivity` subclasses `ReactActivity` (which subclasses `ComponentActivity`) so `foodOrderingClient.requestMicrophonePermission()` can present the runtime permission prompt.

   > **Future: gMaven**: Once `com.google.android.foodorderingaiagent:foodorderingaiagent` is published to Google's Maven repository (`google()`), the plugin will drop the `@aar` classifier, `ivy` repository, and explicit transitive Maven dependencies, and host apps can simply remove the `ivy` block from `android/build.gradle`.

### iOS Setup

1. **Minimum iOS Deployment Target**: Ensure your `ios/Podfile` targets `min_ios_version_supported` (**iOS `15.1`** or higher):
   ```ruby
   platform :ios, min_ios_version_supported
   ```

2. **Install CocoaPods**: Run `pod install` inside your `ios/` directory. The `FoodaiOrderingReactNative.podspec` `prepare_command` automatically downloads `foodai_orderingagent.xcframework` (`v0.6.0`) from `https://dl.google.com/food-ordering-ai-agent/` if it is not already present in `ios/Frameworks/`.
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Microphone Usage Description**: Add `NSMicrophoneUsageDescription` to your app's `ios/<YourApp>/Info.plist`:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Allow microphone access to place your order by voice.</string>
   ```

4. **Xcode 26+ Troubleshooting (`{fmt}` `consteval` Error)**: Newer Apple Clang in Xcode 26+ rejects `{fmt}`'s `consteval` format string constructors under C++20 (`Pods/fmt/include/fmt/format-inl.h: Call to consteval function 'fmt::basic_format_string...' is not a constant expression`). If you build with Xcode 26+, set `CLANG_CXX_LANGUAGE_STANDARD = 'c++17'` for the `fmt` pod target in your `ios/Podfile` `post_install` hook:
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

Whenever the Food AI agent requests an auth token or invokes a client execution callback (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`), the plugin invokes your async TypeScript delegate method and returns the response to the ordering stream. If an optional callback (`handleFinalizeOrder`, `handleOrderPrices`, `handleSubmitOrder`, or `handleOrderStatus`) is omitted, the SDK uses `sessionConfig.userInfo.paymentInfo` for `finalizeOrder` and `{ success: false }` for `orderPrices`, `submitOrder`, and `orderStatus`.

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
        // Calculate tax, discounts, fees, and total price via your POS / cart backend
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
        // Prepare checkout / verify payment readiness
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
        // Submit the order to your POS backend
        const res = await fetch('https://api.example.com/pos/submit-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        return { success: res.ok };
      },

      async handleOrderStatus(
        _request: OrderStatusRequest
      ): Promise<OrderStatusResponse> {
        return { success: true };
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
          case 'speechRecognition':
            setTranscript(event.speechRecognition.transcript);
            break;
          case 'agentText':
            setAgentMessage(event.text);
            break;
          case 'sessionEnded':
            setSessionId(null);
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

    setupClient();

    return () => {
      foodOrderingClient.endSession(false);
    };
  }, []);

  const handleStartOrdering = async () => {
    const granted = await foodOrderingClient.requestMicrophonePermission();
    if (!granted) {
      return;
    }

    const activeSessionId = await foodOrderingClient.startSession({
      storeId: 'store-1234',
      daypartId: 'lunch',
      userInfo: {
        preferredName: 'Alex',
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
        Voice Ordering ({sessionId ? 'Active' : 'Idle'}) — Mic: {audioLevel.toFixed(2)}
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
| `handleFinalizeOrder?(request)` | `FinalizeOrderRequest` | `Promise<FinalizeOrderResponse>` | Called when the agent requests to finalize the order (`paymentFlowEnabled`, `paymentInfo?: PaymentInfo`). Defaults to `sessionConfig.userInfo.paymentInfo` if omitted. |
| `handleOrderPrices?(request)` | `OrderPricesRequest` (`{ order }`) | `Promise<OrderPricesResponse>` | Called when the agent requests subtotal, tax, discount, fees, and total price calculation (`{ success, orderPriceInfo }`). Defaults to `{ success: false }` if omitted. |
| `handleSubmitOrder?(request)` | `SubmitOrderRequest` (`{ paymentInfo?: SubmitOrderPaymentInfo, loyaltyInfo, tip }`) | `Promise<SubmitOrderResponse>` | Called when the agent requests to submit the order to the POS (`{ success }`), where `SubmitOrderPaymentInfo` is the only payment model that carries `creditCardCvv`. Defaults to `{ success: false }` if omitted. |
| `handleOrderStatus?(request)` | `OrderStatusRequest` | `Promise<OrderStatusResponse>` | Called when the agent requests order status (`{ success }`). Defaults to `{ success: false }` if omitted. |
| `handleAudioLevel?(audioLevel)` | `number` (`0.0..1.0`) | `void` | Called with normalized microphone audio levels during active recording. |
| `handleEvent?(event)` | `FoodOrderingServiceEvent` | `void` | Unified callback receiving all `OrderResponse` events (`sessionStarted`, `orderUpdate`, `speechRecognition`, `agentText`, `suggestedOptions`, `recommendedOrders`, `agentEvent`, `turnCompleted`, `interruptionSignal`, `sessionEnded`, `sessionLifecycle`, `error`). |

---

## 5. `FoodOrderingClient` Methods

| Method | Description |
| :--- | :--- |
| `initialize(config: FoodOrderingClientConfig)` | Configures the native SDK (`gcpProjectName`, `location`, `brand`, optional `logLevel` (`'DEBUG' \| 'INFO' \| 'WARNING' \| 'ERROR' \| 'NONE'`, default `'ERROR'`), and `delegate`). |
| `setDelegate(delegate: FoodOrderingDelegate)` | Registers the `FoodOrderingDelegate` implementation for all client execution callbacks, auth token requests, audio levels, and stream events. |
| `requestMicrophonePermission()` | Checks and requests OS microphone permission (`Promise<boolean>`). |
| `startSession(config: OrderingSessionConfig)` | Starts a voice ordering session and resolves with the active `sessionId` (`Promise<string>`). Emits `sessionStarted` (and `sessionLifecycle` with `state: 'STARTED'`) once connected. Rejects with `SESSION_ALREADY_STARTED` if a session is already active or starting, or `APP_IN_BACKGROUND` if the app is in the background. |
| `sendText(text: string)` | Sends a text utterance to the active ordering session (commands sent while connecting are queued and sent once connected). |
| `updateOrderState(order: Order)` | Pushes a client-side `Order` state update (e.g., from a touch UI cart edit) to the ordering agent. |
| `sendCustomizedInput(input)` | Sends a `CustomizedInput` (`{ parameters: Record<string, string> }` or flat key-value map) to the active ordering session. |
| `pauseMicrophone()` / `resumeMicrophone()` | Pauses or resumes microphone capture while keeping the ordering session open. |
| `endSession(waitUntilComplete?)` | Ends the ordering session and stops audio capture and playback. |
| `release()` | Stops any active session, releases native SDK resources, and removes all active event and delegate listeners. |
| `onSessionStarted` / `onOrderUpdate` / `onSessionEnded` / `onTurnCompleted` / `onError` / `onSpeechRecognition` / `onAgentText` / `onSuggestedOptions` / `onRecommendedOrders` / `onAgentEvent` / `onInterruptionSignal` / `onSessionLifecycle` / `onAudioLevel` | Individual typed `FoodOrderingSubscription` helpers (can be used alongside or instead of `delegate.handleEvent`). |
