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
 * Point in time independent of any time zone or local calendar, encoded as UTC
 * epoch seconds and optional nanosecond fraction (`google.protobuf.Timestamp`).
 * Aligned with Android `Timestamp` and iOS `Timestamp`.
 */
export interface Timestamp {
  /** Seconds of UTC time since Unix epoch `1970-01-01T00:00:00Z`. */
  seconds: number;
  /** Non-negative fractions of a second at nanosecond resolution (`0` to `999,999,999`). */
  nanos?: number;
}

/**
 * Signed, fixed-length span of time represented as seconds and optional
 * nanosecond fraction (`google.protobuf.Duration`).
 * Aligned with Android `Duration` and iOS `Duration`.
 */
export interface Duration {
  /** Signed seconds of the span of time. */
  seconds: number;
  /** Signed fractions of a second at nanosecond resolution. */
  nanos?: number;
}

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
  /** Remaining amount due from the customer after discounts or loyalty redemptions. */
  totalAmountDue?: Money;
  /** Updated price breakdown finalized by the POS prior to order submission. */
  orderPriceInfo?: OrderPriceInfo;
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
  /** Estimated duration until the submitted order will be ready, if provided by the POS. */
  estimatedReadyDuration?: Duration;
  /** Point-of-Sale (POS) external system identifier assigned to the submitted order. */
  externalOrderId?: string;
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
  /** Pricing breakdown including subtotal, tax, discount, fees, tip, and total price. */
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
 * Category of a loyalty operation requested by or reported to the ordering agent.
 * Aligned with Android `LoyaltyActionCategory` and iOS `LoyaltyActionCategory`.
 */
export type LoyaltyActionCategory =
  | 'LOYALTY_ACTION_CATEGORY_UNSPECIFIED'
  | 'LOYALTY_ACTION_CATEGORY_ADD_CODE'
  | 'LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER'
  | 'LOYALTY_ACTION_CATEGORY_ADD_REWARD'
  | 'LOYALTY_ACTION_CATEGORY_REDEEM_POINTS'
  | 'LOYALTY_ACTION_CATEGORY_REMOVE_LOYALTY'
  | 'UNKNOWN';

/**
 * Structured reason for rejecting a loyalty operation.
 * Aligned with Android `ClientExecutionStatus.RejectionReason` and iOS `ClientExecutionStatus.RejectionReason`.
 */
export type ClientExecutionRejectionReason =
  | 'REJECTION_REASON_UNSPECIFIED'
  | 'REJECTION_REASON_INVALID_ID'
  | 'REJECTION_REASON_COOLDOWN_PERIOD'
  | 'REJECTION_REASON_INSUFFICIENT_FUNDS'
  | 'REJECTION_REASON_INSUFFICIENT_POINTS'
  | 'UNKNOWN';

/**
 * Status details reported by the host application when handling a client execution request.
 * Aligned with Android `ClientExecutionStatus` and iOS `ClientExecutionStatus`.
 */
export interface ClientExecutionStatus {
  /** The HTTP status code returned by the underlying provider, if any. */
  httpStatusCode?: number;
  /** The raw status or diagnostic message from the provider, if any. */
  rawProviderMessage?: string;
  /** Structured reason for rejecting a loyalty operation, if applicable. */
  rejectionReason?: ClientExecutionRejectionReason;
}

/**
 * Loyalty operation request dispatched by the ordering agent to the host application.
 * Aligned with Android `LoyaltyRequest` and iOS `LoyaltyRequest`.
 */
export interface LoyaltyRequest {
  /** The type of loyalty action requested. */
  category: LoyaltyActionCategory;
  /** Loyalty or promo code to add or remove, if applicable. */
  code?: string;
  /** Customer phone number used for identification, if provided. */
  phoneNumber?: string;
  /** Customer email address used for identification, if provided. */
  email?: string;
  /** Customer loyalty account identifier, if provided. */
  loyaltyAccountId?: string;
  /** Identifiers of rewards to apply or remove. */
  rewardIds?: string[];
  /** Menu product codes selected to fulfill reward slots. */
  selectedProductCodes?: string[];
  /** Quantity of loyalty points or balance to redeem, if applicable. */
  loyaltyAmount?: LoyaltyAmount;
}

/**
 * Client response returned for a `LoyaltyRequest`.
 *
 * Return `{}` when a customer identification check finds no signed-in loyalty member
 * (guest session). When the loyalty provider rejects an operation (such as an invalid code
 * or insufficient points), populate `clientExecutionStatus` with the rejection details.
 *
 * Aligned with Android `LoyaltyResponse` and iOS `LoyaltyResponse`.
 */
