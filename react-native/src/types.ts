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

/**
 * Minimum severity level of messages that the Food Ordering AI Agent SDK logs.
 *
 * Aligned with iOS `LogLevel` (`.debug`, `.info`, `.warning`, `.error`, `.none`)
 * and Android `java.util.logging.Level` (`Level.FINE`, `Level.INFO`,
 * `Level.WARNING`, `Level.SEVERE`, `Level.OFF`). Defaults to `'error'` / `'SEVERE'`.
 */
export type LogLevel =
  | 'debug'
  | 'info'
  | 'warning'
  | 'error'
  | 'none'
  | 'DEBUG'
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'NONE'
  | 'SEVERE'
  | 'OFF';

/**
 * An authorization token used to authenticate the Food Ordering AI Agent
 * bidirectional gRPC stream.
 * Aligned with Android `FoodOrderingClientAuthTokenResponse` and iOS `FoodOrderingClientAuthToken`.
 */
export interface FoodOrderingClientAuthToken {
  /** Non-blank OAuth2 / Bearer token string. */
  token: string;
  /**
   * Optional expiration timestamp as an ISO 8601 string
   * (e.g. `"2026-10-16T18:34:30Z"`).
   */
  expiry?: string;
}

/** Alias preserving backward compatibility for `FoodOrderingClientAuthToken`. */
export type AuthTokenResponse = FoodOrderingClientAuthToken;

/**
 * Callback invoked when the native SDK requests a fresh auth token for opening
 * or resuming the bidirectional ordering stream.
 */
export type AuthTokenProvider = () => Promise<
  FoodOrderingClientAuthToken | string
>;

/**
 * A customized input to send to the ordering agent.
 * Aligned with Android `CustomizedInput` and iOS `CustomizedInput`.
 */
export interface CustomizedInput {
  /** Key-value input parameters to send to the agent. */
  parameters: Record<string, string>;
}

/**
 * Request sent by the agent to finalize the order before payment/submission.
 * Aligned with Android `FinalizeOrderRequest` and iOS `FinalizeOrderRequest`.
 */
export type FinalizeOrderRequest = Record<string, never>;

/**
 * Response returned by the host application when finalizing an order.
 * Aligned with Android `FinalizeOrderResponse` and iOS `FinalizeOrderResponse`.
 */
export interface FinalizeOrderResponse {
  /** Whether the payment flow is enabled for this session. */
  paymentFlowEnabled: boolean;
  /** Additional payment information of the user, if available. */
  paymentInfo?: PaymentInfo;
}

/**
 * Request sent by the agent to submit the order.
 * Aligned with Android `SubmitOrderRequest` and iOS `SubmitOrderRequest`.
 */
export interface SubmitOrderRequest {
  /** Payment information for submitting the order. */
  paymentInfo?: SubmitOrderPaymentInfo;
  /** Loyalty information for submitting the order. */
  loyaltyInfo?: LoyaltyInfo;
  /** Tip amount to include when submitting the order. */
  tip?: Money;
}

/**
 * Response returned by the host application when submitting an order.
 * Aligned with Android `SubmitOrderResponse` and iOS `SubmitOrderResponse`.
 */
export interface SubmitOrderResponse {
  /** Whether the order submission succeeded. */
  success: boolean;
}

/**
 * Request sent by the agent to retrieve prices (subtotal, tax, discounts, total) for an order.
 * Aligned with Android `OrderPricesRequest` and iOS `OrderPricesRequest`.
 */
export interface OrderPricesRequest {
  /** The candidate order to calculate prices for. */
  order?: Order;
}

/**
 * Response returned by the host application when retrieving order prices.
 * Aligned with Android `OrderPricesResponse` and iOS `OrderPricesResponse`.
 */
export interface OrderPricesResponse {
  /** Whether the order prices were successfully retrieved. */
  success: boolean;
  /** Pricing breakdown including subtotal, tax, discount, fees, and total price. */
  orderPriceInfo?: OrderPriceInfo;
}

/**
 * Request sent by the agent to retrieve the status of an order.
 * Aligned with Android `OrderStatusRequest` and iOS `OrderStatusRequest`.
 */
export type OrderStatusRequest = Record<string, never>;

