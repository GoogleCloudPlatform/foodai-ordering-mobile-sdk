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

import Foundation
import XCTest
import foodai_orderingagent

@testable import FoodaiOrderingReactNative

final class FoodOrderingBridgeTests: XCTestCase {

  private final class FakeFoodOrderingClientController:
    FoodOrderingClientControlling, @unchecked Sendable
  {
    var lastConfiguredConfig: FoodOrderingClientConfig?
    weak var lastDelegate: (any FoodOrderingClientDelegate)?
    var lastSessionConfig: OrderingSessionConfig?
    var lastUpdatedOrder: Order?

    func configure(_ config: FoodOrderingClientConfig) {
      lastConfiguredConfig = config
    }

    func setDelegate(_ delegate: (any FoodOrderingClientDelegate)?) {
      lastDelegate = delegate
    }

    func requestMicrophonePermission() async -> Bool {
      true
    }

    func startSession(
      sessionConfig: OrderingSessionConfig
    ) async throws -> AsyncThrowingStream<OrderResponse, Error> {
      lastSessionConfig = sessionConfig
      return AsyncThrowingStream { continuation in
        continuation.finish()
      }
    }

    func sendText(_ text: String) {}

    func updateOrderState(_ order: Order) {
      lastUpdatedOrder = order
    }

    func sendCustomizedInput(_ input: CustomizedInput) {}

    func pauseMicrophone() {}

    func resumeMicrophone() {}

    func stopSession(finishPlayingAudio: Bool) {}
  }

  func testStartSessionDecodes070UserLocationFeatureGatesAndTimestamp() async {
    let controller = FakeFoodOrderingClientController()
    let impl = FoodOrderingSwiftImpl(clientController: controller)

    let initResolved = expectation(description: "initialize resolved")
    impl.initialize(
      [
        "gcpProjectName": "demo-project",
        "location": "global",
        "brand": "demo-brand",
      ],
      resolver: { _ in initResolved.fulfill() },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [initResolved], timeout: 2.0)

    let startResolved = expectation(description: "startSession resolved")
    var resolvedSessionId: String?
    impl.startSession(
      [
        "storeId": "store-202",
        "sessionId": "ios-sess-070",
        "userInfo": [
          "preferredName": "Casey",
          "location": [
            "coordinates": [
              "latitude": 37.422,
              "longitude": -122.084,
            ],
            "captureTime": [
              "seconds": 1_762_272_000,
              "nanos": 0,
            ],
          ],
        ],
        "featureGates": [
          "storeSelectionEnabled": true,
          "offersAndLoyaltyEnabled": true,
        ],
        "initialOrder": [
          "fulfillment": [
            "fulfillmentMethod": "FULFILLMENT_METHOD_DRIVE_THRU",
            "createTime": [
              "seconds": 1_762_272_100,
              "nanos": 500,
            ],
          ],
        ],
      ],
      resolver: { value in
        resolvedSessionId = value as? String
        startResolved.fulfill()
      },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [startResolved], timeout: 2.0)

    XCTAssertEqual(resolvedSessionId, "ios-sess-070")
    guard let config = controller.lastSessionConfig else {
      XCTFail("Expected lastSessionConfig to be captured")
      return
    }
    XCTAssertEqual(config.storeID, "store-202")
    XCTAssertEqual(config.userInfo?.location?.coordinates.latitude ?? 0, 37.422, accuracy: 1e-6)
    XCTAssertEqual(config.userInfo?.location?.coordinates.longitude ?? 0, -122.084, accuracy: 1e-6)
    XCTAssertEqual(config.userInfo?.location?.captureTime?.seconds, 1_762_272_000)
    XCTAssertEqual(config.featureGate?.storeSelectionEnabled, true)
    XCTAssertEqual(config.featureGate?.offersAndLoyaltyEnabled, true)
    XCTAssertEqual(config.initialOrder?.fulfillment?.method, .driveThru)
    XCTAssertEqual(config.initialOrder?.fulfillment?.createTimestamp?.seconds, 1_762_272_100)
    XCTAssertEqual(config.initialOrder?.fulfillment?.createTimestamp?.nanos, 500)
  }

