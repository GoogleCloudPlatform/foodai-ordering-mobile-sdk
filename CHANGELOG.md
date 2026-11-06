# Changelog

All notable changes to the Google Cloud Food Ordering AI Agent Mobile SDKs — **iOS** (`foodai_orderingagent`), **Android** (`com.google.android.foodorderingaiagent:foodorderingaiagent`), and **React Native** (`@google-cloud/foodai-ordering-react-native`) — are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-11-06

### iOS

#### Breaking
- **`OrderResponse.AgentEvent` Enum**: Replaced the single-field `AgentEvent` struct with an enum (`case restartOrder(RestartOrder)`, `case storeChange(StoreChange)`, `case unknown`).
- **Structured `Timestamp` on `OrderFulfillment`**: Replaced raw ISO-8601 strings on `OrderFulfillment.createTime` and `OrderFulfillment.targetFulfillmentTime` with structured `Timestamp` values (`seconds`, `nanos`).

#### Added
- **User Device Location (`UserLocation`)**: Added `UserInfo.location` (`UserLocation` with `LatLng` coordinates and optional `captureTime`, redacting coordinates in string descriptions) for nearby store search and location-aware ordering.
- **Session Feature Gates (`FeatureGates`)**: Added `storeSelectionEnabled` and `offersAndLoyaltyEnabled` on `FeatureGates` (deprecating `triggerUpsellOnDemand` and `triggerOrderCustomizationSuggestionOnDemand`).
- **Conversational Store Selection & Store Hours**:
  - Added `OrderResponse.AgentEvent.storeChange` (`StoreChange`) when the customer switches stores mid-session; active store switches are automatically preserved across stream reconnections and foreground resumes, and `OrderingSessionConfig.storeID` accepts both short store IDs and full `projects/.../stores/...` resource paths.
  - Added `EndType.requestedStoreSelection` when the customer asks to browse or pick a store manually in the app UI.
  - Added `EndSession.storeSchedule` (and `OrderResponse.SessionEnded.storeSchedule`) to surface `StoreSchedule` operating hours when a session ends with `.storeClosed`.
- **Loyalty Client Execution & Expanded `LoyaltyReward` Cards**:
  - Added `FoodOrderingClientDelegate.handleLoyalty(request:)`, `LoyaltyRequest`, `LoyaltyResponse`, `LoyaltyActionCategory`, `ClientExecutionStatus`, and `ClientExecutionStatus.RejectionReason` (with PII redaction on loyalty identifiers and automatic status-500 fallback when unregistered).
  - Expanded `LoyaltyReward` with `redemptionCost`, `description`, `image`, `expireTime` (`Timestamp`), and `customIntegrationAttributes`.
- **Suggested Offers & Promotional Discounts**: Added `SuggestedOptions.suggestedOffers` (`SuggestedOffers`), `SuggestedOffer` (`.loyaltyReward`, `.discount`, `.unknown`), `Discount`, `DiscountType`, and `DiscountScope`.
- **Expanded Checkout, Pricing & Nutritional Metadata**: Added `OrderPriceInfo.tip`, `FinalizeOrderResponse.totalAmountDue` and `orderPriceInfo`, `SubmitOrderResponse.estimatedReadyDuration` (`Duration`) and `externalOrderId`, `SuggestedItem.description` and `nutritionalInfo` (`NutritionalInfo`), `SuggestedModifier.nutritionalInfo`, and multi-resolution `Image.sources` (`ImageSource`).
- **Forward-Compatible `.unknown` Enum Cases**: Added `.unknown` across all public Headless and WebView SDK enums (`EndType`, `DayOfWeek`, `PaymentMethod`, `OrderStateUpdateStatus`, `FulfillmentMethod`, `DeliveryAddressValidationStatus`, `FulfillmentState`, `OfferEngineState`, `LoyaltyActionCategory`, `ClientExecutionStatus.RejectionReason`, `DiscountType`, `DiscountScope`, `VoiceState`, `VoiceAgentStatus`, `OrderResponse.AgentEvent`, and `SuggestedOffer`) so unrecognized future server enum values decode cleanly.