export interface LoyaltyResponse {
  /** The category of the completed loyalty operation, if applicable. */
  category?: LoyaltyActionCategory;
  /** Updated loyalty profile, available rewards, and applied rewards or codes. */
  loyaltyMetadata?: LoyaltyMetadata;
  /** Partner-specific non-PII loyalty metadata for downstream integrations. */
  customIntegrationAttributes?: Record<string, unknown>;
  /** Optional provider status or structured rejection details. */
  clientExecutionStatus?: ClientExecutionStatus;
}

/**
 * Boundary delegate interface between `FoodOrderingClient` and the React Native host application.
 *
 * Mirrors iOS `FoodOrderingClientDelegate` and Android `FoodOrderingClient` handler interfaces
 * (`FoodOrderingClientAuthTokenRequestHandler`, `FoodOrderingClientFinalizeOrderHandler`,
 * `FoodOrderingClientSubmitOrderHandler`, `FoodOrderingClientOrderPricesHandler`,
 * `FoodOrderingClientOrderStatusHandler`, and `FoodOrderingClientLoyaltyHandler`).
 *
 * If an optional client execution callback (`handleFinalizeOrder`, `handleOrderPrices`,
 * `handleSubmitOrder`, `handleOrderStatus`, or `handleLoyalty`) is omitted, both Android and iOS
 * bridges send the standard default `ClientExecutionResult` (`finalizeOrder` defaults from
 * `sessionConfig.userInfo.paymentInfo`, `submitOrder`/`orderPrices`/`orderStatus` respond with
 * `success: false`, and `handleLoyalty` reports an unregistered-handler status).
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
   * Handles a loyalty operation request (customer identification, code application,
   * reward redemption, point redemption, or loyalty removal).
   */
  handleLoyalty?(request: LoyaltyRequest): Promise<LoyaltyResponse>;

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
   * Delegate handling auth token requests (`handleAuthTokenRequest`), client execution
   * requests (`finalizeOrder`, `orderPrices`, `submitOrder`, `orderStatus`, `loyalty`),
   * audio levels, and session events. May be supplied here or registered before
   * `startSession()` via `foodOrderingClient.setDelegate(delegate)`.
   */
  delegate?: FoodOrderingDelegate;
}

/**
 * Session-level configuration settings used to start a food ordering session.
 * Aligned with Android `OrderingSessionConfig` and iOS `OrderingSessionConfig`.
 * Note: `ClientAppInfo` is automatically populated internally by the native SDKs.
 */
export interface OrderingSessionConfig {
  /**
   * The store identifier (short ID or qualified `projects/.../stores/...` resource path)
   * where the order is being placed.
   */
  storeId: string;
  /**
   * Optional custom session ID. When omitted, the native SDK generates a new
   * `"android-session-<UUID>"` or `"ios-session-<UUID>"` automatically.
   */
  sessionId?: string;
  /** Optional daypart identifier (e.g., `"breakfast"`, `"lunch"`, `"dinner"`). */
  daypartId?: string;
  /** Optional user profile, loyalty, payment, device location, and saved delivery address info. */
  userInfo?: UserInfo;
  /** Optional initial cart/order state when starting or resuming a session. */
  initialOrder?: Order;
  /** Optional feature gates to enable or disable specific ordering capabilities. */
  featureGate?: FeatureGates;
  /** Convenience alias for `featureGate`. */
  featureGates?: FeatureGates;
  /** Optional initial text utterance to kick off the conversation. */
  initialUtterance?: string;
}

/**
 * Feature gates to enable or disable specific food ordering capabilities.
 * Aligned with Android `FeatureGates` and iOS `FeatureGates`.
 */