/**
 * Response returned by the host application when retrieving order status.
 * Aligned with Android `OrderStatusResponse` and iOS `OrderStatusResponse`.
 */
export interface OrderStatusResponse {
  /** Whether the order status was successfully retrieved. */
  success: boolean;
}

/**
 * Boundary delegate interface between `FoodOrderingClient` and the React Native host application.
 *
 * Mirrors iOS `FoodOrderingClientDelegate` and Android `FoodOrderingClient` handler interfaces
 * (`FoodOrderingClientAuthTokenRequestHandler`, `FoodOrderingClientFinalizeOrderHandler`,
 * `FoodOrderingClientSubmitOrderHandler`, `FoodOrderingClientOrderPricesHandler`, and
 * `FoodOrderingClientOrderStatusHandler`).
 *
 * If an optional client execution callback (`handleFinalizeOrder`, `handleOrderPrices`,
 * `handleSubmitOrder`, or `handleOrderStatus`) is omitted, both Android and iOS bridges send
 * the standard default `ClientExecutionResult` (`finalizeOrder` defaults from
 * `sessionConfig.userInfo.paymentInfo`, and `submitOrder`/`orderPrices`/`orderStatus` respond
 * with `success: false`).
 */
export interface FoodOrderingDelegate {
  /**
   * Handles a request for an auth token to connect or reconnect to the ordering stream.
   */
  handleAuthTokenRequest(): Promise<FoodOrderingClientAuthToken | string>;

  /**
   * Handles a request from the agent to finalize the order.
   */
  handleFinalizeOrder?(
    request: FinalizeOrderRequest
  ): Promise<FinalizeOrderResponse>;

  /**
   * Handles a request from the agent to calculate order prices.
   */
  handleOrderPrices?(request: OrderPricesRequest): Promise<OrderPricesResponse>;

  /**
   * Handles a request from the agent to submit the order.
   */
  handleSubmitOrder?(request: SubmitOrderRequest): Promise<SubmitOrderResponse>;

  /**
   * Handles a request from the agent to retrieve the order status.
   */
  handleOrderStatus?(request: OrderStatusRequest): Promise<OrderStatusResponse>;

  /**
   * Handles updates to the normalized microphone audio level in the range `0.0..1.0`.
   */
  handleAudioLevel?(audioLevel: number): void;

  /**
   * Optional unified handler called for every `FoodOrderingServiceEvent` (`OrderResponse`)
   * emitted by the ordering session.
   */
  handleEvent?(event: FoodOrderingServiceEvent): void;
}

/**
 * SDK-level configuration settings for `FoodOrderingClient`.
 * Aligned with Android `FoodOrderingClientConfig` and iOS `FoodOrderingClientConfig`
 * (`gcpProjectName`, `location`, `brand`, `logLevel`).
 */
export interface FoodOrderingClientConfig {
  /** The Google Cloud project ID/name associated with the conversational agent. */
  gcpProjectName: string;
  /** The Google Cloud location (e.g., `"global"` or `"us-central1"`). */
  location: string;
  /** The merchant brand identifier. */
  brand: string;
  /**
   * Minimum severity of log events recorded by the native SDK.
   * Defaults to `'error'` (`Level.SEVERE` on Android, `.error` on iOS).
   */
  logLevel?: LogLevel;
  /**
   * Optional initial auth token to pre-seed the native client. For long-lived
   * sessions and automatic foreground reconnection, prefer `delegate` or `authTokenProvider`.
   */
  authToken?: string;
  /** Optional ISO 8601 expiration timestamp for `authToken`. */
  authTokenExpiry?: string;
  /**
   * Optional delegate handling auth token requests, client execution requests
   * (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`), audio levels,
   * and session events. Can also be set via `foodOrderingClient.setDelegate(delegate)`.
   */
  delegate?: FoodOrderingDelegate;
  /**
   * Optional standalone auth token provider if a full `delegate` is not supplied.
   */
  authTokenProvider?: AuthTokenProvider;
}

/**
 * Session-level configuration settings used to start a food ordering session.
 * Aligned with Android `OrderingSessionConfig` and iOS `OrderingSessionConfig`.
 * Note: `ClientAppInfo` is automatically populated internally by the native SDKs.
 */
