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

import com.facebook.react.bridge.Arguments
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
import com.google.android.foodorderingaiagent.models.AgentEvent
import com.google.android.foodorderingaiagent.models.CustomizedInput
import com.google.android.foodorderingaiagent.models.DeliveryAddress
import com.google.android.foodorderingaiagent.models.EndSession
import com.google.android.foodorderingaiagent.models.FeatureGates
import com.google.android.foodorderingaiagent.models.FinalizeOrderRequest
import com.google.android.foodorderingaiagent.models.FinalizeOrderResponse
import com.google.android.foodorderingaiagent.models.FoodOrderingClientAuthTokenRequestHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientAuthTokenResponse
import com.google.android.foodorderingaiagent.models.FoodOrderingClientAuthTokenResult
import com.google.android.foodorderingaiagent.models.FoodOrderingClientConfig
import com.google.android.foodorderingaiagent.models.FoodOrderingClientFinalizeOrderHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientOrderPricesHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientOrderStatusHandler
import com.google.android.foodorderingaiagent.models.FoodOrderingClientSubmitOrderHandler
import com.google.android.foodorderingaiagent.models.Image
import com.google.android.foodorderingaiagent.models.ItemIntegrationAttributes
import com.google.android.foodorderingaiagent.models.LatLng
import com.google.android.foodorderingaiagent.models.LoyaltyAmount
import com.google.android.foodorderingaiagent.models.LoyaltyInfo
import com.google.android.foodorderingaiagent.models.ModifierGroupIntegrationAttributes
import com.google.android.foodorderingaiagent.models.ModifierIntegrationAttributes
import com.google.android.foodorderingaiagent.models.Money
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
import com.google.android.foodorderingaiagent.models.OrderStatusRequest
import com.google.android.foodorderingaiagent.models.OrderStatusResponse
import com.google.android.foodorderingaiagent.models.OrderingSessionConfig
import com.google.android.foodorderingaiagent.models.PastOrder
import com.google.android.foodorderingaiagent.models.PaymentInfo
import com.google.android.foodorderingaiagent.models.PaymentMethod
import com.google.android.foodorderingaiagent.models.PostalAddress
import com.google.android.foodorderingaiagent.models.RecommendedOrders
import com.google.android.foodorderingaiagent.models.SpeechRecognition
import com.google.android.foodorderingaiagent.models.SubmitOrderPaymentInfo
import com.google.android.foodorderingaiagent.models.SubmitOrderRequest
import com.google.android.foodorderingaiagent.models.SubmitOrderResponse
import com.google.android.foodorderingaiagent.models.SuggestedModGroup
import com.google.android.foodorderingaiagent.models.SuggestedModifier
import com.google.android.foodorderingaiagent.models.SuggestedOptions
import com.google.android.foodorderingaiagent.models.SuggestedStores
import com.google.android.foodorderingaiagent.models.TippingInfo
import com.google.android.foodorderingaiagent.models.UpdatedOrderState
import com.google.android.foodorderingaiagent.models.UserInfo
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.logging.Level
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/**
 * React Native New Architecture TurboModule bridging JavaScript calls, delegate callbacks, and
 * typed Codegen `EventEmitter` events to the Android [FoodOrderingClient].
 */
