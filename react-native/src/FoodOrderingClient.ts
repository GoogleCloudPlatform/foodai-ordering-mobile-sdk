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

import type { CodegenTypes } from 'react-native';
import NativeFoodOrdering from './NativeFoodOrdering';
import type {
  AgentEventPayload,
  AgentTextEvent,
  AudioLevelEvent,
  AuthTokenProvider,
  CustomizedInput,
  FinalizeOrderRequest,
  FoodOrderingClientAuthToken,
  FoodOrderingClientConfig,
  FoodOrderingDelegate,
  FoodOrderingErrorEvent,
  FoodOrderingEventMap,
  FoodOrderingServiceEvent,
  InterruptionSignalEvent,
  Order,
  OrderingSessionConfig,
  OrderPricesRequest,
  OrderStatusRequest,
  OrderUpdateEvent,
  RecommendedOrdersEvent,
  SessionEndedEvent,
  SessionLifecycleEvent,
  SessionStartedEvent,
  SpeechRecognitionEvent,
  SubmitOrderRequest,
  SuggestedOptionsEvent,
  TurnCompletedEvent,
} from './types';

/** Handle returned by listener registration; call `remove()` to unsubscribe. */
export interface FoodOrderingSubscription {
  remove(): void;
}

const UNIMPLEMENTED_DELEGATE_ERROR = 'UNIMPLEMENTED';

interface NativeDelegateRequestEnvelope<TRequest> {
  requestId: string;
  request?: TRequest;
}

interface TrackedSubscription {
  event: keyof FoodOrderingEventMap;
  subscription: FoodOrderingSubscription;
}

function toUnsafeObject(value: unknown): CodegenTypes.UnsafeObject {
  return value as CodegenTypes.UnsafeObject;
}

/**
 * Recursively normalizes incoming native bridge payloads so cross-platform
 * runtime representations match `types.ts` (specifically converting iOS
 * `Money.units` and `LoyaltyAmount.units` Int64 strings to JS `number`s).
 */
function normalizeIncomingPayload(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeIncomingPayload);
  }
  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, propValue] of Object.entries(record)) {
    if (key === 'customIntegrationAttributes') {
      normalized[key] = propValue;
    } else if (
      (key === 'units' || key === 'nanos') &&
      typeof propValue === 'string' &&
      propValue.trim() !== ''
    ) {
      const parsed = Number(propValue);
      normalized[key] = Number.isFinite(parsed) ? parsed : propValue;
    } else {
      normalized[key] = normalizeIncomingPayload(propValue);
    }
  }
  return normalized;
}

function fromUnsafeObject<T>(value: CodegenTypes.UnsafeObject): T {
  return normalizeIncomingPayload(value) as T;
}

const NATIVE_EVENT_EMITTERS: {
  readonly [K in keyof FoodOrderingEventMap]: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
} = {
  sessionStarted: NativeFoodOrdering.onSessionStarted,
  orderUpdate: NativeFoodOrdering.onOrderUpdate,
  sessionEnded: NativeFoodOrdering.onSessionEnded,
  turnCompleted: NativeFoodOrdering.onTurnCompleted,
  error: NativeFoodOrdering.onError,
  speechRecognition: NativeFoodOrdering.onSpeechRecognition,
  agentText: NativeFoodOrdering.onAgentText,
  suggestedOptions: NativeFoodOrdering.onSuggestedOptions,
  recommendedOrders: NativeFoodOrdering.onRecommendedOrders,
  agentEvent: NativeFoodOrdering.onAgentEvent,
  interruptionSignal: NativeFoodOrdering.onInterruptionSignal,
  sessionLifecycle: NativeFoodOrdering.onSessionLifecycle,
  audioLevel: NativeFoodOrdering.onAudioLevel,
};

/**
 * Headless React Native client for the Google Cloud Food Ordering AI Agent.
 *
 * Wraps the native Android (`com.google.android.foodorderingaiagent.FoodOrderingClient`)
 * and iOS (`foodai_orderingagent.FoodOrderingClient`) SDKs over a unified
 * delegate and event-driven TypeScript API backed by React Native's New Architecture
 * TurboModule (`NativeFoodOrdering`) and Codegen typed `EventEmitter`s.
 */
