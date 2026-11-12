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

package com.google.cloud.foodai.ordering.reactnative

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.google.android.foodorderingaiagent.FoodOrderingClient
import com.google.android.foodorderingaiagent.models.AccrualForecast
import com.google.android.foodorderingaiagent.models.AgentEvent
import com.google.android.foodorderingaiagent.models.AppliedOffer
import com.google.android.foodorderingaiagent.models.ClientExecutionStatus
import com.google.android.foodorderingaiagent.models.CustomerInformation
import com.google.android.foodorderingaiagent.models.CustomizedInput
import com.google.android.foodorderingaiagent.models.DateRange
import com.google.android.foodorderingaiagent.models.DayOfWeek
import com.google.android.foodorderingaiagent.models.DeliveryAddress
import com.google.android.foodorderingaiagent.models.DeliveryAddressValidationStatus
import com.google.android.foodorderingaiagent.models.Discount
import com.google.android.foodorderingaiagent.models.DiscountScope
import com.google.android.foodorderingaiagent.models.DiscountType
import com.google.android.foodorderingaiagent.models.Duration
import com.google.android.foodorderingaiagent.models.EndSession
import com.google.android.foodorderingaiagent.models.EndType
import com.google.android.foodorderingaiagent.models.FeatureGates
import com.google.android.foodorderingaiagent.models.FinalizeOrderRequest
import com.google.android.foodorderingaiagent.models.FinalizeOrderResponse
import com.google.android.foodorderingaiagent.models.FoodOrderingClientAuthTokenRequestHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientAuthTokenResponse
import com.google.android.foodorderingaiagent.models.FoodOrderingClientAuthTokenResult
import com.google.android.foodorderingaiagent.models.FoodOrderingClientConfig
import com.google.android.foodorderingaiagent.models.FoodOrderingClientFinalizeOrderHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientLoyaltyHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientOrderPricesHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientOrderStatusHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientSubmitOrderHandler
import com.google.android.foodorderingaiagent.models.FulfilledItem
import com.google.android.foodorderingaiagent.models.FulfillmentMethod
import com.google.android.foodorderingaiagent.models.FulfillmentState
import com.google.android.foodorderingaiagent.models.Image
import com.google.android.foodorderingaiagent.models.ImageSource
import com.google.android.foodorderingaiagent.models.ItemIntegrationAttributes
import com.google.android.foodorderingaiagent.models.LatLng
import com.google.android.foodorderingaiagent.models.LoyaltyActionCategory
import com.google.android.foodorderingaiagent.models.LoyaltyAmount
import com.google.android.foodorderingaiagent.models.LoyaltyConditionDetail
import com.google.android.foodorderingaiagent.models.LoyaltyInfo
import com.google.android.foodorderingaiagent.models.LoyaltyMetadata
import com.google.android.foodorderingaiagent.models.LoyaltyRequest
import com.google.android.foodorderingaiagent.models.LoyaltyResponse
import com.google.android.foodorderingaiagent.models.LoyaltyReward
import com.google.android.foodorderingaiagent.models.LoyaltySlotDetail
import com.google.android.foodorderingaiagent.models.ModifierGroupIntegrationAttributes
import com.google.android.foodorderingaiagent.models.ModifierIntegrationAttributes
import com.google.android.foodorderingaiagent.models.Money
import com.google.android.foodorderingaiagent.models.NutritionalInfo
import com.google.android.foodorderingaiagent.models.OfferEngineMetadata
import com.google.android.foodorderingaiagent.models.OfferEngineState
import com.google.android.foodorderingaiagent.models.Order
import com.google.android.foodorderingaiagent.models.OrderFulfillment
import com.google.android.foodorderingaiagent.models.OrderItem
import com.google.android.foodorderingaiagent.models.OrderMetadata
import com.google.android.foodorderingaiagent.models.OrderModifier
import com.google.android.foodorderingaiagent.models.OrderModifierAction
import com.google.android.foodorderingaiagent.models.OrderModifierGroup
import com.google.android.foodorderingaiagent.models.OrderPayment
import com.google.android.foodorderingaiagent.models.OrderPriceInfo
import com.google.android.foodorderingaiagent.models.OrderPricesRequest
import com.google.android.foodorderingaiagent.models.OrderPricesResponse
import com.google.android.foodorderingaiagent.models.OrderResponse
import com.google.android.foodorderingaiagent.models.OrderStateUpdateStatus
import com.google.android.foodorderingaiagent.models.OrderStatusRequest
import com.google.android.foodorderingaiagent.models.OrderStatusResponse
import com.google.android.foodorderingaiagent.models.OrderingSessionConfig
import com.google.android.foodorderingaiagent.models.PastOrder
import com.google.android.foodorderingaiagent.models.PaymentInfo
import com.google.android.foodorderingaiagent.models.PaymentMethod
import com.google.android.foodorderingaiagent.models.PostalAddress
import com.google.android.foodorderingaiagent.models.RecommendedOrders
import com.google.android.foodorderingaiagent.models.SpeechRecognition
import com.google.android.foodorderingaiagent.models.StoreDate
import com.google.android.foodorderingaiagent.models.StoreSchedule
import com.google.android.foodorderingaiagent.models.SubmitOrderPaymentInfo
import com.google.android.foodorderingaiagent.models.SubmitOrderRequest
import com.google.android.foodorderingaiagent.models.SubmitOrderResponse
import com.google.android.foodorderingaiagent.models.SuggestedModGroup
import com.google.android.foodorderingaiagent.models.SuggestedModifier
import com.google.android.foodorderingaiagent.models.SuggestedOffer
import com.google.android.foodorderingaiagent.models.SuggestedOffers
import com.google.android.foodorderingaiagent.models.SuggestedOptions
import com.google.android.foodorderingaiagent.models.SuggestedStores
import com.google.android.foodorderingaiagent.models.TimeOfDay
import com.google.android.foodorderingaiagent.models.TimeOfDayRange
import com.google.android.foodorderingaiagent.models.Timestamp
import com.google.android.foodorderingaiagent.models.TippingInfo
import com.google.android.foodorderingaiagent.models.UpdatedOrderState
import com.google.android.foodorderingaiagent.models.UserInfo
import com.google.android.foodorderingaiagent.models.UserLocation
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.logging.Level
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/** Internal seam over [FoodOrderingClient] enabling deterministic JVM unit testing. */
internal interface FoodOrderingNativeClient {
  val audioLevelFlow: StateFlow<Float>

  suspend fun requestMicrophonePermission(context: Context): Boolean

  fun startSession(
    context: Context,
    scope: CoroutineScope,
    agentConfig: OrderingSessionConfig,
  ): Flow<OrderResponse>

  suspend fun endSession(waitUntilComplete: Boolean)

  fun pauseMicrophone(): OrderResponse.Error?

  fun resumeMicrophone(): OrderResponse.Error?

  fun sendText(text: String)

  fun updateOrderState(order: Order)

  fun sendCustomizedInput(input: CustomizedInput)

  fun release()
}

/** Handler bundle passed when constructing a [FoodOrderingNativeClient]. */
internal data class FoodOrderingClientHandlers(
  val authTokenRequestHandler: FoodOrderingClientAuthTokenRequestHandler,
  val finalizeOrderHandler: FoodOrderingClientFinalizeOrderHandler,
  val submitOrderHandler: FoodOrderingClientSubmitOrderHandler,
  val orderPricesHandler: FoodOrderingClientOrderPricesHandler,
  val orderStatusHandler: FoodOrderingClientOrderStatusHandler,
  val loyaltyHandler: FoodOrderingClientLoyaltyHandler,
)

private class RealFoodOrderingNativeClient(private val delegate: FoodOrderingClient) :
  FoodOrderingNativeClient {
  override val audioLevelFlow: StateFlow<Float>
    get() = delegate.audioLevelFlow

  override suspend fun requestMicrophonePermission(context: Context): Boolean =
    delegate.requestMicrophonePermission(context)

  override fun startSession(
    context: Context,
    scope: CoroutineScope,
    agentConfig: OrderingSessionConfig,
  ): Flow<OrderResponse> = delegate.startSession(context, scope, agentConfig)

  override suspend fun endSession(waitUntilComplete: Boolean) =
    delegate.endSession(waitUntilComplete)

  override fun pauseMicrophone(): OrderResponse.Error? = delegate.pauseMicrophone()

  override fun resumeMicrophone(): OrderResponse.Error? = delegate.resumeMicrophone()

  override fun sendText(text: String) = delegate.sendText(text)

  override fun updateOrderState(order: Order) = delegate.updateOrderState(order)

  override fun sendCustomizedInput(input: CustomizedInput) = delegate.sendCustomizedInput(input)

  override fun release() = delegate.release()
}

/**
 * React Native New Architecture TurboModule bridging JavaScript calls, delegate callbacks, and
 * typed Codegen `EventEmitter` events to the Android [FoodOrderingClient].
 */
