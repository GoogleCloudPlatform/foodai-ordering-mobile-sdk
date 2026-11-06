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
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.google.android.foodorderingaiagent.models.AgentEvent
import com.google.android.foodorderingaiagent.models.ClientExecutionStatus
import com.google.android.foodorderingaiagent.models.CustomizedInput
import com.google.android.foodorderingaiagent.models.DayOfWeek
import com.google.android.foodorderingaiagent.models.Discount
import com.google.android.foodorderingaiagent.models.DiscountScope
import com.google.android.foodorderingaiagent.models.DiscountType
import com.google.android.foodorderingaiagent.models.EndSession
import com.google.android.foodorderingaiagent.models.EndType
import com.google.android.foodorderingaiagent.models.FinalizeOrderRequest
import com.google.android.foodorderingaiagent.models.FoodOrderingClientConfig
import com.google.android.foodorderingaiagent.models.FulfillmentMethod
import com.google.android.foodorderingaiagent.models.LoyaltyActionCategory
import com.google.android.foodorderingaiagent.models.LoyaltyAmount
import com.google.android.foodorderingaiagent.models.LoyaltyRequest
import com.google.android.foodorderingaiagent.models.LoyaltyReward
import com.google.android.foodorderingaiagent.models.Money
import com.google.android.foodorderingaiagent.models.Order
import com.google.android.foodorderingaiagent.models.OrderPriceInfo
import com.google.android.foodorderingaiagent.models.OrderResponse
import com.google.android.foodorderingaiagent.models.OrderStateUpdateStatus
import com.google.android.foodorderingaiagent.models.OrderingSessionConfig
import com.google.android.foodorderingaiagent.models.RecommendedOrder
import com.google.android.foodorderingaiagent.models.RecommendedOrders
import com.google.android.foodorderingaiagent.models.StoreSchedule
import com.google.android.foodorderingaiagent.models.SuggestedOffer
import com.google.android.foodorderingaiagent.models.SuggestedOffers
import com.google.android.foodorderingaiagent.models.SuggestedOptions
import com.google.android.foodorderingaiagent.models.TimeOfDay
import com.google.android.foodorderingaiagent.models.TimeOfDayRange
import com.google.android.foodorderingaiagent.models.Timestamp
import com.google.android.foodorderingaiagent.models.UpdatedOrderState
import java.lang.reflect.Proxy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.mockito.Mockito

@OptIn(ExperimentalCoroutinesApi::class)
class FoodOrderingModuleTest {

  private class FakeFoodOrderingNativeClient : FoodOrderingNativeClient {
    val responses = MutableSharedFlow<OrderResponse>(extraBufferCapacity = 16)
    override val audioLevelFlow = MutableStateFlow(0f)

    var lastSessionConfig: OrderingSessionConfig? = null
    var releasedCount: Int = 0

    override suspend fun requestMicrophonePermission(context: Context): Boolean = true

    override fun startSession(
      context: Context,
      scope: CoroutineScope,
      agentConfig: OrderingSessionConfig,
    ): Flow<OrderResponse> {
      lastSessionConfig = agentConfig
      return responses
    }

    override suspend fun endSession(waitUntilComplete: Boolean) {}

    override fun pauseMicrophone(): OrderResponse.Error? = null

    override fun resumeMicrophone(): OrderResponse.Error? = null

    override fun sendText(text: String) {}

    override fun updateOrderState(order: Order) {}

    override fun sendCustomizedInput(input: CustomizedInput) {}

    override fun release() {
      releasedCount += 1
    }
  }

  private class CapturedPromise {
    var resolved: Boolean = false
    var resolvedValue: Any? = null
    var rejectedCode: String? = null
    var rejectedMessage: String? = null