export interface OrderingSessionConfig {
  /** The store identifier where the order is being placed. */
  storeId: string;
  /**
   * Optional custom session ID. When omitted, the native SDK generates a new
   * `"android-session-<UUID>"` or `"ios-session-<UUID>"` automatically.
   */
  sessionId?: string;
  /** Optional daypart identifier (e.g., `"breakfast"`, `"lunch"`, `"dinner"`). */
  daypartId?: string;
  /** Optional user profile, loyalty, payment, and saved delivery address info. */
  userInfo?: UserInfo;
  /** Optional initial cart/order state when starting or resuming a session. */
  initialOrder?: Order;
  /** Optional feature gates to enable or disable specific ordering capabilities. */
  featureGate?: FeatureGates;
  /** Optional initial text utterance to kick off the conversation. */
  initialUtterance?: string;
}

/**
 * Feature gates to enable or disable specific food ordering capabilities.
 */
export interface FeatureGates {
  triggerOfferEngineOnDemand?: boolean;
  triggerLoyaltyOnDemand?: boolean;
  triggerOrderMediaAssistantOnDemand?: boolean;
  menuResponseEnabled?: boolean;
  revampedPaymentFlowEnabled?: boolean;
  enableOrderStatusRetrieval?: boolean;
  updatedOrderStateEnabled?: boolean;
}

/**
 * Represents a monetary value (`google.type.Money`).
 */
export interface Money {
  /** Three-letter ISO 4217 currency code (e.g., `"USD"`). */
  currencyCode: string;
  /** Whole units of the amount. */
  units: number;
  /** Number of nano (`10^-9`) units of the amount. */
  nanos?: number;
}

/**
 * Represents an image asset associated with a menu item or modifier.
 */
export interface Image {
  sourceUri: string;
}

/**
 * Geographic coordinates in degrees (`google.type.LatLng`).
 */
export interface LatLng {
  latitude?: number;
  longitude?: number;
}

/**
 * Represents a postal address (`google.type.PostalAddress`).
 */
export interface PostalAddress {
  revision?: number;
  regionCode?: string;
  languageCode?: string;
  postalCode?: string;
  sortingCode?: string;
  administrativeArea?: string;
  locality?: string;
  sublocality?: string;
  addressLines?: string[];
  recipients?: string[];
  organization?: string;
}

/**
 * Represents a customer's delivery address.
 */
export interface DeliveryAddress {
  address?: PostalAddress;
  validationStatus?: string;
  coordinates?: LatLng;
}

/**
 * Supported payment method types.
 */
export type PaymentMethod =
  | 'PAYMENT_METHOD_UNSPECIFIED'
  | 'PAYMENT_METHOD_CREDIT_CARD'
  | 'PAYMENT_METHOD_CASH'
  | 'CREDIT_CARD'
  | 'CASH';

/**
 * Payment method details for the user or order.
 * Aligned with Android `PaymentInfo` and iOS `PaymentInfo`.
 */
export interface PaymentInfo {
  creditCardLastFourDigits?: string;
  paymentMethod?: PaymentMethod | string;
}

/**
 * Payment information provided when submitting an order.
 * Aligned with Android `SubmitOrderPaymentInfo` and iOS `SubmitOrderPaymentInfo`.
 *
 * Note: Only `SubmitOrderPaymentInfo` (on `SubmitOrderRequest.paymentInfo`)
 * includes `creditCardCvv`.
 */
export interface SubmitOrderPaymentInfo {
  creditCardLastFourDigits?: string;
  creditCardCvv?: string;
  paymentMethod?: PaymentMethod | string;
}

/**
 * Represents tipping information.
 */
export interface TippingInfo {
  amount?: Money;
  /** Percentage in basis points (e.g., `1500` = 15.0%). */
  percentageBps?: number;
}

/**
 * Represents a quantity of loyalty points.
 */
export interface LoyaltyAmount {
  units: number;
}

/**
 * Customer loyalty account information.
 */
export interface LoyaltyInfo {
  loyaltyAmount?: LoyaltyAmount;
}

/**
 * Past order entry in `UserInfo`.
 */
export interface PastOrder {
  order?: Order;
}