@ReactModule(name = FoodOrderingModule.NAME)
class FoodOrderingModule
internal constructor(
  private val reactContext: ReactApplicationContext,
  mainDispatcher: CoroutineDispatcher,
  private val sdkConfigurer: (FoodOrderingClientConfig) -> Unit,
  private val clientFactory: (FoodOrderingClientHandlers) -> FoodOrderingNativeClient,
  private val eventSink: ((String, ReadableMap) -> Unit)?,
  private val delegateRequestTimeoutMs: Long,
) : NativeFoodOrderingSpec(reactContext), LifecycleEventListener {

  constructor(
    reactContext: ReactApplicationContext
  ) : this(
    reactContext = reactContext,
    mainDispatcher = Dispatchers.Main.immediate,
    sdkConfigurer = { cfg -> FoodOrderingClient.configure(cfg) },
    clientFactory = { handlers ->
      RealFoodOrderingNativeClient(
        FoodOrderingClient(
          authTokenRequestHandler = handlers.authTokenRequestHandler,
          finalizeOrderHandler = handlers.finalizeOrderHandler,
          submitOrderHandler = handlers.submitOrderHandler,
          orderPricesHandler = handlers.orderPricesHandler,
          orderStatusHandler = handlers.orderStatusHandler,
          loyaltyHandler = handlers.loyaltyHandler,
        )
      )
    },
    eventSink = null,
    delegateRequestTimeoutMs = DELEGATE_REQUEST_TIMEOUT_MS,
  )

  private val moduleScope = CoroutineScope(SupervisorJob() + mainDispatcher)
  private var client: FoodOrderingNativeClient? = null
  private var sessionJob: Job? = null
  private var audioLevelJob: Job? = null

  @Volatile private var isSessionActive: Boolean = false
  @Volatile private var activeSessionId: String? = null
  @Volatile private var latestSessionUserInfo: UserInfo? = null

  private val pendingDelegateRequests =
    ConcurrentHashMap<String, CompletableDeferred<ReadableMap>>()

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  @ReactMethod
  override fun initialize(configMap: ReadableMap, promise: Promise) {
    try {
      val gcpProjectName =
        configMap.getString("gcpProjectName")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("gcpProjectName is required.")
      val location =
        configMap.getString("location")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("location is required.")
      val brand =
        configMap.getString("brand")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("brand is required.")
      val logLevel = parseLogLevel(configMap.getOptionalString("logLevel"))

      val sdkConfig =
        FoodOrderingClientConfig(
          gcpProjectName = gcpProjectName,
          location = location,
          brand = brand,
          logLevel = logLevel,
        )
      sdkConfigurer(sdkConfig)
      recreateClient()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("INITIALIZE_ERROR", e.message ?: "Failed to initialize FoodOrderingClient", e)
    }
  }

  private fun recreateClient(): FoodOrderingNativeClient {
    client?.release()
    val created =
      clientFactory(
        FoodOrderingClientHandlers(
          authTokenRequestHandler =
            FoodOrderingClientAuthTokenRequestHandler { requestAuthTokenFromBridge() },
          finalizeOrderHandler =
            FoodOrderingClientFinalizeOrderHandler { request ->
              requestFinalizeOrderFromBridge(request)
            },
          submitOrderHandler =
            FoodOrderingClientSubmitOrderHandler { request ->
              requestSubmitOrderFromBridge(request)
            },
          orderPricesHandler =
            FoodOrderingClientOrderPricesHandler { request ->
              requestOrderPricesFromBridge(request)
            },
          orderStatusHandler =
            FoodOrderingClientOrderStatusHandler { request ->
              requestOrderStatusFromBridge(request)
            },
          loyaltyHandler =
            FoodOrderingClientLoyaltyHandler { request -> requestLoyaltyFromBridge(request) },
        )
      )
    client = created
    return created
  }

  // ==========================================================================
  // JS -> Native Delegate Response Methods
  // ==========================================================================

  @ReactMethod
  override fun respondToAuthTokenRequest(requestId: String, response: ReadableMap) {
    pendingDelegateRequests.remove(requestId)?.complete(response)
  }

  @ReactMethod
  override fun respondToFinalizeOrder(requestId: String, response: ReadableMap) {
    pendingDelegateRequests.remove(requestId)?.complete(response)
  }

  @ReactMethod
  override fun respondToSubmitOrder(requestId: String, response: ReadableMap) {
    pendingDelegateRequests.remove(requestId)?.complete(response)
  }

  @ReactMethod
  override fun respondToOrderPrices(requestId: String, response: ReadableMap) {
    pendingDelegateRequests.remove(requestId)?.complete(response)
  }

  @ReactMethod
  override fun respondToOrderStatus(requestId: String, response: ReadableMap) {
    pendingDelegateRequests.remove(requestId)?.complete(response)
  }

  @ReactMethod
  override fun respondToLoyalty(requestId: String, response: ReadableMap) {
    pendingDelegateRequests.remove(requestId)?.complete(response)
  }

  @ReactMethod
  override fun rejectDelegateRequest(requestId: String, errorMessage: String) {
    pendingDelegateRequests
      .remove(requestId)
      ?.completeExceptionally(IllegalStateException(errorMessage))
  }

  @ReactMethod
  override fun requestMicrophonePermission(promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.reject(
        "NOT_INITIALIZED",
        "FoodOrderingClient is not initialized. Call initialize() first.",
      )
      return
    }
    moduleScope.launch {
      try {
        val context = reactContext.currentActivity ?: reactContext
        val granted = activeClient.requestMicrophonePermission(context)
        promise.resolve(granted)
      } catch (e: Exception) {
        promise.reject(
          "PERMISSION_ERROR",
          e.message ?: "Failed to request microphone permission",
          e,
        )
      }
    }
  }

  @ReactMethod
  override fun startSession(sessionConfigMap: ReadableMap, promise: Promise) {
    val currentClient = client
    if (currentClient == null) {
      promise.reject(
        "NOT_INITIALIZED",
        "FoodOrderingClient is not initialized. Call initialize() first.",
      )
      return
    }

    try {
      val storeId =
        sessionConfigMap.getString("storeId")?.takeIf { it.isNotBlank() }
          ?: throw IllegalArgumentException("storeId is required in OrderingSessionConfig.")
      val customSessionId =
        sessionConfigMap.getOptionalString("sessionId")?.takeIf { it.isNotBlank() }
      val resolvedSessionId = customSessionId ?: "android-session-${UUID.randomUUID()}"
      val userInfo = sessionConfigMap.getOptionalMap("userInfo")?.toUserInfo()
      val featureGateMap =
        sessionConfigMap.getOptionalMap("featureGate")
          ?: sessionConfigMap.getOptionalMap("featureGates")

      val wasSessionActive = isSessionActive

      val sessionConfig =
        OrderingSessionConfig(
          storeId = storeId,
          sessionId = resolvedSessionId,
          userInfo = userInfo,
          featureGate = featureGateMap?.toFeatureGates(),
          initialUtterance = sessionConfigMap.getOptionalString("initialUtterance"),
          daypartId = sessionConfigMap.getOptionalString("daypartId"),
          initialOrder = sessionConfigMap.getOptionalMap("initialOrder")?.toOrder(),
        )

      if (!wasSessionActive) {
        sessionJob?.cancel()
        sessionJob = null
        latestSessionUserInfo = userInfo
        activeSessionId = resolvedSessionId
        isSessionActive = true
      }

      val context = reactContext.currentActivity ?: reactContext
      val responseFlow = currentClient.startSession(context, moduleScope, sessionConfig)

      if (!wasSessionActive) {
        val job =
          moduleScope.launch(start = CoroutineStart.LAZY) {
            responseFlow
              .catch { throwable ->
                val currentId = activeSessionId ?: resolvedSessionId
                emitErrorEvent(
                  sessionId = currentId,
                  code = "STREAM_CLOSED",
                  message = throwable.message ?: "Ordering stream terminated with an error.",
                )
                clearActiveSessionState()
              }
              .collect { response -> handleOrderResponse(response) }
          }
        sessionJob = job
        job.start()
      }

      if (isSessionActive && audioLevelJob?.isActive != true) {
        audioLevelJob?.cancel()
        val audioJob =
          moduleScope.launch(start = CoroutineStart.LAZY) {
            currentClient.audioLevelFlow.collect { level ->
              val payload = createMap().apply { putDouble("audioLevel", level.toDouble()) }
              dispatchOnAudioLevel(payload)
            }
          }
        audioLevelJob = audioJob
        audioJob.start()
      }

      promise.resolve(resolvedSessionId)
    } catch (e: Exception) {
      promise.reject("START_SESSION_ERROR", e.message ?: "Failed to start ordering session", e)
    }
  }

  @ReactMethod
  override fun sendText(text: String, promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.reject("NOT_INITIALIZED", "FoodOrderingClient is not initialized.")
      return
    }
    try {
      activeClient.sendText(text)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SEND_TEXT_ERROR", e.message ?: "Failed to send text utterance", e)
    }
  }

  @ReactMethod
  override fun updateOrderState(orderMap: ReadableMap, promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.reject("NOT_INITIALIZED", "FoodOrderingClient is not initialized.")
      return
    }
    try {
      val order = orderMap.toOrder()
      activeClient.updateOrderState(order)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("UPDATE_ORDER_STATE_ERROR", e.message ?: "Failed to update order state", e)
    }
  }

  @ReactMethod
  override fun sendCustomizedInput(parameters: ReadableMap, promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.reject("NOT_INITIALIZED", "FoodOrderingClient is not initialized.")
      return
    }
    try {
      val sourceMap = parameters.getOptionalMap("parameters") ?: parameters
      val stringMap = mutableMapOf<String, String>()
      val iterator = sourceMap.keySetIterator()
      while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        if (!sourceMap.isNull(key)) {
          when (sourceMap.getType(key)) {
            ReadableType.String -> sourceMap.getString(key)?.let { stringMap[key] = it }
            ReadableType.Number -> stringMap[key] = sourceMap.getDouble(key).toString()
            ReadableType.Boolean -> stringMap[key] = sourceMap.getBoolean(key).toString()
            else -> {}
          }
        }
      }
      activeClient.sendCustomizedInput(CustomizedInput(parameters = stringMap))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "SEND_CUSTOMIZED_INPUT_ERROR",
        e.message ?: "Failed to send customized input",
        e,
      )
    }
  }

  @ReactMethod
  override fun pauseMicrophone(promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.reject("NOT_INITIALIZED", "FoodOrderingClient is not initialized.")
      return
    }
    val err = activeClient.pauseMicrophone()
    if (err != null) {
      handleOrderResponse(err)
      promise.reject("PAUSE_MIC_ERROR", err.message)
    } else {
      promise.resolve(null)
    }
  }

  @ReactMethod
  override fun resumeMicrophone(promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.reject("NOT_INITIALIZED", "FoodOrderingClient is not initialized.")
      return
    }
    val err = activeClient.resumeMicrophone()
    if (err != null) {
      handleOrderResponse(err)
      promise.reject("RESUME_MIC_ERROR", err.message)
    } else {
      promise.resolve(null)
    }
  }

  @ReactMethod
  override fun endSession(waitUntilComplete: Boolean, promise: Promise) {
    val activeClient = client
    if (activeClient == null) {
      promise.resolve(null)
      return
    }
    moduleScope.launch {
      try {
        activeClient.endSession(waitUntilComplete)
        clearActiveSessionState()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("END_SESSION_ERROR", e.message ?: "Failed to end session", e)
      }
    }
  }

  @ReactMethod
  override fun release(promise: Promise) {
    cleanup()
    promise.resolve(null)
  }

  override fun onHostResume() {
    // Handled internally by FoodOrderingClient's AppLifecycleTracker.
  }

  override fun onHostPause() {
    // Handled internally by FoodOrderingClient's AppLifecycleTracker.
  }

  override fun onHostDestroy() {
    cleanup()
  }

  override fun invalidate() {
    super.invalidate()
    cleanup()
    moduleScope.cancel()
  }

  private fun clearActiveSessionState() {
    isSessionActive = false
    activeSessionId = null
    latestSessionUserInfo = null
    sessionJob?.cancel()
    sessionJob = null
    audioLevelJob?.cancel()
    audioLevelJob = null
  }

  private fun OrderResponse.Error.isTerminalSessionError(): Boolean =
    when (this) {
      is OrderResponse.Error.SessionAlreadyStarted,
      is OrderResponse.Error.SessionNotStarted -> false
      else -> true
    }

  private fun cleanup() {
    clearActiveSessionState()
    client?.release()
    client = null
    pendingDelegateRequests.values.forEach {
      it.completeExceptionally(IllegalStateException("FoodOrderingModule was released."))
    }
    pendingDelegateRequests.clear()
  }

  // ==========================================================================
  // Event Dispatch Helpers (Codegen JSI or Test Sink)
  // ==========================================================================

  private fun dispatchOnSessionStarted(payload: ReadableMap) {
    eventSink?.invoke("onSessionStarted", payload) ?: emitOnSessionStarted(payload)
  }

  private fun dispatchOnOrderUpdate(payload: ReadableMap) {
    eventSink?.invoke("onOrderUpdate", payload) ?: emitOnOrderUpdate(payload)
  }

  private fun dispatchOnSessionEnded(payload: ReadableMap) {
    eventSink?.invoke("onSessionEnded", payload) ?: emitOnSessionEnded(payload)
  }

  private fun dispatchOnTurnCompleted(payload: ReadableMap) {
    eventSink?.invoke("onTurnCompleted", payload) ?: emitOnTurnCompleted(payload)
  }

  private fun dispatchOnError(payload: ReadableMap) {
    eventSink?.invoke("onError", payload) ?: emitOnError(payload)
  }

  private fun dispatchOnSpeechRecognition(payload: ReadableMap) {
    eventSink?.invoke("onSpeechRecognition", payload) ?: emitOnSpeechRecognition(payload)
  }

  private fun dispatchOnAgentText(payload: ReadableMap) {
    eventSink?.invoke("onAgentText", payload) ?: emitOnAgentText(payload)
  }

  private fun dispatchOnSuggestedOptions(payload: ReadableMap) {
    eventSink?.invoke("onSuggestedOptions", payload) ?: emitOnSuggestedOptions(payload)
  }

  private fun dispatchOnRecommendedOrders(payload: ReadableMap) {
    eventSink?.invoke("onRecommendedOrders", payload) ?: emitOnRecommendedOrders(payload)
  }

  private fun dispatchOnAgentEvent(payload: ReadableMap) {
    eventSink?.invoke("onAgentEvent", payload) ?: emitOnAgentEvent(payload)
  }

  private fun dispatchOnInterruptionSignal(payload: ReadableMap) {
    eventSink?.invoke("onInterruptionSignal", payload) ?: emitOnInterruptionSignal(payload)
  }

  private fun dispatchOnSessionLifecycle(payload: ReadableMap) {
    eventSink?.invoke("onSessionLifecycle", payload) ?: emitOnSessionLifecycle(payload)
  }

  private fun dispatchOnAudioLevel(payload: ReadableMap) {
    eventSink?.invoke("onAudioLevel", payload) ?: emitOnAudioLevel(payload)
  }

  private fun dispatchOnAuthTokenRequested(payload: ReadableMap) {
    eventSink?.invoke("onAuthTokenRequested", payload) ?: emitOnAuthTokenRequested(payload)
  }

  private fun dispatchOnFinalizeOrderRequested(payload: ReadableMap) {
    eventSink?.invoke("onFinalizeOrderRequested", payload) ?: emitOnFinalizeOrderRequested(payload)
  }

  private fun dispatchOnSubmitOrderRequested(payload: ReadableMap) {
    eventSink?.invoke("onSubmitOrderRequested", payload) ?: emitOnSubmitOrderRequested(payload)
  }

  private fun dispatchOnOrderPricesRequested(payload: ReadableMap) {
    eventSink?.invoke("onOrderPricesRequested", payload) ?: emitOnOrderPricesRequested(payload)
  }

  private fun dispatchOnOrderStatusRequested(payload: ReadableMap) {
    eventSink?.invoke("onOrderStatusRequested", payload) ?: emitOnOrderStatusRequested(payload)
  }

  private fun dispatchOnLoyaltyRequested(payload: ReadableMap) {
    eventSink?.invoke("onLoyaltyRequested", payload) ?: emitOnLoyaltyRequested(payload)
  }

  // ==========================================================================
  // Native -> JS Delegate Request Helpers
  // ==========================================================================

  private suspend fun awaitDelegateResponse(
    emitRequest: (ReadableMap) -> Unit,
    requestMap: WritableMap,
    timeoutMs: Long = delegateRequestTimeoutMs,
  ): ReadableMap {
    val requestId = UUID.randomUUID().toString()
    val deferred = CompletableDeferred<ReadableMap>()
    pendingDelegateRequests[requestId] = deferred

    val envelope =
      createMap().apply {
        putString("requestId", requestId)
        putMap("request", requestMap)
      }
    emitRequest(envelope)

    return try {
      withTimeout(timeoutMs) { deferred.await() }
    } finally {
      pendingDelegateRequests.remove(requestId)
    }
  }

  private suspend fun requestAuthTokenFromBridge(): FoodOrderingClientAuthTokenResult {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::dispatchOnAuthTokenRequested,
          requestMap = createMap(),
        )
      val token = responseMap.getOptionalString("token")?.takeIf { it.isNotBlank() }
      val expiry = responseMap.getOptionalString("expiry")
      if (token != null) {
        FoodOrderingClientAuthTokenResult(
          success = true,
          authToken = FoodOrderingClientAuthTokenResponse(token = token, expiry = expiry),
        )
      } else {
        FoodOrderingClientAuthTokenResult(success = false, authToken = null)
      }
    } catch (_: Exception) {
      FoodOrderingClientAuthTokenResult(success = false, authToken = null)
    }
  }

  private suspend fun requestFinalizeOrderFromBridge(
    @Suppress("UNUSED_PARAMETER") request: FinalizeOrderRequest
  ): FinalizeOrderResponse {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::dispatchOnFinalizeOrderRequested,
          requestMap = createMap(),
        )
      responseMap.toFinalizeOrderResponse()
    } catch (e: Exception) {
      if (e.message == UNIMPLEMENTED_DELEGATE_ERROR) {
        defaultFinalizeOrderResponse()
      } else {
        FinalizeOrderResponse(paymentFlowEnabled = false)
      }
    }
  }

  private suspend fun requestSubmitOrderFromBridge(
    request: SubmitOrderRequest
  ): SubmitOrderResponse {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::dispatchOnSubmitOrderRequested,
          requestMap = request.toWritableMap(),
        )
      responseMap.toSubmitOrderResponse()
    } catch (_: Exception) {
      SubmitOrderResponse(success = false)
    }
  }

  private suspend fun requestOrderPricesFromBridge(
    request: OrderPricesRequest
  ): OrderPricesResponse {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::dispatchOnOrderPricesRequested,
          requestMap = request.toWritableMap(),
        )
      responseMap.toOrderPricesResponse()
    } catch (_: Exception) {
      OrderPricesResponse(success = false)
    }
  }

  private suspend fun requestOrderStatusFromBridge(
    @Suppress("UNUSED_PARAMETER") request: OrderStatusRequest
  ): OrderStatusResponse {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::dispatchOnOrderStatusRequested,
          requestMap = createMap(),
        )
      responseMap.toOrderStatusResponse()
    } catch (_: Exception) {
      OrderStatusResponse(success = false)
    }
  }

  private suspend fun requestLoyaltyFromBridge(request: LoyaltyRequest): LoyaltyResponse {
    val responseMap =
      try {
        awaitDelegateResponse(
          emitRequest = ::dispatchOnLoyaltyRequested,
          requestMap = request.toWritableMap(),
        )
      } catch (e: Exception) {
        if (e.message == UNIMPLEMENTED_DELEGATE_ERROR) {
          throw IllegalStateException("Loyalty handler is not registered.")
        }
        throw e
      }
    if (responseMap.getOptionalBoolean("__unhandled") == true) {
      throw IllegalStateException("Loyalty handler is not registered.")
    }
    if (responseMap.getOptionalBoolean("__error") == true) {
      throw IllegalStateException(
        responseMap.getOptionalString("errorMessage") ?: "Loyalty handler failed."
      )
    }
    return responseMap.toLoyaltyResponse()
  }

  private fun defaultFinalizeOrderResponse(): FinalizeOrderResponse {
    val paymentInfo = latestSessionUserInfo?.paymentInfo ?: return FinalizeOrderResponse()
    val lastFourDigits = paymentInfo.creditCardLastFourDigits?.takeIf { it.isNotEmpty() }
    val paymentMethod =
      paymentInfo.paymentMethod?.takeIf {
        it != PaymentMethod.UNSPECIFIED && it != PaymentMethod.UNKNOWN
      }
    val hasPaymentFlowInfo =
      lastFourDigits != null || (paymentMethod != null && paymentMethod != PaymentMethod.CASH)
    if (!hasPaymentFlowInfo) {
      return FinalizeOrderResponse()
    }
    return FinalizeOrderResponse(
      paymentFlowEnabled = true,
      paymentInfo =
        PaymentInfo(
          creditCardLastFourDigits = lastFourDigits,
          paymentMethod = paymentMethod,
        ),
    )
  }

  internal fun handleOrderResponse(response: OrderResponse) {
    when (response) {
      is OrderResponse.SessionStarted -> {
        if (response.sessionId.isNotBlank()) {
          activeSessionId = response.sessionId
        }
        dispatchOnSessionStarted(
          createMap().apply { putString("sessionId", response.sessionId) }
        )
        dispatchOnSessionLifecycle(
          createMap().apply {
            putString("sessionId", response.sessionId)
            putString("state", "STARTED")
          }
        )
      }
      is OrderResponse.OrderUpdate -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("updatedOrderState", response.updatedOrderState.toWritableMap())
            response.order?.let { putMap("order", it.toWritableMap()) }
          }
        dispatchOnOrderUpdate(payload)
      }
      is OrderResponse.SessionEnd -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("endSession", response.endSession.toWritableMap())
            response.endSession.storeSchedule?.let { putMap("storeSchedule", it.toWritableMap()) }
          }
        dispatchOnSessionEnded(payload)
        clearActiveSessionState()
      }
      is OrderResponse.TurnCompleted -> {
        val payload = createMap().apply { putString("sessionId", response.sessionId) }
        dispatchOnTurnCompleted(payload)
      }
      is OrderResponse.SpeechRecognitionResult -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("speechRecognition", response.speechRecognition.toWritableMap())
          }
        dispatchOnSpeechRecognition(payload)
      }
      is OrderResponse.Text -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putString("text", response.agentText)
          }
        dispatchOnAgentText(payload)
      }
      is OrderResponse.SuggestedOptions -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("suggestedOptions", response.suggestedOptions.toWritableMap())
          }
        dispatchOnSuggestedOptions(payload)
      }
      is OrderResponse.RecommendedOrders -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("recommendedOrders", response.recommendedOrders.toWritableMap())
          }
        dispatchOnRecommendedOrders(payload)
      }
      is OrderResponse.AgentEvent -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("agentEvent", response.agentEvent.toWritableMap())
          }
        dispatchOnAgentEvent(payload)
      }
      is OrderResponse.InterruptionSignal -> {
        val payload = createMap().apply { putString("sessionId", response.sessionId) }
        dispatchOnInterruptionSignal(payload)
      }
      is OrderResponse.SessionPaused -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putString("state", "PAUSED")
          }
        dispatchOnSessionLifecycle(payload)
      }
      is OrderResponse.SessionResumed -> {
        val payload =
          createMap().apply {
            putString("sessionId", response.sessionId)
            putString("state", "RESUMED")
          }
        dispatchOnSessionLifecycle(payload)
      }
      // Server response with no recognized payload; nothing to forward to JS.
      is OrderResponse.Unset -> Unit
      is OrderResponse.Error -> {
        val errorCode =
          when (response) {
            is OrderResponse.Error.MicrophonePermissionNotGranted ->
              "MICROPHONE_PERMISSION_NOT_GRANTED"
            is OrderResponse.Error.SessionAlreadyStarted -> "SESSION_ALREADY_STARTED"
            is OrderResponse.Error.InvalidSessionConfiguration -> "INVALID_SESSION_CONFIGURATION"
            is OrderResponse.Error.AuthTokenRefreshFailure -> "AUTH_TOKEN_REFRESH_FAILURE"
            is OrderResponse.Error.AppInBackground -> "APP_IN_BACKGROUND"
            is OrderResponse.Error.StreamClosed -> "STREAM_CLOSED"
            is OrderResponse.Error.InternalServerError -> "INTERNAL_SERVER_ERROR"
            is OrderResponse.Error.SessionNotStarted -> "SESSION_NOT_STARTED"
          }
        emitErrorEvent(
          sessionId = response.sessionId,
          code = errorCode,
          message = response.message,
        )
        if (response.isTerminalSessionError()) {
          clearActiveSessionState()
        }
      }
    }
  }

  private fun parseLogLevel(rawLevel: String?): Level =
    when (rawLevel?.trim()?.lowercase()) {
      "debug",
      "fine",
      "finer",
      "finest",
      "all" -> Level.FINE
      "info",
      "config" -> Level.INFO
      "warning",
      "warn" -> Level.WARNING
      "error",
      "severe" -> Level.SEVERE
      "none",
      "off" -> Level.OFF
      else -> Level.SEVERE
    }

  private fun emitErrorEvent(sessionId: String?, code: String, message: String) {
    val payload =
      createMap().apply {
        sessionId?.let { putString("sessionId", it) }
        putString("code", code)
        putString("message", message)
      }
    dispatchOnError(payload)
  }

  companion object {
    const val NAME = "FoodOrderingModule"
    const val MODULE_NAME = NAME
    private const val DELEGATE_REQUEST_TIMEOUT_MS = 15_000L
    private const val UNIMPLEMENTED_DELEGATE_ERROR = "UNIMPLEMENTED"
  }
}

