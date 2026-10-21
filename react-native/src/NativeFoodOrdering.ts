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

import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * React Native New Architecture TurboModule specification for `FoodOrderingModule`.
 *
 * Processed by `@react-native/codegen` (`codegenConfig.name = "FoodOrderingSpec"`)
 * to generate `NativeFoodOrderingSpec` on Android and `NativeFoodOrderingSpecBase` /
 * `<NativeFoodOrderingSpec>` on iOS, including typed `emitOn*` event emitters.
 */
export interface Spec extends TurboModule {
  /**
   * Configures the native `FoodOrderingClient` with `gcpProjectName`, `location`,
   * `brand`, `logLevel`, and optional initial auth token settings.
   */
  initialize(config: CodegenTypes.UnsafeObject): Promise<void>;

  /**
   * Updates the cached OAuth2 / Bearer token on the native bridge.
   */
  setAuthToken(token: string, expiry: string | null): Promise<void>;

  /**
   * Resolves an on-demand `handleAuthTokenRequest` call from the native bridge.
   */
  respondToAuthTokenRequest(
    requestId: string,
    response: CodegenTypes.UnsafeObject
  ): void;

  /**
   * Resolves an on-demand `handleFinalizeOrder` call from the native bridge.
   */
  respondToFinalizeOrder(
    requestId: string,
    response: CodegenTypes.UnsafeObject
  ): void;

  /**
   * Resolves an on-demand `handleSubmitOrder` call from the native bridge.
   */
  respondToSubmitOrder(
    requestId: string,
    response: CodegenTypes.UnsafeObject
  ): void;

  /**
   * Resolves an on-demand `handleOrderPrices` call from the native bridge.
   */
  respondToOrderPrices(
    requestId: string,
    response: CodegenTypes.UnsafeObject
  ): void;

  /**
   * Resolves an on-demand `handleOrderStatus` call from the native bridge.
   */
  respondToOrderStatus(
    requestId: string,
    response: CodegenTypes.UnsafeObject
  ): void;

  /**
   * Rejects any pending delegate request (`requestId`) on the native bridge.
   */
  rejectDelegateRequest(requestId: string, errorMessage: string): void;

  /**
   * Checks and requests OS microphone recording permission (`RECORD_AUDIO` on
   * Android, `AVAudioSession.recordPermission` on iOS).
   */
  requestMicrophonePermission(): Promise<boolean>;

  /**
   * Starts a bidirectional food ordering session and begins streaming microphone
   * audio and agent responses. Resolves with the active `sessionId`.
   */
  startSession(config: CodegenTypes.UnsafeObject): Promise<string>;

  /**
   * Sends a text utterance to the active ordering stream.
   */
  sendText(text: string): Promise<void>;

  /**
   * Sends an updated client-side `Order` (e.g., after a touch UI cart edit) to
   * the active ordering stream.
   */
  updateOrderState(order: CodegenTypes.UnsafeObject): Promise<void>;

  /**
   * Sends a dictionary of custom input parameters to the ordering agent.
   */
  sendCustomizedInput(parameters: CodegenTypes.UnsafeObject): Promise<void>;

  /**
   * Pauses microphone audio capture while keeping the ordering session alive.
   */
  pauseMicrophone(): Promise<void>;

  /**
   * Resumes microphone audio capture for the active ordering session.
   */
  resumeMicrophone(): Promise<void>;

  /**
   * Ends the active ordering session and stops audio capture and playback.
   */
  endSession(waitUntilComplete: boolean): Promise<void>;

  /**
   * Releases native client resources.
   */
  release(): Promise<void>;

  // ===========================================================================
  // Codegen Typed Event Emitters (RN 0.76+ New Architecture)
  // ===========================================================================

  readonly onSessionStarted: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onOrderUpdate: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSessionEnded: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onTurnCompleted: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onError: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSpeechRecognition: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onAgentText: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSuggestedOptions: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onRecommendedOrders: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onAgentEvent: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onInterruptionSignal: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSessionLifecycle: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onAudioLevel: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;

  // Delegate request event emitters (native -> JS -> respondTo*)
  readonly onAuthTokenRequested: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onFinalizeOrderRequested: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSubmitOrderRequested: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onOrderPricesRequested: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onOrderStatusRequested: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
}

export type NativeFoodOrderingModuleSpec = Spec;

export default TurboModuleRegistry.getEnforcing<Spec>('FoodOrderingModule');
