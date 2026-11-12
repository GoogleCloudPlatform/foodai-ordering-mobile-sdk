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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  type AgentEventPayload,
  type Discount,
  type EndSession,
  type FinalizeOrderRequest,
  type FinalizeOrderResponse,
  type FoodOrderingDelegate,
  type FoodOrderingErrorCode,
  type FoodOrderingErrorEvent,
  foodOrderingClient,
  type LoyaltyRequest,
  type LoyaltyResponse,
  type Money,
  type Order,
  type OrderItem,
  type OrderingSessionConfig,
  type OrderPricesRequest,
  type OrderPricesResponse,
  type OrderStatusRequest,
  type OrderStatusResponse,
  type OrderUpdateEvent,
  type SessionEndedEvent,
  type StoreSchedule,
  type SubmitOrderPaymentInfo,
  type SubmitOrderRequest,
  type SubmitOrderResponse,
  type SuggestedAction,
  type SuggestedItem,
  type SuggestedModifier,
  type SuggestedOffer,
  type SuggestedOptions,
  type SuggestedOptionsEvent,
  type TimeOfDay,
  type UpdatedOrderState,
} from '@google-cloud/foodai-ordering-react-native';
import { hasUnfilledPlaceholders } from './config.example';
import { loadDemoAppConfig } from './loadConfig';

type DemoLifecycleState =
  | 'IDLE'
  | 'CONNECTING'
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'ENDED';

type DebugSimulationScenario =
  | 'STORE_CHANGE'
  | 'RESTART_ORDER'
  | 'AGENT_EVENT_UNKNOWN'
  | 'REQUESTED_STORE_SELECTION'
  | 'STORE_CLOSED'
  | 'SUGGESTED_OFFERS'
  | 'LOYALTY_IDENTIFY'
  | 'ORDER_UPDATE_WITH_TIP';

interface ErrorBannerState {
  readonly code: string;
  readonly message: string;
  readonly guidance: string;
}

const DEBUG_SCENARIOS: readonly {
  readonly scenario: DebugSimulationScenario;
  readonly label: string;
}[] = [
  { scenario: 'STORE_CHANGE', label: 'Store Change' },
  { scenario: 'RESTART_ORDER', label: 'Restart Order' },
  { scenario: 'AGENT_EVENT_UNKNOWN', label: 'Unknown AgentEvent' },
  { scenario: 'REQUESTED_STORE_SELECTION', label: 'Store Picker End' },
  { scenario: 'STORE_CLOSED', label: 'Store Closed + Hours' },
  { scenario: 'SUGGESTED_OFFERS', label: 'Suggested Offers' },
  { scenario: 'LOYALTY_IDENTIFY', label: 'Loyalty Callback' },
  { scenario: 'ORDER_UPDATE_WITH_TIP', label: 'Order + Tip' },
];

/**
 * Formats a `google.type.Money` value using `Intl.NumberFormat`.
 */