@ReactModule(name = FoodOrderingModule.NAME)
class FoodOrderingModule(
  private val reactContext: ReactApplicationContext,
) : NativeFoodOrderingSpec(reactContext), LifecycleEventListener {

  private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var client: FoodOrderingClient? = null
  private var sessionJob: Job? = null
  private var audioLevelJob: Job? = null

  @Volatile private var cachedToken: String? = null
  @Volatile private var cachedTokenExpiry: String? = null
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

      if (configMap.hasKey("authToken") && !configMap.isNull("authToken")) {
        cachedToken = configMap.getString("authToken")
        cachedTokenExpiry =
          if (configMap.hasKey("authTokenExpiry") && !configMap.isNull("authTokenExpiry")) {
            configMap.getString("authTokenExpiry")
          } else {
            null
          }
      }

      val sdkConfig =
        FoodOrderingClientConfig(
          gcpProjectName = gcpProjectName,
          location = location,
          brand = brand,
          logLevel = logLevel,
        )
      FoodOrderingClient.configure(sdkConfig)

      client?.release()
      client =
        FoodOrderingClient(
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
        )
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("INITIALIZE_ERROR", e.message ?: "Failed to initialize FoodOrderingClient", e)
    }
  }

  @ReactMethod
  override fun setAuthToken(token: String, expiry: String?, promise: Promise) {
    cachedToken = token
    cachedTokenExpiry = expiry
    promise.resolve(null)
  }

  // ==========================================================================
  // JS -> Native Delegate Response Methods
  // ==========================================================================

  @ReactMethod
  override fun respondToAuthTokenRequest(requestId: String, response: ReadableMap) {
    response.getOptionalString("token")?.let { token ->
      cachedToken = token
      cachedTokenExpiry = response.getOptionalString("expiry")
    }
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
    val activeClient = client
    if (activeClient == null) {
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

      val sessionConfig =
        OrderingSessionConfig(
          storeId = storeId,
          sessionId = resolvedSessionId,
          userInfo = userInfo,
          featureGate = sessionConfigMap.getOptionalMap("featureGate")?.toFeatureGates(),
          initialUtterance = sessionConfigMap.getOptionalString("initialUtterance"),
          daypartId = sessionConfigMap.getOptionalString("daypartId"),
          initialOrder = sessionConfigMap.getOptionalMap("initialOrder")?.toOrder(),
        )

      if (sessionJob?.isActive != true) {
        latestSessionUserInfo = userInfo
      }

      val context = reactContext.currentActivity ?: reactContext
      val responseFlow = activeClient.startSession(context, moduleScope, sessionConfig)

      if (sessionJob?.isActive != true) {
        sessionJob =
          moduleScope.launch {
            responseFlow
              .catch { throwable ->
                emitErrorEvent(
                  sessionId = resolvedSessionId,
                  code = "STREAM_CLOSED",
                  message = throwable.message ?: "Ordering stream terminated with an error.",
                )
              }
              .collect { response -> handleOrderResponse(response) }
          }
      }

      if (audioLevelJob?.isActive != true) {
        audioLevelJob =
          moduleScope.launch {
            activeClient.audioLevelFlow.collect { level ->
              val payload =
                Arguments.createMap().apply { putDouble("audioLevel", level.toDouble()) }
              emitOnAudioLevel(payload)
            }
          }
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
        sessionJob?.cancel()
        sessionJob = null
        audioLevelJob?.cancel()
        audioLevelJob = null
        latestSessionUserInfo = null
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

  private fun cleanup() {
    sessionJob?.cancel()
    sessionJob = null
    audioLevelJob?.cancel()
    audioLevelJob = null
    latestSessionUserInfo = null
    client?.release()
    client = null
    pendingDelegateRequests.values.forEach {
      it.completeExceptionally(IllegalStateException("FoodOrderingModule was released."))
    }
    pendingDelegateRequests.clear()
  }

  // ==========================================================================
  // Native -> JS Delegate Request Helpers
  // ==========================================================================

  private suspend fun awaitDelegateResponse(
    emitRequest: (ReadableMap) -> Unit,
    requestMap: WritableMap,
    timeoutMs: Long = DELEGATE_REQUEST_TIMEOUT_MS,
  ): ReadableMap {
    val requestId = UUID.randomUUID().toString()
    val deferred = CompletableDeferred<ReadableMap>()
    pendingDelegateRequests[requestId] = deferred

    val envelope =
      Arguments.createMap().apply {
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
    try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::emitOnAuthTokenRequested,
          requestMap = Arguments.createMap(),
        )
      val token = responseMap.getOptionalString("token")?.takeIf { it.isNotBlank() }
      val expiry = responseMap.getOptionalString("expiry")
      if (token != null) {
        cachedToken = token
        cachedTokenExpiry = expiry
        return FoodOrderingClientAuthTokenResult(
          success = true,
          authToken = FoodOrderingClientAuthTokenResponse(token = token, expiry = expiry),
        )
      }
    } catch (_: Exception) {
      // Fall back to pre-seeded cachedToken if set via setAuthToken / initialize.
    }

    val fallbackToken = cachedToken
    if (!fallbackToken.isNullOrBlank()) {
      return FoodOrderingClientAuthTokenResult(
        success = true,
        authToken =
          FoodOrderingClientAuthTokenResponse(token = fallbackToken, expiry = cachedTokenExpiry),
      )
    }
    return FoodOrderingClientAuthTokenResult(success = false, authToken = null)
  }

  private suspend fun requestFinalizeOrderFromBridge(
    request: FinalizeOrderRequest
  ): FinalizeOrderResponse {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::emitOnFinalizeOrderRequested,
          requestMap = Arguments.createMap(),
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
          emitRequest = ::emitOnSubmitOrderRequested,
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
          emitRequest = ::emitOnOrderPricesRequested,
          requestMap = request.toWritableMap(),
        )
      responseMap.toOrderPricesResponse()
    } catch (_: Exception) {
      OrderPricesResponse(success = false)
    }
  }

  private suspend fun requestOrderStatusFromBridge(
    request: OrderStatusRequest
  ): OrderStatusResponse {
    return try {
      val responseMap =
        awaitDelegateResponse(
          emitRequest = ::emitOnOrderStatusRequested,
          requestMap = Arguments.createMap(),
        )
      responseMap.toOrderStatusResponse()
    } catch (_: Exception) {
      OrderStatusResponse(success = false)
    }
  }

  private fun defaultFinalizeOrderResponse(): FinalizeOrderResponse {
    val paymentInfo = latestSessionUserInfo?.paymentInfo ?: return FinalizeOrderResponse()
    val lastFourDigits = paymentInfo.creditCardLastFourDigits?.takeIf { it.isNotEmpty() }
    val paymentMethod =
      paymentInfo.paymentMethod?.takeIf { it != PaymentMethod.UNSPECIFIED }
    if (lastFourDigits == null && paymentMethod == null) {
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

  private fun handleOrderResponse(response: OrderResponse) {
    when (response) {
      is OrderResponse.SessionStarted -> {
        emitOnSessionStarted(
          Arguments.createMap().apply { putString("sessionId", response.sessionId) }
        )
        emitOnSessionLifecycle(
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putString("state", "STARTED")
          }
        )
      }
      is OrderResponse.OrderUpdate -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("updatedOrderState", response.updatedOrderState.toWritableMap())
            response.order?.let { putMap("order", it.toWritableMap()) }
          }
        emitOnOrderUpdate(payload)
      }
      is OrderResponse.SessionEnd -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("endSession", response.endSession.toWritableMap())
          }
        emitOnSessionEnded(payload)
      }
      is OrderResponse.TurnCompleted -> {
        val payload = Arguments.createMap().apply { putString("sessionId", response.sessionId) }
        emitOnTurnCompleted(payload)
      }
      is OrderResponse.SpeechRecognitionResult -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("speechRecognition", response.speechRecognition.toWritableMap())
          }
        emitOnSpeechRecognition(payload)
      }
      is OrderResponse.Text -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putString("text", response.agentText)
          }
        emitOnAgentText(payload)
      }
      is OrderResponse.SuggestedOptions -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("suggestedOptions", response.suggestedOptions.toWritableMap())
          }
        emitOnSuggestedOptions(payload)
      }
      is OrderResponse.RecommendedOrders -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("recommendedOrders", response.recommendedOrders.toWritableMap())
          }
        emitOnRecommendedOrders(payload)
      }
      is OrderResponse.AgentEvent -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putMap("agentEvent", response.agentEvent.toWritableMap())
          }
        emitOnAgentEvent(payload)
      }
      is OrderResponse.InterruptionSignal -> {
        val payload = Arguments.createMap().apply { putString("sessionId", response.sessionId) }
        emitOnInterruptionSignal(payload)
      }
      is OrderResponse.SessionPaused -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putString("state", "PAUSED")
          }
        emitOnSessionLifecycle(payload)
      }
      is OrderResponse.SessionResumed -> {
        val payload =
          Arguments.createMap().apply {
            putString("sessionId", response.sessionId)
            putString("state", "RESUMED")
          }
        emitOnSessionLifecycle(payload)
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
      Arguments.createMap().apply {
        sessionId?.let { putString("sessionId", it) }
        putString("code", code)
        putString("message", message)
      }
    emitOnError(payload)
  }

  companion object {
    const val NAME = "FoodOrderingModule"
    const val MODULE_NAME = NAME
    private const val DELEGATE_REQUEST_TIMEOUT_MS = 15_000L
    private const val UNIMPLEMENTED_DELEGATE_ERROR = "UNIMPLEMENTED"
  }
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