/**
 * Personal information of the end user shared with the Food AI agent.
 * Aligned with Android `UserInfo` and iOS `UserInfo`.
 */
export interface UserInfo {
  preferredName?: string;
  phoneNumber?: string;
  userId?: string;
  paymentInfo?: PaymentInfo;
  pastOrders?: PastOrder[];
  loyaltyInfo?: LoyaltyInfo;
  savedDeliveryAddress?: DeliveryAddress;
}

/**
 * Downstream integration metadata for a line item.
 */
export interface ItemIntegrationAttributes {
  customIntegrationAttributes?: Record<string, unknown>;
  externalItemId?: string;
}

/**
 * Downstream integration metadata for a modifier group.
 */
export interface ModifierGroupIntegrationAttributes {
  customIntegrationAttributes?: Record<string, unknown>;
  externalModifierGroupId?: string;
}

/**
 * Downstream integration metadata for a modifier.
 */
export interface ModifierIntegrationAttributes {
  customIntegrationAttributes?: Record<string, unknown>;
  externalModifierId?: string;
}

/**
 * Specifies the action associated with an applied `OrderModifier`
 * (e.g., `"ADD"`, `"NO"`, `"EXTRA"`, `"SIDE"`, `"LIGHT"`).
 */
export interface OrderModifierAction {
  name?: string;
}

/**
 * Represents an individual customization modifier applied to an item.
 */
export interface OrderModifier {
  uid?: string;
  modifierId: string;
  displayName: string;
  priceAdjustment?: Money;
  quantity: number;
  modifierAction?: OrderModifierAction;
  image?: Image;
  modifierGroups?: OrderModifierGroup[];
  isDefault?: boolean;
  integrationAttributes?: ModifierIntegrationAttributes;
}

/**
 * Represents a customization group (modifier group) applied to a menu item.
 */
export interface OrderModifierGroup {
  modifierGroupId: string;
  displayName: string;
  modifiers: OrderModifier[];
  integrationAttributes?: ModifierGroupIntegrationAttributes;
}

/**
 * Represents a single line item within an order.
 */
export interface OrderItem {
  uid?: string;
  itemId: string;
  displayName: string;
  image?: Image;
  basePrice?: Money;
  modifierGroups?: OrderModifierGroup[];
  quantity: number;
  integrationAttributes?: ItemIntegrationAttributes;
  totalPrice?: Money;
  categoryIds?: string[];
  isPending?: boolean;
}

/**
 * Represents an item satisfying a requirement for an applied offer.
 */
export interface FulfilledItem {
  lineItemUid?: string;
  quantity?: number;
}

/**
 * Details tracking the status and item mapping for an active promotion.
 */
export interface AppliedOffer {
  offerId?: string;
  state?: string;
  fulfilledItems?: FulfilledItem[];
}

/**
 * Loyalty program customer profile details.
 */
export interface CustomerInformation {
  name?: string;
  loyaltyAmount?: LoyaltyAmount;
  tier?: string;
}

/**
 * Projection of loyalty points expected to be accrued.
 */
export interface AccrualForecast {
  potentialAccrual?: LoyaltyAmount;
  upsellNudge?: string;
}

/**
 * Minimum spend requirements to redeem a loyalty reward.
 */
export interface LoyaltyConditionDetail {
  description?: string;
  preTaxMinimumSpend?: Money;
  postTaxMinimumSpend?: Money;
}

/**
 * Item constraints for redeeming a loyalty reward.
 */
export interface LoyaltySlotDetail {
  eligibleProductCodes?: string[];
  quantityRequired?: number;
  conditionalFill?: boolean;
}

/**
 * Details of a redeemable loyalty reward.
 */
export interface LoyaltyReward {
  rewardId?: string;
  displayName?: string;
  conditions?: LoyaltyConditionDetail[];
  slotDetails?: LoyaltySlotDetail[];
}

/**
 * Tracks loyalty program account balance and active rewards.
 */
export interface LoyaltyMetadata {
  customer?: CustomerInformation;
  accrual?: AccrualForecast;
  availableRewards?: LoyaltyReward[];
  appliedCodes?: string[];
  appliedRewardIds?: string[];
}

/**
 * Detailed breakdown of order pricing.
 */