function formatMoney(money?: Money): string {
  if (money == null) {
    return '';
  }
  const nanos = money.nanos ?? 0;
  const amount = Number(money.units) + nanos / 1_000_000_000;
  const currency =
    money.currencyCode && money.currencyCode.trim() !== ''
      ? money.currencyCode
      : 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Converts a scalar dollar amount into a `google.type.Money` object.
 */
function toUsdMoney(amount: number): Money {
  const wholeUnits = Math.trunc(amount);
  const nanos = Math.round((amount - wholeUnits) * 1_000_000_000);
  return {
    currencyCode: 'USD',
    units: wholeUnits,
    nanos,
  };
}

/**
 * Formats a `TimeOfDay` as `HH:MM`.
 */
function formatTimeOfDay(time?: TimeOfDay): string {
  if (time == null) {
    return '';
  }
  const hh = String(time.hours).padStart(2, '0');
  const mm = String(time.minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a `StoreSchedule` into a concise single-line summary.
 */
function formatStoreSchedule(schedule?: StoreSchedule): string {
  if (schedule == null) {
    return '';
  }
  const daysText =
    schedule.days.length > 0 ? schedule.days.map(String).join(', ') : 'Daily';
  const hoursText = schedule.timeRanges
    .map((range) => {
      const start = formatTimeOfDay(range.startTime);
      const end = formatTimeOfDay(range.endTime);
      return start && end ? `${start}-${end}` : start || end;
    })
    .filter((entry) => entry !== '')
    .join(', ');
  return hoursText ? `${daysText}: ${hoursText}` : daysText;
}

/**
 * Formats a promotional `Discount` badge label.
 */
function formatDiscountBadge(discount: Discount): string {
  switch (discount.type) {
    case 'PERCENT_OFF':
      return `${discount.percent}% OFF`;
    case 'FIXED_OFF':
      return discount.fixedAmount
        ? `${formatMoney(discount.fixedAmount)} OFF`
        : 'DISCOUNT';
    case 'FIXED_TOTAL':
      return discount.fixedAmount
        ? `${formatMoney(discount.fixedAmount)} DEAL`
        : 'DEAL';
    case 'BOGO':
      return 'BOGO';
    case 'FREE_DELIVERY':
      return 'FREE DELIVERY';
    default:
      return discount.autoApply ? 'AUTO' : 'OFFER';
  }
}

/**
 * Returns a one-line recovery hint for known `FoodOrderingErrorCode` values.
 */
function getErrorGuidance(code: FoodOrderingErrorCode | string): string {
  switch (code) {
    case 'APP_IN_BACKGROUND':
      return 'Session startup is rejected in the background. Return to the foreground and tap Start Voice Session.';
    case 'SESSION_ALREADY_STARTED':
      return 'Only one session may be active or starting at a time. Wait for startup/teardown or tap Stop Session first.';
    case 'MICROPHONE_PERMISSION_NOT_GRANTED':
      return 'Grant microphone permission in system settings before starting a voice ordering session.';
    case 'AUTH_TOKEN_REFRESH_FAILURE':
      return 'Verify fetchAuthToken in src/config.ts returns a valid OAuth2 Bearer token.';
    case 'INVALID_SESSION_CONFIGURATION':
      return 'Check gcpProjectName, location, brand, and storeId in src/config.ts.';
    case 'STREAM_CLOSED':
      return 'The bidirectional ordering stream closed. Tap Start Voice Session to begin a new session.';
    default:
      return 'Inspect native logs (logLevel: "info" or "debug") for additional details.';
  }
}

/**
 * Extracts a structured error code and message from a rejected native Promise or Error.
 */
function parseThrownError(err: unknown): ErrorBannerState {
  if (err != null && typeof err === 'object') {
    const maybeCode = (err as { readonly code?: unknown }).code;
    const maybeMessage = (err as { readonly message?: unknown }).message;
    const code =
      typeof maybeCode === 'string' && maybeCode.trim() !== ''
        ? maybeCode
        : 'UNKNOWN_ERROR';
    const message =
      typeof maybeMessage === 'string' && maybeMessage.trim() !== ''
        ? maybeMessage
        : 'Unexpected native SDK error.';
    return {
      code,
      message,
      guidance: getErrorGuidance(code),
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: String(err),
    guidance: getErrorGuidance('UNKNOWN_ERROR'),
  };
}

/**
 * Builds a stable identifier segment for a `SuggestedItem` when `itemId` may be
 * empty (for example, category quick-reply items or downstream-ID-only menus).
 */
function getSuggestedItemKeyBase(item: SuggestedItem): string {
  return (
    item.itemId ||
    item.integrationAttributes?.externalItemId ||
    item.displayName ||
    'item'
  );
}

/**
 * Builds a stable identifier segment for a `SuggestedModifier` when
 * `modifierGroupId` or `modifierId` may be empty (for example, modifiers
 * emitted inside `SuggestedModGroup` whose identity is carried in
 * `integrationAttributes.externalModifierId` or `displayName`).
 */
function getSuggestedModifierKeyBase(mod: SuggestedModifier): string {
  const customAttrs = mod.integrationAttributes?.customIntegrationAttributes;
  const externalGroupId =
    typeof customAttrs?.externalModifierGroupId === 'string'
      ? customAttrs.externalModifierGroupId
      : '';
  const groupKey =
    mod.modifierGroupId ||
    externalGroupId ||
    mod.modifierGroupDisplayName ||
    'group';
  const modKey =
    mod.modifierId ||
    mod.integrationAttributes?.externalModifierId ||
    mod.displayName ||
    'mod';
  return `${groupKey}-${modKey}`;
}

/**
 * Single-screen sample application demonstrating the headless
 * `@google-cloud/foodai-ordering-react-native` integration flow.
 */
export function App(): React.JSX.Element {
  const appConfig = useMemo(() => loadDemoAppConfig(), []);
  const placeholdersMissing = useMemo(
    () => hasUnfilledPlaceholders(appConfig),
    [appConfig]
  );

  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [lifecycleState, setLifecycleState] =
    useState<DemoLifecycleState>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<string>(
    appConfig.sessionConfig.storeId
  );
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [storeSelectionEnabled, setStoreSelectionEnabled] = useState<boolean>(
    appConfig.sessionConfig.featureGate?.storeSelectionEnabled ?? true
  );
  const [offersAndLoyaltyEnabled, setOffersAndLoyaltyEnabled] =
    useState<boolean>(
      appConfig.sessionConfig.featureGate?.offersAndLoyaltyEnabled ?? true
    );
  const [includeSampleLocation, setIncludeSampleLocation] = useState<boolean>(
    appConfig.sessionConfig.userInfo?.location != null
  );
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState<boolean>(true);

  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  const [isTranscriptFinal, setIsTranscriptFinal] = useState<boolean>(false);
  const [agentText, setAgentText] = useState<string>('');
  const [turnCount, setTurnCount] = useState<number>(0);

  const [orderState, setOrderState] = useState<UpdatedOrderState | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [suggestedOptions, setSuggestedOptions] =
    useState<SuggestedOptions | null>(null);
  const [endSessionInfo, setEndSessionInfo] = useState<EndSession | null>(null);
  const [errorBanner, setErrorBanner] = useState<ErrorBannerState | null>(null);
  const [delegateLogs, setDelegateLogs] = useState<readonly string[]>([]);
  const [utteranceInput, setUtteranceInput] = useState<string>('');

  const isSessionActiveOrConnecting =
    lifecycleState === 'CONNECTING' ||
    lifecycleState === 'STARTED' ||
    lifecycleState === 'PAUSED' ||
    lifecycleState === 'RESUMED';

  const appendDelegateLog = useCallback((entry: string): void => {
    const timestamp = new Date().toLocaleTimeString();
    setDelegateLogs((prev) => [`[${timestamp}] ${entry}`, ...prev.slice(0, 7)]);
  }, []);

  /**
   * Delegate implementation handling auth token requests and POS/loyalty callbacks
   * (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, `loyalty`, and `audioLevel`).
   */
  const delegateRef = useRef<FoodOrderingDelegate>({
    handleAuthTokenRequest: async () => {
      appendDelegateLog('handleAuthTokenRequest -> fetching Bearer token');
      return appConfig.fetchAuthToken();
    },

    handleOrderPrices: async (
      request: OrderPricesRequest
    ): Promise<OrderPricesResponse> => {
      const items = request.order?.items ?? [];
      let subtotal = 0;
      for (const item of items) {
        const unitPrice = item.basePrice
          ? Number(item.basePrice.units) +
            (item.basePrice.nanos ?? 0) / 1_000_000_000
          : 4.99;
        subtotal += unitPrice * item.quantity;
      }
      const tax = Number((subtotal * 0.0825).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));
      appendDelegateLog(
        `handleOrderPrices (${items.length} items) -> total $${total.toFixed(2)}`
      );
      return {
        success: true,
        orderPriceInfo: {
          subtotalPrice: toUsdMoney(subtotal),
          taxPrice: toUsdMoney(tax),
          totalPrice: toUsdMoney(total),
        },
      };
    },

    handleFinalizeOrder: async (
      _request: FinalizeOrderRequest
    ): Promise<FinalizeOrderResponse> => {
      // Note: FinalizeOrderResponse.paymentInfo uses general PaymentInfo, which
      // never contains a CVV field.
      appendDelegateLog(
        'handleFinalizeOrder -> paymentFlowEnabled=true (VISA •••• 4242)'
      );
      return {
        paymentFlowEnabled: true,
        paymentInfo: {
          paymentMethod: 'PAYMENT_METHOD_CREDIT_CARD',
          creditCardLastFourDigits: '4242',
        },
      };
    },

    handleSubmitOrder: async (
      request: SubmitOrderRequest
    ): Promise<SubmitOrderResponse> => {
      // `request.paymentInfo` is `SubmitOrderPaymentInfo`, the only payment type
      // that carries `creditCardCvv`. Never log or echo raw CVV values.
      const paymentInfo: SubmitOrderPaymentInfo | undefined =
        request.paymentInfo;
      const method = paymentInfo?.paymentMethod ?? 'UNSPECIFIED';
      const lastFour = paymentInfo?.creditCardLastFourDigits ?? 'N/A';
      const hasCvv = Boolean(
        paymentInfo?.creditCardCvv && paymentInfo.creditCardCvv.length > 0
      );
      const tipSummary = request.tip ? `, tip=${formatMoney(request.tip)}` : '';
      appendDelegateLog(
        `handleSubmitOrder -> method=${method}, last4=${lastFour}, cvvPresent=${hasCvv} (redacted)${tipSummary}`
      );
      return {
        success: true,
        estimatedReadyDuration: { seconds: 300 },
        externalOrderId: 'DEMO-POS-1001',
      };
    },

    handleOrderStatus: async (
      _request: OrderStatusRequest
    ): Promise<OrderStatusResponse> => {
      appendDelegateLog('handleOrderStatus -> success=true');
      return {
        success: true,
      };
    },

    handleLoyalty: async (
      request: LoyaltyRequest
    ): Promise<LoyaltyResponse> => {
      // Never log raw customer identifiers (phone, email, account ID, or code).
      const hasIdentifier = Boolean(
        request.phoneNumber || request.email || request.loyaltyAccountId
      );
      const rewardCount = request.rewardIds?.length ?? 0;
      appendDelegateLog(
        `handleLoyalty -> category=${request.category}, idPresent=${hasIdentifier}, rewards=${rewardCount}`
      );

      if (request.category === 'LOYALTY_ACTION_CATEGORY_REMOVE_LOYALTY') {
        return {
          category: request.category,
          loyaltyMetadata: {
            appliedCodes: [],
            appliedRewardIds: [],
          },
        };
      }

      return {
        category: request.category,
        loyaltyMetadata: {
          customer: {
            name: 'Alex',
            tier: 'Gold',
            loyaltyAmount: { units: 450 },
          },
          availableRewards: [
            {
              rewardId: 'reward-free-fries',
              displayName: 'Free Medium Fries',
              description: 'Redeem 200 points for medium fries.',
              redemptionCost: { units: 200 },
            },
          ],
          appliedCodes: request.code ? [request.code] : [],
          appliedRewardIds: request.rewardIds ?? [],
        },
      };
    },

    handleAudioLevel: (level: number): void => {
      setAudioLevel(level);
    },
  });

  /**
   * Configures the native `FoodOrderingClient` and registers stream listeners.
   */
  const configureSdk = useCallback(async (): Promise<void> => {
    setErrorBanner(null);
    try {
      await foodOrderingClient.configure({
        ...appConfig.clientConfig,
        delegate: delegateRef.current,
      });
      setIsConfigured(true);
      appendDelegateLog(
        `Configured FoodOrderingClient (brand=${appConfig.clientConfig.brand})`
      );
    } catch (err: unknown) {
      setErrorBanner(parseThrownError(err));
    }
  }, [appConfig.clientConfig, appendDelegateLog]);

  const handleOrderUpdateEvent = useCallback((event: OrderUpdateEvent): void => {
    setOrderState(event.updatedOrderState);
    if (event.order != null) {
      setCurrentOrder(event.order);
    } else if (event.updatedOrderState.order != null) {
      setCurrentOrder(event.updatedOrderState.order);
    }
  }, []);

  const handleSuggestedOptionsEvent = useCallback(
    (event: SuggestedOptionsEvent): void => {
      setSuggestedOptions(event.suggestedOptions);
    },
    []
  );

  const handleAgentEventReceived = useCallback(
    (event: AgentEventPayload): void => {
      switch (event.agentEvent.type) {
        case 'STORE_CHANGE':
          setActiveStoreId(event.agentEvent.store);
          appendDelegateLog(
            `Event: agentEvent.STORE_CHANGE -> ${event.agentEvent.store}`
          );
          break;
        case 'RESTART_ORDER':
          appendDelegateLog(
            `Event: agentEvent.RESTART_ORDER (confirmationStep=${event.agentEvent.confirmationStep})`
          );
          break;
        case 'UNKNOWN':
          appendDelegateLog('Event: agentEvent.UNKNOWN');
          break;
      }
    },
    [appendDelegateLog]
  );

  const handleSessionEndedEvent = useCallback(
    (event: SessionEndedEvent): void => {
      setEndSessionInfo(event.endSession);
      setLifecycleState('ENDED');
      setAudioLevel(0);
    },
    []
  );

  useEffect(() => {
    void configureSdk();

    const subscriptions = [
      foodOrderingClient.onSessionStarted((event) => {
        setSessionId(event.sessionId);
        setLifecycleState('STARTED');
        setEndSessionInfo(null);
      }),
      foodOrderingClient.onSessionLifecycle((event) => {
        setSessionId(event.sessionId);
        setLifecycleState(event.state);
      }),
      foodOrderingClient.onSpeechRecognition((event) => {
        setSpeechTranscript(event.speechRecognition.transcript);
        setIsTranscriptFinal(event.speechRecognition.isFinal);
      }),
      foodOrderingClient.onAgentText((event) => {
        setAgentText(event.text);
      }),
      foodOrderingClient.onOrderUpdate(handleOrderUpdateEvent),
      foodOrderingClient.onSuggestedOptions(handleSuggestedOptionsEvent),
      foodOrderingClient.onTurnCompleted(() => {
        setTurnCount((prev) => prev + 1);
      }),
      foodOrderingClient.onInterruptionSignal(() => {
        appendDelegateLog('Event: interruptionSignal (user barge-in)');
      }),
      foodOrderingClient.onAgentEvent(handleAgentEventReceived),
      foodOrderingClient.onSessionEnded(handleSessionEndedEvent),
      foodOrderingClient.onError((event: FoodOrderingErrorEvent) => {
        setErrorBanner({
          code: event.code,
          message: event.message,
          guidance: getErrorGuidance(event.code),
        });
        if (
          event.code === 'APP_IN_BACKGROUND' ||
          event.code === 'STREAM_CLOSED' ||
          event.code === 'AUTH_TOKEN_REFRESH_FAILURE' ||
          event.code === 'MICROPHONE_PERMISSION_NOT_GRANTED'
        ) {
          setLifecycleState('IDLE');
          setAudioLevel(0);
        }
      }),
    ];

    return () => {
      for (const sub of subscriptions) {
        sub.remove();
      }
      void foodOrderingClient.release();
    };
  }, [
    appendDelegateLog,
    configureSdk,
    handleAgentEventReceived,
    handleOrderUpdateEvent,
    handleSessionEndedEvent,
    handleSuggestedOptionsEvent,
  ]);

  /**
   * Requests microphone permission and starts a new voice ordering session.
   */
  const handleStartSession = useCallback(async (): Promise<void> => {
    setErrorBanner(null);
    setEndSessionInfo(null);
    try {
      if (!isConfigured) {
        await configureSdk();
      }
      const granted = await foodOrderingClient.requestMicrophonePermission();
      if (!granted) {
        setErrorBanner({
          code: 'MICROPHONE_PERMISSION_NOT_GRANTED',
          message: 'Microphone permission was denied by the user.',
          guidance: getErrorGuidance('MICROPHONE_PERMISSION_NOT_GRANTED'),
        });
        return;
      }
      setLifecycleState('CONNECTING');
      setIsMicMuted(false);

      const baseSession = appConfig.sessionConfig;
      const mergedSessionConfig: OrderingSessionConfig = {
        ...baseSession,
        storeId: activeStoreId,
        userInfo: {
          ...baseSession.userInfo,
          location: includeSampleLocation
            ? (baseSession.userInfo?.location ?? {
                coordinates: { latitude: 37.422, longitude: -122.084 },
                captureTime: { seconds: Math.floor(Date.now() / 1000) },
              })
            : undefined,
        },
        featureGate: {
          ...baseSession.featureGate,
          storeSelectionEnabled,
          offersAndLoyaltyEnabled,
        },
      };

      const startedId =
        await foodOrderingClient.startSession(mergedSessionConfig);
      setSessionId(startedId);
    } catch (err: unknown) {
      setLifecycleState('IDLE');
      setErrorBanner(parseThrownError(err));
    }
  }, [
    activeStoreId,
    appConfig.sessionConfig,
    configureSdk,
    includeSampleLocation,
    isConfigured,
    offersAndLoyaltyEnabled,
    storeSelectionEnabled,
  ]);

  /**
   * Ends the current ordering session after draining any buffered agent audio.
   */
  const handleStopSession = useCallback(async (): Promise<void> => {
    setErrorBanner(null);
    try {
      await foodOrderingClient.endSession(true);
      setLifecycleState('IDLE');
      setAudioLevel(0);
    } catch (err: unknown) {
      setErrorBanner(parseThrownError(err));
    }
  }, []);

  /**
   * Toggles microphone recording pause/resume within the active session.
   */
  const handleToggleMicrophone = useCallback(async (): Promise<void> => {
    setErrorBanner(null);
    try {
      if (isMicMuted) {
        await foodOrderingClient.resumeMicrophone();
        setIsMicMuted(false);
      } else {
        await foodOrderingClient.pauseMicrophone();
        setIsMicMuted(true);
        setAudioLevel(0);
      }
    } catch (err: unknown) {
      setErrorBanner(parseThrownError(err));
    }
  }, [isMicMuted]);

  /**
   * Sends a text utterance (from the input field or a suggestion chip) to the agent.
   */
  const handleSendText = useCallback(async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (trimmed === '') {
      return;
    }
    setErrorBanner(null);
    try {
      await foodOrderingClient.sendText(trimmed);
      setUtteranceInput('');
    } catch (err: unknown) {
      setErrorBanner(parseThrownError(err));
    }
  }, []);

  /**
   * Simulates synthetic `0.7.0` event payloads and delegate callbacks directly
   * in the sample app's UI handlers (`__DEV__` only, without calling the SDK).
   */
  const handleSimulateDebugEvent = useCallback(
    async (scenario: DebugSimulationScenario): Promise<void> => {
      setErrorBanner(null);
      const debugSessionId = sessionId ?? 'debug-session-070';
      try {
        switch (scenario) {
          case 'STORE_CHANGE':
            handleAgentEventReceived({
              sessionId: debugSessionId,
              agentEvent: {
                type: 'STORE_CHANGE',
                store: 'projects/demo-project/locations/global/stores/store-downtown-42',
              },
            });
            break;

          case 'RESTART_ORDER':
            handleAgentEventReceived({
              sessionId: debugSessionId,
              agentEvent: {
                type: 'RESTART_ORDER',
                confirmationStep: true,
              },
            });
            break;

          case 'AGENT_EVENT_UNKNOWN':
            handleAgentEventReceived({
              sessionId: debugSessionId,
              agentEvent: {
                type: 'UNKNOWN',
              },
            });
            break;

          case 'REQUESTED_STORE_SELECTION':
            handleSessionEndedEvent({
              sessionId: debugSessionId,
              endSession: {
                type: 'REQUESTED_STORE_SELECTION',
                reason: 'Customer requested to choose a store on screen.',
                agentResponse:
                  'Sure, please pick your preferred store location on screen.',
              },
            });
            break;

          case 'STORE_CLOSED': {
            const schedule: StoreSchedule = {
              days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
              dateRanges: [],
              timeRanges: [
                {
                  startTime: { hours: 7, minutes: 0, seconds: 0, nanos: 0 },
                  endTime: { hours: 22, minutes: 0, seconds: 0, nanos: 0 },
                },
              ],
            };
            handleSessionEndedEvent({
              sessionId: debugSessionId,
              endSession: {
                type: 'STORE_CLOSED',
                reason: 'Selected store is currently outside operating hours.',
                agentResponse: 'Sorry, this store is currently closed.',
                storeSchedule: schedule,
              },
              storeSchedule: schedule,
            });
            break;
          }

          case 'SUGGESTED_OFFERS':
            handleSuggestedOptionsEvent({
              sessionId: debugSessionId,
              suggestedOptions: {
                suggestedOffers: {
                  offers: [
                    {
                      loyaltyReward: {
                        rewardId: 'reward-free-drink',
                        displayName: 'Free Medium Fountain Drink',
                        redemptionCost: { units: 250 },
                        description:
                          'Redeem 250 points for any medium fountain drink.',
                        expireTime: { seconds: 1_893_456_000, nanos: 0 },
                      },
                    },
                    {
                      discount: {
                        name: 'discounts/afternoon-20',
                        displayName: '20% Off Afternoon Order',
                        type: 'PERCENT_OFF',
                        scope: 'ORDER',
                        percent: 20,
                        maxDiscountValue: {
                          currencyCode: 'USD',
                          units: 5,
                          nanos: 0,
                        },
                        autoApply: false,
                        description:
                          'Save 20% on mobile orders placed during afternoon hours.',
                        customIntegrationAttributes: {
                          promoCode: 'AFTERNOON20',
                        },
                      },
                    },
                  ],
                },
              },
            });
            break;

          case 'LOYALTY_IDENTIFY': {
            const loyaltyResponse = await delegateRef.current.handleLoyalty?.({
              category: 'LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER',
              phoneNumber: '+15550109999',
            });
            if (loyaltyResponse?.loyaltyMetadata != null) {
              const updatedOrder: Order = {
                ...(currentOrder ?? { items: [] }),
                metadata: {
                  ...currentOrder?.metadata,
                  loyaltyMetadata: loyaltyResponse.loyaltyMetadata,
                },
              };
              handleOrderUpdateEvent({
                sessionId: debugSessionId,
                order: updatedOrder,
                updatedOrderState: {
                  items: updatedOrder.items,
                  order: updatedOrder,
                  changed: true,
                  status: 'SUCCEEDED',
                  detailedMessage: 'Applied loyalty member profile.',
                },
              });
            }
            break;
          }

          case 'ORDER_UPDATE_WITH_TIP': {
            const sampleItem: OrderItem = {
              uid: 'item-uid-1',
              itemId: 'combo-classic-burger',
              displayName: 'Classic Burger Combo',
              basePrice: { currencyCode: 'USD', units: 10, nanos: 990_000_000 },
              totalPrice: { currencyCode: 'USD', units: 10, nanos: 990_000_000 },
              quantity: 1,
            };
            const sampleOrder: Order = {
              items: [sampleItem],
              fulfillment: {
                fulfillmentMethod: 'FULFILLMENT_METHOD_DRIVE_THRU',
                createTime: { seconds: 1_762_272_000, nanos: 0 },
              },
              priceInfo: {
                subtotalPrice: {
                  currencyCode: 'USD',
                  units: 10,
                  nanos: 990_000_000,
                },
                taxPrice: { currencyCode: 'USD', units: 0, nanos: 990_000_000 },
                tip: { currencyCode: 'USD', units: 2, nanos: 0 },
                totalPrice: {
                  currencyCode: 'USD',
                  units: 13,
                  nanos: 980_000_000,
                },
              },
            };
            handleOrderUpdateEvent({
              sessionId: debugSessionId,
              order: sampleOrder,
              updatedOrderState: {
                items: [sampleItem],
                order: sampleOrder,
                changed: true,
                status: 'SUCCEEDED',
                detailedMessage: 'Added Classic Burger Combo with $2.00 tip.',
              },
            });
            break;
          }
        }
        appendDelegateLog(`Simulated debug scenario: ${scenario}`);
      } catch (err: unknown) {
        setErrorBanner(parseThrownError(err));
      }
    },
    [
      appendDelegateLog,
      currentOrder,
      handleAgentEventReceived,
      handleOrderUpdateEvent,
      handleSessionEndedEvent,
      handleSuggestedOptionsEvent,
      sessionId,
    ]
  );

  const orderItems: readonly OrderItem[] =
    currentOrder?.items ?? orderState?.items ?? [];

  const suggestedItemsList: readonly SuggestedItem[] =
    suggestedOptions?.suggestedItems?.items ?? [];

  const suggestedModifiersList: readonly SuggestedModifier[] = useMemo(() => {
    const directModifiers =
      suggestedOptions?.suggestedModifiers?.modifiers ?? [];
    const groupModifiers = (
      suggestedOptions?.suggestedModifierGroups?.modifierGroups ?? []
    ).flatMap((group) =>
      (group.modifiers ?? []).map((mod) => ({
        ...mod,
        modifierGroupId: mod.modifierGroupId || group.modifierGroupId,
        modifierGroupDisplayName:
          mod.modifierGroupDisplayName || group.displayName,
      }))
    );
    if (groupModifiers.length === 0) {
      return directModifiers;
    }
    const seen = new Set(
      directModifiers.map(
        (mod) => `${getSuggestedModifierKeyBase(mod)}:${mod.displayName}`
      )
    );
    const merged = [...directModifiers];
    for (const mod of groupModifiers) {
      const key = `${getSuggestedModifierKeyBase(mod)}:${mod.displayName}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(mod);
      }
    }
    return merged;
  }, [suggestedOptions]);

  const suggestedActionsList: readonly SuggestedAction[] =
    suggestedOptions?.suggestedActions?.actions ?? [];

  const suggestedOffersList: readonly SuggestedOffer[] =
    suggestedOptions?.suggestedOffers?.offers ?? [];

  const totalSuggestionsCount =
    suggestedItemsList.length +
    suggestedModifiersList.length +
    suggestedActionsList.length +
    suggestedOffersList.length;

  const suggestionChips: readonly {
    readonly key: string;
    readonly label: string;
    readonly query: string;
  }[] = useMemo(() => {
    if (suggestedOptions == null) {
      return [];
    }
    const chips: { key: string; label: string; query: string }[] = [];
    suggestedActionsList.forEach((action, idx) => {
      const query = action.textInput?.text ?? action.displayName;
      const actionKey = action.displayName || query || 'action';
      chips.push({
        key: `action-${actionKey}-${idx}`,
        label: action.displayName,
        query,
      });
    });
    suggestedOffersList.forEach((offer, idx) => {
      if (offer.loyaltyReward?.displayName) {
        const rewardKey =
          offer.loyaltyReward.rewardId ||
          offer.loyaltyReward.displayName ||
          'reward';
        chips.push({
          key: `offer-reward-${rewardKey}-${idx}`,
          label: `Redeem: ${offer.loyaltyReward.displayName}`,
          query: `Redeem ${offer.loyaltyReward.displayName}`,
        });
      } else if (offer.discount?.displayName) {
        const discountKey =
          offer.discount.name || offer.discount.displayName || 'discount';
        chips.push({
          key: `offer-discount-${discountKey}-${idx}`,
          label: `Offer: ${offer.discount.displayName}`,
          query: `Apply ${offer.discount.displayName}`,
        });
      }
    });
    suggestedItemsList.forEach((item, idx) => {
      const priceSuffix = item.basePrice
        ? ` (${formatMoney(item.basePrice)})`
        : '';
      chips.push({
        key: `item-${getSuggestedItemKeyBase(item)}-${idx}`,
        label: `+ ${item.displayName}${priceSuffix}`,
        query: `Add ${item.displayName}`,
      });
    });
    suggestedModifiersList.forEach((mod, idx) => {
      chips.push({
        key: `mod-${getSuggestedModifierKeyBase(mod)}-${idx}`,
        label: mod.displayName,
        query: mod.displayName,
      });
    });
    return chips;
  }, [
    suggestedActionsList,
    suggestedItemsList,
    suggestedModifiersList,
    suggestedOffersList,
    suggestedOptions,
  ]);

  const loyaltyCustomer = currentOrder?.metadata?.loyaltyMetadata?.customer;
  const formattedStoreSchedule = formatStoreSchedule(
    endSessionInfo?.storeSchedule
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Food AI Headless SDK Demo</Text>
        <Text style={styles.subtitle}>
          Store: {activeStoreId} • Brand: {appConfig.clientConfig.brand}
        </Text>

        {placeholdersMissing ? (
          <View style={styles.placeholderNotice}>
            <Text style={styles.placeholderTitle}>
              Configuration Placeholders Detected
            </Text>
            <Text style={styles.placeholderBody}>
              Copy src/config.example.ts to src/config.ts and replace{' '}
              {'<YOUR_GCP_PROJECT_ID>'}, {'<YOUR_GCP_LOCATION>'},{' '}
              {'<YOUR_BRAND_ID>'}, {'<YOUR_STORE_ID>'}, and{' '}
              {'<YOUR_AUTH_TOKEN_URL>'} before starting a live session.
            </Text>
          </View>
        ) : null}

        {errorBanner != null ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorCode}>{errorBanner.code}</Text>
            <Text style={styles.errorMessage}>{errorBanner.message}</Text>
            <Text style={styles.errorGuidance}>{errorBanner.guidance}</Text>
          </View>
        ) : null}

        {/* Session Status & Audio Level */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Session Status</Text>
            <View
              style={[
                styles.badge,
                lifecycleState === 'STARTED' || lifecycleState === 'RESUMED'
                  ? styles.badgeActive
                  : lifecycleState === 'PAUSED' ||
                      lifecycleState === 'CONNECTING'
                    ? styles.badgePaused
                    : styles.badgeIdle,
              ]}
            >
              <Text style={styles.badgeText}>{lifecycleState}</Text>
            </View>
          </View>
          <Text style={styles.metaText}>
            Session ID: {sessionId ?? 'None'} • Turns completed: {turnCount}
          </Text>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${Math.min(100, Math.round(audioLevel * 100))}%` as const,
                },
              ]}
            />
          </View>
          <Text style={styles.metaText}>
            Mic Level: {Math.round(audioLevel * 100)}%
            {isMicMuted ? ' (Paused)' : ''}
          </Text>

          {!isSessionActiveOrConnecting ? (
            <View style={styles.chipsContainer}>
              <Pressable
                style={[
                  styles.togglePill,
                  storeSelectionEnabled ? styles.togglePillActive : null,
                ]}
                onPress={() => {
                  setStoreSelectionEnabled((prev) => !prev);
                }}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    storeSelectionEnabled ? styles.togglePillTextActive : null,
                  ]}
                >
                  Store Selection: {storeSelectionEnabled ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.togglePill,
                  offersAndLoyaltyEnabled ? styles.togglePillActive : null,
                ]}
                onPress={() => {
                  setOffersAndLoyaltyEnabled((prev) => !prev);
                }}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    offersAndLoyaltyEnabled
                      ? styles.togglePillTextActive
                      : null,
                  ]}
                >
                  Offers & Loyalty: {offersAndLoyaltyEnabled ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.togglePill,
                  includeSampleLocation ? styles.togglePillActive : null,
                ]}
                onPress={() => {
                  setIncludeSampleLocation((prev) => !prev);
                }}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    includeSampleLocation ? styles.togglePillTextActive : null,
                  ]}
                >
                  User Location: {includeSampleLocation ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {endSessionInfo != null ? (
            <View style={styles.endSessionBox}>
              <Text style={styles.endSessionTitle}>
                Session Ended: {endSessionInfo.type}
              </Text>
              {endSessionInfo.reason !== '' ? (
                <Text style={styles.metaText}>
                  Reason: {endSessionInfo.reason}
                </Text>
              ) : null}
              {endSessionInfo.agentResponse != null ? (
                <Text style={styles.metaText}>
                  Agent: {endSessionInfo.agentResponse}
                </Text>
              ) : null}
              {formattedStoreSchedule !== '' ? (
                <Text style={styles.metaText}>
                  Store Hours: {formattedStoreSchedule}
                </Text>
              ) : null}
              {endSessionInfo.type === 'REQUESTED_STORE_SELECTION' ? (
                <Text style={styles.metaText}>
                  Action: Present native/RN store picker UI to choose a store.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            {!isSessionActiveOrConnecting ? (
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={() => {
                  void handleStartSession();
                }}
              >
                <Text style={styles.buttonText}>Start Voice Session</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    void handleToggleMicrophone();
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isMicMuted ? 'Resume Mic' : 'Pause Mic'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.dangerButton]}
                  onPress={() => {
                    void handleStopSession();
                  }}
                >
                  <Text style={styles.buttonText}>Stop Session</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Transcript & Agent Response */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conversation</Text>
          <Text style={styles.label}>
            Customer Speech{' '}
            {speechTranscript !== ''
              ? isTranscriptFinal
                ? '(Final)'
                : '(Listening...)'
              : ''}
          </Text>
          <Text style={styles.transcriptText}>
            {speechTranscript !== ''
              ? speechTranscript
              : 'Speak into the microphone or send a text message below.'}
          </Text>

          <Text style={[styles.label, styles.topSpacing]}>Agent Response</Text>
          <Text style={styles.agentText}>
            {agentText !== '' ? agentText : 'Waiting for agent response...'}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={utteranceInput}
              onChangeText={setUtteranceInput}
              placeholder="Type an order utterance (e.g. 'One classic burger')"
              placeholderTextColor="#6b7280"
              onSubmitEditing={() => {
                void handleSendText(utteranceInput);
              }}
            />
            <Pressable
              style={[styles.sendButton]}
              onPress={() => {
                void handleSendText(utteranceInput);
              }}
            >
              <Text style={styles.buttonText}>Send</Text>
            </Pressable>
          </View>

          {suggestionChips.length > 0 ? (
            <View style={styles.chipsContainer}>
              {suggestionChips.map((chip) => (
                <Pressable
                  key={chip.key}
                  style={styles.chip}
                  onPress={() => {
                    void handleSendText(chip.query);
                  }}
                >
                  <Text style={styles.chipText}>{chip.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Suggested Options, Offers & Modifiers List */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>
              Suggested Options & Offers ({totalSuggestionsCount})
            </Text>
            {totalSuggestionsCount > 0 ? (
              <Text style={styles.metaText}>Tap a row to send</Text>
            ) : null}
          </View>

          {totalSuggestionsCount === 0 ? (
            <Text style={styles.emptyText}>
              No suggested options, offers, or modifiers right now.
            </Text>
          ) : (
            <>
              {suggestedOffersList.length > 0 ? (
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionSectionHeader}>
                    Suggested Offers & Rewards ({suggestedOffersList.length})
                  </Text>
                  {suggestedOffersList.map((offer, idx) => {
                    if (offer.loyaltyReward != null) {
                      const reward = offer.loyaltyReward;
                      const label = reward.displayName ?? 'Loyalty Reward';
                      const costText = reward.redemptionCost
                        ? `${reward.redemptionCost.units} pts`
                        : 'Reward';
                      return (
                        <Pressable
                          key={`suggested-reward-${reward.rewardId || label}-${idx}`}
                          style={styles.suggestionRow}
                          onPress={() => {
                            void handleSendText(`Redeem ${label}`);
                          }}
                        >
                          <View style={styles.suggestionRowMain}>
                            <Text style={styles.orderItemName}>{label}</Text>
                            {reward.description ? (
                              <Text style={styles.suggestionHintText}>
                                {reward.description}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.suggestionRowRight}>
                            <Text style={styles.orderItemPrice}>{costText}</Text>
                            <Text style={styles.suggestionActionLabel}>
                              Redeem
                            </Text>
                          </View>
                        </Pressable>
                      );
                    }
                    if (offer.discount != null) {
                      const discount = offer.discount;
                      const badgeLabel = formatDiscountBadge(discount);
                      return (
                        <Pressable
                          key={`suggested-discount-${
                            discount.name || discount.displayName || 'discount'
                          }-${idx}`}
                          style={styles.suggestionRow}
                          onPress={() => {
                            void handleSendText(
                              `Apply ${discount.displayName}`
                            );
                          }}
                        >
                          <View style={styles.suggestionRowMain}>
                            <Text style={styles.orderItemName}>
                              {discount.displayName}
                            </Text>
                            {discount.description !== '' ? (
                              <Text style={styles.suggestionHintText}>
                                {discount.description}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.suggestionRowRight}>
                            <Text style={styles.orderItemPrice}>
                              {badgeLabel}
                            </Text>
                            <Text style={styles.suggestionActionLabel}>
                              {discount.autoApply ? 'Auto' : 'Apply'}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    }
                    return null;
                  })}
                </View>
              ) : null}

              {suggestedItemsList.length > 0 ? (
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionSectionHeader}>
                    Suggested Items ({suggestedItemsList.length})
                  </Text>
                  {suggestedItemsList.map((item, idx) => (
                    <Pressable
                      key={`suggested-item-${getSuggestedItemKeyBase(item)}-${idx}`}
                      style={styles.suggestionRow}
                      onPress={() => {
                        void handleSendText(`Add ${item.displayName}`);
                      }}
                    >
                      <View style={styles.suggestionRowMain}>
                        <Text style={styles.orderItemName}>
                          {item.displayName}
                        </Text>
                        <Text style={styles.suggestionHintText}>
                          Tap to send &quot;Add {item.displayName}&quot;
                        </Text>
                      </View>
                      <View style={styles.suggestionRowRight}>
                        {item.basePrice != null ? (
                          <Text style={styles.orderItemPrice}>
                            {formatMoney(item.basePrice)}
                          </Text>
                        ) : null}
                        <Text style={styles.suggestionActionLabel}>+ Add</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {suggestedModifiersList.length > 0 ? (
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionSectionHeader}>
                    Suggested Modifiers ({suggestedModifiersList.length})
                  </Text>
                  {suggestedModifiersList.map((mod, idx) => (
                    <Pressable
                      key={`suggested-mod-${getSuggestedModifierKeyBase(mod)}-${idx}`}
                      style={styles.suggestionRow}
                      onPress={() => {
                        void handleSendText(mod.displayName);
                      }}
                    >
                      <View style={styles.suggestionRowMain}>
                        <Text style={styles.orderItemName}>
                          {mod.displayName}
                        </Text>
                        {mod.modifierGroupDisplayName ? (
                          <Text style={styles.suggestionHintText}>
                            Group: {mod.modifierGroupDisplayName}
                            {mod.alreadyIncluded ? ' • Included' : ''}
                          </Text>
                        ) : mod.alreadyIncluded ? (
                          <Text style={styles.suggestionHintText}>
                            Included
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.suggestionRowRight}>
                        {mod.priceAdjustment != null ? (
                          <Text style={styles.orderItemPrice}>
                            {formatMoney(mod.priceAdjustment)}
                          </Text>
                        ) : null}
                        <Text style={styles.suggestionActionLabel}>Select</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {suggestedActionsList.length > 0 ? (
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionSectionHeader}>
                    Suggested Actions ({suggestedActionsList.length})
                  </Text>
                  {suggestedActionsList.map((action, idx) => {
                    const query =
                      action.textInput?.text ?? action.displayName;
                    const actionKey = action.displayName || query || 'action';
                    return (
                      <Pressable
                        key={`suggested-action-${actionKey}-${idx}`}
                        style={styles.suggestionRow}
                        onPress={() => {
                          void handleSendText(query);
                        }}
                      >
                        <View style={styles.suggestionRowMain}>
                          <Text style={styles.orderItemName}>
                            {action.displayName}
                          </Text>
                          {action.textInput?.text &&
                          action.textInput.text !== action.displayName ? (
                            <Text style={styles.suggestionHintText}>
                              Sends &quot;{action.textInput.text}&quot;
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.suggestionRowRight}>
                          <Text style={styles.suggestionActionLabel}>Send</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Current Order / Cart */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>
              Current Order ({orderItems.length})
            </Text>
            {orderState != null ? (
              <Text style={styles.metaText}>Status: {orderState.status}</Text>
            ) : null}
          </View>
          {orderState?.detailedMessage ? (
            <Text style={styles.metaText}>{orderState.detailedMessage}</Text>
          ) : null}
          {loyaltyCustomer != null ? (
            <Text style={styles.loyaltyMemberText}>
              Loyalty Member: {loyaltyCustomer.name ?? 'Signed In'}
              {loyaltyCustomer.tier ? ` (${loyaltyCustomer.tier})` : ''}
              {loyaltyCustomer.loyaltyAmount
                ? ` • ${loyaltyCustomer.loyaltyAmount.units} pts`
                : ''}
            </Text>
          ) : null}

          {orderItems.length === 0 ? (
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          ) : (
            orderItems.map((item, idx) => (
              <View
                key={`${
                  item.uid ||
                  item.itemId ||
                  item.integrationAttributes?.externalItemId ||
                  item.displayName ||
                  'order-item'
                }-${idx}`}
                style={styles.orderItemRow}
              >
                <View style={styles.orderItemMain}>
                  <Text style={styles.orderItemName}>
                    {item.quantity}x {item.displayName}
                  </Text>
                  <Text style={styles.orderItemPrice}>
                    {formatMoney(item.totalPrice ?? item.basePrice)}
                  </Text>
                </View>
                {(item.modifierGroups ?? []).map((group, groupIdx) =>
                  group.modifiers.map((mod, modIdx) => (
                    <Text
                      key={`${
                        mod.uid ||
                        mod.modifierId ||
                        mod.integrationAttributes?.externalModifierId ||
                        mod.displayName ||
                        'mod'
                      }-${
                        group.modifierGroupId ||
                        group.integrationAttributes?.externalModifierGroupId ||
                        group.displayName ||
                        'group'
                      }-${groupIdx}-${modIdx}`}
                      style={styles.modifierText}
                    >
                      • {mod.modifierAction?.name ?? ''}{' '}
                      {mod.quantity > 1 ? `${mod.quantity}x ` : ''}
                      {mod.displayName}
                    </Text>
                  ))
                )}
              </View>
            ))
          )}

          {currentOrder?.priceInfo != null ? (
            <View style={styles.priceSummary}>
              {currentOrder.priceInfo.subtotalPrice != null ? (
                <Text style={styles.metaText}>
                  Subtotal: {formatMoney(currentOrder.priceInfo.subtotalPrice)}
                </Text>
              ) : null}
              {currentOrder.priceInfo.discount != null ? (
                <Text style={styles.metaText}>
                  Discount: -{formatMoney(currentOrder.priceInfo.discount)}
                </Text>
              ) : null}
              {currentOrder.priceInfo.taxPrice != null ? (
                <Text style={styles.metaText}>
                  Tax: {formatMoney(currentOrder.priceInfo.taxPrice)}
                </Text>
              ) : null}
              {currentOrder.priceInfo.tip != null ? (
                <Text style={styles.metaText}>
                  Tip: {formatMoney(currentOrder.priceInfo.tip)}
                </Text>
              ) : null}
              {currentOrder.priceInfo.totalPrice != null ? (
                <Text style={styles.totalPriceText}>
                  Total: {formatMoney(currentOrder.priceInfo.totalPrice)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Client Execution / Delegate Log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delegate & Event Log</Text>
          {delegateLogs.length === 0 ? (
            <Text style={styles.emptyText}>No delegate callbacks yet.</Text>
          ) : (
            delegateLogs.map((entry, idx) => (
              <Text key={`${idx}-${entry}`} style={styles.logLine}>
                {entry}
              </Text>
            ))
          )}
        </View>

        {/* Debug Simulation Panel (__DEV__ builds only) */}
        {typeof __DEV__ !== 'undefined' && __DEV__ ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                Simulate 0.7.0 Events (Debug)
              </Text>
              <Pressable
                style={styles.debugToggleButton}
                onPress={() => {
                  setIsDebugPanelOpen((prev) => !prev);
                }}
              >
                <Text style={styles.debugToggleText}>
                  {isDebugPanelOpen ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            {isDebugPanelOpen ? (
              <>
                <Text style={styles.metaText}>
                  Simulate synthetic 0.7.0 event payloads and delegate callbacks
                  locally without a live backend connection:
                </Text>
                <View style={styles.chipsContainer}>
                  {DEBUG_SCENARIOS.map(({ scenario, label }) => (
                    <Pressable
                      key={scenario}
                      style={styles.debugScenarioButton}
                      onPress={() => {
                        void handleSimulateDebugEvent(scenario);
                      }}
                    >
                      <Text style={styles.debugScenarioButtonText}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
    marginBottom: 12,
  },
  placeholderNotice: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  placeholderBody: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorMessage: {
    fontSize: 13,
    color: '#7f1d1d',
    marginTop: 2,
  },
  errorGuidance: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: '#d1fae5',
  },
  badgePaused: {
    backgroundColor: '#fef3c7',
  },
  badgeIdle: {
    backgroundColor: '#e5e7eb',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
  },
  metaText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  meterTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  togglePill: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  togglePillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  togglePillTextActive: {
    color: '#065f46',
  },
  endSessionBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  endSessionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 6,
  },
  topSpacing: {
    marginTop: 10,
  },
  transcriptText: {
    fontSize: 14,
    color: '#111827',
    marginTop: 2,
  },
  agentText: {
    fontSize: 14,
    color: '#1d4ed8',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  suggestionSection: {
    marginTop: 8,
  },
  suggestionSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 6,
  },
  suggestionRowMain: {
    flex: 1,
    paddingRight: 8,
  },
  suggestionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionHintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  suggestionActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
  loyaltyMemberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginTop: 4,
  },
  orderItemRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modifierText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
    marginLeft: 8,
  },
  priceSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  logLine: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'monospace',
    marginTop: 3,
  },
  debugToggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  debugToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  debugScenarioButton: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debugScenarioButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5b21b6',
  },
});

export default App;