  func testHandleEventEmitsAgentEventSessionEndedSuggestedOffersAndOrderUpdates() {
    let controller = FakeFoodOrderingClientController()
    let impl = FoodOrderingSwiftImpl(clientController: controller)

    var emitted: [(name: String, body: NSDictionary)] = []
    impl.eventEmitterCallback = { name, body in
      emitted.append((name as String, body))
    }

    impl.handleEvent(.sessionStarted(sessionID: "sess-ios-1"))
    emitted.removeAll()

    // 1. AgentEvent variants
    impl.handleEvent(
      .agentEvent(
        .storeChange(
          OrderResponse.AgentEvent.StoreChange(store: "projects/p/locations/l/stores/store-77")
        )
      )
    )
    impl.handleEvent(
      .agentEvent(
        .restartOrder(OrderResponse.AgentEvent.RestartOrder(confirmationStep: true))
      )
    )
    impl.handleEvent(.agentEvent(.unknown))

    XCTAssertEqual(emitted.count, 3)
    let storeChangeDict = emitted[0].body["agentEvent"] as? NSDictionary
    XCTAssertEqual(storeChangeDict?["type"] as? String, "STORE_CHANGE")
    XCTAssertEqual(storeChangeDict?["store"] as? String, "projects/p/locations/l/stores/store-77")

    let restartDict = emitted[1].body["agentEvent"] as? NSDictionary
    XCTAssertEqual(restartDict?["type"] as? String, "RESTART_ORDER")
    XCTAssertEqual(restartDict?["confirmationStep"] as? Bool, true)

    let unknownAgentDict = emitted[2].body["agentEvent"] as? NSDictionary
    XCTAssertEqual(unknownAgentDict?["type"] as? String, "UNKNOWN")

    // 2. SessionEnded: REQUESTED_STORE_SELECTION, UNKNOWN, and STORE_CLOSED + storeSchedule
    emitted.removeAll()
    impl.handleEvent(
      .sessionEnded(
        sessionID: "sess-ios-1",
        sessionEnded: OrderResponse.SessionEnded(
          type: .requestedStoreSelection,
          reason: "Select store"
        )
      )
    )
    impl.handleEvent(
      .sessionEnded(
        sessionID: "sess-ios-1",
        sessionEnded: OrderResponse.SessionEnded(type: .unknown, reason: "Unrecognized")
      )
    )
    impl.handleEvent(
      .sessionEnded(
        sessionID: "sess-ios-1",
        sessionEnded: OrderResponse.SessionEnded(
          type: .storeClosed,
          reason: "Closed",
          storeSchedule: StoreSchedule(
            days: [.monday, .unknown],
            timeRanges: [
              TimeOfDayRange(
                startTime: TimeOfDay(hours: 8, minutes: 0),
                endTime: TimeOfDay(hours: 20, minutes: 0)
              )
            ]
          )
        )
      )
    )

    XCTAssertEqual(emitted.count, 3)
    XCTAssertEqual(
      (emitted[0].body["endSession"] as? NSDictionary)?["type"] as? String,
      "REQUESTED_STORE_SELECTION"
    )
    XCTAssertEqual(
      (emitted[1].body["endSession"] as? NSDictionary)?["type"] as? String,
      "UNKNOWN"
    )
    let closedEndSession = emitted[2].body["endSession"] as? NSDictionary
    XCTAssertEqual(closedEndSession?["type"] as? String, "STORE_CLOSED")
    let topLevelSchedule = emitted[2].body["storeSchedule"] as? NSDictionary
    XCTAssertNotNil(topLevelSchedule)
    XCTAssertEqual(topLevelSchedule?["days"] as? [String], ["MONDAY", "UNKNOWN"])

    // 3. SuggestedOptions.suggestedOffers (.loyaltyReward, .discount, .unknown -> [:])
    emitted.removeAll()
    impl.handleEvent(
      .suggestedOptions(
        SuggestedOptions(
          suggestedOffers: SuggestedOffers(
            offers: [
              .loyaltyReward(
                LoyaltyReward(
                  rewardId: "rew-1",
                  displayName: "Free Drink",
                  redemptionCost: LoyaltyAmount(units: 200),
                  expireTime: Timestamp(seconds: 1_800_000_000, nanos: 0)
                )
              ),
              .discount(
                Discount(
                  name: "discounts/10-off",
                  displayName: "10% Off",
                  type: .percentOff,
                  scope: .order,
                  percent: 10.0,
                  autoApply: true,
                  customIntegrationAttributes: [
                    "promoCode": .string("HH10"),
                    "stackable": .bool(false),
                  ]
                )
              ),
              .unknown,
            ]
          )
        )
      )
    )

    XCTAssertEqual(emitted.count, 1)
    let optionsDict = emitted[0].body["suggestedOptions"] as? NSDictionary
    let offersDict = optionsDict?["suggestedOffers"] as? NSDictionary
    let offersArr = offersDict?["offers"] as? [NSDictionary]
    XCTAssertEqual(offersArr?.count, 3)
    XCTAssertEqual(
      (offersArr?[0]["loyaltyReward"] as? NSDictionary)?["rewardId"] as? String,
      "rew-1"
    )
    let discountDict = offersArr?[1]["discount"] as? NSDictionary
    XCTAssertEqual(discountDict?["name"] as? String, "discounts/10-off")
    let discountCustomAttrs = discountDict?["customIntegrationAttributes"] as? NSDictionary
    XCTAssertEqual(discountCustomAttrs?["promoCode"] as? String, "HH10")
    XCTAssertEqual(discountCustomAttrs?["stackable"] as? Bool, false)
    XCTAssertNil(offersArr?[2]["loyaltyReward"])
    XCTAssertNil(offersArr?[2]["discount"])

    // 4. OrderUpdate with OrderPriceInfo.tip and .unknown status
    emitted.removeAll()
    impl.handleEvent(
      .updatedOrderState(
        OrderState(
          order: Order(
            priceInfo: OrderPriceInfo(tip: Money(currencyCode: "USD", units: 3, nanos: 0))
          ),
          changed: true,
          status: .unknown
        )
      )
    )
    XCTAssertEqual(emitted.count, 1)
    let updatedState = emitted[0].body["updatedOrderState"] as? NSDictionary
    XCTAssertEqual(updatedState?["status"] as? String, "UNKNOWN")
    let tipDict = ((emitted[0].body["order"] as? NSDictionary)?["priceInfo"] as? NSDictionary)?[
      "tip"
    ] as? NSDictionary
    XCTAssertEqual("\(tipDict?["units"] ?? "")", "3")
  }