// ============================================================================
// JNI-Safe Bridge Map / Array Factories
// ============================================================================

internal fun createMap(): WritableMap =
  try {
    Arguments.createMap()
  } catch (_: Throwable) {
    JavaOnlyMap()
  }

internal fun createArray(): WritableArray =
  try {
    Arguments.createArray()
  } catch (_: Throwable) {
    JavaOnlyArray()
  }

// ============================================================================
// ReadableMap -> Native Model Converters
// ============================================================================

private fun ReadableMap.getOptionalString(key: String): String? =
  if (hasKey(key) && !isNull(key)) getString(key) else null

private fun ReadableMap.getOptionalBoolean(key: String): Boolean? =
  if (hasKey(key) && !isNull(key)) getBoolean(key) else null

private fun ReadableMap.getOptionalInt(key: String): Int? =
  if (!hasKey(key) || isNull(key)) {
    null
  } else {
    when (getType(key)) {
      ReadableType.Number -> getInt(key)
      ReadableType.String -> getString(key)?.toIntOrNull()
      else -> null
    }
  }

private fun ReadableMap.getOptionalLong(key: String): Long? =
  if (!hasKey(key) || isNull(key)) {
    null
  } else {
    when (getType(key)) {
      ReadableType.Number -> getDouble(key).toLong()
      ReadableType.String -> getString(key)?.toLongOrNull()
      else -> null
    }
  }