private fun ReadableMap.toFinalizeOrderResponse(): FinalizeOrderResponse =
  FinalizeOrderResponse(
    paymentFlowEnabled = getOptionalBoolean("paymentFlowEnabled") ?: false,
    paymentInfo = getOptionalMap("paymentInfo")?.toPaymentInfo(),
  )

private fun ReadableMap.toSubmitOrderResponse(): SubmitOrderResponse =
  SubmitOrderResponse(success = getOptionalBoolean("success") ?: false)

private fun ReadableMap.toOrderPricesResponse(): OrderPricesResponse =
  OrderPricesResponse(
    success = getOptionalBoolean("success") ?: false,
    orderPriceInfo = getOptionalMap("orderPriceInfo")?.toOrderPriceInfo(),
  )

private fun ReadableMap.toOrderStatusResponse(): OrderStatusResponse =
  OrderStatusResponse(success = getOptionalBoolean("success") ?: false)

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
  )

private fun ReadableMap.toMoney(): Money =
  Money(
    currencyCode = getOptionalString("currencyCode") ?: "",
    units = getOptionalInt("units") ?: 0,
    nanos = getOptionalInt("nanos") ?: 0,
  )

private fun ReadableMap.toImage(): Image = Image(sourceUri = getOptionalString("sourceUri") ?: "")

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