#### Changed
- **Swift Package Manager Binary Target**: Updated `Package.swift` to `foodai_orderingagent` `v0.7.0`.
- **Automatic Mid-Session Stream Reconnection**: `FoodOrderingClient` automatically reconnects transient mid-session gRPC stream drops and recovers across network transitions (emitting `sessionPaused` and `sessionResumed`).
- **Swift 6 Concurrency & Objective-C Symbol Isolation**: Completed Swift 6 strict concurrency conformance across the SDK and isolated bundled Objective-C symbols to avoid host-app symbol collisions.

#### Fixed
- **Privacy Manifest Scope**: Removed unused Photos/Videos entries from the bundled `PrivacyInfo.xcprivacy` manifest in `foodai_orderingagent.xcframework`.
- **Resilient `Timestamp` Decoding & Attribute Preservation**: Updated `Timestamp` `Codable` decoding to default omitted or `null` `seconds` and `nanos` fields to `0` and accept numeric string representations, and preserved integer values in `AnyCodable` custom integration attributes.
- **Session Teardown Cancellation**: Cancelled in-flight client-execution and loyalty delegate tasks immediately when entering final audio-drain session teardown, and disabled unintended pinch-to-zoom in WebView `OrderingAgent`.

### Android

#### Breaking
- **`OrderResponse.AgentEvent` Sealed Interface**: Replaced the single-field `AgentEvent` class with a sealed interface (`AgentEvent.RestartOrder`, `AgentEvent.StoreChange`, `AgentEvent.Unknown`).
- **Structured `Timestamp` & Typed Enums**: Replaced raw ISO-8601 strings on `OrderFulfillment` with structured `Timestamp` values (`createTimestamp`, `targetFulfillmentTimestamp`), and converted string enum fields (`FulfillmentMethod`, `DeliveryAddressValidationStatus`, `FulfillmentState`, `OfferEngineState`) to typed Kotlin enums.

#### Added
- **User Device Location (`UserLocation`)**: Added `UserInfo.location` (`UserLocation` with `LatLng` coordinates and optional `captureTime`, redacting coordinates in `toString()`) for nearby store search and location-aware ordering.
- **Session Feature Gates (`FeatureGates`)**: Added `storeSelectionEnabled` and `offersAndLoyaltyEnabled` on `FeatureGates` (deprecating `triggerUpsellOnDemand` and `triggerOrderCustomizationSuggestionOnDemand`).
- **Conversational Store Selection & Store Hours**:
  - Added `AgentEvent.StoreChange` when the customer switches stores mid-session; active store switches are automatically preserved across stream reconnections and foreground resumes, and `OrderingSessionConfig.storeId` accepts both short store IDs and full `projects/.../stores/...` resource paths.
  - Added `EndType.REQUESTED_STORE_SELECTION` (and WebView `FoodEndType.REQUESTED_STORE_SELECTION`) when the customer asks to browse or pick a store manually in the app UI.
  - Added `OrderResponse.SessionEnd.storeSchedule` (`StoreSchedule`) to surface store operating hours when a session ends with `STORE_CLOSED`.
- **Loyalty Client Execution & Expanded `LoyaltyReward` Cards**:
  - Added `FoodOrderingClientLoyaltyHandler`, `LoyaltyRequest`, `LoyaltyResponse`, `LoyaltyActionCategory`, `ClientExecutionStatus`, and `ClientExecutionStatus.RejectionReason` (with PII redaction on loyalty identifiers and automatic status-500 fallback when unregistered).
  - Expanded `LoyaltyReward` with `redemptionCost`, `description`, `image`, `expireTime` (`Timestamp`), and `customIntegrationAttributes`.