export interface FeatureGates {
  triggerOfferEngineOnDemand?: boolean;
  triggerLoyaltyOnDemand?: boolean;
  triggerOrderMediaAssistantOnDemand?: boolean;
  menuResponseEnabled?: boolean;
  revampedPaymentFlowEnabled?: boolean;
  enableOrderStatusRetrieval?: boolean;
  updatedOrderStateEnabled?: boolean;
  /** Enables conversational store search and mid-session store switching. */
  storeSelectionEnabled?: boolean;
  /** Enables promotional offers and loyalty capabilities for the session. */
  offersAndLoyaltyEnabled?: boolean;
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
 * Represents an individual image source variant with optional dimensions.
 */
export interface ImageSource {
  /** The URI of this image variant. */
  uri: string;
  /** Width of this image variant in pixels, or `0` if unspecified. */
  width?: number;
  /** Height of this image variant in pixels, or `0` if unspecified. */
  height?: number;
}

/**
 * Represents an image asset associated with a menu item, modifier, reward, or discount.
 */
export interface Image {
  sourceUri: string;
  /** Multi-resolution image source variants, if available. */
  sources?: ImageSource[];
}

/**
 * Geographic coordinates in degrees (`google.type.LatLng`).
 */
export interface LatLng {
  latitude?: number;
  longitude?: number;
}

/**
 * Real-time or recent geographic location of the user's device.
 *
 * Populate only when the host application holds foreground location permission.
 * Aligned with Android `UserLocation` and iOS `UserLocation`.
 */
export interface UserLocation {
  /** WGS84 geographic coordinates of the user's device. */
  coordinates: LatLng;
  /** Timestamp when the device captured this location fix. */
  captureTime?: Timestamp;
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
 * Fulfillment method for an order or store operating hours.
 * Aligned with Android `FulfillmentMethod` and iOS `FulfillmentMethod`.
 */
export type FulfillmentMethod =
  | 'FULFILLMENT_METHOD_UNSPECIFIED'
  | 'FULFILLMENT_METHOD_DINE_IN'
  | 'FULFILLMENT_METHOD_PICKUP'
  | 'FULFILLMENT_METHOD_DRIVE_THRU'
  | 'FULFILLMENT_METHOD_DELIVERY'
  | 'FULFILLMENT_METHOD_CURBSIDE'
  | 'UNKNOWN';

/**
 * Validation status of a customer's delivery address.
 * Aligned with Android `DeliveryAddressValidationStatus` and iOS `DeliveryAddressValidationStatus`.
 */
export type DeliveryAddressValidationStatus =
  | 'VALIDATION_STATUS_UNSPECIFIED'
  | 'VALIDATION_STATUS_VALID'
  | 'VALIDATION_STATUS_INVALID'
  | 'VALIDATION_STATUS_OUT_OF_RANGE'
  | 'VALIDATION_STATUS_INCOMPLETE_ADDRESS'
  | 'UNKNOWN';

/**
 * Fulfillment status of an applied promotional offer or reward.
 * Aligned with Android `FulfillmentState` and iOS `FulfillmentState`.
 */
export type FulfillmentState =
  | 'FULFILLMENT_STATE_UNSPECIFIED'
  | 'FULFILLMENT_STATE_PARTIALLY_APPLIED'
  | 'FULFILLMENT_STATE_FULLY_APPLIED'
  | 'UNKNOWN';

/**
 * Execution state of the offer engine for an order.
 * Aligned with Android `OfferEngineState` and iOS `OfferEngineState`.
 */
export type OfferEngineState =
  | 'OFFER_ENGINE_STATE_UNSPECIFIED'
  | 'OFFER_ENGINE_STATE_NOT_TRIGGERED'
  | 'OFFER_ENGINE_STATE_NO_OFFERS_FOUND'
  | 'OFFER_ENGINE_STATE_OFFERS_FOUND'
  | 'UNKNOWN';

/**
 * Represents a customer's delivery address.
 */
export interface DeliveryAddress {
  address?: PostalAddress;
  validationStatus?: DeliveryAddressValidationStatus | string;
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
  | 'CASH'
  | 'UNKNOWN';

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
  /** Current or last-known geographic location of the user's device. */
  location?: UserLocation;
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
  state?: FulfillmentState | string;
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
 * Aligned with Android `LoyaltyReward` and iOS `LoyaltyReward`.
 */
export interface LoyaltyReward {
  rewardId?: string;
  displayName?: string;
  conditions?: LoyaltyConditionDetail[];
  slotDetails?: LoyaltySlotDetail[];
  /** Loyalty points required to redeem this reward. */
  redemptionCost?: LoyaltyAmount;
  /** Human-readable summary or subtitle for the reward. */
  description?: string;
  /** Image associated with this reward. */
  image?: Image;
  /** Timestamp when this reward expires. */
  expireTime?: Timestamp;
  /** Partner-specific non-PII metadata and display attributes for downstream integrations. */
  customIntegrationAttributes?: Record<string, unknown>;
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
  /** Tip amount applied to the order. */
  tip?: Money;
}

/**
 * Metadata about the offer engine's execution.
 */
export interface OfferEngineMetadata {
  state?: OfferEngineState | string;
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
 * Aligned with Android `OrderFulfillment` and iOS `OrderFulfillment`.
 */
export interface OrderFulfillment {
  fulfillmentMethod?: FulfillmentMethod | string;
  /** Timestamp when the order session was initiated. */
  createTime?: Timestamp;
  /** Scheduled timestamp for future pickup or delivery, or undefined for ASAP. */
  targetFulfillmentTime?: Timestamp;
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
export type OrderStateUpdateStatus =
  | 'UNSPECIFIED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'UNKNOWN';

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
  | 'STORE_CLOSED'
  | 'REQUESTED_STORE_SELECTION'
  | 'UNKNOWN';

/**
 * Payload returned when the agent ends the session.
 * Aligned with Android `EndSession` and iOS `OrderResponse.SessionEnded`.
 */
export interface EndSession {
  type: SessionEndType;
  reason: string;
  posResponse?: string;
  agentResponse?: string;
  /** Operating schedule of the store when `type === 'STORE_CLOSED'`, if available. */
  storeSchedule?: StoreSchedule;
}

/**
 * Nutritional metadata for a menu item or modifier.
 */
export interface NutritionalInfo {
  /** Human-readable calorie string (e.g., `"680 Cal"`). */
  calories: string;
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
  description?: string;
  nutritionalInfo?: NutritionalInfo;
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
  nutritionalInfo?: NutritionalInfo;
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
 * Aligned with Android `DayOfWeek` and iOS `DayOfWeek`.
 */
export type DayOfWeek =
  | 'DAY_OF_WEEK_UNSPECIFIED'
  | 'UNSPECIFIED'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'
  | 'UNKNOWN'
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
 * Schedule of days, date ranges, and time ranges for a store or discount.
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
  fulfillmentMethod?: FulfillmentMethod | string;
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
 * Type of a promotional discount.
 * Aligned with Android `DiscountType` and iOS `DiscountType`.
 */
export type DiscountType =
  | 'DISCOUNT_TYPE_UNSPECIFIED'
  | 'BOGO'
  | 'FIXED_OFF'
  | 'PERCENT_OFF'
  | 'FIXED_TOTAL'
  | 'FREE_DELIVERY'
  | 'UNKNOWN';

/**
 * Scope at which a promotional discount is applied.
 * Aligned with Android `DiscountScope` and iOS `DiscountScope`.
 */
export type DiscountScope =
  | 'SCOPE_UNSPECIFIED'
  | 'ORDER'
  | 'ITEM'
  | 'UNKNOWN';

/**
 * Customer-facing display fields of a promotional discount suggested to the customer.
 * Aligned with Android `Discount` and iOS `Discount`.
 */
export interface Discount {
  /** Resource name of the discount. */
  name: string;
  /** User-facing name of the discount (e.g., `"20% Off Your Order"`). */
  displayName: string;
  /** Type of discount being applied. */
  type: DiscountType;
  /** Scope at which the discount is applied. */
  scope: DiscountScope;
  /** Schedule when the discount is active. */
  schedule?: StoreSchedule;
  /** Fixed monetary value of the discount or fixed total price. */
  fixedAmount?: Money;
  /** Percentage value of the discount (`0.0` to `100.0`) when `type === 'PERCENT_OFF'`. */
  percent: number;
  /** Maximum discount value a customer can receive when `type === 'PERCENT_OFF'`. */
  maxDiscountValue?: Money;
  /** Whether the discount is automatically applied when its criteria are met. */
  autoApply: boolean;
  /** Image to display for this discount in the UI. */
  image?: Image;
  /** Human-readable summary or subtitle for this discount. */
  description: string;
  /** Partner-specific non-PII metadata and display attributes for downstream integrations. */
  customIntegrationAttributes?: Record<string, unknown>;
}

/**
 * A loyalty reward redemption or promotional discount suggested to the customer.
 * Unrecognized future offer variants deserialize with neither field set (`{}`).
 * Aligned with Android `SuggestedOffer` and iOS `SuggestedOffer`.
 */
export interface SuggestedOffer {
  /** Point-based or wallet loyalty reward, if this offer represents a loyalty reward. */
  loyaltyReward?: LoyaltyReward;
  /** Store or dynamic promotional discount, if this offer represents a discount. */
  discount?: Discount;
}

/**
 * Promotional offers or loyalty rewards suggested to the customer.
 * Aligned with Android `SuggestedOffers` and iOS `SuggestedOffers`.
 */
export interface SuggestedOffers {
  offers: SuggestedOffer[];
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
  suggestedOffers?: SuggestedOffers;
  customIntegrationAttributes?: Record<string, unknown>;
}

/**
 * Recommended orders returned by the agent.
 */
export interface RecommendedOrder {
  order?: Order;
}

export interface RecommendedOrders {
  recommendedOrders: RecommendedOrder[];
}

/**
 * Discriminated union representing an event emitted by the agent.
 * Aligned with Android `AgentEvent` and iOS `OrderResponse.AgentEvent`.
 */
export type AgentEvent =
  | {
      type: 'RESTART_ORDER';
      confirmationStep: boolean;
    }
  | {
      type: 'STORE_CHANGE';
      /** Resource path or identifier of the store selected for the active session. */
      store: string;
    }
  | {
      type: 'UNKNOWN';
    };

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
  /** Convenience reference to `endSession.storeSchedule`, when present. */
  storeSchedule?: StoreSchedule;
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
 * - `'PAUSED'`: Session paused when the app moves to the background or loses
 *   network connectivity (emitted strictly alternately with `'RESUMED'`).
 * - `'RESUMED'`: Session resumed when the app returns to the foreground or
 *   restores connectivity, emitted once the bidirectional gRPC stream reconnects
 *   and the session configuration is delivered to the stream.
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