private fun ReadableMap.toDeliveryAddress(): DeliveryAddress =
  DeliveryAddress(
    address = getOptionalMap("address")?.toPostalAddress(),
    validationStatus = getOptionalString("validationStatus"),
    coordinates = getOptionalMap("coordinates")?.toLatLng(),
  )

private fun ReadableMap.toPaymentInfo(): PaymentInfo =
  PaymentInfo(
    creditCardLastFourDigits = getOptionalString("creditCardLastFourDigits"),
    paymentMethod =
      getOptionalString("paymentMethod")?.let { raw ->
        when (raw) {
          "PAYMENT_METHOD_CREDIT_CARD",
          "CREDIT_CARD" -> PaymentMethod.CREDIT_CARD
          "PAYMENT_METHOD_CASH",
          "CASH" -> PaymentMethod.CASH
          "PAYMENT_METHOD_UNSPECIFIED",
          "UNSPECIFIED" -> PaymentMethod.UNSPECIFIED
          else -> null
        }
      },
  )

private fun ReadableMap.toTippingInfo(): TippingInfo =
  TippingInfo(
    amount = getOptionalMap("amount")?.toMoney(),
    percentageBps = getOptionalInt("percentageBps"),
  )

private fun ReadableMap.toLoyaltyAmount(): LoyaltyAmount =
  LoyaltyAmount(units = getOptionalDouble("units")?.toLong() ?: 0L)

private fun ReadableMap.toLoyaltyInfo(): LoyaltyInfo =
  LoyaltyInfo(loyaltyAmount = getOptionalMap("loyaltyAmount")?.toLoyaltyAmount())

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
  )

private fun ReadableMap.toOrder(): Order =
  Order(
    items =
      getOptionalArray("items")?.let { arr ->
        (0 until arr.size()).mapNotNull { arr.getMap(it)?.toOrderItem() }
      } ?: emptyList(),
    metadata =
      getOptionalMap("metadata")?.let { meta ->
        OrderMetadata(
          collectedCustomerName = meta.getOptionalString("collectedCustomerName"),
          callerPhoneNumber = meta.getOptionalString("callerPhoneNumber"),
          deliveryAddress = meta.getOptionalMap("deliveryAddress")?.toDeliveryAddress(),
        )
      },
    fulfillment =
      getOptionalMap("fulfillment")?.let { f ->
        OrderFulfillment(
          fulfillmentMethod = f.getOptionalString("fulfillmentMethod"),
          createTime = f.getOptionalString("createTime"),
          targetFulfillmentTime = f.getOptionalString("targetFulfillmentTime"),
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

private fun SubmitOrderRequest.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    paymentInfo?.let { putMap("paymentInfo", it.toWritableMap()) }
    loyaltyInfo?.let { putMap("loyaltyInfo", it.toWritableMap()) }
    tip?.let { putMap("tip", it.toWritableMap()) }
  }

private fun OrderPricesRequest.toWritableMap(): WritableMap =
  Arguments.createMap().apply { order?.let { putMap("order", it.toWritableMap()) } }

private fun SubmitOrderPaymentInfo.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    creditCardLastFourDigits?.let { putString("creditCardLastFourDigits", it) }
    creditCardCvv?.let { putString("creditCardCvv", it) }
    paymentMethod?.let { putString("paymentMethod", it.value) }
  }

private fun PaymentInfo.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    creditCardLastFourDigits?.let { putString("creditCardLastFourDigits", it) }
    paymentMethod?.let { putString("paymentMethod", it.value) }
  }