- **Suggested Offers & Promotional Discounts**: Added `SuggestedOptions.suggestedOffers` (`SuggestedOffers`), `SuggestedOffer`, `Discount`, `DiscountType`, and `DiscountScope`.
- **Expanded Checkout, Pricing & Nutritional Metadata**: Added `OrderPriceInfo.tip`, `FinalizeOrderResponse.totalAmountDue` and `orderPriceInfo`, `SubmitOrderResponse.estimatedReadyDuration` (`Duration`) and `externalOrderId`, `SuggestedItem.description` and `nutritionalInfo` (`NutritionalInfo`), `SuggestedModifier.nutritionalInfo`, and multi-resolution `Image.sources` (`ImageSource`).
- **Forward-Compatible `UNKNOWN` Enum Entries**: Added `UNKNOWN` across all public Headless and WebView SDK enums (`EndType`, `FoodEndType`, `DayOfWeek`, `PaymentMethod`, `FoodPaymentMethod`, `OrderStateUpdateStatus`, `FulfillmentMethod`, `DeliveryAddressValidationStatus`, `FulfillmentState`, `OfferEngineState`, `LoyaltyActionCategory`, `ClientExecutionStatus.RejectionReason`, `DiscountType`, `DiscountScope`, `VoiceState`, `VoiceAgentStatus`, and `AgentEvent.Unknown`).

#### Changed
- **Public Maven Repository Distribution**: Published `com.google.android.foodorderingaiagent:foodorderingaiagent` to the public Maven repository `https://us-maven.pkg.dev/food-ai-prod-services/android-sdk` with pinned version resolution (`0.7.0`) and full Maven POM transitive dependency metadata (no authentication plugin or credentials required).
- **Removed Core Library Desugaring Requirement**: Disabled `coreLibraryDesugaringEnabled` in the AAR metadata so host Android apps targeting `minSdk 24+` no longer need `desugar_jdk_libs`.
- **Automatic Stream Reconnection & Audio Controls**: Added automatic mid-session gRPC stream reconnection across transient network drops, immediate `AudioTrack` PCM buffer flushing on user barge-in, and microphone mute state persistence across pre-connect, reconnect, and resume transitions.

#### Fixed
- **Host R8 Full-Mode Keep Rules & Compose Compatibility**: Hardened consumer R8/ProGuard keep rules (`proguard.txt`) for host-app full-mode minification and aligned `androidx.compose.material3:material3` to `1.3.1` for binary compatibility with host Compose apps.
- **Auth Expiry Parsing & WebView Session Reset**: Added support for `+0000`-formatted OAuth token expiry offsets and suppressed duplicate `OrderingAgentLoadedEvent` emissions during WebView session resets.

### React Native

#### Breaking
- **`AgentEvent` Discriminated Union**: Replaced the single-field `AgentEvent` object (`{ restartOrder?: RestartOrderEvent }`) with a discriminated union (`{ type: 'RESTART_ORDER'; confirmationStep: boolean } | { type: 'STORE_CHANGE'; store: string } | { type: 'UNKNOWN' }`). Update `onAgentEvent` and `handleEvent` listeners to switch on `event.agentEvent.type`.
- **Structured `Timestamp` Objects**: Replaced ISO-8601 string fields on `OrderFulfillment.createTime` and `OrderFulfillment.targetFulfillmentTime` with structured `Timestamp` objects (`{ seconds: number; nanos?: number }`) matching the native Android and iOS `0.7.0` SDKs.
- **Delegate-Only Auth Token Provisioning**: Removed `FoodOrderingClientConfig.authToken`, `FoodOrderingClientConfig.authTokenExpiry`, `FoodOrderingClientConfig.authTokenProvider` (`AuthTokenProvider`), `foodOrderingClient.setAuthToken()`, `foodOrderingClient.setAuthTokenProvider()`, and native cached-token fallbacks so OAuth2 / Bearer tokens are fetched exclusively on demand via `FoodOrderingDelegate.handleAuthTokenRequest()` (matching the native Android and iOS headless SDKs). Register `delegate` via `configure({ ..., delegate })` or `setDelegate(delegate)` before calling `startSession()`.