private fun ReadableMap.getOptionalDouble(key: String): Double? =
  if (!hasKey(key) || isNull(key)) {
    null
  } else {
    when (getType(key)) {
      ReadableType.Number -> getDouble(key)
      ReadableType.String -> getString(key)?.toDoubleOrNull()
      else -> null
    }
  }

private fun ReadableMap.getOptionalMap(key: String): ReadableMap? =
  if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.Map) getMap(key) else null

private fun ReadableMap.getOptionalArray(key: String): ReadableArray? =
  if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.Array) getArray(key) else null

private fun ReadableArray.toStringList(): List<String> {
  val list = mutableListOf<String>()
  for (i in 0 until size()) {
    if (!isNull(i) && getType(i) == ReadableType.String) {
      getString(i)?.let { list.add(it) }
    }
  }
  return list
}

private fun ReadableMap.toTimestamp(): Timestamp? {
  val seconds = getOptionalLong("seconds") ?: return null
  val nanos = getOptionalInt("nanos") ?: 0
  return Timestamp(seconds = seconds, nanos = nanos)
}

private fun ReadableMap.toDuration(): Duration? {
  val seconds = getOptionalLong("seconds") ?: return null
  val nanos = getOptionalInt("nanos") ?: 0
  return Duration(seconds = seconds, nanos = nanos)
}

private fun ReadableMap.toFinalizeOrderResponse(): FinalizeOrderResponse =
  FinalizeOrderResponse(
    paymentFlowEnabled = getOptionalBoolean("paymentFlowEnabled") ?: false,
    paymentInfo = getOptionalMap("paymentInfo")?.toPaymentInfo(),
    totalAmountDue = getOptionalMap("totalAmountDue")?.toMoney(),
    orderPriceInfo = getOptionalMap("orderPriceInfo")?.toOrderPriceInfo(),
  )

private fun ReadableMap.toSubmitOrderResponse(): SubmitOrderResponse =
  SubmitOrderResponse(
    success = getOptionalBoolean("success") ?: false,
    estimatedReadyDuration = getOptionalMap("estimatedReadyDuration")?.toDuration(),
    externalOrderId = getOptionalString("externalOrderId"),
  )

private fun ReadableMap.toOrderPricesResponse(): OrderPricesResponse =
  OrderPricesResponse(
    success = getOptionalBoolean("success") ?: false,
    orderPriceInfo = getOptionalMap("orderPriceInfo")?.toOrderPriceInfo(),
  )

private fun ReadableMap.toOrderStatusResponse(): OrderStatusResponse =
  OrderStatusResponse(success = getOptionalBoolean("success") ?: false)

private fun parseLoyaltyActionCategory(raw: String?): LoyaltyActionCategory? {
  val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return when (trimmed) {
    "LOYALTY_ACTION_CATEGORY_UNSPECIFIED",
    "UNSPECIFIED" -> LoyaltyActionCategory.UNSPECIFIED
    "LOYALTY_ACTION_CATEGORY_ADD_CODE",
    "ADD_CODE" -> LoyaltyActionCategory.ADD_CODE
    "LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER",
    "IDENTIFY_CUSTOMER" -> LoyaltyActionCategory.IDENTIFY_CUSTOMER
    "LOYALTY_ACTION_CATEGORY_ADD_REWARD",
    "ADD_REWARD" -> LoyaltyActionCategory.ADD_REWARD
    "LOYALTY_ACTION_CATEGORY_REDEEM_POINTS",
    "REDEEM_POINTS" -> LoyaltyActionCategory.REDEEM_POINTS
    "LOYALTY_ACTION_CATEGORY_REMOVE_LOYALTY",
    "REMOVE_LOYALTY" -> LoyaltyActionCategory.REMOVE_LOYALTY
    "UNKNOWN" -> LoyaltyActionCategory.UNKNOWN
    else -> LoyaltyActionCategory.UNKNOWN
  }
}

private fun parseRejectionReason(raw: String?): ClientExecutionStatus.RejectionReason? {
  val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return when (trimmed) {
    "REJECTION_REASON_UNSPECIFIED",
    "UNSPECIFIED" -> ClientExecutionStatus.RejectionReason.UNSPECIFIED
    "REJECTION_REASON_INVALID_ID",
    "INVALID_ID" -> ClientExecutionStatus.RejectionReason.INVALID_ID
    "REJECTION_REASON_COOLDOWN_PERIOD",
    "COOLDOWN_PERIOD" -> ClientExecutionStatus.RejectionReason.COOLDOWN_PERIOD
    "REJECTION_REASON_INSUFFICIENT_FUNDS",
    "INSUFFICIENT_FUNDS" -> ClientExecutionStatus.RejectionReason.INSUFFICIENT_FUNDS
    "REJECTION_REASON_INSUFFICIENT_POINTS",
    "INSUFFICIENT_POINTS" -> ClientExecutionStatus.RejectionReason.INSUFFICIENT_POINTS
    "UNKNOWN" -> ClientExecutionStatus.RejectionReason.UNKNOWN
    else -> ClientExecutionStatus.RejectionReason.UNKNOWN
  }
}

private fun ReadableMap.toClientExecutionStatus(): ClientExecutionStatus =
  ClientExecutionStatus(
    httpStatusCode = getOptionalInt("httpStatusCode"),
    rawProviderMessage = getOptionalString("rawProviderMessage"),
    rejectionReason = parseRejectionReason(getOptionalString("rejectionReason")),
  )

private fun ReadableMap.toLoyaltyResponse(): LoyaltyResponse =
  LoyaltyResponse(
    category = parseLoyaltyActionCategory(getOptionalString("category")),
    loyaltyMetadata = getOptionalMap("loyaltyMetadata")?.toLoyaltyMetadata(),
    customIntegrationAttributes =
      getOptionalMap("customIntegrationAttributes")?.toHashMap() ?: emptyMap(),
    clientExecutionStatus =
      getOptionalMap("clientExecutionStatus")?.toClientExecutionStatus(),
  )

private fun ReadableMap.toUserLocation(): UserLocation? {
  val coordsMap = getOptionalMap("coordinates") ?: return null
  return UserLocation(
    coordinates = coordsMap.toLatLng(),
    captureTime = getOptionalMap("captureTime")?.toTimestamp(),
  )
}

private fun ReadableMap.toUserInfo(): UserInfo =
  UserInfo(
    preferredName = getOptionalString("preferredName"),
    phoneNumber = getOptionalString("phoneNumber"),
    userId = getOptionalString("userId"),
    paymentInfo = getOptionalMap("paymentInfo")?.toPaymentInfo(),
    pastOrders =
      getOptionalArray("pastOrders")?.let { arr ->
        (0 until arr.size()).mapNotNull { i ->
          arr.getMap(i)?.let { PastOrder(order = it.getOptionalMap("order")?.toOrder()) }
        }
      } ?: emptyList(),
    loyaltyInfo = getOptionalMap("loyaltyInfo")?.toLoyaltyInfo(),
    savedDeliveryAddress = getOptionalMap("savedDeliveryAddress")?.toDeliveryAddress(),
    location = getOptionalMap("location")?.toUserLocation(),
  )

