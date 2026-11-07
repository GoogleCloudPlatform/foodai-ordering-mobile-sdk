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

type Listener = (payload: unknown) => void | Promise<void>;

interface MockNativeModule {
  initialize: jest.Mock<Promise<void>, [unknown]>;
  respondToAuthTokenRequest: jest.Mock<void, [string, unknown]>;
  respondToFinalizeOrder: jest.Mock<void, [string, unknown]>;
  respondToSubmitOrder: jest.Mock<void, [string, unknown]>;
  respondToOrderPrices: jest.Mock<void, [string, unknown]>;
  respondToOrderStatus: jest.Mock<void, [string, unknown]>;
  respondToLoyalty: jest.Mock<void, [string, unknown]>;
  rejectDelegateRequest: jest.Mock<void, [string, string]>;
  requestMicrophonePermission: jest.Mock<Promise<boolean>, []>;
  startSession: jest.Mock<Promise<string>, [unknown]>;
  sendText: jest.Mock<Promise<void>, [string]>;
  updateOrderState: jest.Mock<Promise<void>, [unknown]>;
  sendCustomizedInput: jest.Mock<Promise<void>, [unknown]>;
  pauseMicrophone: jest.Mock<Promise<void>, []>;
  resumeMicrophone: jest.Mock<Promise<void>, []>;
  endSession: jest.Mock<Promise<void>, [boolean]>;
  release: jest.Mock<Promise<void>, []>;
  __emit: (emitterName: string, payload: unknown) => Promise<void>;
  __listenerCount: (emitterName: string) => number;
  __resetAll: () => void;
}

jest.mock('../NativeFoodOrdering', () => {
  const emitterNames = [
    'onSessionStarted',
    'onOrderUpdate',
    'onSessionEnded',
    'onTurnCompleted',
    'onError',
    'onSpeechRecognition',
    'onAgentText',
    'onSuggestedOptions',
    'onRecommendedOrders',
    'onAgentEvent',
    'onInterruptionSignal',
    'onSessionLifecycle',
    'onAudioLevel',
    'onAuthTokenRequested',
    'onFinalizeOrderRequested',
    'onSubmitOrderRequested',
    'onOrderPricesRequested',
    'onOrderStatusRequested',
    'onLoyaltyRequested',
  ] as const;

  const listenerBuckets = new Map<string, Set<Listener>>();
  for (const name of emitterNames) {
    listenerBuckets.set(name, new Set<Listener>());
  }

  const emitters: Record<
    string,
    (listener: Listener) => { remove: () => void }
  > = {};
  for (const name of emitterNames) {
    emitters[name] = (listener: Listener) => {
      const bucket = listenerBuckets.get(name)!;
      bucket.add(listener);
      return {
        remove: () => {
          bucket.delete(listener);
        },
      };
    };
  }

  const mockModule: Record<string, unknown> = {
    ...emitters,
    initialize: jest.fn().mockResolvedValue(undefined),
    respondToAuthTokenRequest: jest.fn(),
    respondToFinalizeOrder: jest.fn(),
    respondToSubmitOrder: jest.fn(),
    respondToOrderPrices: jest.fn(),
    respondToOrderStatus: jest.fn(),
    respondToLoyalty: jest.fn(),
    rejectDelegateRequest: jest.fn(),
    requestMicrophonePermission: jest.fn().mockResolvedValue(true),
    startSession: jest.fn().mockResolvedValue('mock-session-070'),
    sendText: jest.fn().mockResolvedValue(undefined),
    updateOrderState: jest.fn().mockResolvedValue(undefined),
    sendCustomizedInput: jest.fn().mockResolvedValue(undefined),
    pauseMicrophone: jest.fn().mockResolvedValue(undefined),
    resumeMicrophone: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    __emit: async (emitterName: string, payload: unknown) => {
      const bucket = listenerBuckets.get(emitterName);
      if (!bucket) {
        throw new Error(`Unknown mock emitter: ${emitterName}`);
      }
      for (const listener of Array.from(bucket)) {
        await listener(payload);
      }
    },
    __listenerCount: (emitterName: string) =>
      listenerBuckets.get(emitterName)?.size ?? 0,
    __resetAll: () => {
      for (const bucket of listenerBuckets.values()) {
        bucket.clear();
      }
      jest.clearAllMocks();
    },
  };

  return {
    __esModule: true,
    default: mockModule,
  };
});