#### Added
- **Loyalty Client Execution (`handleLoyalty`)**: Added `FoodOrderingDelegate.handleLoyalty?(request: LoyaltyRequest): Promise<LoyaltyResponse>`, `LoyaltyRequest`, `LoyaltyResponse`, `LoyaltyActionCategory`, `ClientExecutionStatus`, and `ClientExecutionRejectionReason` for customer identification, loyalty/promo code application, reward redemption, point redemption, and loyalty removal. When `handleLoyalty` is omitted, both native bridges automatically fall back to the native SDK's unregistered-handler status.
- **Expanded `LoyaltyReward` Display Fields**: Added `description`, `image`, `expireTime` (`Timestamp`), and `customIntegrationAttributes` (`Record<string, unknown>`) to `LoyaltyReward`.
- **Suggested Offers & Promotional Discounts**: Added `SuggestedOptions.suggestedOffers` (`SuggestedOffers`), `SuggestedOffer` (`{ loyaltyReward?: LoyaltyReward; discount?: Discount }`), `Discount`, `DiscountType`, and `DiscountScope` to surface loyalty rewards and store/dynamic discounts during ordering conversations.
- **User Device Location (`UserLocation`)**: Added `UserInfo.location?: UserLocation` (`{ coordinates: LatLng; captureTime?: Timestamp }`) on `OrderingSessionConfig` for nearby store search and location-aware ordering.
- **Conversational Store Selection & Store Hours**:
  - Added `FeatureGates.storeSelectionEnabled` and `FeatureGates.offersAndLoyaltyEnabled` (plus `OrderingSessionConfig.featureGates` alias alongside `featureGate`).
  - Added `{ type: 'STORE_CHANGE'; store: string }` on `AgentEvent` when the customer switches stores mid-session; active store changes are automatically preserved by the native SDKs across pause/resume stream reconnections, and `OrderingSessionConfig.storeId` accepts both short store IDs and full `projects/.../stores/...` resource paths.
  - Added `'REQUESTED_STORE_SELECTION'` to `SessionEndType` when the customer asks to browse or pick a store manually in the app UI.
  - Added `EndSession.storeSchedule?: StoreSchedule` (and `SessionEndedEvent.storeSchedule`) to surface store operating hours when a session ends with `'STORE_CLOSED'`.
- **Expanded Checkout, Pricing & Nutritional Metadata**:
  - Added `totalAmountDue?: Money` and `orderPriceInfo?: OrderPriceInfo` to `FinalizeOrderResponse`.
  - Added `estimatedReadyDuration?: Duration` and `externalOrderId?: string` to `SubmitOrderResponse`.
  - Added `tip?: Money` to `OrderPriceInfo`.
  - Added `sources?: ImageSource[]` (`uri`, `width`, `height`) to `Image`, and `nutritionalInfo?: NutritionalInfo` (`calories`) to `SuggestedItem` and `SuggestedModifier`.
- **Forward-Compatible `'UNKNOWN'` Enum Fallbacks**: Added `'UNKNOWN'` to `SessionEndType`, `OrderStateUpdateStatus`, `FulfillmentMethod`, `DeliveryAddressValidationStatus`, `FulfillmentState`, `OfferEngineState`, `PaymentMethod`, `DayOfWeek`, `LoyaltyActionCategory`, `ClientExecutionRejectionReason`, `DiscountType`, `DiscountScope`, and `AgentEvent` so unrecognized future server enum values deserialize cleanly.
- **Automated Test Suites**: Added Jest unit tests (`src/__tests__/FoodOrderingClient.test.ts`), Android JVM JUnit4 bridge tests (`FoodOrderingModuleTest.kt`), and iOS XCTest bridge tests (`FoodOrderingBridgeTests.swift`).