private fun ReadableMap.toFeatureGates(): FeatureGates =
  FeatureGates(
    triggerOfferEngineOnDemand = getOptionalBoolean("triggerOfferEngineOnDemand"),
    triggerLoyaltyOnDemand = getOptionalBoolean("triggerLoyaltyOnDemand"),
    triggerOrderMediaAssistantOnDemand = getOptionalBoolean("triggerOrderMediaAssistantOnDemand"),
    menuResponseEnabled = getOptionalBoolean("menuResponseEnabled"),
    revampedPaymentFlowEnabled = getOptionalBoolean("revampedPaymentFlowEnabled"),
    enableOrderStatusRetrieval = getOptionalBoolean("enableOrderStatusRetrieval"),
    updatedOrderStateEnabled = getOptionalBoolean("updatedOrderStateEnabled"),
    storeSelectionEnabled = getOptionalBoolean("storeSelectionEnabled"),
    offersAndLoyaltyEnabled = getOptionalBoolean("offersAndLoyaltyEnabled"),
  )

private fun ReadableMap.toMoney(): Money =
  Money(
    currencyCode = getOptionalString("currencyCode") ?: "",
    units = getOptionalInt("units") ?: 0,
    nanos = getOptionalInt("nanos") ?: 0,
  )

private fun ReadableMap.toImageSource(): ImageSource =
  ImageSource(
    uri = getOptionalString("uri") ?: "",
    width = getOptionalInt("width") ?: 0,
    height = getOptionalInt("height") ?: 0,
  )

private fun ReadableMap.toImage(): Image =
  Image(
    sourceUri = getOptionalString("sourceUri") ?: "",
    sources =
      getOptionalArray("sources")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toImageSource() }
      } ?: emptyList(),
  )

private fun ReadableMap.toLatLng(): LatLng =
  LatLng(latitude = getOptionalDouble("latitude"), longitude = getOptionalDouble("longitude"))

private fun ReadableMap.toPostalAddress(): PostalAddress =
  PostalAddress(
    revision = getOptionalInt("revision"),
    regionCode = getOptionalString("regionCode"),
    languageCode = getOptionalString("languageCode"),
    postalCode = getOptionalString("postalCode"),
    sortingCode = getOptionalString("sortingCode"),
    administrativeArea = getOptionalString("administrativeArea"),
    locality = getOptionalString("locality"),
    sublocality = getOptionalString("sublocality"),
    addressLines = getOptionalArray("addressLines")?.toStringList() ?: emptyList(),
    recipients = getOptionalArray("recipients")?.toStringList() ?: emptyList(),
    organization = getOptionalString("organization"),
  )

private fun parseDeliveryAddressValidationStatus(
  raw: String?
): DeliveryAddressValidationStatus? {
  val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return when (trimmed) {
    "VALIDATION_STATUS_UNSPECIFIED",
    "UNSPECIFIED" -> DeliveryAddressValidationStatus.UNSPECIFIED
    "VALIDATION_STATUS_VALID",
    "VALID" -> DeliveryAddressValidationStatus.VALID
    "VALIDATION_STATUS_INVALID",
    "INVALID" -> DeliveryAddressValidationStatus.INVALID
    "VALIDATION_STATUS_OUT_OF_RANGE",
    "OUT_OF_RANGE" -> DeliveryAddressValidationStatus.OUT_OF_RANGE
    "VALIDATION_STATUS_INCOMPLETE_ADDRESS",
    "INCOMPLETE_ADDRESS" -> DeliveryAddressValidationStatus.INCOMPLETE_ADDRESS
    "UNKNOWN" -> DeliveryAddressValidationStatus.UNKNOWN
    else -> DeliveryAddressValidationStatus.UNKNOWN
  }
}

private fun parseFulfillmentMethod(raw: String?): FulfillmentMethod? {
  val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return when (trimmed) {
    "FULFILLMENT_METHOD_UNSPECIFIED",
    "UNSPECIFIED" -> FulfillmentMethod.UNSPECIFIED
    "FULFILLMENT_METHOD_DINE_IN",
    "DINE_IN" -> FulfillmentMethod.DINE_IN
    "FULFILLMENT_METHOD_PICKUP",
    "PICKUP" -> FulfillmentMethod.PICKUP
    "FULFILLMENT_METHOD_DRIVE_THRU",
    "DRIVE_THRU" -> FulfillmentMethod.DRIVE_THRU
    "FULFILLMENT_METHOD_DELIVERY",
    "DELIVERY" -> FulfillmentMethod.DELIVERY
    "FULFILLMENT_METHOD_CURBSIDE",
    "CURBSIDE" -> FulfillmentMethod.CURBSIDE
    "UNKNOWN" -> FulfillmentMethod.UNKNOWN
    else -> FulfillmentMethod.UNKNOWN
  }
}

private fun parseFulfillmentState(raw: String?): FulfillmentState? {
  val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return when (trimmed) {
    "FULFILLMENT_STATE_UNSPECIFIED",
    "UNSPECIFIED" -> FulfillmentState.UNSPECIFIED
    "FULFILLMENT_STATE_PARTIALLY_APPLIED",
    "PARTIALLY_APPLIED" -> FulfillmentState.PARTIALLY_APPLIED
    "FULFILLMENT_STATE_FULLY_APPLIED",
    "FULLY_APPLIED" -> FulfillmentState.FULLY_APPLIED
    "UNKNOWN" -> FulfillmentState.UNKNOWN
    else -> FulfillmentState.UNKNOWN
  }
}

private fun parseOfferEngineState(raw: String?): OfferEngineState? {
  val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return when (trimmed) {
    "OFFER_ENGINE_STATE_UNSPECIFIED",
    "UNSPECIFIED" -> OfferEngineState.UNSPECIFIED
    "OFFER_ENGINE_STATE_NOT_TRIGGERED",
    "NOT_TRIGGERED" -> OfferEngineState.NOT_TRIGGERED
    "OFFER_ENGINE_STATE_NO_OFFERS_FOUND",
    "NO_OFFERS_FOUND" -> OfferEngineState.NO_OFFERS_FOUND
    "OFFER_ENGINE_STATE_OFFERS_FOUND",
    "OFFERS_FOUND" -> OfferEngineState.OFFERS_FOUND
    "UNKNOWN" -> OfferEngineState.UNKNOWN
    else -> OfferEngineState.UNKNOWN
  }
}

private fun ReadableMap.toDeliveryAddress(): DeliveryAddress =
  DeliveryAddress(
    address = getOptionalMap("address")?.toPostalAddress(),
    status = parseDeliveryAddressValidationStatus(getOptionalString("validationStatus")),
    coordinates = getOptionalMap("coordinates")?.toLatLng(),
  )

private fun ReadableMap.toPaymentInfo(): PaymentInfo =
  PaymentInfo(
    creditCardLastFourDigits = getOptionalString("creditCardLastFourDigits"),
    paymentMethod =
      getOptionalString("paymentMethod")?.trim()?.takeIf { it.isNotEmpty() }?.let { raw ->
        when (raw) {
          "PAYMENT_METHOD_CREDIT_CARD",
          "CREDIT_CARD" -> PaymentMethod.CREDIT_CARD
          "PAYMENT_METHOD_CASH",
          "CASH" -> PaymentMethod.CASH
          "PAYMENT_METHOD_UNSPECIFIED",
          "UNSPECIFIED" -> PaymentMethod.UNSPECIFIED
          "UNKNOWN" -> PaymentMethod.UNKNOWN
          else -> PaymentMethod.UNKNOWN
        }
      },
  )

private fun ReadableMap.toTippingInfo(): TippingInfo =
  TippingInfo(
    amount = getOptionalMap("amount")?.toMoney(),
    percentageBps = getOptionalInt("percentageBps"),
  )

private fun ReadableMap.toLoyaltyAmount(): LoyaltyAmount =
  LoyaltyAmount(units = getOptionalLong("units") ?: 0L)

private fun ReadableMap.toLoyaltyInfo(): LoyaltyInfo =
  LoyaltyInfo(loyaltyAmount = getOptionalMap("loyaltyAmount")?.toLoyaltyAmount())

private fun ReadableMap.toCustomerInformation(): CustomerInformation =
  CustomerInformation(
    name = getOptionalString("name"),
    loyaltyAmount = getOptionalMap("loyaltyAmount")?.toLoyaltyAmount(),
    tier = getOptionalString("tier"),
  )

private fun ReadableMap.toAccrualForecast(): AccrualForecast =
  AccrualForecast(
    potentialAccrual = getOptionalMap("potentialAccrual")?.toLoyaltyAmount(),
    upsellNudge = getOptionalString("upsellNudge"),
  )

private fun ReadableMap.toLoyaltyConditionDetail(): LoyaltyConditionDetail =
  LoyaltyConditionDetail(
    description = getOptionalString("description"),
    preTaxMinimumSpend = getOptionalMap("preTaxMinimumSpend")?.toMoney(),
    postTaxMinimumSpend = getOptionalMap("postTaxMinimumSpend")?.toMoney(),
  )

private fun ReadableMap.toLoyaltySlotDetail(): LoyaltySlotDetail =
  LoyaltySlotDetail(
    eligibleProductCodes = getOptionalArray("eligibleProductCodes")?.toStringList() ?: emptyList(),
    quantityRequired = getOptionalInt("quantityRequired"),
    conditionalFill = getOptionalBoolean("conditionalFill"),
  )

private fun ReadableMap.toLoyaltyReward(): LoyaltyReward =
  LoyaltyReward(
    rewardId = getOptionalString("rewardId"),
    displayName = getOptionalString("displayName"),
    conditions =
      getOptionalArray("conditions")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toLoyaltyConditionDetail() }
      } ?: emptyList(),
    slotDetails =
      getOptionalArray("slotDetails")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toLoyaltySlotDetail() }
      } ?: emptyList(),
    redemptionCost = getOptionalMap("redemptionCost")?.toLoyaltyAmount(),
    description = getOptionalString("description"),
    image = getOptionalMap("image")?.toImage(),
    expireTime = getOptionalMap("expireTime")?.toTimestamp(),
    customIntegrationAttributes =
      getOptionalMap("customIntegrationAttributes")?.toHashMap() ?: emptyMap(),
  )

private fun ReadableMap.toLoyaltyMetadata(): LoyaltyMetadata =
  LoyaltyMetadata(
    customer = getOptionalMap("customer")?.toCustomerInformation(),
    accrual = getOptionalMap("accrual")?.toAccrualForecast(),
    availableRewards =
      getOptionalArray("availableRewards")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toLoyaltyReward() }
      } ?: emptyList(),
    appliedCodes = getOptionalArray("appliedCodes")?.toStringList() ?: emptyList(),
    appliedRewardIds = getOptionalArray("appliedRewardIds")?.toStringList() ?: emptyList(),
  )