export class FoodOrderingClient {
  private delegate?: FoodOrderingDelegate;
  private authTokenProvider?: AuthTokenProvider;
  private delegateBridgeSubscriptions: FoodOrderingSubscription[] = [];
  private subscriptions: TrackedSubscription[] = [];

  /**
   * Initializes and configures the native `FoodOrderingClient`.
   *
   * Call this once before starting an ordering session. You can supply a
   * `FoodOrderingDelegate` either via `config.delegate` or by calling
   * `setDelegate(delegate)` to handle auth token requests, `finalizeOrder`,
   * `orderPrices`, `submitOrder`, `orderStatus`, audio levels, and stream events.
   */
  async initialize(config: FoodOrderingClientConfig): Promise<void> {
    const { delegate, authTokenProvider, ...nativeConfig } = config;
    if (delegate) {
      this.setDelegate(delegate);
    }
    if (authTokenProvider) {
      this.setAuthTokenProvider(authTokenProvider);
    }
    this.ensureDelegateBridgeSubscriptions();
    await NativeFoodOrdering.initialize(toUnsafeObject(nativeConfig));
  }

  /**
   * Alias of `initialize` matching the native Android/iOS `FoodOrderingClient.configure` naming.
   */
  async configure(config: FoodOrderingClientConfig): Promise<void> {
    return this.initialize(config);
  }

  /**
   * Registers the `FoodOrderingDelegate` that handles client execution requests
   * (`handleFinalizeOrder`, `handleOrderPrices`, `handleSubmitOrder`, `handleOrderStatus`),
   * auth token requests (`handleAuthTokenRequest`), microphone audio level updates
   * (`handleAudioLevel`), and optional unified `handleEvent` callbacks.
   */
  setDelegate(delegate: FoodOrderingDelegate): void {
    this.delegate = delegate;
    this.ensureDelegateBridgeSubscriptions();
  }

  /**
   * Registers an async callback that supplies OAuth2 / Bearer tokens whenever
   * the native ordering stream connects or reconnects after returning to the foreground.
   */
  setAuthTokenProvider(provider: AuthTokenProvider): void {
    this.authTokenProvider = provider;
    this.ensureDelegateBridgeSubscriptions();
  }

  /**
   * Explicitly sets or updates the auth token cached on the native bridge.
   *
   * @param token Non-blank OAuth2 / Bearer token string.
   * @param expiry Optional ISO 8601 expiration timestamp (e.g. `"2026-10-16T18:34:30Z"`).
   */
  async setAuthToken(token: string, expiry?: string): Promise<void> {
    await NativeFoodOrdering.setAuthToken(token, expiry ?? null);
  }

  /**
   * Checks and requests OS microphone permission from the user.
   *
   * @returns `true` if microphone permission is granted, `false` otherwise.
   */
  async requestMicrophonePermission(): Promise<boolean> {
    return NativeFoodOrdering.requestMicrophonePermission();
  }

  /**
   * Starts a voice/multimodal ordering session for the given store.
   *
   * Only one session may be active at a time:
   * - Rejects with `SESSION_ALREADY_STARTED` if a session is already active or starting.
   * - Rejects with `APP_IN_BACKGROUND` if the app is in the background or enters the
   *   background before the session connects.
   *
   * @param config Session configuration including `storeId`, optional `sessionId`,
   *   `daypartId`, `userInfo`, `initialOrder`, `featureGate`, and `initialUtterance`.
   * @returns The active `sessionId` string.
   */
  async startSession(config: OrderingSessionConfig): Promise<string> {
    this.ensureDelegateBridgeSubscriptions();
    return NativeFoodOrdering.startSession(toUnsafeObject(config));
  }

  /**
   * Sends a text utterance to the active ordering session.
   * Commands sent while the session is connecting are queued and sent once connected.
   */
  async sendText(text: string): Promise<void> {
    await NativeFoodOrdering.sendText(text);
  }

  /**
   * Notifies the ordering agent that the cart/order state was modified on the
   * client side (for example, via a touch UI).
   */
  async updateOrderState(order: Order): Promise<void> {
    await NativeFoodOrdering.updateOrderState(toUnsafeObject(order));
  }