    val proxy: Promise =
      Proxy.newProxyInstance(
        Promise::class.java.classLoader,
        arrayOf(Promise::class.java),
      ) { _, method, args ->
        when (method.name) {
          "resolve" -> {
            resolved = true
            resolvedValue = args?.firstOrNull()
            null
          }
          "reject" -> {
            val strings = args?.filterIsInstance<String>().orEmpty()
            rejectedCode = strings.firstOrNull()
            rejectedMessage = if (strings.size >= 2) strings[1] else strings.firstOrNull()
            null
          }
          "toString" -> "CapturedPromise"
          "hashCode" -> System.identityHashCode(this)
          "equals" -> args?.firstOrNull() === this
          else -> null
        }
      } as Promise
  }

  private data class EmittedEvent(val name: String, val body: ReadableMap)

  @Test
  fun initializeAndStartSession_decodes070ConfigAndUpgradesLoyaltyHandler() = runTest {
    val dispatcher = UnconfinedTestDispatcher(testScheduler)
    val reactContext = Mockito.mock(ReactApplicationContext::class.java)
    val configuredConfigs = mutableListOf<FoodOrderingClientConfig>()
    val capturedHandlers = mutableListOf<FoodOrderingClientHandlers>()
    val createdClients = mutableListOf<FakeFoodOrderingNativeClient>()

    val module =
      FoodOrderingModule(
        reactContext = reactContext,
        mainDispatcher = dispatcher,
        sdkConfigurer = { configuredConfigs.add(it) },
        clientFactory = { handlers ->
          capturedHandlers.add(handlers)
          FakeFoodOrderingNativeClient().also { createdClients.add(it) }
        },
        eventSink = { _, _ -> },
        delegateRequestTimeoutMs = 2_000L,
      )

    val initPromise = CapturedPromise()
    module.initialize(
      JavaOnlyMap().apply {
        putString("gcpProjectName", "demo-project")
        putString("location", "global")
        putString("brand", "demo-brand")
        putBoolean("__hasLoyaltyHandler", false)
      },
      initPromise.proxy,
    )

    assertTrue(initPromise.resolved)
    assertEquals(1, configuredConfigs.size)
    assertNull(capturedHandlers.single().loyaltyHandler)

    val startPromise = CapturedPromise()
    module.startSession(
      JavaOnlyMap().apply {
        putString("storeId", "store-101")
        putString("sessionId", "session-070")
        putBoolean("__hasLoyaltyHandler", true)
        putMap(
          "userInfo",
          JavaOnlyMap().apply {
            putString("preferredName", "Taylor")
            putMap(
              "location",
              JavaOnlyMap().apply {
                putMap(
                  "coordinates",
                  JavaOnlyMap().apply {
                    putDouble("latitude", 37.422)
                    putDouble("longitude", -122.084)
                  },
                )
                putMap(
                  "captureTime",
                  JavaOnlyMap().apply {
                    putDouble("seconds", 1_762_272_000.0)
                    putInt("nanos", 0)
                  },
                )
              },
            )
          },
        )
        putMap(
          "featureGates",
          JavaOnlyMap().apply {
            putBoolean("storeSelectionEnabled", true)
            putBoolean("offersAndLoyaltyEnabled", true)
          },
        )
        putMap(
          "initialOrder",
          JavaOnlyMap().apply {
            putMap(
              "fulfillment",
              JavaOnlyMap().apply {
                putString("fulfillmentMethod", "FULFILLMENT_METHOD_DRIVE_THRU")
                putMap(
                  "createTime",
                  JavaOnlyMap().apply {
                    putDouble("seconds", 1_762_272_100.0)
                    putInt("nanos", 250)
                  },
                )
              },
            )
          },
        )
      },
      startPromise.proxy,
    )

    assertTrue(startPromise.resolved)
    assertEquals("session-070", startPromise.resolvedValue)
    assertEquals(1, createdClients[0].releasedCount)
    assertEquals(2, capturedHandlers.size)
    assertNotNull(capturedHandlers.last().loyaltyHandler)

    val sessionConfig = createdClients.last().lastSessionConfig
    assertNotNull(sessionConfig)
    assertEquals("store-101", sessionConfig!!.storeId)
    assertEquals(37.422, sessionConfig.userInfo?.location?.coordinates?.latitude ?: 0.0, 1e-6)
    assertEquals(-122.084, sessionConfig.userInfo?.location?.coordinates?.longitude ?: 0.0, 1e-6)
    assertEquals(1_762_272_000L, sessionConfig.userInfo?.location?.captureTime?.seconds)
    assertEquals(true, sessionConfig.featureGate?.storeSelectionEnabled)
    assertEquals(true, sessionConfig.featureGate?.offersAndLoyaltyEnabled)
    assertEquals(FulfillmentMethod.DRIVE_THRU, sessionConfig.initialOrder?.fulfillment?.method)
    assertEquals(1_762_272_100L, sessionConfig.initialOrder?.fulfillment?.createTimestamp?.seconds)
    assertEquals(250, sessionConfig.initialOrder?.fulfillment?.createTimestamp?.nanos)
  }