  func testHandleLoyaltyRoundTripsSuccessGuestUnhandledAndError() async {
    let controller = FakeFoodOrderingClientController()
    let impl = FoodOrderingSwiftImpl(clientController: controller)

    var nextReplyFactory: ((NSDictionary) -> NSDictionary)?
    impl.eventEmitterCallback = { [weak impl] name, body in
      guard name as String == "onLoyaltyRequested",
        let requestId = body["requestId"] as? String,
        let requestPayload = body["request"] as? NSDictionary
      else {
        return
      }
      let reply = nextReplyFactory?(requestPayload) ?? [:]
      impl?.respondToLoyalty(requestId as NSString, response: reply)
    }

    // 1. Happy path
    var observedCategory: String?
    nextReplyFactory = { requestPayload in
      observedCategory = requestPayload["category"] as? String
      return [
        "category": "LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER",
        "loyaltyMetadata": [
          "customer": [
            "name": "Morgan",
          ],
        ],
        "clientExecutionStatus": [
          "httpStatusCode": 200,
          "rejectionReason": "REJECTION_REASON_INSUFFICIENT_POINTS",
        ],
      ]
    }

    let successResult = await impl.handleLoyalty(
      request: LoyaltyRequest(category: .identifyCustomer, phoneNumber: "+15550101234")
    )
    XCTAssertEqual(observedCategory, "LOYALTY_ACTION_CATEGORY_IDENTIFY_CUSTOMER")
    switch successResult {
    case .success(let response):
      XCTAssertEqual(response.category, .identifyCustomer)
      XCTAssertEqual(response.loyaltyMetadata?.customer?.name, "Morgan")
      XCTAssertEqual(response.clientExecutionStatus?.rejectionReason, .insufficientPoints)
    case .failure(let error):
      XCTFail("Expected success but failed with \(error)")
    }

    // 2. Guest empty [:] response
    nextReplyFactory = { _ in [:] }
    let guestResult = await impl.handleLoyalty(
      request: LoyaltyRequest(category: .identifyCustomer)
    )
    switch guestResult {
    case .success(let response):
      XCTAssertNil(response.category)
      XCTAssertNil(response.loyaltyMetadata)
    case .failure(let error):
      XCTFail("Expected empty guest LoyaltyResponse() but got \(error)")
    }

    // 3. Unhandled sentinel ["__unhandled": true] delegates to default protocol fallback
    nextReplyFactory = { _ in ["__unhandled": true] }
    let unhandledResult = await impl.handleLoyalty(
      request: LoyaltyRequest(category: .addCode, code: "SAVE10")
    )
    switch unhandledResult {
    case .success:
      XCTFail("Expected failure for __unhandled loyalty request")
    case .failure(let error):
      XCTAssertTrue(
        String(reflecting: error).contains("UnimplementedLoyaltyHandlerError"),
        "Expected default UnimplementedLoyaltyHandlerError, got \(String(reflecting: error))"
      )
    }

    // 4. Error sentinel ["__error": true, "errorMessage": ...]
    nextReplyFactory = { _ in
      [
        "__error": true,
        "errorMessage": "Loyalty CRM timed out",
      ]
    }
    let errorResult = await impl.handleLoyalty(
      request: LoyaltyRequest(category: .addCode, code: "SAVE10")
    )
    switch errorResult {
    case .success:
      XCTFail("Expected failure for __error loyalty request")
    case .failure(let error):
      XCTAssertEqual(error.localizedDescription, "Loyalty CRM timed out")
    }
  }