import {
  FoodOrderingClient,
  NativeFoodOrdering,
  type AgentEventPayload,
  type FoodOrderingServiceEvent,
  type LoyaltyRequest,
  type OrderUpdateEvent,
  type SessionEndedEvent,
  type SuggestedOptionsEvent,
} from '../index';

const mockNative = NativeFoodOrdering as unknown as MockNativeModule;

describe('FoodOrderingClient (0.7.0)', () => {
  let client: FoodOrderingClient;

  beforeEach(() => {
    mockNative.__resetAll();
    client = new FoodOrderingClient();
  });

  afterEach(async () => {
    await client.release();
  });

  it('normalizes 0.7.0 initialize and startSession payloads, timestamps, featureGates alias, and opaque maps', async () => {
    await client.initialize({
      gcpProjectName: 'demo-project',
      location: 'global',
      brand: 'demo-brand',
    });

    expect(mockNative.initialize).toHaveBeenCalledWith({
      gcpProjectName: 'demo-project',
      location: 'global',
      brand: 'demo-brand',
      __hasLoyaltyHandler: false,
    });

    // Starting a session before registering a delegate rejects clearly
    await expect(
      client.startSession({ storeId: 'store-42' })
    ).rejects.toThrow(/FoodOrderingDelegate with handleAuthTokenRequest/);

    // Register a delegate with handleLoyalty after initialize() and verify startSession upgrades __hasLoyaltyHandler
    client.setDelegate({
      handleAuthTokenRequest: async () => 'token-456',
      handleLoyalty: async () => ({}),
    });

    const sessionId = await client.startSession({
      storeId: 'store-42',
      userInfo: {
        preferredName: 'Sam',
        location: {
          coordinates: { latitude: 37.422, longitude: -122.084 },
          captureTime: { seconds: 1762272000.9 },
        },
      },
      featureGates: {
        storeSelectionEnabled: true,
        offersAndLoyaltyEnabled: true,
      },
      initialOrder: {
        items: [],
        fulfillment: {
          fulfillmentMethod: 'FULFILLMENT_METHOD_DRIVE_THRU',
          createTime: { seconds: 1762272001 },
          targetFulfillmentTime: { seconds: 1762272600, nanos: 500 },
        },
        customIntegrationAttributes: {
          // Opaque partner keys named `seconds` or `units` must NOT be mutated
          seconds: 99,
          units: 'raw-partner-string',
        },
      },
    });

    expect(sessionId).toBe('mock-session-070');
    expect(mockNative.startSession).toHaveBeenCalledWith({
      storeId: 'store-42',
      userInfo: {
        preferredName: 'Sam',
        location: {
          coordinates: { latitude: 37.422, longitude: -122.084 },
          captureTime: { seconds: 1762272000, nanos: 0 },
        },
      },
      featureGate: {
        storeSelectionEnabled: true,
        offersAndLoyaltyEnabled: true,
      },
      initialOrder: {
        items: [],
        fulfillment: {
          fulfillmentMethod: 'FULFILLMENT_METHOD_DRIVE_THRU',
          createTime: { seconds: 1762272001, nanos: 0 },
          targetFulfillmentTime: { seconds: 1762272600, nanos: 500 },
        },
        customIntegrationAttributes: {
          seconds: 99,
          units: 'raw-partner-string',
        },
      },
      __hasLoyaltyHandler: true,
    });

    // Also verify sendCustomizedInput preserves parameters without injecting nanos
    await client.sendCustomizedInput({
      parameters: { seconds: '15', lane: '2' },
    });
    expect(mockNative.sendCustomizedInput).toHaveBeenCalledWith({
      seconds: '15',
      lane: '2',
    });
  });

  it('delivers discriminated AgentEvent union variants (STORE_CHANGE, RESTART_ORDER, UNKNOWN)', async () => {
    const received: AgentEventPayload[] = [];
    const delegateEvents: FoodOrderingServiceEvent[] = [];

    client.setDelegate({
      handleAuthTokenRequest: async () => 'tok',
      handleEvent: (event) => delegateEvents.push(event),
    });
    client.onAgentEvent((payload) => received.push(payload));

    await mockNative.__emit('onAgentEvent', {
      sessionId: 'sess-1',
      agentEvent: {
        type: 'STORE_CHANGE',
        store: 'projects/demo/locations/global/stores/store-99',
      },
    });
    await mockNative.__emit('onAgentEvent', {
      sessionId: 'sess-1',
      agentEvent: {
        type: 'RESTART_ORDER',
        confirmationStep: true,
      },
    });
    await mockNative.__emit('onAgentEvent', {
      sessionId: 'sess-1',
      agentEvent: {
        type: 'UNKNOWN',
      },
    });

    expect(received).toEqual([
      {
        sessionId: 'sess-1',
        agentEvent: {
          type: 'STORE_CHANGE',
          store: 'projects/demo/locations/global/stores/store-99',
        },
      },
      {
        sessionId: 'sess-1',
        agentEvent: {
          type: 'RESTART_ORDER',
          confirmationStep: true,
        },
      },
      {
        sessionId: 'sess-1',
        agentEvent: {
          type: 'UNKNOWN',
        },
      },
    ]);
    expect(delegateEvents).toHaveLength(3);
    expect(delegateEvents[0]).toEqual({
      type: 'agentEvent',
      sessionId: 'sess-1',
      agentEvent: {
        type: 'STORE_CHANGE',
        store: 'projects/demo/locations/global/stores/store-99',
      },
    });
  });

  it('delivers REQUESTED_STORE_SELECTION, UNKNOWN, and promotes endSession.storeSchedule on sessionEnded', async () => {
    const endedEvents: SessionEndedEvent[] = [];
    client.onSessionEnded((payload) => endedEvents.push(payload));

    await mockNative.__emit('onSessionEnded', {
      sessionId: 'sess-1',
      endSession: {
        type: 'REQUESTED_STORE_SELECTION',
        reason: 'Customer asked to switch location on screen.',
      },
    });

    await mockNative.__emit('onSessionEnded', {
      sessionId: 'sess-1',
      endSession: {
        type: 'STORE_CLOSED',
        reason: 'Store closed.',
        storeSchedule: {
          days: ['MONDAY', 'TUESDAY', 'UNKNOWN'],
          timeRanges: [
            {
              startTime: { hours: 7, minutes: 0 },
              endTime: { hours: 22, minutes: 0 },
            },
          ],
        },
      },
    });

    await mockNative.__emit('onSessionEnded', {
      sessionId: 'sess-1',
      endSession: {
        type: 'UNKNOWN',
        reason: 'Unrecognized server enum value.',
      },
    });

    expect(endedEvents[0]?.endSession.type).toBe('REQUESTED_STORE_SELECTION');
    expect(endedEvents[1]?.endSession.type).toBe('STORE_CLOSED');
    expect(endedEvents[1]?.storeSchedule?.days).toEqual([
      'MONDAY',
      'TUESDAY',
      'UNKNOWN',
    ]);
    expect(endedEvents[1]?.endSession.storeSchedule?.days).toEqual([
      'MONDAY',
      'TUESDAY',
      'UNKNOWN',
    ]);
    expect(endedEvents[2]?.endSession.type).toBe('UNKNOWN');
  });

  it('normalizes iOS string Money/LoyaltyAmount units and SuggestedOffers / OrderPriceInfo.tip payloads', async () => {
    const suggestedEvents: SuggestedOptionsEvent[] = [];
    const orderUpdates: OrderUpdateEvent[] = [];

    client.onSuggestedOptions((payload) => suggestedEvents.push(payload));
    client.onOrderUpdate((payload) => orderUpdates.push(payload));

    // Simulate iOS Codable string-encoded Money.units & LoyaltyAmount.units
    await mockNative.__emit('onSuggestedOptions', {
      sessionId: 'sess-2',
      suggestedOptions: {
        suggestedOffers: {
          offers: [
            {
              loyaltyReward: {
                rewardId: 'rew-drink',
                displayName: 'Free Medium Drink',
                redemptionCost: { units: '250' },
                description: 'Redeem 250 pts',
                expireTime: { seconds: '1893456000', nanos: 0 },
                customIntegrationAttributes: { units: 'keep-as-string' },
              },
            },
            {
              discount: {
                name: 'discounts/save20',
                displayName: '20% Off',
                type: 'PERCENT_OFF',
                scope: 'ORDER',
                percent: 20,
                maxDiscountValue: {
                  currencyCode: 'USD',
                  units: '5',
                  nanos: 0,
                },
                autoApply: false,
                description: 'Save up to $5',
              },
            },
            {},
          ],
        },
      },
    });

    await mockNative.__emit('onOrderUpdate', {
      sessionId: 'sess-2',
      updatedOrderState: {
        items: [],
        changed: true,
        status: 'UNKNOWN',
        detailedMessage: '',
      },
      order: {
        items: [],
        priceInfo: {
          subtotalPrice: { currencyCode: 'USD', units: '10', nanos: 990000000 },
          tip: { currencyCode: 'USD', units: '2', nanos: 500000000 },
          totalPrice: { currencyCode: 'USD', units: '13', nanos: 490000000 },
        },
      },
    });

    const offers =
      suggestedEvents[0]?.suggestedOptions.suggestedOffers?.offers ?? [];
    expect(offers).toHaveLength(3);

    const firstOffer = offers[0];
    if (firstOffer && 'loyaltyReward' in firstOffer && firstOffer.loyaltyReward) {
      expect(firstOffer.loyaltyReward.redemptionCost?.units).toBe(250);
      expect(firstOffer.loyaltyReward.expireTime?.seconds).toBe(1893456000);
      expect(
        firstOffer.loyaltyReward.customIntegrationAttributes?.units
      ).toBe('keep-as-string');
    } else {
      throw new Error('Expected loyaltyReward offer variant');
    }

    const secondOffer = offers[1];
    if (secondOffer && 'discount' in secondOffer && secondOffer.discount) {
      expect(secondOffer.discount.maxDiscountValue?.units).toBe(5);
      expect(secondOffer.discount.type).toBe('PERCENT_OFF');
    } else {
      throw new Error('Expected discount offer variant');
    }

    expect(offers[2]).toEqual({});
    expect(orderUpdates[0]?.updatedOrderState.status).toBe('UNKNOWN');
    expect(orderUpdates[0]?.order?.priceInfo?.tip).toEqual({
      currencyCode: 'USD',
      units: 2,
      nanos: 500000000,
    });
  });

  it('bridges handleLoyalty round-trips for member lookup, guest {}, omitted handler, and thrown errors', async () => {
    // 1. Omitted handleLoyalty -> responds with { __unhandled: true }
    client.setDelegate({
      handleAuthTokenRequest: async () => 'tok',
    });

    await mockNative.__emit('onLoyaltyRequested', {
      requestId: 'req-unhandled',
      request: {
        category: 'LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER',
        phoneNumber: '+15550100001',
      },
    });
    expect(mockNative.respondToLoyalty).toHaveBeenLastCalledWith(
      'req-unhandled',
      { __unhandled: true }
    );

    // 2. Member lookup happy path (also normalizing incoming LoyaltyAmount.units & outgoing expireTime.nanos)
    const receivedRequests: LoyaltyRequest[] = [];
    client.setDelegate({
      handleAuthTokenRequest: async () => 'tok',
      handleLoyalty: async (request) => {
        receivedRequests.push(request);
        if (request.phoneNumber === '+15550000000') {
          return {};
        }
        if (request.code === 'THROW_ERR') {
          throw new Error('CRM backend timeout');
        }
        return {
          category: request.category,
          loyaltyMetadata: {
            customer: {
              name: 'Alex',
              loyaltyAmount: { units: 500 },
            },
            availableRewards: [
              {
                rewardId: 'rew-100',
                displayName: 'Free Slush',
                expireTime: { seconds: 1893456000 },
              },
            ],
          },
          clientExecutionStatus: {
            httpStatusCode: 200,
            rejectionReason: 'REJECTION_REASON_UNSPECIFIED',
          },
        };
      },
    });

    await mockNative.__emit('onLoyaltyRequested', {
      requestId: 'req-member',
      request: {
        category: 'LOYALTY_ACTION_CATEGORY_REDEEM_POINTS',
        loyaltyAmount: { units: '250' },
      },
    });
    expect(receivedRequests[0]?.loyaltyAmount?.units).toBe(250);
    expect(mockNative.respondToLoyalty).toHaveBeenLastCalledWith('req-member', {
      category: 'LOYALTY_ACTION_CATEGORY_REDEEM_POINTS',
      loyaltyMetadata: {
        customer: {
          name: 'Alex',
          loyaltyAmount: { units: 500 },
        },
        availableRewards: [
          {
            rewardId: 'rew-100',
            displayName: 'Free Slush',
            expireTime: { seconds: 1893456000, nanos: 0 },
          },
        ],
      },
      clientExecutionStatus: {
        httpStatusCode: 200,
        rejectionReason: 'REJECTION_REASON_UNSPECIFIED',
      },
    });

    // 3. Guest empty {} response
    await mockNative.__emit('onLoyaltyRequested', {
      requestId: 'req-guest',
      request: {
        category: 'LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER',
        phoneNumber: '+15550000000',
      },
    });
    expect(mockNative.respondToLoyalty).toHaveBeenLastCalledWith(
      'req-guest',
      {}
    );

    // 4. Thrown error -> { __error: true, errorMessage }
    await mockNative.__emit('onLoyaltyRequested', {
      requestId: 'req-error',
      request: {
        category: 'LOYALTY_ACTION_CATEGORY_ADD_CODE',
        code: 'THROW_ERR',
      },
    });
    expect(mockNative.respondToLoyalty).toHaveBeenLastCalledWith('req-error', {
      __error: true,
      errorMessage: 'CRM backend timeout',
    });
  });

  it('normalizes 0.7.0 handleFinalizeOrder and handleSubmitOrder Duration/Money responses', async () => {
    client.setDelegate({
      handleAuthTokenRequest: async () => 'tok',
      handleFinalizeOrder: async () => ({
        paymentFlowEnabled: true,
        totalAmountDue: { currencyCode: 'USD', units: 8, nanos: 500000000 },
        orderPriceInfo: {
          tip: { currencyCode: 'USD', units: 1, nanos: 500000000 },
        },
      }),
      handleSubmitOrder: async () => ({
        success: true,
        externalOrderId: 'POS-9001',
        estimatedReadyDuration: { seconds: 420 },
      }),
    });

    await mockNative.__emit('onFinalizeOrderRequested', {
      requestId: 'fin-1',
      request: {},
    });
    expect(mockNative.respondToFinalizeOrder).toHaveBeenCalledWith('fin-1', {
      paymentFlowEnabled: true,
      totalAmountDue: { currencyCode: 'USD', units: 8, nanos: 500000000 },
      orderPriceInfo: {
        tip: { currencyCode: 'USD', units: 1, nanos: 500000000 },
      },
    });

    await mockNative.__emit('onSubmitOrderRequested', {
      requestId: 'sub-1',
      request: {},
    });
    expect(mockNative.respondToSubmitOrder).toHaveBeenCalledWith('sub-1', {
      success: true,
      externalOrderId: 'POS-9001',
      estimatedReadyDuration: { seconds: 420, nanos: 0 },
    });
  });

  it('enforces delegate-only auth token fetching and rejects missing, blank, or throwing callbacks', async () => {
    expect('setAuthToken' in client).toBe(false);
    expect('setAuthTokenProvider' in client).toBe(false);
    expect('simulateDebugEvent' in client).toBe(false);

    expect(() =>
      client.setDelegate({} as unknown as Parameters<typeof client.setDelegate>[0])
    ).toThrow(/handleAuthTokenRequest is required/);

    await client.initialize({
      gcpProjectName: 'demo-project',
      location: 'global',
      brand: 'demo-brand',
    });

    // Missing delegate rejects onAuthTokenRequested clearly
    await mockNative.__emit('onAuthTokenRequested', {
      requestId: 'auth-missing',
      request: {},
    });
    expect(mockNative.rejectDelegateRequest).toHaveBeenLastCalledWith(
      'auth-missing',
      expect.stringContaining('No FoodOrderingDelegate registered')
    );

    // Valid delegate returning structured token + expiry
    client.setDelegate({
      handleAuthTokenRequest: async () => ({
        token: 'bearer-070',
        expiry: '2026-11-06T23:00:00Z',
      }),
    });
    await mockNative.__emit('onAuthTokenRequested', {
      requestId: 'auth-ok',
      request: {},
    });
    expect(mockNative.respondToAuthTokenRequest).toHaveBeenCalledWith(
      'auth-ok',
      {
        token: 'bearer-070',
        expiry: '2026-11-06T23:00:00Z',
      }
    );

    // Blank token rejected
    client.setDelegate({
      handleAuthTokenRequest: async () => '   ',
    });
    await mockNative.__emit('onAuthTokenRequested', {
      requestId: 'auth-blank',
      request: {},
    });
    expect(mockNative.rejectDelegateRequest).toHaveBeenLastCalledWith(
      'auth-blank',
      'handleAuthTokenRequest returned an empty auth token.'
    );
  });
});