  @Test
  fun orderResponses_emit070AgentEventsSessionEndOffersAndOrderUpdates() = runTest {
    val dispatcher = UnconfinedTestDispatcher(testScheduler)
    val reactContext = Mockito.mock(ReactApplicationContext::class.java)
    val emitted = mutableListOf<EmittedEvent>()
    val fakeClient = FakeFoodOrderingNativeClient()

    val module =
      FoodOrderingModule(
        reactContext = reactContext,
        mainDispatcher = dispatcher,
        sdkConfigurer = {},
        clientFactory = { fakeClient },
        eventSink = { name, body -> emitted.add(EmittedEvent(name, body)) },
        delegateRequestTimeoutMs = 2_000L,
      )

    module.initialize(
      JavaOnlyMap().apply {
        putString("gcpProjectName", "demo-project")
        putString("location", "global")
        putString("brand", "demo-brand")
      },
      CapturedPromise().proxy,
    )
    module.startSession(
      JavaOnlyMap().apply {
        putString("storeId", "store-1")
        putString("sessionId", "sess-1")
      },
      CapturedPromise().proxy,
    )
    emitted.clear()

    // 1. AgentEvent variants: StoreChange, RestartOrder, Unknown
    module.handleOrderResponse(
      OrderResponse.AgentEvent(
        agentEvent = AgentEvent.StoreChange(store = "projects/p/locations/l/stores/store-2"),
        sessionId = "sess-1",
      )
    )
    module.handleOrderResponse(
      OrderResponse.AgentEvent(
        agentEvent = AgentEvent.RestartOrder(confirmationStep = true),
        sessionId = "sess-1",
      )
    )
    module.handleOrderResponse(
      OrderResponse.AgentEvent(agentEvent = AgentEvent.Unknown, sessionId = "sess-1")
    )

    val agentEvents = emitted.filter { it.name == "onAgentEvent" }
    assertEquals(3, agentEvents.size)
    assertEquals("STORE_CHANGE", agentEvents[0].body.getMap("agentEvent")?.getString("type"))
    assertEquals(
      "projects/p/locations/l/stores/store-2",
      agentEvents[0].body.getMap("agentEvent")?.getString("store"),
    )
    assertEquals("RESTART_ORDER", agentEvents[1].body.getMap("agentEvent")?.getString("type"))
    assertEquals(true, agentEvents[1].body.getMap("agentEvent")?.getBoolean("confirmationStep"))
    assertEquals("UNKNOWN", agentEvents[2].body.getMap("agentEvent")?.getString("type"))

    // 2. EndSession: REQUESTED_STORE_SELECTION, UNKNOWN, and STORE_CLOSED with storeSchedule
    emitted.clear()
    module.handleOrderResponse(
      OrderResponse.SessionEnd(
        endSession = EndSession(type = EndType.REQUESTED_STORE_SELECTION, reason = "Select store"),
        sessionId = "sess-1",
      )
    )
    module.handleOrderResponse(
      OrderResponse.SessionEnd(
        endSession = EndSession(type = EndType.UNKNOWN, reason = "Future end type"),
        sessionId = "sess-1",
      )
    )
    val unknownDay = DayOfWeek.entries.firstOrNull { it.name == "UNKNOWN" }
    module.handleOrderResponse(
      OrderResponse.SessionEnd(
        endSession =
          EndSession(
            type = EndType.STORE_CLOSED,
            reason = "Closed",
            storeSchedule =
              StoreSchedule(
                days = listOfNotNull(DayOfWeek.MONDAY, unknownDay),
                timeRanges =
                  listOf(
                    TimeOfDayRange(
                      startTime = TimeOfDay(hours = 8, minutes = 0),
                      endTime = TimeOfDay(hours = 21, minutes = 0),
                    )
                  ),
              ),
          ),
        sessionId = "sess-1",
      )
    )

    val endedEvents = emitted.filter { it.name == "onSessionEnded" }
    assertEquals(3, endedEvents.size)
    assertEquals(
      "REQUESTED_STORE_SELECTION",
      endedEvents[0].body.getMap("endSession")?.getString("type"),
    )
    assertEquals("UNKNOWN", endedEvents[1].body.getMap("endSession")?.getString("type"))
    assertEquals("STORE_CLOSED", endedEvents[2].body.getMap("endSession")?.getString("type"))
    assertNotNull(endedEvents[2].body.getMap("storeSchedule"))
    assertEquals(
      "MONDAY",
      endedEvents[2].body.getMap("storeSchedule")?.getArray("days")?.getString(0),
    )
    if (unknownDay != null) {
      assertEquals(
        "UNKNOWN",
        endedEvents[2].body.getMap("storeSchedule")?.getArray("days")?.getString(1),
      )
    }

    // 3. SuggestedOptions.suggestedOffers (LoyaltyReward, Discount, Unknown -> {})
    emitted.clear()
    module.handleOrderResponse(
      OrderResponse.SuggestedOptions(
        suggestedOptions =
          SuggestedOptions(
            suggestedOffers =
              SuggestedOffers(
                offers =
                  listOf(
                    SuggestedOffer.LoyaltyReward(
                      loyaltyReward =
                        LoyaltyReward(
                          rewardId = "rew-1",
                          displayName = "Free Fries",
                          redemptionCost = LoyaltyAmount(units = 150L),
                          expireTime = Timestamp(seconds = 1_800_000_000L, nanos = 0),
                        )
                    ),
                    SuggestedOffer.Discount(
                      discount =
                        Discount(
                          name = "discounts/bogo",
                          displayName = "25% Off",
                          type = DiscountType.PERCENT_OFF,
                          scope = DiscountScope.ORDER,
                          percent = 25.0f,
                          autoApply = true,
                        )
                    ),
                    SuggestedOffer.Unknown,
                  )
              )
          ),
        sessionId = "sess-1",
      )
    )

    val suggestedBody = emitted.single { it.name == "onSuggestedOptions" }.body
    val offersArr =
      suggestedBody.getMap("suggestedOptions")?.getMap("suggestedOffers")?.getArray("offers")
    assertNotNull(offersArr)
    assertEquals(3, offersArr!!.size())
    assertEquals("rew-1", offersArr.getMap(0)?.getMap("loyaltyReward")?.getString("rewardId"))
    assertEquals("discounts/bogo", offersArr.getMap(1)?.getMap("discount")?.getString("name"))
    assertEquals("PERCENT_OFF", offersArr.getMap(1)?.getMap("discount")?.getString("type"))
    assertFalse(offersArr.getMap(2)?.hasKey("loyaltyReward") ?: true)
    assertFalse(offersArr.getMap(2)?.hasKey("discount") ?: true)

    // 4. OrderUpdate with OrderPriceInfo.tip and OrderStateUpdateStatus.UNKNOWN + RecommendedOrder(null)
    emitted.clear()
    module.handleOrderResponse(
      OrderResponse.OrderUpdate(
        updatedOrderState =
          UpdatedOrderState(
            order = Order(priceInfo = OrderPriceInfo(tip = Money("USD", 2, 500_000_000))),
            changed = true,
            status = OrderStateUpdateStatus.UNKNOWN,
          ),
        sessionId = "sess-1",
      )
    )
    module.handleOrderResponse(
      OrderResponse.RecommendedOrders(
        recommendedOrders = RecommendedOrders(listOf(RecommendedOrder(order = null))),
        sessionId = "sess-1",
      )
    )

    val orderUpdateBody = emitted.single { it.name == "onOrderUpdate" }.body
    assertEquals("UNKNOWN", orderUpdateBody.getMap("updatedOrderState")?.getString("status"))
    assertEquals(2, orderUpdateBody.getMap("order")?.getMap("priceInfo")?.getMap("tip")?.getInt("units"))

    val recBody = emitted.single { it.name == "onRecommendedOrders" }.body
    val firstRec = recBody.getMap("recommendedOrders")?.getArray("recommendedOrders")?.getMap(0)
    assertNotNull(firstRec)
    assertFalse(firstRec!!.hasKey("order"))
  }