  func testMultiSessionAfterRequestedStoreSelectionResetsSessionState() async {
    let controller = FakeFoodOrderingClientController()
    let impl = FoodOrderingSwiftImpl(clientController: controller)

    var emitted: [(name: String, body: NSDictionary)] = []
    impl.eventEmitterCallback = { [weak impl] name, body in
      let eventName = name as String
      emitted.append((eventName, body))
      if eventName == "onFinalizeOrderRequested", let requestId = body["requestId"] as? String {
        impl?.rejectDelegateRequest(requestId as NSString, errorMessage: "UNIMPLEMENTED")
      }
    }

    let initResolved = expectation(description: "initialize resolved")
    impl.initialize(
      [
        "gcpProjectName": "demo-project",
        "location": "global",
        "brand": "demo-brand",
      ],
      resolver: { _ in initResolved.fulfill() },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [initResolved], timeout: 2.0)

    // 1. Session 1 starts with card "1111"
    let start1Resolved = expectation(description: "startSession 1 resolved")
    impl.startSession(
      [
        "storeId": "store-1",
        "sessionId": "ios-sess-1",
        "userInfo": [
          "paymentInfo": [
            "creditCardLastFourDigits": "1111",
            "paymentMethod": "PAYMENT_METHOD_CREDIT_CARD",
          ],
        ],
      ],
      resolver: { _ in start1Resolved.fulfill() },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [start1Resolved], timeout: 2.0)

    let finalize1 = await impl.handleFinalizeOrder(request: FinalizeOrderRequest())
    switch finalize1 {
    case .success(let response):
      XCTAssertTrue(response.paymentFlowEnabled)
      XCTAssertEqual(response.paymentInfo?.creditCardLastFourDigits, "1111")
    case .failure(let error):
      XCTFail("Unexpected finalizeOrder failure: \(error)")
    }

    // Natural SessionEnded (.requestedStoreSelection) without endSession() clears session state
    impl.handleEvent(
      .sessionEnded(
        sessionID: "ios-sess-1",
        sessionEnded: OrderResponse.SessionEnded(
          type: .requestedStoreSelection,
          reason: "Select store"
        )
      )
    )

    let finalizeBetween = await impl.handleFinalizeOrder(request: FinalizeOrderRequest())
    switch finalizeBetween {
    case .success(let response):
      XCTAssertFalse(response.paymentFlowEnabled)
      XCTAssertNil(response.paymentInfo)
    case .failure(let error):
      XCTFail("Unexpected finalizeOrder failure: \(error)")
    }

    // 2. Session 2 starts immediately with card "2222", then Session 3 with cash
    let start2Resolved = expectation(description: "startSession 2 resolved")
    impl.startSession(
      [
        "storeId": "store-2",
        "sessionId": "ios-sess-2",
        "userInfo": [
          "paymentInfo": [
            "creditCardLastFourDigits": "2222",
            "paymentMethod": "PAYMENT_METHOD_CREDIT_CARD",
          ],
        ],
      ],
      resolver: { _ in start2Resolved.fulfill() },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [start2Resolved], timeout: 2.0)

    let finalize2 = await impl.handleFinalizeOrder(request: FinalizeOrderRequest())
    switch finalize2 {
    case .success(let response):
      XCTAssertTrue(response.paymentFlowEnabled)
      XCTAssertEqual(response.paymentInfo?.creditCardLastFourDigits, "2222")
    case .failure(let error):
      XCTFail("Unexpected finalizeOrder failure: \(error)")
    }

    impl.handleEvent(
      .sessionEnded(
        sessionID: "ios-sess-2",
        sessionEnded: OrderResponse.SessionEnded(type: .orderCompleted, reason: "Done")
      )
    )

    let start3Resolved = expectation(description: "startSession 3 resolved")
    impl.startSession(
      [
        "storeId": "store-3",
        "sessionId": "ios-sess-3",
        "userInfo": [
          "paymentInfo": [
            "paymentMethod": "PAYMENT_METHOD_CASH",
          ],
        ],
      ],
      resolver: { _ in start3Resolved.fulfill() },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [start3Resolved], timeout: 2.0)

    let finalize3 = await impl.handleFinalizeOrder(request: FinalizeOrderRequest())
    switch finalize3 {
    case .success(let response):
      XCTAssertFalse(response.paymentFlowEnabled)
      XCTAssertNil(response.paymentInfo)
    case .failure(let error):
      XCTFail("Unexpected finalizeOrder failure: \(error)")
    }
  }