  /**
   * Sends a customized input event (`CustomizedInput` or key-value parameter map)
   * to the active ordering session.
   */
  async sendCustomizedInput(
    input: CustomizedInput | Record<string, string>
  ): Promise<void> {
    const parameters =
      'parameters' in input &&
      input.parameters !== null &&
      typeof input.parameters === 'object'
        ? (input as CustomizedInput).parameters
        : (input as Record<string, string>);
    await NativeFoodOrdering.sendCustomizedInput(toUnsafeObject(parameters));
  }

  /**
   * Pauses microphone audio recording while keeping the ordering session open.
   */
  async pauseMicrophone(): Promise<void> {
    await NativeFoodOrdering.pauseMicrophone();
  }

  /**
   * Resumes microphone audio recording for the active ordering session.
   */
  async resumeMicrophone(): Promise<void> {
    await NativeFoodOrdering.resumeMicrophone();
  }

  /**
   * Ends the current ordering session and stops audio recording and playback.
   *
   * @param waitUntilComplete Whether to wait for buffered agent audio to finish
   *   playing before tearing down the session (defaults to `true`).
   */
  async endSession(waitUntilComplete: boolean = true): Promise<void> {
    await NativeFoodOrdering.endSession(waitUntilComplete);
  }

  /**
   * Stops any active session, releases native SDK resources, and removes all
   * registered event and delegate listeners.
   */
  async release(): Promise<void> {
    this.removeAllListeners();
    for (const sub of this.delegateBridgeSubscriptions) {
      sub.remove();
    }
    this.delegateBridgeSubscriptions = [];
    this.delegate = undefined;
    this.authTokenProvider = undefined;
    await NativeFoodOrdering.release();
  }

  /**
   * Subscribes to a typed event emitted by the native `FoodOrderingModule`.
   */
  addListener<K extends keyof FoodOrderingEventMap>(
    event: K,
    listener: (payload: FoodOrderingEventMap[K]) => void
  ): FoodOrderingSubscription {
    const emitter = NATIVE_EVENT_EMITTERS[event];
    const rawSub = emitter((payload: CodegenTypes.UnsafeObject) => {
      listener(fromUnsafeObject<FoodOrderingEventMap[K]>(payload));
    });
    const tracked: TrackedSubscription = {
      event,
      subscription: rawSub,
    };
    this.subscriptions.push(tracked);
    return {
      remove: () => {
        rawSub.remove();
        this.subscriptions = this.subscriptions.filter(
          (item) => item !== tracked
        );
      },
    };
  }