private fun ReadableMap.toFulfilledItem(): FulfilledItem =
  FulfilledItem(
    lineItemUid = getOptionalString("lineItemUid"),
    quantity = getOptionalInt("quantity"),
  )

private fun ReadableMap.toAppliedOffer(): AppliedOffer =
  AppliedOffer(
    offerId = getOptionalString("offerId"),
    fulfillmentState = parseFulfillmentState(getOptionalString("state")),
    fulfilledItems =
      getOptionalArray("fulfilledItems")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toFulfilledItem() }
      } ?: emptyList(),
  )

private fun ReadableMap.toOfferEngineMetadata(): OfferEngineMetadata =
  OfferEngineMetadata(
    engineState = parseOfferEngineState(getOptionalString("state")),
    discountedOrderPriceInfo = getOptionalMap("discountedOrderPriceInfo")?.toOrderPriceInfo(),
  )

private fun ReadableMap.toOrderModifier(): OrderModifier =
  OrderModifier(
    uid = getOptionalString("uid"),
    modifierId = getOptionalString("modifierId") ?: "",
    displayName = getOptionalString("displayName") ?: "",
    priceAdjustment = getOptionalMap("priceAdjustment")?.toMoney(),
    quantity = getOptionalInt("quantity") ?: 0,
    modifierAction =
      getOptionalMap("modifierAction")?.let {
        OrderModifierAction(name = it.getOptionalString("name"))
      },
    image = getOptionalMap("image")?.toImage(),
    modifierGroups =
      getOptionalArray("modifierGroups")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toOrderModifierGroup() }
      } ?: emptyList(),
    isDefault = getOptionalBoolean("isDefault"),
    integrationAttributes =
      getOptionalMap("integrationAttributes")?.let {
        ModifierIntegrationAttributes(
          customIntegrationAttributes =
            it.getOptionalMap("customIntegrationAttributes")?.toHashMap() ?: emptyMap(),
          externalModifierId = it.getOptionalString("externalModifierId"),
        )
      },
  )

private fun ReadableMap.toOrderModifierGroup(): OrderModifierGroup =
  OrderModifierGroup(
    modifierGroupId = getOptionalString("modifierGroupId") ?: "",
    displayName = getOptionalString("displayName") ?: "",
    modifiers =
      getOptionalArray("modifiers")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toOrderModifier() }
      } ?: emptyList(),
    integrationAttributes =
      getOptionalMap("integrationAttributes")?.let {
        ModifierGroupIntegrationAttributes(
          customIntegrationAttributes =
            it.getOptionalMap("customIntegrationAttributes")?.toHashMap() ?: emptyMap(),
          externalModifierGroupId = it.getOptionalString("externalModifierGroupId"),
        )
      },
  )

private fun ReadableMap.toOrderItem(): OrderItem =
  OrderItem(
    uid = getOptionalString("uid"),
    itemId = getOptionalString("itemId") ?: "",
    displayName = getOptionalString("displayName") ?: "",
    image = getOptionalMap("image")?.toImage(),
    basePrice = getOptionalMap("basePrice")?.toMoney(),
    modifierGroups =
      getOptionalArray("modifierGroups")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toOrderModifierGroup() }
      } ?: emptyList(),
    quantity = getOptionalInt("quantity") ?: 0,
    integrationAttributes =
      getOptionalMap("integrationAttributes")?.let {
        ItemIntegrationAttributes(
          customIntegrationAttributes =
            it.getOptionalMap("customIntegrationAttributes")?.toHashMap() ?: emptyMap(),
          externalItemId = it.getOptionalString("externalItemId"),
        )
      },
    totalPrice = getOptionalMap("totalPrice")?.toMoney(),
    categoryIds = getOptionalArray("categoryIds")?.toStringList() ?: emptyList(),
    isPending = getOptionalBoolean("isPending"),
  )

private fun ReadableMap.toOrderPriceInfo(): OrderPriceInfo =
  OrderPriceInfo(
    totalPrice = getOptionalMap("totalPrice")?.toMoney(),
    subtotalPrice = getOptionalMap("subtotalPrice")?.toMoney(),
    taxPrice = getOptionalMap("taxPrice")?.toMoney(),
    discount = getOptionalMap("discount")?.toMoney(),
    saving = getOptionalMap("saving")?.toMoney(),
    fees = getOptionalMap("fees")?.toMoney(),
    tip = getOptionalMap("tip")?.toMoney(),
  )

private fun ReadableMap.toOrderMetadata(): OrderMetadata =
  OrderMetadata(
    collectedCustomerName = getOptionalString("collectedCustomerName"),
    callerPhoneNumber = getOptionalString("callerPhoneNumber"),
    loyaltyMetadata = getOptionalMap("loyaltyMetadata")?.toLoyaltyMetadata(),
    appliedOffers =
      getOptionalArray("appliedOffers")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toAppliedOffer() }
      } ?: emptyList(),
    deliveryAddress = getOptionalMap("deliveryAddress")?.toDeliveryAddress(),
    offerEngineMetadata = getOptionalMap("offerEngineMetadata")?.toOfferEngineMetadata(),
  )

private fun ReadableMap.toOrder(): Order =
  Order(
    items =
      getOptionalArray("items")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toOrderItem() }
      } ?: emptyList(),
    metadata = getOptionalMap("metadata")?.toOrderMetadata(),
    fulfillment =
      getOptionalMap("fulfillment")?.let { f ->
        OrderFulfillment(
          method = parseFulfillmentMethod(f.getOptionalString("fulfillmentMethod")),
          createTimestamp = f.getOptionalMap("createTime")?.toTimestamp(),
          targetFulfillmentTimestamp = f.getOptionalMap("targetFulfillmentTime")?.toTimestamp(),
        )
      },
    priceInfo = getOptionalMap("priceInfo")?.toOrderPriceInfo(),
    externalOrderId = getOptionalString("externalOrderId"),
    tippingInfo = getOptionalMap("tippingInfo")?.toTippingInfo(),
    loyaltyInfo = getOptionalMap("loyaltyInfo")?.toLoyaltyInfo(),
    orderPayment =
      getOptionalMap("orderPayment")?.let { op ->
        OrderPayment(
          tippingInfo = op.getOptionalMap("tippingInfo")?.toTippingInfo(),
          loyaltyConsumed = op.getOptionalMap("loyaltyConsumed")?.toLoyaltyAmount(),
          paymentInfo = op.getOptionalMap("paymentInfo")?.toPaymentInfo(),
        )
      },
    customIntegrationAttributes =
      getOptionalMap("customIntegrationAttributes")?.toHashMap() ?: emptyMap(),
  )

// ============================================================================
// Native Model -> WritableMap Converters
// ============================================================================

private fun Timestamp.toWritableMap(): WritableMap =
  createMap().apply {
    putDouble("seconds", seconds.toDouble())
    putInt("nanos", nanos)
  }

private fun LoyaltyAmount.toWritableMap(): WritableMap =
  createMap().apply { putDouble("units", units.toDouble()) }

private fun LoyaltyActionCategory.toWireString(): String =
  when (this) {
    LoyaltyActionCategory.UNSPECIFIED -> "LOYALTY_ACTION_CATEGORY_UNSPECIFIED"
    LoyaltyActionCategory.ADD_CODE -> "LOYALTY_ACTION_CATEGORY_ADD_CODE"
    LoyaltyActionCategory.IDENTIFY_CUSTOMER -> "LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER"
    LoyaltyActionCategory.ADD_REWARD -> "LOYALTY_ACTION_CATEGORY_ADD_REWARD"
    LoyaltyActionCategory.REDEEM_POINTS -> "LOYALTY_ACTION_CATEGORY_REDEEM_POINTS"
    LoyaltyActionCategory.REMOVE_LOYALTY -> "LOYALTY_ACTION_CATEGORY_REMOVE_LOYALTY"
    LoyaltyActionCategory.UNKNOWN -> "UNKNOWN"
  }

private fun LoyaltyRequest.toWritableMap(): WritableMap =
  createMap().apply {
    putString("category", category.toWireString())
    code?.let { putString("code", it) }
    phoneNumber?.let { putString("phoneNumber", it) }
    email?.let { putString("email", it) }
    loyaltyAccountId?.let { putString("loyaltyAccountId", it) }
    if (rewardIds.isNotEmpty()) {
      putArray("rewardIds", rewardIds.toWritableArray())
    }
    if (selectedProductCodes.isNotEmpty()) {
      putArray("selectedProductCodes", selectedProductCodes.toWritableArray())
    }
    loyaltyAmount?.let { putMap("loyaltyAmount", it.toWritableMap()) }
  }

private fun SubmitOrderRequest.toWritableMap(): WritableMap =
  createMap().apply {
    paymentInfo?.let { putMap("paymentInfo", it.toWritableMap()) }
    loyaltyInfo?.let { putMap("loyaltyInfo", it.toWritableMap()) }
    tip?.let { putMap("tip", it.toWritableMap()) }
  }

private fun OrderPricesRequest.toWritableMap(): WritableMap =
  createMap().apply { order?.let { putMap("order", it.toWritableMap()) } }

private fun SubmitOrderPaymentInfo.toWritableMap(): WritableMap =
  createMap().apply {
    creditCardLastFourDigits?.let { putString("creditCardLastFourDigits", it) }
    creditCardCvv?.let { putString("creditCardCvv", it) }
    paymentMethod?.let { putString("paymentMethod", it.value) }
  }

private fun PaymentInfo.toWritableMap(): WritableMap =
  createMap().apply {
    creditCardLastFourDigits?.let { putString("creditCardLastFourDigits", it) }
    paymentMethod?.let { putString("paymentMethod", it.value) }
  }

private fun LoyaltyInfo.toWritableMap(): WritableMap =
  createMap().apply { loyaltyAmount?.let { putMap("loyaltyAmount", it.toWritableMap()) } }

private fun CustomerInformation.toWritableMap(): WritableMap =
  createMap().apply {
    name?.let { putString("name", it) }
    loyaltyAmount?.let { putMap("loyaltyAmount", it.toWritableMap()) }
    tier?.let { putString("tier", it) }
  }

private fun AccrualForecast.toWritableMap(): WritableMap =
  createMap().apply {
    potentialAccrual?.let { putMap("potentialAccrual", it.toWritableMap()) }
    upsellNudge?.let { putString("upsellNudge", it) }
  }

private fun LoyaltyConditionDetail.toWritableMap(): WritableMap =
  createMap().apply {
    description?.let { putString("description", it) }
    preTaxMinimumSpend?.let { putMap("preTaxMinimumSpend", it.toWritableMap()) }
    postTaxMinimumSpend?.let { putMap("postTaxMinimumSpend", it.toWritableMap()) }
  }