  @Test
  fun loyaltyHandler_roundTripsSuccessGuestUnhandledAndError() = runTest {
    val dispatcher = UnconfinedTestDispatcher(testScheduler)
    val reactContext = Mockito.mock(ReactApplicationContext::class.java)
    var capturedHandlers: FoodOrderingClientHandlers? = null
    var nextReplyFactory: ((ReadableMap) -> JavaOnlyMap)? = null
    lateinit var module: FoodOrderingModule

    module =
      FoodOrderingModule(
        reactContext = reactContext,
        mainDispatcher = dispatcher,
        sdkConfigurer = {},
        clientFactory = { handlers ->
          capturedHandlers = handlers
          FakeFoodOrderingNativeClient()
        },
        eventSink = { name, body ->
          if (name == "onLoyaltyRequested") {
            val requestId = body.getString("requestId")!!
            val reply = nextReplyFactory?.invoke(body.getMap("request")!!) ?: JavaOnlyMap()
            module.respondToLoyalty(requestId, reply)
          }
        },
        delegateRequestTimeoutMs = 2_000L,
      )

    module.initialize(
      JavaOnlyMap().apply {
        putString("gcpProjectName", "demo-project")
        putString("location", "global")
        putString("brand", "demo-brand")
        putBoolean("__hasLoyaltyHandler", true)
      },
      CapturedPromise().proxy,
    )

    val loyaltyHandler = capturedHandlers?.loyaltyHandler
    assertNotNull(loyaltyHandler)

    // 1. Happy path
    var observedCategory: String? = null
    nextReplyFactory = { requestMap ->
      observedCategory = requestMap.getString("category")
      JavaOnlyMap().apply {
        putString("category", "LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER")
        putMap(
          "loyaltyMetadata",
          JavaOnlyMap().apply {
            putMap("customer", JavaOnlyMap().apply { putString("name", "Jordan") })
          },
        )
        putMap(
          "clientExecutionStatus",
          JavaOnlyMap().apply {
            putInt("httpStatusCode", 200)
            putString("rejectionReason", "REJECTION_REASON_COOLDOWN_PERIOD")
          },
        )
      }
    }

    val successResponse =
      async {
          loyaltyHandler!!.handleLoyalty(
            LoyaltyRequest(
              category = LoyaltyActionCategory.IDENTIFY_CUSTOMER,
              phoneNumber = "+15550101234",
            )
          )
        }
        .await()

    assertEquals("LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER", observedCategory)
    assertEquals(LoyaltyActionCategory.IDENTIFY_CUSTOMER, successResponse.category)
    assertEquals("Jordan", successResponse.loyaltyMetadata?.customer?.name)
    assertEquals(
      ClientExecutionStatus.RejectionReason.COOLDOWN_PERIOD,
      successResponse.clientExecutionStatus?.rejectionReason,
    )

    // 2. Guest empty {} response
    nextReplyFactory = { JavaOnlyMap() }
    val guestResponse =
      async {
          loyaltyHandler!!.handleLoyalty(
            LoyaltyRequest(category = LoyaltyActionCategory.IDENTIFY_CUSTOMER)
          )
        }
        .await()
    assertNull(guestResponse.category)
    assertNull(guestResponse.loyaltyMetadata)

    // 3. Unhandled sentinel { __unhandled: true }
    nextReplyFactory = { JavaOnlyMap().apply { putBoolean("__unhandled", true) } }
    try {
      loyaltyHandler!!.handleLoyalty(LoyaltyRequest(category = LoyaltyActionCategory.ADD_CODE))
      fail("Expected IllegalStateException when JS reports __unhandled")
    } catch (expected: IllegalStateException) {
      assertTrue(expected.message!!.contains("not registered"))
    }

    // 4. Error sentinel { __error: true, errorMessage }
    nextReplyFactory = {
      JavaOnlyMap().apply {
        putBoolean("__error", true)
        putString("errorMessage", "CRM service unavailable")
      }
    }
    try {
      loyaltyHandler!!.handleLoyalty(LoyaltyRequest(category = LoyaltyActionCategory.ADD_CODE))
      fail("Expected IllegalStateException when JS reports __error")
    } catch (expected: IllegalStateException) {
      assertEquals("CRM service unavailable", expected.message)
    }
  }