private fun LoyaltyInfo.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    loyaltyAmount?.let { la ->
      putMap(
        "loyaltyAmount",
        Arguments.createMap().apply { putDouble("units", la.units.toDouble()) },
      )
    }
  }

private fun UpdatedOrderState.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    order?.let {
      putMap("order", it.toWritableMap())
      val itemsArr = Arguments.createArray()
      it.items.forEach { item -> itemsArr.pushMap(item.toWritableMap()) }
      putArray("items", itemsArr)
    }
    putBoolean("changed", changed)
    putString("status", status.name)
    putString("detailedMessage", detailedMessage)
  }

private fun EndSession.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("type", type?.name ?: "END_TYPE_UNSPECIFIED")
    putString("reason", reason ?: "")
    posResponse?.let { putString("posResponse", it) }
    agentResponse?.let { putString("agentResponse", it) }
  }

private fun SpeechRecognition.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("transcript", transcript)
    putString("languageCode", languageCode)
    putBoolean("isFinal", isFinal)
  }

private fun AgentEvent.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    restartOrder?.let { ro ->
      putMap(
        "restartOrder",
        Arguments.createMap().apply { putBoolean("confirmationStep", ro.confirmationStep) },
      )
    }
  }

private fun Money.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("currencyCode", currencyCode)
    putInt("units", units)
    putInt("nanos", nanos)
  }

private fun Image.toWritableMap(): WritableMap =
  Arguments.createMap().apply { putString("sourceUri", sourceUri) }

private fun LatLng.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    latitude?.let { putDouble("latitude", it) }
    longitude?.let { putDouble("longitude", it) }
  }

private fun PostalAddress.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
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
  Arguments.createMap().apply {
    address?.let { putMap("address", it.toWritableMap()) }
    validationStatus?.let { putString("validationStatus", it) }
    coordinates?.let { putMap("coordinates", it.toWritableMap()) }
  }

private fun OrderModifier.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    uid?.let { putString("uid", it) }
    putString("modifierId", modifierId)
    putString("displayName", displayName)
    priceAdjustment?.let { putMap("priceAdjustment", it.toWritableMap()) }
    putInt("quantity", quantity)
    modifierAction?.let { action ->
      putMap(
        "modifierAction",
        Arguments.createMap().apply { action.name?.let { putString("name", it) } },
      )
    }
    image?.let { putMap("image", it.toWritableMap()) }
    val nestedGroups = Arguments.createArray()
    modifierGroups.forEach { nestedGroups.pushMap(it.toWritableMap()) }
    putArray("modifierGroups", nestedGroups)
    isDefault?.let { putBoolean("isDefault", it) }
    integrationAttributes?.let { attrs ->
      putMap(
        "integrationAttributes",
        Arguments.createMap().apply {
          attrs.externalModifierId?.let { putString("externalModifierId", it) }
        },
      )
    }
  }

private fun OrderModifierGroup.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("modifierGroupId", modifierGroupId)
    putString("displayName", displayName)
    val modsArray = Arguments.createArray()
    modifiers.forEach { modsArray.pushMap(it.toWritableMap()) }
    putArray("modifiers", modsArray)
    integrationAttributes?.let { attrs ->
      putMap(
        "integrationAttributes",
        Arguments.createMap().apply {
          attrs.externalModifierGroupId?.let { putString("externalModifierGroupId", it) }
        },
      )
    }
  }

private fun OrderItem.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    uid?.let { putString("uid", it) }
    putString("itemId", itemId)
    putString("displayName", displayName)
    image?.let { putMap("image", it.toWritableMap()) }
    basePrice?.let { putMap("basePrice", it.toWritableMap()) }
    val groupsArray = Arguments.createArray()
    modifierGroups.forEach { groupsArray.pushMap(it.toWritableMap()) }
    putArray("modifierGroups", groupsArray)
    putInt("quantity", quantity)
    integrationAttributes?.let { attrs ->
      putMap(
        "integrationAttributes",
        Arguments.createMap().apply {
          attrs.externalItemId?.let { putString("externalItemId", it) }
        },
      )
    }
    totalPrice?.let { putMap("totalPrice", it.toWritableMap()) }
    putArray("categoryIds", categoryIds.toWritableArray())
    isPending?.let { putBoolean("isPending", it) }
  }