  /**
   * Subscribes to session started events (`sessionStarted`).
   */
  onSessionStarted(
    listener: (event: SessionStartedEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('sessionStarted', listener);
  }

  /**
   * Subscribes to cart / order state updates (`orderUpdate`).
   */
  onOrderUpdate(
    listener: (event: OrderUpdateEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('orderUpdate', listener);
  }

  /**
   * Subscribes to session termination events (`sessionEnded`).
   */
  onSessionEnded(
    listener: (event: SessionEndedEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('sessionEnded', listener);
  }

  /**
   * Subscribes to turn completion events (`turnCompleted`).
   */
  onTurnCompleted(
    listener: (event: TurnCompletedEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('turnCompleted', listener);
  }

  /**
   * Subscribes to ordering stream and permission error events (`error`).
   */
  onError(
    listener: (event: FoodOrderingErrorEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('error', listener);
  }

  /**
   * Subscribes to real-time customer speech recognition transcripts (`speechRecognition`).
   */
  onSpeechRecognition(
    listener: (event: SpeechRecognitionEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('speechRecognition', listener);
  }

  /**
   * Subscribes to agent text responses (`agentText`).
   */
  onAgentText(listener: (event: AgentTextEvent) => void): FoodOrderingSubscription {
    return this.addListener('agentText', listener);
  }

  /**
   * Subscribes to contextual suggested items, modifiers, stores, and action chips (`suggestedOptions`).
   */
  onSuggestedOptions(
    listener: (event: SuggestedOptionsEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('suggestedOptions', listener);
  }

  /**
   * Subscribes to recommended orders (`recommendedOrders`).
   */
  onRecommendedOrders(
    listener: (event: RecommendedOrdersEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('recommendedOrders', listener);
  }

  /**
   * Subscribes to agent events such as `restartOrder` (`agentEvent`).
   */
  onAgentEvent(
    listener: (event: AgentEventPayload) => void
  ): FoodOrderingSubscription {
    return this.addListener('agentEvent', listener);
  }

  /**
   * Subscribes to user barge-in / interruption signals (`interruptionSignal`).
   */
  onInterruptionSignal(
    listener: (event: InterruptionSignalEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('interruptionSignal', listener);
  }

  /**
   * Subscribes to session lifecycle transitions (`STARTED`, `PAUSED`, `RESUMED`).
   */
  onSessionLifecycle(
    listener: (event: SessionLifecycleEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('sessionLifecycle', listener);
  }

  /**
   * Subscribes to normalized (`0.0..1.0`) microphone audio level updates (`audioLevel`).
   */
  onAudioLevel(
    listener: (event: AudioLevelEvent) => void
  ): FoodOrderingSubscription {
    return this.addListener('audioLevel', listener);
  }

  /**
   * Removes all registered listeners, or all listeners for a specific event type.
   */
  removeAllListeners(event?: keyof FoodOrderingEventMap): void {
    if (event) {
      const remaining: TrackedSubscription[] = [];
      for (const item of this.subscriptions) {
        if (item.event === event) {
          item.subscription.remove();
        } else {
          remaining.push(item);
        }
      }
      this.subscriptions = remaining;
      return;
    }
    for (const item of this.subscriptions) {
      item.subscription.remove();
    }
    this.subscriptions = [];
  }

  private ensureDelegateBridgeSubscriptions(): void {
    if (this.delegateBridgeSubscriptions.length > 0) {
      return;
    }

    // 1. Auth Token Request (handleAuthTokenRequest)
    this.delegateBridgeSubscriptions.push(
      NativeFoodOrdering.onAuthTokenRequested(
        async (raw: CodegenTypes.UnsafeObject) => {
          const envelope =
            fromUnsafeObject<NativeDelegateRequestEnvelope<never>>(raw);
          const requestId = envelope?.requestId;
          if (!requestId) {
            return;
          }
          const handler = this.delegate
            ? () => this.delegate!.handleAuthTokenRequest()
            : this.authTokenProvider;
          if (!handler) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              UNIMPLEMENTED_DELEGATE_ERROR
            );
            return;
          }
          try {
            const result = await handler();
            const normalized: FoodOrderingClientAuthToken =
              typeof result === 'string' ? { token: result } : result;
            NativeFoodOrdering.respondToAuthTokenRequest(
              requestId,
              toUnsafeObject(normalized)
            );
          } catch (err) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              err instanceof Error
                ? err.message
                : 'handleAuthTokenRequest failed.'
            );
          }
        }
      )
    );

    // 2. Finalize Order Request (handleFinalizeOrder)
    this.delegateBridgeSubscriptions.push(
      NativeFoodOrdering.onFinalizeOrderRequested(
        async (raw: CodegenTypes.UnsafeObject) => {
          const envelope =
            fromUnsafeObject<
              NativeDelegateRequestEnvelope<FinalizeOrderRequest>
            >(raw);
          const requestId = envelope?.requestId;
          if (!requestId) {
            return;
          }
          if (!this.delegate?.handleFinalizeOrder) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              UNIMPLEMENTED_DELEGATE_ERROR
            );
            return;
          }
          try {
            const response = await this.delegate.handleFinalizeOrder(
              envelope.request ?? {}
            );
            NativeFoodOrdering.respondToFinalizeOrder(
              requestId,
              toUnsafeObject(response)
            );
          } catch (err) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              err instanceof Error ? err.message : 'handleFinalizeOrder failed.'
            );
          }
        }
      )
    );

    // 3. Submit Order Request (handleSubmitOrder)
    this.delegateBridgeSubscriptions.push(
      NativeFoodOrdering.onSubmitOrderRequested(
        async (raw: CodegenTypes.UnsafeObject) => {
          const envelope =
            fromUnsafeObject<
              NativeDelegateRequestEnvelope<SubmitOrderRequest>
            >(raw);
          const requestId = envelope?.requestId;
          if (!requestId) {
            return;
          }
          if (!this.delegate?.handleSubmitOrder) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              UNIMPLEMENTED_DELEGATE_ERROR
            );
            return;
          }
          try {
            const response = await this.delegate.handleSubmitOrder(
              envelope.request ?? {}
            );
            NativeFoodOrdering.respondToSubmitOrder(
              requestId,
              toUnsafeObject(response)
            );
          } catch (err) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              err instanceof Error ? err.message : 'handleSubmitOrder failed.'
            );
          }
        }
      )
    );

    // 4. Order Prices Request (handleOrderPrices)
    this.delegateBridgeSubscriptions.push(
      NativeFoodOrdering.onOrderPricesRequested(
        async (raw: CodegenTypes.UnsafeObject) => {
          const envelope =
            fromUnsafeObject<
              NativeDelegateRequestEnvelope<OrderPricesRequest>
            >(raw);
          const requestId = envelope?.requestId;
          if (!requestId) {
            return;
          }
          if (!this.delegate?.handleOrderPrices) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              UNIMPLEMENTED_DELEGATE_ERROR
            );
            return;
          }
          try {
            const response = await this.delegate.handleOrderPrices(
              envelope.request ?? {}
            );
            NativeFoodOrdering.respondToOrderPrices(
              requestId,
              toUnsafeObject(response)
            );
          } catch (err) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              err instanceof Error ? err.message : 'handleOrderPrices failed.'
            );
          }
        }
      )
    );

    // 5. Order Status Request (handleOrderStatus)
    this.delegateBridgeSubscriptions.push(
      NativeFoodOrdering.onOrderStatusRequested(
        async (raw: CodegenTypes.UnsafeObject) => {
          const envelope =
            fromUnsafeObject<
              NativeDelegateRequestEnvelope<OrderStatusRequest>
            >(raw);
          const requestId = envelope?.requestId;
          if (!requestId) {
            return;
          }
          if (!this.delegate?.handleOrderStatus) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              UNIMPLEMENTED_DELEGATE_ERROR
            );
            return;
          }
          try {
            const response = await this.delegate.handleOrderStatus(
              envelope.request ?? {}
            );
            NativeFoodOrdering.respondToOrderStatus(
              requestId,
              toUnsafeObject(response)
            );
          } catch (err) {
            NativeFoodOrdering.rejectDelegateRequest(
              requestId,
              err instanceof Error ? err.message : 'handleOrderStatus failed.'
            );
          }
        }
      )
    );

    // 6. Audio Level (handleAudioLevel)
    this.delegateBridgeSubscriptions.push(
      NativeFoodOrdering.onAudioLevel((raw: CodegenTypes.UnsafeObject) => {
        const payload = fromUnsafeObject<AudioLevelEvent>(raw);
        if (typeof payload?.audioLevel === 'number') {
          this.delegate?.handleAudioLevel?.(payload.audioLevel);
        }
      })
    );

    // 7. Forward FoodOrderingServiceEvent (OrderResponse) to delegate.handleEvent
    const forwardEvent = <
      K extends Exclude<keyof FoodOrderingEventMap, 'audioLevel'>,
    >(
      type: K
    ) => {
      const emitter = NATIVE_EVENT_EMITTERS[type];
      this.delegateBridgeSubscriptions.push(
        emitter((raw: CodegenTypes.UnsafeObject) => {
          const payload = fromUnsafeObject<FoodOrderingEventMap[K]>(raw);
          this.delegate?.handleEvent?.({
            type,
            ...payload,
          } as FoodOrderingServiceEvent);
        })
      );
    };

    forwardEvent('sessionStarted');
    forwardEvent('orderUpdate');
    forwardEvent('sessionEnded');
    forwardEvent('turnCompleted');
    forwardEvent('speechRecognition');
    forwardEvent('agentText');
    forwardEvent('suggestedOptions');
    forwardEvent('recommendedOrders');
    forwardEvent('agentEvent');
    forwardEvent('interruptionSignal');
    forwardEvent('sessionLifecycle');
    forwardEvent('error');
  }
}

/**
 * Shared singleton instance of `FoodOrderingClient`.
 */
export const foodOrderingClient = new FoodOrderingClient();