export interface OrderPriceInfo {
  totalPrice?: Money;
  subtotalPrice?: Money;
  taxPrice?: Money;
  discount?: Money;
  saving?: Money;
  fees?: Money;
}

/**
 * Metadata about the offer engine's execution.
 */
export interface OfferEngineMetadata {
  state?: string;
  discountedOrderPriceInfo?: OrderPriceInfo;
}

/**
 * Metadata collected or inferred during the ordering conversation.
 */
export interface OrderMetadata {
  collectedCustomerName?: string;
  callerPhoneNumber?: string;
  loyaltyMetadata?: LoyaltyMetadata;
  appliedOffers?: AppliedOffer[];
  deliveryAddress?: DeliveryAddress;
  offerEngineMetadata?: OfferEngineMetadata;
}

/**
 * Information regarding order delivery, pickup, or drive-thru fulfillment.
 */
export interface OrderFulfillment {
  fulfillmentMethod?: string;
  createTime?: string;
  targetFulfillmentTime?: string;
}

/**
 * Payment-related information for an order.
 */
export interface OrderPayment {
  tippingInfo?: TippingInfo;
  loyaltyConsumed?: LoyaltyAmount;
  paymentInfo?: PaymentInfo;
}

/**
 * Represents the complete state of a customer's order.
 * Aligned with Android `Order` and iOS `Order`.
 */
export interface Order {
  items: OrderItem[];
  metadata?: OrderMetadata;
  fulfillment?: OrderFulfillment;
  priceInfo?: OrderPriceInfo;
  externalOrderId?: string;
  tippingInfo?: TippingInfo;
  loyaltyInfo?: LoyaltyInfo;
  orderPayment?: OrderPayment;
  customIntegrationAttributes?: Record<string, unknown>;
}

/**
 * Status of an order state update emitted by the agent.
 */
export type OrderStateUpdateStatus = 'UNSPECIFIED' | 'SUCCEEDED' | 'FAILED';

/**
 * Represents an update to the order state returned by the agent.
 * Aligned with Android `UpdatedOrderState` and iOS `OrderState` / `UpdatedOrderState`.
 */
export interface UpdatedOrderState {
  order?: Order;
  items?: OrderItem[];
  changed: boolean;
  status: OrderStateUpdateStatus;
  detailedMessage: string;
}

/**
 * Real-time speech recognition transcript for the customer's audio input.
 */
export interface SpeechRecognition {
  transcript: string;
  languageCode: string;
  isFinal: boolean;
}

/**
 * Reason why an ordering session ended.
 * Aligned with Android `EndType` and iOS `OrderResponse.SessionEndedType`.
 */
export type SessionEndType =
  | 'END_TYPE_UNSPECIFIED'
  | 'DRIVE_OFF'
  | 'AGENT_ESCALATION'
  | 'CREW_INTERJECTION'
  | 'ORDER_COMPLETED'
  | 'PAYMENT_FLOW_SUCCESS'
  | 'PAYMENT_FLOW_FAILURE'
  | 'CLIENT_ESCALATION'
  | 'CALLER_HANGUP'
  | 'REQUESTED_CHECKOUT'
  | 'REQUESTED_ORDER_STATUS'
  | 'STORE_CLOSED';

/**
 * Payload returned when the agent ends the session.
 * Aligned with Android `EndSession` and iOS `OrderResponse.SessionEnded`.
 */
export interface EndSession {
  type: SessionEndType;
  reason: string;
  posResponse?: string;
  agentResponse?: string;
}

/**
 * An item suggested by the agent.
 */
export interface SuggestedItem {
  itemId: string;
  displayName: string;
  image?: Image;
  basePrice?: Money;
  integrationAttributes?: ItemIntegrationAttributes;
}

/**
 * A modifier suggested by the agent.
 */
export interface SuggestedModifier {
  modifierId: string;
  modifierGroupId: string;
  modifierGroupDisplayName: string;
  displayName: string;
  image?: Image;
  priceAdjustment?: Money;
  integrationAttributes?: ModifierIntegrationAttributes;
  alreadyIncluded?: boolean;
  suggestedModifierGroups?: SuggestedModGroup[];
}

/**
 * A modifier group suggested by the agent.
 */