private fun OrderPriceInfo.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    totalPrice?.let { putMap("totalPrice", it.toWritableMap()) }
    subtotalPrice?.let { putMap("subtotalPrice", it.toWritableMap()) }
    taxPrice?.let { putMap("taxPrice", it.toWritableMap()) }
    discount?.let { putMap("discount", it.toWritableMap()) }
    saving?.let { putMap("saving", it.toWritableMap()) }
    fees?.let { putMap("fees", it.toWritableMap()) }
  }

private fun OrderMetadata.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    collectedCustomerName?.let { putString("collectedCustomerName", it) }
    callerPhoneNumber?.let { putString("callerPhoneNumber", it) }
    deliveryAddress?.let { putMap("deliveryAddress", it.toWritableMap()) }
    offerEngineMetadata?.let { oem ->
      putMap(
        "offerEngineMetadata",
        Arguments.createMap().apply {
          oem.state?.let { putString("state", it) }
          oem.discountedOrderPriceInfo?.let {
            putMap("discountedOrderPriceInfo", it.toWritableMap())
          }
        },
      )
    }
  }

private fun Order.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    val itemsArray = Arguments.createArray()
    items.forEach { itemsArray.pushMap(it.toWritableMap()) }
    putArray("items", itemsArray)
    metadata?.let { putMap("metadata", it.toWritableMap()) }
    fulfillment?.let { f ->
      putMap(
        "fulfillment",
        Arguments.createMap().apply {
          f.fulfillmentMethod?.let { putString("fulfillmentMethod", it) }
          f.createTime?.let { putString("createTime", it) }
          f.targetFulfillmentTime?.let { putString("targetFulfillmentTime", it) }
        },
      )
    }
    priceInfo?.let { putMap("priceInfo", it.toWritableMap()) }
    externalOrderId?.let { putString("externalOrderId", it) }
    tippingInfo?.let { tip ->
      putMap(
        "tippingInfo",
        Arguments.createMap().apply {
          tip.amount?.let { putMap("amount", it.toWritableMap()) }
          tip.percentageBps?.let { putInt("percentageBps", it) }
        },
      )
    }
    loyaltyInfo?.let { putMap("loyaltyInfo", it.toWritableMap()) }
  }

private fun SuggestedModifier.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("modifierId", modifierId)
    putString("modifierGroupId", modifierGroupId)
    putString("modifierGroupDisplayName", modifierGroupDisplayName)
    putString("displayName", displayName)
    image?.let { putMap("image", it.toWritableMap()) }
    priceAdjustment?.let { putMap("priceAdjustment", it.toWritableMap()) }
    putBoolean("alreadyIncluded", alreadyIncluded)
    val nestedGroups = Arguments.createArray()
    suggestedModifierGroups.forEach { nestedGroups.pushMap(it.toWritableMap()) }
    putArray("suggestedModifierGroups", nestedGroups)
  }

private fun SuggestedModGroup.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("modifierGroupId", modifierGroupId)
    putString("displayName", displayName)
    val modsArray = Arguments.createArray()
    modifiers.forEach { modsArray.pushMap(it.toWritableMap()) }
    putArray("modifiers", modsArray)
    putInt("maxSelectionCount", maxSelectionCount)
    putInt("minSelectionCount", minSelectionCount)
    putInt("maxSelectionCountPerModifier", maxSelectionCountPerModifier)
    putBoolean("minSelectionNotMatched", minSelectionNotMatched)
  }