  @Test
  fun multiSessionLifecycle_resetsSessionStateAfterSessionEndAndTerminalError() = runTest {
    val dispatcher = UnconfinedTestDispatcher(testScheduler)
    val reactContext = Mockito.mock(ReactApplicationContext::class.java)
    val emitted = mutableListOf<EmittedEvent>()
    val capturedHandlers = mutableListOf<FoodOrderingClientHandlers>()
    val createdClients = mutableListOf<FakeFoodOrderingNativeClient>()
    lateinit var module: FoodOrderingModule

    module =
      FoodOrderingModule(
        reactContext = reactContext,
        mainDispatcher = dispatcher,
        sdkConfigurer = {},
        clientFactory = { handlers ->
          capturedHandlers.add(handlers)
          FakeFoodOrderingNativeClient().also { createdClients.add(it) }
        },
        eventSink = { name, body ->
          emitted.add(EmittedEvent(name, body))
          when (name) {
            "onFinalizeOrderRequested" -> {
              module.rejectDelegateRequest(body.getString("requestId")!!, "UNIMPLEMENTED")
            }
            "onLoyaltyRequested" -> {
              module.respondToLoyalty(
                body.getString("requestId")!!,
                JavaOnlyMap().apply {
                  putString("category", "LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER")
                  putMap(
                    "loyaltyMetadata",
                    JavaOnlyMap().apply {
                      putMap("customer", JavaOnlyMap().apply { putString("name", "Alex") })
                    },
                  )
                },
              )
            }
          }
        },
        delegateRequestTimeoutMs = 2_000L,
      )

    module.initialize(
      JavaOnlyMap().apply {
        putString("gcpProjectName", "demo-project")
        putString("location", "global")
        putString("brand", "demo-brand")
        putBoolean("__hasLoyaltyHandler", false)
      },
      CapturedPromise().proxy,
    )
    assertEquals(1, createdClients.size)
    assertNull(capturedHandlers.last().loyaltyHandler)

    // 1. Session 1 starts without handleLoyalty and with payment card "1111".
    module.startSession(
      JavaOnlyMap().apply {
        putString("storeId", "store-1")
        putString("sessionId", "sess-1")
        putBoolean("__hasLoyaltyHandler", false)
        putMap(
          "userInfo",
          JavaOnlyMap().apply {
            putMap(
              "paymentInfo",
              JavaOnlyMap().apply {
                putString("creditCardLastFourDigits", "1111")
                putString("paymentMethod", "PAYMENT_METHOD_CREDIT_CARD")
              },
            )
          },
        )
      },
      CapturedPromise().proxy,
    )

    val finalizeSess1 =
      async { capturedHandlers.last().finalizeOrderHandler.handleFinalizeOrder(FinalizeOrderRequest()) }
        .await()
    assertTrue(finalizeSess1.paymentFlowEnabled)
    assertEquals("1111", finalizeSess1.paymentInfo?.creditCardLastFourDigits)

    // Non-terminal SessionAlreadyStarted must NOT clear active Session 1 state or recreate client.
    createdClients[0].responses.tryEmit(OrderResponse.Error.SessionAlreadyStarted("sess-dup"))
    module.startSession(
      JavaOnlyMap().apply {
        putString("storeId", "store-dup")
        putString("sessionId", "sess-dup")
        putBoolean("__hasLoyaltyHandler", true)
        putMap(
          "userInfo",
          JavaOnlyMap().apply {
            putMap(
              "paymentInfo",
              JavaOnlyMap().apply {
                putString("creditCardLastFourDigits", "9999")
                putString("paymentMethod", "PAYMENT_METHOD_CREDIT_CARD")
              },
            )
          },
        )
      },
      CapturedPromise().proxy,
    )
    assertEquals(1, createdClients.size)
    val finalizeStillSess1 =
      async { capturedHandlers.last().finalizeOrderHandler.handleFinalizeOrder(FinalizeOrderRequest()) }
        .await()
    assertEquals("1111", finalizeStillSess1.paymentInfo?.creditCardLastFourDigits)

    // Natural SessionEnd (REQUESTED_STORE_SELECTION) without calling endSession() resets state,
    // even though the underlying SharedFlow never completes.
    emitted.clear()
    createdClients[0]
      .responses
      .tryEmit(
        OrderResponse.SessionEnd(
          endSession = EndSession(type = EndType.REQUESTED_STORE_SELECTION, reason = "Pick store"),
          sessionId = "sess-1",
        )
      )
    assertEquals(1, emitted.count { it.name == "onSessionEnded" })

    val finalizeBetweenSessions =
      async { capturedHandlers.last().finalizeOrderHandler.handleFinalizeOrder(FinalizeOrderRequest()) }
        .await()
    assertFalse(finalizeBetweenSessions.paymentFlowEnabled)
    assertNull(finalizeBetweenSessions.paymentInfo)

    // 2. Session 2 starts immediately with handleLoyalty enabled and updated card "2222".
    module.startSession(
      JavaOnlyMap().apply {
        putString("storeId", "store-2")
        putString("sessionId", "sess-2")
        putBoolean("__hasLoyaltyHandler", true)
        putMap(
          "userInfo",
          JavaOnlyMap().apply {
            putMap(
              "paymentInfo",
              JavaOnlyMap().apply {
                putString("creditCardLastFourDigits", "2222")
                putString("paymentMethod", "PAYMENT_METHOD_CREDIT_CARD")
              },
            )
          },
        )
      },
      CapturedPromise().proxy,
    )

    assertEquals(2, createdClients.size)
    assertEquals(1, createdClients[0].releasedCount)
    assertNotNull(capturedHandlers.last().loyaltyHandler)

    val loyaltyResp =
      async {
          capturedHandlers
            .last()
            .loyaltyHandler!!
            .handleLoyalty(LoyaltyRequest(category = LoyaltyActionCategory.IDENTIFY_CUSTOMER))
        }
        .await()
    assertEquals("Alex", loyaltyResp.loyaltyMetadata?.customer?.name)

    val finalizeSess2 =
      async { capturedHandlers.last().finalizeOrderHandler.handleFinalizeOrder(FinalizeOrderRequest()) }
        .await()
    assertTrue(finalizeSess2.paymentFlowEnabled)
    assertEquals("2222", finalizeSess2.paymentInfo?.creditCardLastFourDigits)

    emitted.clear()
    createdClients[1]
      .responses
      .tryEmit(OrderResponse.Text(agentText = "Welcome to store 2", sessionId = "sess-2"))
    assertEquals(1, emitted.count { it.name == "onAgentText" })

    // 3. Terminal StreamClosed error resets state so Session 3 reconfigures cleanly without endSession().
    emitted.clear()
    createdClients[1]
      .responses
      .tryEmit(OrderResponse.Error.StreamClosed("sess-2", "Stream disconnected"))
    assertEquals(1, emitted.count { it.name == "onError" })
    assertEquals("STREAM_CLOSED", emitted.single { it.name == "onError" }.body.getString("code"))

    module.startSession(
      JavaOnlyMap().apply {
        putString("storeId", "store-3")
        putString("sessionId", "sess-3")
        putBoolean("__hasLoyaltyHandler", false)
        putMap(
          "userInfo",
          JavaOnlyMap().apply {
            putMap(
              "paymentInfo",
              JavaOnlyMap().apply { putString("paymentMethod", "PAYMENT_METHOD_CASH") },
            )
          },
        )
      },
      CapturedPromise().proxy,
    )

    assertEquals(3, createdClients.size)
    assertEquals(1, createdClients[1].releasedCount)
    assertNull(capturedHandlers.last().loyaltyHandler)

    val finalizeSess3Cash =
      async { capturedHandlers.last().finalizeOrderHandler.handleFinalizeOrder(FinalizeOrderRequest()) }
        .await()
    assertFalse(finalizeSess3Cash.paymentFlowEnabled)
    assertNull(finalizeSess3Cash.paymentInfo)
  }