  func testHandleAuthTokenRequestUsesDelegateCallbackOnlyWithNoCachedFallback() async {
    let controller = FakeFoodOrderingClientController()
    let impl = FoodOrderingSwiftImpl(clientController: controller)

    var shouldSucceed = true
    impl.eventEmitterCallback = { [weak impl] name, body in
      guard name as String == "onAuthTokenRequested",
        let reqId = body["requestId"] as? NSString
      else {
        return
      }
      if shouldSucceed {
        impl?.respondToAuthTokenRequest(
          reqId,
          response: [
            "token": "ios-fresh-token",
            "expiry": "2026-11-06T23:00:00Z",
          ]
        )
      } else {
        impl?.rejectDelegateRequest(reqId, errorMessage: "Token refresh failed")
      }
    }

    let initResolved = expectation(description: "initialize resolved")
    impl.initialize(
      [
        "gcpProjectName": "demo-project",
        "location": "global",
        "brand": "demo-brand",
        "authToken": "ignored-static-token",
      ],
      resolver: { _ in initResolved.fulfill() },
      rejecter: { code, message, _ in
        XCTFail("Unexpected reject \(code ?? ""): \(message ?? "")")
      }
    )
    await fulfillment(of: [initResolved], timeout: 2.0)

    let okResult = await impl.handleAuthTokenRequest()
    switch okResult {
    case .success(let token):
      XCTAssertEqual(token.token, "ios-fresh-token")
      XCTAssertNotNil(token.expirationDate)
    case .failure(let error):
      XCTFail("Unexpected auth token failure: \(error)")
    }

    // Subsequent failure must fail directly with no cached token fallback
    shouldSucceed = false
    let failedResult = await impl.handleAuthTokenRequest()
    switch failedResult {
    case .success(let token):
      XCTFail("Expected failure without cached fallback, got \(token.token)")
    case .failure:
      break
    }
  }
}