private fun SuggestedStores.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    val storesArr = Arguments.createArray()
    stores.forEach { store ->
      storesArr.pushMap(
        Arguments.createMap().apply {
          putDouble("distance", store.distance)
          store.address?.let { addr ->
            putMap(
              "address",
              Arguments.createMap().apply {
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
          val hoursArr = Arguments.createArray()
          store.storeHours.forEach { sh ->
            hoursArr.pushMap(
              Arguments.createMap().apply {
                sh.fulfillmentMethod?.let { putString("fulfillmentMethod", it) }
                val schedulesArr = Arguments.createArray()
                sh.schedules.forEach { sched ->
                  schedulesArr.pushMap(
                    Arguments.createMap().apply {
                      val daysArr = Arguments.createArray()
                      sched.days.forEach { daysArr.pushString(it.name) }
                      putArray("days", daysArr)
                      val dateRangesArr = Arguments.createArray()
                      sched.dateRanges.forEach { dr ->
                        dateRangesArr.pushMap(
                          Arguments.createMap().apply {
                            dr.startDate?.let { sd ->
                              putMap(
                                "startDate",
                                Arguments.createMap().apply {
                                  putInt("year", sd.year)
                                  putInt("month", sd.month)
                                  putInt("day", sd.day)
                                },
                              )
                            }
                            dr.endDate?.let { ed ->
                              putMap(
                                "endDate",
                                Arguments.createMap().apply {
                                  putInt("year", ed.year)
                                  putInt("month", ed.month)
                                  putInt("day", ed.day)
                                },
                              )
                            }
                          }
                        )
                      }
                      putArray("dateRanges", dateRangesArr)
                      val timeRangesArr = Arguments.createArray()
                      sched.timeRanges.forEach { tr ->
                        timeRangesArr.pushMap(
                          Arguments.createMap().apply {
                            tr.startTime?.let { st ->
                              putMap(
                                "startTime",
                                Arguments.createMap().apply {
                                  putInt("hours", st.hours)
                                  putInt("minutes", st.minutes)
                                  putInt("seconds", st.seconds)
                                  putInt("nanos", st.nanos)
                                },
                              )
                            }
                            tr.endTime?.let { et ->
                              putMap(
                                "endTime",
                                Arguments.createMap().apply {
                                  putInt("hours", et.hours)
                                  putInt("minutes", et.minutes)
                                  putInt("seconds", et.seconds)
                                  putInt("nanos", et.nanos)
                                },
                              )
                            }
                          }
                        )
                      }
                      putArray("timeRanges", timeRangesArr)
                    }
                  )
                }
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
              Arguments.createMap().apply {
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

private fun SuggestedOptions.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    suggestedItems?.let { si ->
      val itemsArr = Arguments.createArray()
      si.items.forEach { item ->
        itemsArr.pushMap(
          Arguments.createMap().apply {
            putString("itemId", item.itemId)
            putString("displayName", item.displayName)
            item.image?.let { putMap("image", it.toWritableMap()) }
            item.basePrice?.let { putMap("basePrice", it.toWritableMap()) }
          }
        )
      }
      putMap("suggestedItems", Arguments.createMap().apply { putArray("items", itemsArr) })
    }
    suggestedModifiers?.let { sm ->
      val modsArr = Arguments.createArray()
      sm.modifiers.forEach { modsArr.pushMap(it.toWritableMap()) }
      putMap(
        "suggestedModifiers",
        Arguments.createMap().apply {
          putArray("modifiers", modsArr)
          putString("parentUid", sm.parentUid)
        },
      )
    }
    suggestedModifierGroups?.let { smg ->
      val groupsArr = Arguments.createArray()
      smg.modifierGroups.forEach { groupsArr.pushMap(it.toWritableMap()) }
      putMap(
        "suggestedModifierGroups",
        Arguments.createMap().apply { putArray("modifierGroups", groupsArr) },
      )
    }
    suggestedStores?.let { ss -> putMap("suggestedStores", ss.toWritableMap()) }
    suggestedActions?.let { sa ->
      val actionsArr = Arguments.createArray()
      sa.actions.forEach { action ->
        actionsArr.pushMap(
          Arguments.createMap().apply {
            putString("displayName", action.displayName)
            action.textInput?.let { ti ->
              putMap("textInput", Arguments.createMap().apply { putString("text", ti.text) })
            }
          }
        )
      }
      putMap("suggestedActions", Arguments.createMap().apply { putArray("actions", actionsArr) })
    }
  }

private fun RecommendedOrders.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    val arr = Arguments.createArray()
    recommendedOrders.forEach { rec ->
      arr.pushMap(Arguments.createMap().apply { putMap("order", rec.order.toWritableMap()) })
    }
    putArray("recommendedOrders", arr)
  }

private fun List<String>.toWritableArray(): WritableArray {
  val array = Arguments.createArray()
  forEach { array.pushString(it) }
  return array
}