  @Test
  fun authTokenRequestHandler_usesDelegateCallbackOnlyWithNoCachedTokenFallback() = runTest {
    val dispatcher = UnconfinedTestDispatcher(testScheduler)
    val reactContext = Mockito.mock(ReactApplicationContext::class.java)
    val capturedHandlers = mutableListOf<FoodOrderingClientHandlers>()
    var authShouldSucceed = true

    lateinit var module: FoodOrderingModule
    module =
      FoodOrderingModule(
        reactContext = reactContext,
        mainDispatcher = dispatcher,
        sdkConfigurer = {},
        clientFactory = { handlers ->
          capturedHandlers.add(handlers)
          FakeFoodOrderingNativeClient()
        },
        eventSink = { name, body ->
          if (name == "onAuthTokenRequested") {
            val reqId = body.getString("requestId")!!
            if (authShouldSucceed) {
              module.respondToAuthTokenRequest(
                reqId,
                JavaOnlyMap().apply {
                  putString("token", "fresh-callback-token")
                  putString("expiry", "2026-11-06T23:00:00Z")
                },
              )
            } else {
              module.rejectDelegateRequest(reqId, "Token refresh failed")
            }
          }
        },
        delegateRequestTimeoutMs = 2_000L,
      )

    // Even if a caller passes a legacy "authToken" key in initialize(), it is ignored.
    val initPromise = CapturedPromise()
    module.initialize(
      JavaOnlyMap().apply {
        putString("gcpProjectName", "demo-project")
        putString("location", "global")
        putString("brand", "demo-brand")
        putString("authToken", "ignored-static-token")
      },
      initPromise.proxy,
    )
    assertTrue(initPromise.resolved)

    val okResult = capturedHandlers.single().authTokenRequestHandler.handleAuthTokenRequest()
    assertTrue(okResult.success)
    assertEquals("fresh-callback-token", okResult.authToken?.token)
    assertEquals("2026-11-06T23:00:00Z", okResult.authToken?.expiry)

    // Subsequent failure must NOT fall back to the previously returned or static token.
    authShouldSucceed = false
    val failedResult = capturedHandlers.single().authTokenRequestHandler.handleAuthTokenRequest()
    assertFalse(failedResult.success)
    assertNull(failedResult.authToken)
  }
}