#### Changed
- **Native SDK Dependencies & Public Maven Repository**: Updated native Android (`com.google.android.foodorderingaiagent:foodorderingaiagent:0.7.0`) and iOS (`foodai_orderingagent.xcframework` `v0.7.0`) dependencies in `android/build.gradle`, `FoodaiOrderingReactNative.podspec`, and `example/`, migrating Android resolution from the `dl.google.com` Ivy `@aar` layout and hardcoded transitive dependencies to the public Maven repository (`https://us-maven.pkg.dev/food-ai-prod-services/android-sdk`) with POM transitive resolution and no authentication plugin or credentials required.
- **Removed Android Core Library Desugaring Requirement**: Removed `java.time` usage in `FoodOrderingModule.kt` and updated Android dependencies, eliminating the `coreLibraryDesugaringEnabled` requirement for host Android apps on `minSdkVersion 24+`.

#### Fixed
- **Multi-Session State Reset & Android Bridge Parity**: Reset active session state on natural `SessionEnd` and terminal stream errors so back-to-back sessions refresh `userInfo`/`sessionId` and reconfigure `handleLoyalty` cleanly without requiring `endSession()`, and bridged `OrderMetadata.loyaltyMetadata`/`appliedOffers` and `SuggestedItem`/`SuggestedModifier` `integrationAttributes` on Android for parity with iOS.
- **Cross-Platform Numeric Normalization & Opaque Map Preservation**: Normalized string-encoded 64-bit integer fields (`Money.units`, `LoyaltyAmount.units`, `Timestamp.seconds`, `Duration.seconds`) emitted by Swift `Codable` on iOS into JavaScript `number` values while preserving arbitrary partner keys inside `customIntegrationAttributes` and `CustomizedInput.parameters`.
- **Version-Aware iOS XCFramework Resolution**: Factored iOS `foodai_orderingagent.xcframework` resolution into `scripts/fetch-ios-sdk.sh` (`npx foodai-fetch-ios-sdk`), invoked from `FoodaiOrderingReactNative.podspec` `prepare_command` and `example/ios/Podfile` `pre_install` so SDK upgrades automatically replace stale cached XCFrameworks.

## [0.6.0] - 2026-10-21

### iOS
- Released headless `FoodOrderingClient` bidirectional voice and multimodal ordering API alongside WebView `OrderingAgent`, client execution delegates (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, and auth token refresh), and `SubmitOrderPaymentInfo` CVV separation from general `PaymentInfo`.

### Android
- Released headless `FoodOrderingClient` bidirectional voice and multimodal ordering API alongside WebView `OrderingAgent`, client execution handlers (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, and auth token refresh), and `SubmitOrderPaymentInfo` CVV separation from general `PaymentInfo`.

### React Native
- Initial release of `@google-cloud/foodai-ordering-react-native` built on the React Native New Architecture (TurboModule Codegen spec + typed `EventEmitter` subscriptions) targeting native Android and iOS Food Ordering AI Agent SDKs `v0.6.0`.
- Full voice and multimodal session lifecycle (`initialize`, `setDelegate`, `requestMicrophonePermission`, `startSession`, `sendText`, `updateOrderState`, `sendCustomizedInput`, `pauseMicrophone`, `resumeMicrophone`, `endSession`, `release`), client execution callbacks (`handleAuthTokenRequest`, `handleFinalizeOrder`, `handleOrderPrices`, `handleSubmitOrder`, `handleOrderStatus`), real-time speech/agent text/cart/suggestion events, and the `example/` React Native `0.83` application.

## [0.5.0] - 2026-09-16

### iOS
- Updated `foodai_orderingagent` Swift Package Manager binary target to `v0.5.0`.

## [0.3.0] - 2026-06-12

### iOS
- Initial public Swift Package Manager release of `foodai_orderingagent` (`v0.3.0`).