export interface SuggestedModGroup {
  modifierGroupId: string;
  displayName: string;
  modifiers: SuggestedModifier[];
  maxSelectionCount?: number;
  minSelectionCount?: number;
  maxSelectionCountPerModifier?: number;
  minSelectionNotMatched?: boolean;
}

/**
 * Physical address and geolocation of a store.
 */
export interface StoreAddress {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

/**
 * Day of the week.
 */
export type DayOfWeek =
  | 'UNSPECIFIED'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'
  | number;

/**
 * Whole or partial calendar date.
 */
export interface StoreDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Inclusive range of calendar dates.
 */
export interface DateRange {
  startDate?: StoreDate;
  endDate?: StoreDate;
}

/**
 * Time of day.
 */
export interface TimeOfDay {
  hours: number;
  minutes: number;
  seconds: number;
  nanos: number;
}

/**
 * Range of times within a day.
 */
export interface TimeOfDayRange {
  startTime?: TimeOfDay;
  endTime?: TimeOfDay;
}

/**
 * Schedule of days, date ranges, and time ranges for a store.
 */
export interface StoreSchedule {
  days: DayOfWeek[];
  dateRanges: DateRange[];
  timeRanges: TimeOfDayRange[];
}

/**
 * Store operating hours for a specific fulfillment method.
 */
export interface StoreHours {
  fulfillmentMethod?: string;
  schedules: StoreSchedule[];
}

/**
 * IANA Time Zone Database entry for a store.
 */
export interface StoreTimeZone {
  id: string;
  version: string;
}

/**
 * A store suggested to the customer.
 */
export interface SuggestedStore {
  distance: number;
  address?: StoreAddress;
  storeHours: StoreHours[];
  phoneNumber: string;
  storeName: string;
  open: boolean;
  timeZone?: StoreTimeZone;
}

/**
 * Collection of stores suggested to the customer.
 */
export interface SuggestedStores {
  stores: SuggestedStore[];
}

/**
 * Action that sends a text query back to the agent when a suggestion chip is tapped.
 */
export interface TextInputAction {
  text: string;
}

/**
 * A contextual action pill or chip suggested to the customer.
 */
export interface SuggestedAction {
  displayName: string;
  textInput?: TextInputAction;
}

/**
 * Contextual options suggested to the customer during the conversation.
 * Aligned with Android `SuggestedOptions` and iOS `SuggestedOptions`.
 */
export interface SuggestedOptions {
  suggestedItems?: { items: SuggestedItem[] };
  suggestedModifiers?: { modifiers: SuggestedModifier[]; parentUid?: string };
  suggestedModifierGroups?: { modifierGroups: SuggestedModGroup[] };
  suggestedStores?: SuggestedStores;
  suggestedActions?: { actions: SuggestedAction[] };
  customIntegrationAttributes?: Record<string, unknown>;
}

/**
 * Recommended orders returned by the agent.
 */
export interface RecommendedOrder {
  order: Order;
}

export interface RecommendedOrders {
  recommendedOrders: RecommendedOrder[];
}

/**
 * Event payload emitted by the agent (e.g., `restartOrder`).
 * Aligned with Android `AgentEvent` and iOS `OrderResponse.AgentEvent`.
 */
export interface AgentEvent {
  restartOrder?: {
    confirmationStep: boolean;
  };
}

// ============================================================================
// Event Payloads & Discriminated Union (`OrderResponse` / `FoodOrderingServiceEvent`)
// ============================================================================

/**
 * Payload emitted when an ordering session starts (once the bidirectional gRPC
 * stream connects and the initial session configuration is delivered).
 * Aligned with Android `OrderResponse.SessionStarted(val sessionId: String)`
 * and iOS `OrderResponse.SessionStarted(sessionID: String)` /
 * `FoodOrderingServiceEvent.sessionStarted(String)`.
 */
export interface SessionStartedEvent {
  sessionId: string;
}

export interface OrderUpdateEvent {
  sessionId: string;
  updatedOrderState: UpdatedOrderState;
  /** Convenience reference to `updatedOrderState.order`. */
  order?: Order;
}

export interface SessionEndedEvent {
  sessionId: string;
  endSession: EndSession;
}

export interface TurnCompletedEvent {
  sessionId: string;
}

export interface SpeechRecognitionEvent {
  sessionId: string;
  speechRecognition: SpeechRecognition;
}

export interface AgentTextEvent {
  sessionId: string;
  text: string;
}

export interface SuggestedOptionsEvent {
  sessionId: string;
  suggestedOptions: SuggestedOptions;
}

export interface RecommendedOrdersEvent {
  sessionId: string;
  recommendedOrders: RecommendedOrders;
}

export interface AgentEventPayload {
  sessionId: string;
  agentEvent: AgentEvent;
}

export interface InterruptionSignalEvent {
  sessionId: string;
}

/**
 * Payload emitted when the ordering session lifecycle state changes:
 * - `'STARTED'`: Session started once the initial stream connects and the
 *   session configuration is delivered.
 * - `'PAUSED'`: Session paused when the app moves to the background (emitted
 *   strictly alternately with `'RESUMED'`).
 * - `'RESUMED'`: Session resumed when the app returns to the foreground, emitted
 *   once the bidirectional gRPC stream reconnects and the session configuration
 *   is delivered to the stream.
 */
export interface SessionLifecycleEvent {
  sessionId: string;
  state: 'STARTED' | 'PAUSED' | 'RESUMED';
}

export interface AudioLevelEvent {
  /** Normalized microphone audio level in the range `0.0` to `1.0`. */
  audioLevel: number;
}

export type FoodOrderingErrorCode =
  | 'MICROPHONE_PERMISSION_NOT_GRANTED'
  | 'SESSION_ALREADY_STARTED'
  | 'INVALID_SESSION_CONFIGURATION'
  | 'AUTH_TOKEN_REFRESH_FAILURE'
  | 'APP_IN_BACKGROUND'
  | 'STREAM_CLOSED'
  | 'INTERNAL_SERVER_ERROR'
  | 'SESSION_NOT_STARTED'
  | 'UNKNOWN_ERROR';

export interface FoodOrderingErrorEvent {
  sessionId?: string;
  code: FoodOrderingErrorCode;
  message: string;
}

/**
 * Unified discriminated union representing any response emitted on the
 * ordering session stream.
 * Aligned with Android `OrderResponse` and iOS `OrderResponse` / `FoodOrderingServiceEvent`.
 */
export type OrderResponse =
  | ({ type: 'sessionStarted' } & SessionStartedEvent)
  | ({ type: 'orderUpdate' } & OrderUpdateEvent)
  | ({ type: 'sessionEnded' } & SessionEndedEvent)
  | ({ type: 'turnCompleted' } & TurnCompletedEvent)
  | ({ type: 'speechRecognition' } & SpeechRecognitionEvent)
  | ({ type: 'agentText' } & AgentTextEvent)
  | ({ type: 'suggestedOptions' } & SuggestedOptionsEvent)
  | ({ type: 'recommendedOrders' } & RecommendedOrdersEvent)
  | ({ type: 'agentEvent' } & AgentEventPayload)
  | ({ type: 'interruptionSignal' } & InterruptionSignalEvent)
  | ({ type: 'sessionLifecycle' } & SessionLifecycleEvent)
  | ({ type: 'error' } & FoodOrderingErrorEvent);

/**
 * Alias matching iOS `FoodOrderingServiceEvent` for `FoodOrderingDelegate.handleEvent`.
 */
export type FoodOrderingServiceEvent = OrderResponse;

/**
 * Map of event names emitted by `FoodOrderingClient` to their payload types.
 */
export interface FoodOrderingEventMap {
  sessionStarted: SessionStartedEvent;
  orderUpdate: OrderUpdateEvent;
  sessionEnded: SessionEndedEvent;
  turnCompleted: TurnCompletedEvent;
  error: FoodOrderingErrorEvent;
  speechRecognition: SpeechRecognitionEvent;
  agentText: AgentTextEvent;
  suggestedOptions: SuggestedOptionsEvent;
  recommendedOrders: RecommendedOrdersEvent;
  agentEvent: AgentEventPayload;
  interruptionSignal: InterruptionSignalEvent;
  sessionLifecycle: SessionLifecycleEvent;
  audioLevel: AudioLevelEvent;
}