private fun LoyaltySlotDetail.toWritableMap(): WritableMap =
  createMap().apply {
    putArray("eligibleProductCodes", eligibleProductCodes.toWritableArray())
    quantityRequired?.let { putInt("quantityRequired", it) }
    conditionalFill?.let { putBoolean("conditionalFill", it) }
  }

private fun LoyaltyReward.toWritableMap(): WritableMap =
  createMap().apply {
    rewardId?.let { putString("rewardId", it) }
    displayName?.let { putString("displayName", it) }
    val condArr = createArray()
    conditions.forEach { condArr.pushMap(it.toWritableMap()) }
    putArray("conditions", condArr)
    val slotsArr = createArray()
    slotDetails.forEach { slotsArr.pushMap(it.toWritableMap()) }
    putArray("slotDetails", slotsArr)
    redemptionCost?.let { putMap("redemptionCost", it.toWritableMap()) }
    description?.let { putString("description", it) }
    image?.let { putMap("image", it.toWritableMap()) }
    expireTime?.let { putMap("expireTime", it.toWritableMap()) }
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun LoyaltyMetadata.toWritableMap(): WritableMap =
  createMap().apply {
    customer?.let { putMap("customer", it.toWritableMap()) }
    accrual?.let { putMap("accrual", it.toWritableMap()) }
    val rewardsArr = createArray()
    availableRewards.forEach { rewardsArr.pushMap(it.toWritableMap()) }
    putArray("availableRewards", rewardsArr)
    putArray("appliedCodes", appliedCodes.toWritableArray())
    putArray("appliedRewardIds", appliedRewardIds.toWritableArray())
  }

private fun FulfilledItem.toWritableMap(): WritableMap =
  createMap().apply {
    lineItemUid?.let { putString("lineItemUid", it) }
    quantity?.let { putInt("quantity", it) }
  }

private fun AppliedOffer.toWritableMap(): WritableMap =
  createMap().apply {
    offerId?.let { putString("offerId", it) }
    fulfillmentState?.let { putString("state", it.value) }
    val itemsArr = createArray()
    fulfilledItems.forEach { itemsArr.pushMap(it.toWritableMap()) }
    putArray("fulfilledItems", itemsArr)
  }

private fun UpdatedOrderState.toWritableMap(): WritableMap =
  createMap().apply {
    order?.let {
      putMap("order", it.toWritableMap())
      val itemsArr = createArray()
      it.items.forEach { item -> itemsArr.pushMap(item.toWritableMap()) }
      putArray("items", itemsArr)
    }
    putBoolean("changed", changed)
    putString("status", status.name)
    putString("detailedMessage", detailedMessage)
  }

private fun DayOfWeek.toWireString(): String =
  if (this == DayOfWeek.UNSPECIFIED) "DAY_OF_WEEK_UNSPECIFIED" else name

private fun StoreDate.toWritableMap(): WritableMap =
  createMap().apply {
    putInt("year", year)
    putInt("month", month)
    putInt("day", day)
  }

private fun DateRange.toWritableMap(): WritableMap =
  createMap().apply {
    startDate?.let { putMap("startDate", it.toWritableMap()) }
    endDate?.let { putMap("endDate", it.toWritableMap()) }
  }

private fun TimeOfDay.toWritableMap(): WritableMap =
  createMap().apply {
    putInt("hours", hours)
    putInt("minutes", minutes)
    putInt("seconds", seconds)
    putInt("nanos", nanos)
  }

private fun TimeOfDayRange.toWritableMap(): WritableMap =
  createMap().apply {
    startTime?.let { putMap("startTime", it.toWritableMap()) }
    endTime?.let { putMap("endTime", it.toWritableMap()) }
  }

private fun StoreSchedule.toWritableMap(): WritableMap =
  createMap().apply {
    val daysArr = createArray()
    days.forEach { daysArr.pushString(it.toWireString()) }
    putArray("days", daysArr)
    val dateRangesArr = createArray()
    dateRanges.forEach { dateRangesArr.pushMap(it.toWritableMap()) }
    putArray("dateRanges", dateRangesArr)
    val timeRangesArr = createArray()
    timeRanges.forEach { timeRangesArr.pushMap(it.toWritableMap()) }
    putArray("timeRanges", timeRangesArr)
  }

private fun EndSession.toWritableMap(): WritableMap =
  createMap().apply {
    putString("type", type?.name ?: "END_TYPE_UNSPECIFIED")
    putString("reason", reason ?: "")
    posResponse?.let { putString("posResponse", it) }
    agentResponse?.let { putString("agentResponse", it) }
    storeSchedule?.let { putMap("storeSchedule", it.toWritableMap()) }
  }

private fun SpeechRecognition.toWritableMap(): WritableMap =
  createMap().apply {
    putString("transcript", transcript)
    putString("languageCode", languageCode)
    putBoolean("isFinal", isFinal)
  }

private fun AgentEvent.toWritableMap(): WritableMap =
  createMap().apply {
    when (this@toWritableMap) {
      is AgentEvent.RestartOrder -> {
        putString("type", "RESTART_ORDER")
        putBoolean("confirmationStep", confirmationStep)
      }
      is AgentEvent.StoreChange -> {
        putString("type", "STORE_CHANGE")
        putString("store", store)
      }
      AgentEvent.Unknown -> {
        putString("type", "UNKNOWN")
      }
    }
  }

private fun Money.toWritableMap(): WritableMap =
  createMap().apply {
    putString("currencyCode", currencyCode)
    putInt("units", units)
    putInt("nanos", nanos)
  }

private fun ImageSource.toWritableMap(): WritableMap =
  createMap().apply {
    putString("uri", uri)
    putInt("width", width)
    putInt("height", height)
  }

private fun Image.toWritableMap(): WritableMap =
  createMap().apply {
    putString("sourceUri", sourceUri)
    if (sources.isNotEmpty()) {
      val sourcesArr = createArray()
      sources.forEach { sourcesArr.pushMap(it.toWritableMap()) }
      putArray("sources", sourcesArr)
    }
  }

private fun NutritionalInfo.toWritableMap(): WritableMap =
  createMap().apply { putString("calories", calories) }

private fun LatLng.toWritableMap(): WritableMap =
  createMap().apply {
    latitude?.let { putDouble("latitude", it) }
    longitude?.let { putDouble("longitude", it) }
  }

private fun PostalAddress.toWritableMap(): WritableMap =
  createMap().apply {
    revision?.let { putInt("revision", it) }
    regionCode?.let { putString("regionCode", it) }
    languageCode?.let { putString("languageCode", it) }
    postalCode?.let { putString("postalCode", it) }
    sortingCode?.let { putString("sortingCode", it) }
    administrativeArea?.let { putString("administrativeArea", it) }
    locality?.let { putString("locality", it) }
    sublocality?.let { putString("sublocality", it) }
    putArray("addressLines", addressLines.toWritableArray())
    putArray("recipients", recipients.toWritableArray())
    organization?.let { putString("organization", it) }
  }

private fun DeliveryAddress.toWritableMap(): WritableMap =
  createMap().apply {
    address?.let { putMap("address", it.toWritableMap()) }
    status?.let { putString("validationStatus", it.value) }
    coordinates?.let { putMap("coordinates", it.toWritableMap()) }
  }

private fun ItemIntegrationAttributes.toWritableMap(): WritableMap =
  createMap().apply {
    externalItemId?.let { putString("externalItemId", it) }
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun ModifierGroupIntegrationAttributes.toWritableMap(): WritableMap =
  createMap().apply {
    externalModifierGroupId?.let { putString("externalModifierGroupId", it) }
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun ModifierIntegrationAttributes.toWritableMap(): WritableMap =
  createMap().apply {
    externalModifierId?.let { putString("externalModifierId", it) }
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun OrderModifier.toWritableMap(): WritableMap =
  createMap().apply {
    uid?.let { putString("uid", it) }
    putString("modifierId", modifierId)
    putString("displayName", displayName)
    priceAdjustment?.let { putMap("priceAdjustment", it.toWritableMap()) }
    putInt("quantity", quantity)
    modifierAction?.let { action ->
      putMap(
        "modifierAction",
        createMap().apply { action.name?.let { putString("name", it) } },
      )
    }
    image?.let { putMap("image", it.toWritableMap()) }
    val nestedGroups = createArray()
    modifierGroups.forEach { nestedGroups.pushMap(it.toWritableMap()) }
    putArray("modifierGroups", nestedGroups)
    isDefault?.let { putBoolean("isDefault", it) }
    integrationAttributes?.let { putMap("integrationAttributes", it.toWritableMap()) }
  }

private fun OrderModifierGroup.toWritableMap(): WritableMap =
  createMap().apply {
    putString("modifierGroupId", modifierGroupId)
    putString("displayName", displayName)
    val modsArray = createArray()
    modifiers.forEach { modsArray.pushMap(it.toWritableMap()) }
    putArray("modifiers", modsArray)
    integrationAttributes?.let { putMap("integrationAttributes", it.toWritableMap()) }
  }

private fun OrderItem.toWritableMap(): WritableMap =
  createMap().apply {
    uid?.let { putString("uid", it) }
    putString("itemId", itemId)
    putString("displayName", displayName)
    image?.let { putMap("image", it.toWritableMap()) }
    basePrice?.let { putMap("basePrice", it.toWritableMap()) }
    val groupsArray = createArray()
    modifierGroups.forEach { groupsArray.pushMap(it.toWritableMap()) }
    putArray("modifierGroups", groupsArray)
    putInt("quantity", quantity)
    integrationAttributes?.let { putMap("integrationAttributes", it.toWritableMap()) }
    totalPrice?.let { putMap("totalPrice", it.toWritableMap()) }
    putArray("categoryIds", categoryIds.toWritableArray())
    isPending?.let { putBoolean("isPending", it) }
  }

private fun OrderPriceInfo.toWritableMap(): WritableMap =
  createMap().apply {
    totalPrice?.let { putMap("totalPrice", it.toWritableMap()) }
    subtotalPrice?.let { putMap("subtotalPrice", it.toWritableMap()) }
    taxPrice?.let { putMap("taxPrice", it.toWritableMap()) }
    discount?.let { putMap("discount", it.toWritableMap()) }
    saving?.let { putMap("saving", it.toWritableMap()) }
    fees?.let { putMap("fees", it.toWritableMap()) }
    tip?.let { putMap("tip", it.toWritableMap()) }
  }

private fun OrderMetadata.toWritableMap(): WritableMap =
  createMap().apply {
    collectedCustomerName?.let { putString("collectedCustomerName", it) }
    callerPhoneNumber?.let { putString("callerPhoneNumber", it) }
    loyaltyMetadata?.let { putMap("loyaltyMetadata", it.toWritableMap()) }
    if (appliedOffers.isNotEmpty()) {
      val offersArr = createArray()
      appliedOffers.forEach { offersArr.pushMap(it.toWritableMap()) }
      putArray("appliedOffers", offersArr)
    }
    deliveryAddress?.let { putMap("deliveryAddress", it.toWritableMap()) }
    offerEngineMetadata?.let { oem ->
      putMap(
        "offerEngineMetadata",
        createMap().apply {
          oem.engineState?.let { putString("state", it.value) }
          oem.discountedOrderPriceInfo?.let {
            putMap("discountedOrderPriceInfo", it.toWritableMap())
          }
        },
      )
    }
  }

private fun TippingInfo.toWritableMap(): WritableMap =
  createMap().apply {
    amount?.let { putMap("amount", it.toWritableMap()) }
    percentageBps?.let { putInt("percentageBps", it) }
  }

private fun OrderPayment.toWritableMap(): WritableMap =
  createMap().apply {
    tippingInfo?.let { putMap("tippingInfo", it.toWritableMap()) }
    loyaltyConsumed?.let { putMap("loyaltyConsumed", it.toWritableMap()) }
    paymentInfo?.let { putMap("paymentInfo", it.toWritableMap()) }
  }

private fun Order.toWritableMap(): WritableMap =
  createMap().apply {
    val itemsArray = createArray()
    items.forEach { itemsArray.pushMap(it.toWritableMap()) }
    putArray("items", itemsArray)
    metadata?.let { putMap("metadata", it.toWritableMap()) }
    fulfillment?.let { f ->
      putMap(
        "fulfillment",
        createMap().apply {
          f.method?.let { putString("fulfillmentMethod", it.value) }
          f.createTimestamp?.let { putMap("createTime", it.toWritableMap()) }
          f.targetFulfillmentTimestamp?.let { putMap("targetFulfillmentTime", it.toWritableMap()) }
        },
      )
    }
    priceInfo?.let { putMap("priceInfo", it.toWritableMap()) }
    externalOrderId?.let { putString("externalOrderId", it) }
    @Suppress("DEPRECATION")
    tippingInfo?.let { putMap("tippingInfo", it.toWritableMap()) }
    @Suppress("DEPRECATION")
    loyaltyInfo?.let { putMap("loyaltyInfo", it.toWritableMap()) }
    orderPayment?.let { putMap("orderPayment", it.toWritableMap()) }
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun SuggestedModifier.toWritableMap(): WritableMap =
  createMap().apply {
    putString("modifierId", modifierId)
    putString("modifierGroupId", modifierGroupId)
    putString("modifierGroupDisplayName", modifierGroupDisplayName)
    putString("displayName", displayName)
    image?.let { putMap("image", it.toWritableMap()) }
    priceAdjustment?.let { putMap("priceAdjustment", it.toWritableMap()) }
    integrationAttributes?.let { putMap("integrationAttributes", it.toWritableMap()) }
    putBoolean("alreadyIncluded", alreadyIncluded)
    val nestedGroups = createArray()
    suggestedModifierGroups.forEach { nestedGroups.pushMap(it.toWritableMap()) }
    putArray("suggestedModifierGroups", nestedGroups)
    nutritionalInfo?.let { putMap("nutritionalInfo", it.toWritableMap()) }
  }

private fun SuggestedModGroup.toWritableMap(): WritableMap =
  createMap().apply {
    putString("modifierGroupId", modifierGroupId)
    putString("displayName", displayName)
    val modsArray = createArray()
    modifiers.forEach { modsArray.pushMap(it.toWritableMap()) }
    putArray("modifiers", modsArray)
    putInt("maxSelectionCount", maxSelectionCount)
    putInt("minSelectionCount", minSelectionCount)
    putInt("maxSelectionCountPerModifier", maxSelectionCountPerModifier)
    putBoolean("minSelectionNotMatched", minSelectionNotMatched)
  }

private fun SuggestedStores.toWritableMap(): WritableMap =
  createMap().apply {
    val storesArr = createArray()
    stores.forEach { store ->
      storesArr.pushMap(
        createMap().apply {
          putDouble("distance", store.distance)
          store.address?.let { addr ->
            putMap(
              "address",
              createMap().apply {
                putString("streetAddress", addr.streetAddress)
                putString("city", addr.city)
                putString("state", addr.state)
                putString("country", addr.country)
                putString("postalCode", addr.postalCode)
                putDouble("latitude", addr.latitude)
                putDouble("longitude", addr.longitude)
                putString("googleMapsUrl", addr.googleMapsUrl)
              },
            )
          }
          val hoursArr = createArray()
          store.storeHours.forEach { sh ->
            hoursArr.pushMap(
              createMap().apply {
                sh.method?.let { putString("fulfillmentMethod", it.value) }
                val schedulesArr = createArray()
                sh.schedules.forEach { sched -> schedulesArr.pushMap(sched.toWritableMap()) }
                putArray("schedules", schedulesArr)
              }
            )
          }
          putArray("storeHours", hoursArr)
          putString("phoneNumber", store.phoneNumber)
          putString("storeName", store.storeName)
          putBoolean("open", store.open)
          store.timeZone?.let { tz ->
            putMap(
              "timeZone",
              createMap().apply {
                putString("id", tz.id)
                putString("version", tz.version)
              },
            )
          }
        }
      )
    }
    putArray("stores", storesArr)
  }

private fun DiscountType.toWireString(): String =
  if (this == DiscountType.UNSPECIFIED) "DISCOUNT_TYPE_UNSPECIFIED" else name

private fun DiscountScope.toWireString(): String =
  if (this == DiscountScope.UNSPECIFIED) "SCOPE_UNSPECIFIED" else name

private fun Discount.toWritableMap(): WritableMap =
  createMap().apply {
    putString("name", name)
    putString("displayName", displayName)
    putString("type", type.toWireString())
    putString("scope", scope.toWireString())
    schedule?.let { putMap("schedule", it.toWritableMap()) }
    fixedAmount?.let { putMap("fixedAmount", it.toWritableMap()) }
    putDouble("percent", percent.toDouble())
    maxDiscountValue?.let { putMap("maxDiscountValue", it.toWritableMap()) }
    putBoolean("autoApply", autoApply)
    image?.let { putMap("image", it.toWritableMap()) }
    putString("description", description)
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun SuggestedOffer.toWritableMap(): WritableMap =
  createMap().apply {
    when (this@toWritableMap) {
      is SuggestedOffer.LoyaltyReward -> putMap("loyaltyReward", loyaltyReward.toWritableMap())
      is SuggestedOffer.Discount -> putMap("discount", discount.toWritableMap())
      SuggestedOffer.Unknown -> Unit
    }
  }

private fun SuggestedOffers.toWritableMap(): WritableMap =
  createMap().apply {
    val offersArr = createArray()
    offers.forEach { offersArr.pushMap(it.toWritableMap()) }
    putArray("offers", offersArr)
  }

private fun SuggestedOptions.toWritableMap(): WritableMap =
  createMap().apply {
    suggestedItems?.let { si ->
      val itemsArr = createArray()
      si.items.forEach { item ->
        itemsArr.pushMap(
          createMap().apply {
            putString("itemId", item.itemId)
            putString("displayName", item.displayName)
            item.image?.let { putMap("image", it.toWritableMap()) }
            item.basePrice?.let { putMap("basePrice", it.toWritableMap()) }
            item.integrationAttributes?.let { putMap("integrationAttributes", it.toWritableMap()) }
            putString("description", item.description)
            item.nutritionalInfo?.let { putMap("nutritionalInfo", it.toWritableMap()) }
          }
        )
      }
      putMap("suggestedItems", createMap().apply { putArray("items", itemsArr) })
    }
    suggestedModifiers?.let { sm ->
      val modsArr = createArray()
      sm.modifiers.forEach { modsArr.pushMap(it.toWritableMap()) }
      putMap(
        "suggestedModifiers",
        createMap().apply {
          putArray("modifiers", modsArr)
          putString("parentUid", sm.parentUid)
        },
      )
    }
    suggestedModifierGroups?.let { smg ->
      val groupsArr = createArray()
      smg.modifierGroups.forEach { groupsArr.pushMap(it.toWritableMap()) }
      putMap("suggestedModifierGroups", createMap().apply { putArray("modifierGroups", groupsArr) })
    }
    suggestedStores?.let { ss -> putMap("suggestedStores", ss.toWritableMap()) }
    suggestedActions?.let { sa ->
      val actionsArr = createArray()
      sa.actions.forEach { action ->
        actionsArr.pushMap(
          createMap().apply {
            putString("displayName", action.displayName)
            action.textInput?.let { ti ->
              putMap("textInput", createMap().apply { putString("text", ti.text) })
            }
          }
        )
      }
      putMap("suggestedActions", createMap().apply { putArray("actions", actionsArr) })
    }
    suggestedOffers?.let { so -> putMap("suggestedOffers", so.toWritableMap()) }
    if (customIntegrationAttributes.isNotEmpty()) {
      putMap("customIntegrationAttributes", customIntegrationAttributes.toArbitraryWritableMap())
    }
  }

private fun RecommendedOrders.toWritableMap(): WritableMap =
  createMap().apply {
    val arr = createArray()
    recommendedOrders.forEach { rec ->
      arr.pushMap(createMap().apply { rec.order?.let { putMap("order", it.toWritableMap()) } })
    }
    putArray("recommendedOrders", arr)
  }

private fun List<String>.toWritableArray(): WritableArray {
  val array = createArray()
  forEach { array.pushString(it) }
  return array
}

private fun Map<*, *>.toArbitraryWritableMap(): WritableMap =
  createMap().apply {
    for ((rawKey, value) in this@toArbitraryWritableMap) {
      val key = rawKey?.toString() ?: continue
      putArbitraryValue(key, value)
    }
  }

private fun Iterable<*>.toArbitraryWritableArray(): WritableArray =
  createArray().apply {
    for (element in this@toArbitraryWritableArray) {
      pushArbitraryValue(element)
    }
  }

private fun WritableMap.putArbitraryValue(key: String, value: Any?) {
  when (value) {
    null -> putNull(key)
    is Boolean -> putBoolean(key, value)
    is Int -> putInt(key, value)
    is Number -> putDouble(key, value.toDouble())
    is String -> putString(key, value)
    is Map<*, *> -> putMap(key, value.toArbitraryWritableMap())
    is Iterable<*> -> putArray(key, value.toArbitraryWritableArray())
    is Array<*> -> putArray(key, value.asIterable().toArbitraryWritableArray())
    else -> putString(key, value.toString())
  }
}

private fun WritableArray.pushArbitraryValue(value: Any?) {
  when (value) {
    null -> pushNull()
    is Boolean -> pushBoolean(value)
    is Int -> pushInt(value)
    is Number -> pushDouble(value.toDouble())
    is String -> pushString(value)
    is Map<*, *> -> pushMap(value.toArbitraryWritableMap())
    is Iterable<*> -> pushArray(value.toArbitraryWritableArray())
    is Array<*> -> pushArray(value.asIterable().toArbitraryWritableArray())
    else -> pushString(value.toString())
  }
}
