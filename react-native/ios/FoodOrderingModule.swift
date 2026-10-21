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
import foodai_orderingagent

/// Objective-C compatible promise resolve callback matching `RCTPromiseResolveBlock`.
public typealias FoodOrderingPromiseResolveBlock = (Any?) -> Void

/// Objective-C compatible promise reject callback matching `RCTPromiseRejectBlock`.
public typealias FoodOrderingPromiseRejectBlock = (String?, String?, Error?) -> Void

/// Swift implementation backing the Objective-C++ `FoodOrderingModule` TurboModule (`NativeFoodOrderingSpec`),
/// bridging JavaScript calls, `FoodOrderingClientDelegate` callbacks, and stream events to the iOS
/// `FoodOrderingClient.shared` singleton.
@objc(FoodOrderingSwiftImpl)
public final class FoodOrderingSwiftImpl:
  NSObject, FoodOrderingClientDelegate, @unchecked Sendable
{

  @objc public override init() {
    super.init()
  }

  /// Callback wired by `FoodOrderingModule.mm` that routes events to Codegen's `emitOn*` methods.
  @objc public var eventEmitterCallback: ((NSString, NSDictionary) -> Void)?

  private var activeSessionId: String?
  private var latestSessionUserInfo: UserInfo?
  private var streamListenerTask: Task<Void, Never>?

  private let requestLock = NSLock()
  private var cachedToken: String?
  private var cachedTokenExpiry: Date?
  private var pendingDelegateContinuations:
    [String: CheckedContinuation<Result<NSDictionary, Error>, Never>] = [:]

  private static let delegateTimeoutNanoseconds: UInt64 = 15_000_000_000

  private enum BridgeError: LocalizedError {
    case delegateError(String)

    var errorDescription: String? {
      switch self {
      case .delegateError(let message):
        return message
      }
    }
  }

  // MARK: - Exported React Native Methods

  @objc(initialize:resolver:rejecter:)
  public func initialize(
    _ config: NSDictionary,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    guard
      let gcpProjectName = config["gcpProjectName"] as? String,
      !gcpProjectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      reject("INITIALIZE_ERROR", "gcpProjectName is required.", nil)
      return
    }
    guard
      let location = config["location"] as? String,
      !location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      reject("INITIALIZE_ERROR", "location is required.", nil)
      return
    }
    guard
      let brand = config["brand"] as? String,
      !brand.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      reject("INITIALIZE_ERROR", "brand is required.", nil)
      return
    }

    let logLevel = parseLogLevel(config["logLevel"] as? String)

    if let initialToken = config["authToken"] as? String, !initialToken.isEmpty {
      let expiryString = config["authTokenExpiry"] as? String
      storeCachedToken(token: initialToken, expiryISO8601: expiryString)
    }

    let clientConfig = FoodOrderingClientConfig(
      gcpProjectName: gcpProjectName,
      location: location,
      brand: brand,
      logLevel: logLevel
    )
    FoodOrderingClient.configure(clientConfig)
    FoodOrderingClient.shared.setDelegate(self)
    resolve(nil)
  }

  @objc(setAuthToken:expiry:resolver:rejecter:)
  public func setAuthToken(
    _ token: NSString,
    expiry: NSString?,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    storeCachedToken(token: token as String, expiryISO8601: expiry as String?)
    resolve(nil)
  }

  // MARK: - JS -> Native Delegate Response Methods

  @objc(respondToAuthTokenRequest:response:)
  public func respondToAuthTokenRequest(_ requestId: NSString, response: NSDictionary) {
    if let token = response["token"] as? String, !token.isEmpty {
      let expiry = response["expiry"] as? String
      storeCachedToken(token: token, expiryISO8601: expiry)
    }
    completePendingRequest(requestId: requestId as String, result: .success(response))
  }

  @objc(respondToFinalizeOrder:response:)
  public func respondToFinalizeOrder(_ requestId: NSString, response: NSDictionary) {
    completePendingRequest(requestId: requestId as String, result: .success(response))
  }

  @objc(respondToSubmitOrder:response:)
  public func respondToSubmitOrder(_ requestId: NSString, response: NSDictionary) {
    completePendingRequest(requestId: requestId as String, result: .success(response))
  }

  @objc(respondToOrderPrices:response:)
  public func respondToOrderPrices(_ requestId: NSString, response: NSDictionary) {
    completePendingRequest(requestId: requestId as String, result: .success(response))
  }

  @objc(respondToOrderStatus:response:)
  public func respondToOrderStatus(_ requestId: NSString, response: NSDictionary) {
    completePendingRequest(requestId: requestId as String, result: .success(response))
  }

  @objc(rejectDelegateRequest:errorMessage:)
  public func rejectDelegateRequest(_ requestId: NSString, errorMessage: NSString) {
    completePendingRequest(
      requestId: requestId as String,
      result: .failure(BridgeError.delegateError(errorMessage as String))
    )
  }

  @objc(requestMicrophonePermission:rejecter:)
  public func requestMicrophonePermission(
    _ resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    Task {
      let granted = await FoodOrderingClient.shared.requestMicrophonePermission()
      resolve(granted)
    }
  }

  @objc(startSession:resolver:rejecter:)
  public func startSession(
    _ configDict: NSDictionary,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    guard
      let storeId = configDict["storeId"] as? String,
      !storeId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      reject("START_SESSION_ERROR", "storeId is required in OrderingSessionConfig.", nil)
      return
    }

    let customSessionId = (configDict["sessionId"] as? String).flatMap {
      $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0
    }
    let resolvedSessionId = customSessionId ?? "ios-session-\(UUID().uuidString)"
    let daypartId = configDict["daypartId"] as? String
    let initialUtterance = configDict["initialUtterance"] as? String
    let userInfo = (configDict["userInfo"] as? NSDictionary).flatMap {
      decodeModel(UserInfo.self, from: $0)
    }
    let initialOrder = (configDict["initialOrder"] as? NSDictionary).flatMap {
      decodeModel(Order.self, from: $0)
    }
    let featureGate = (configDict["featureGate"] as? NSDictionary).flatMap {
      decodeModel(FeatureGates.self, from: $0)
    }

    let sessionConfig = OrderingSessionConfig(
      sessionID: resolvedSessionId,
      storeID: storeId,
      daypartID: daypartId,
      userInfo: userInfo,
      initialOrder: initialOrder,
      featureGate: featureGate,
      initialUtterance: initialUtterance
    )

    FoodOrderingClient.shared.setDelegate(self)

    Task {
      do {
        let responseStream = try await FoodOrderingClient.shared.startSession(
          sessionConfig: sessionConfig
        )
        self.streamListenerTask?.cancel()
        self.activeSessionId = resolvedSessionId
        self.latestSessionUserInfo = userInfo
        self.streamListenerTask = Task { [weak self] in
          do {
            for try await response in responseStream {
              if Task.isCancelled { break }
              if let started = response.sessionStarted, !started.sessionID.isEmpty {
                self?.activeSessionId = started.sessionID
              }
            }
          } catch {
            guard let self = self, !Task.isCancelled else { return }
            self.emitStreamError(error, sessionId: resolvedSessionId)
          }
        }
        resolve(resolvedSessionId)
      } catch {
        self.emitStreamError(error, sessionId: resolvedSessionId)
        reject("START_SESSION_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(sendText:resolver:rejecter:)
  public func sendText(
    _ text: NSString,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    FoodOrderingClient.shared.sendText(text as String)
    resolve(nil)
  }

  @objc(updateOrderState:resolver:rejecter:)
  public func updateOrderState(
    _ orderDict: NSDictionary,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    guard let order = decodeModel(Order.self, from: orderDict) else {
      reject("UPDATE_ORDER_STATE_ERROR", "Failed to decode Order dictionary.", nil)
      return
    }
    FoodOrderingClient.shared.updateOrderState(order)
    resolve(nil)
  }

  @objc(sendCustomizedInput:resolver:rejecter:)
  public func sendCustomizedInput(
    _ parameters: NSDictionary,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    let sourceDict = (parameters["parameters"] as? NSDictionary) ?? parameters
    var stringParams: [String: String] = [:]
    for (key, value) in sourceDict {
      if let keyStr = key as? String {
        stringParams[keyStr] = "\(value)"
      }
    }
    FoodOrderingClient.shared.sendCustomizedInput(CustomizedInput(parameters: stringParams))
    resolve(nil)
  }

  @objc(pauseMicrophone:rejecter:)
  public func pauseMicrophone(
    _ resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    FoodOrderingClient.shared.pauseMicrophone()
    resolve(nil)
  }

  @objc(resumeMicrophone:rejecter:)
  public func resumeMicrophone(
    _ resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    FoodOrderingClient.shared.resumeMicrophone()
    resolve(nil)
  }

  @objc(endSession:resolver:rejecter:)
  public func endSession(
    _ waitUntilComplete: Bool,
    resolver resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    streamListenerTask?.cancel()
    streamListenerTask = nil
    FoodOrderingClient.shared.stopSession(finishPlayingAudio: waitUntilComplete)
    activeSessionId = nil
    latestSessionUserInfo = nil
    resolve(nil)
  }

  @objc(releaseClient:rejecter:)
  public func releaseClient(
    _ resolve: @escaping FoodOrderingPromiseResolveBlock,
    rejecter reject: @escaping FoodOrderingPromiseRejectBlock
  ) {
    streamListenerTask?.cancel()
    streamListenerTask = nil
    FoodOrderingClient.shared.stopSession(finishPlayingAudio: false)
    activeSessionId = nil
    latestSessionUserInfo = nil
    cancelAllPendingDelegateRequests()
    resolve(nil)
  }

  // MARK: - FoodOrderingClientDelegate

  public func handleAuthTokenRequest() async -> Result<FoodOrderingClientAuthToken, Error> {
    let responseResult = await sendDelegateRequest(
      eventName: "onAuthTokenRequested",
      requestPayload: [:]
    )
    switch responseResult {
    case .success(let dict):
      if let token = dict["token"] as? String,
        !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      {
        let expiryStr = dict["expiry"] as? String
        storeCachedToken(token: token, expiryISO8601: expiryStr)
        let expiryDate = expiryStr.flatMap { ISO8601DateFormatter().date(from: $0) }
        return .success(FoodOrderingClientAuthToken(token: token, expirationDate: expiryDate))
      }
    case .failure:
      break
    }

    if let fallback = getFallbackCachedAuthToken() {
      return .success(fallback)
    }
    return .failure(BridgeError.delegateError("No auth token provided by JS delegate."))
  }

  public func handleFinalizeOrder(
    request: FinalizeOrderRequest
  ) async -> Result<FinalizeOrderResponse, Error> {
    let payload = encodeToDictionary(request) ?? [:]
    let responseResult = await sendDelegateRequest(
      eventName: "onFinalizeOrderRequested",
      requestPayload: payload
    )
    switch responseResult {
    case .success(let dict):
      guard let decoded = decodeModel(FinalizeOrderResponse.self, from: dict) else {
        return .success(FinalizeOrderResponse(paymentFlowEnabled: false, paymentInfo: nil))
      }
      return .success(decoded)
    case .failure(let error):
      if isUnimplementedDelegateError(error) {
        return .success(defaultFinalizeOrderResponse())
      }
      return .success(FinalizeOrderResponse(paymentFlowEnabled: false, paymentInfo: nil))
    }
  }

  public func handleOrderPrices(
    request: OrderPricesRequest
  ) async -> Result<OrderPricesResponse, Error> {
    let payload = encodeToDictionary(request) ?? [:]
    let responseResult = await sendDelegateRequest(
      eventName: "onOrderPricesRequested",
      requestPayload: payload
    )
    switch responseResult {
    case .success(let dict):
      guard let decoded = decodeModel(OrderPricesResponse.self, from: dict) else {
        return .success(OrderPricesResponse(success: false))
      }
      return .success(decoded)
    case .failure:
      return .success(OrderPricesResponse(success: false))
    }
  }

  public func handleSubmitOrder(
    request: SubmitOrderRequest
  ) async -> Result<SubmitOrderResponse, Error> {
    let payload = encodeToDictionary(request) ?? [:]
    let responseResult = await sendDelegateRequest(
      eventName: "onSubmitOrderRequested",
      requestPayload: payload
    )
    switch responseResult {
    case .success(let dict):
      guard let decoded = decodeModel(SubmitOrderResponse.self, from: dict) else {
        return .success(SubmitOrderResponse(success: false))
      }
      return .success(decoded)
    case .failure:
      return .success(SubmitOrderResponse(success: false))
    }
  }

  public func handleOrderStatus(
    request: OrderStatusRequest
  ) async -> Result<OrderStatusResponse, Error> {
    let payload = encodeToDictionary(request) ?? [:]
    let responseResult = await sendDelegateRequest(
      eventName: "onOrderStatusRequested",
      requestPayload: payload
    )
    switch responseResult {
    case .success(let dict):
      guard let decoded = decodeModel(OrderStatusResponse.self, from: dict) else {
        return .success(OrderStatusResponse(success: false))
      }
      return .success(decoded)
    case .failure:
      return .success(OrderStatusResponse(success: false))
    }
  }

  public func handleAudioLevel(_ audioLevel: Float) {
    emitEvent("audioLevel", body: ["audioLevel": Double(audioLevel)])
  }

  public func handleEvent(_ event: FoodOrderingServiceEvent) {
    let sessionId = activeSessionId ?? ""
    switch event {
    case .sessionStarted(let startedSessionId):
      activeSessionId = startedSessionId
      emitEvent(
        "sessionStarted",
        body: [
          "sessionId": startedSessionId,
        ]
      )
      emitEvent(
        "sessionLifecycle",
        body: [
          "sessionId": startedSessionId,
          "state": "STARTED",
        ]
      )
    case .sessionEnded(let endedSessionId, let ended):
      let resolvedId = endedSessionId.isEmpty ? sessionId : endedSessionId
      var endDict: [String: Any] = [
        "type": mapSessionEndType(ended.type),
        "reason": ended.reason,
      ]
      if let posResponse = ended.posResponse {
        endDict["posResponse"] = posResponse
      }
      if let agentResponse = ended.agentResponse {
        endDict["agentResponse"] = agentResponse
      }
      emitEvent(
        "sessionEnded",
        body: [
          "sessionId": resolvedId,
          "endSession": endDict,
        ]
      )
    case .sessionPaused:
      emitEvent(
        "sessionLifecycle",
        body: [
          "sessionId": sessionId,
          "state": "PAUSED",
        ]
      )
    case .sessionResumed:
      emitEvent(
        "sessionLifecycle",
        body: [
          "sessionId": sessionId,
          "state": "RESUMED",
        ]
      )
    case .updatedOrderState(let orderState):
      emitOrderUpdate(orderState, sessionId: sessionId)
    case .interruptionSignal:
      emitEvent("interruptionSignal", body: ["sessionId": sessionId])
    case .agentEvent(let agentEvent):
      // OrderResponse.AgentEvent isn't Encodable, so map its fields explicitly.
      var dict: [String: Any] = [:]
      if let restartOrder = agentEvent.restartOrder {
        dict["restartOrder"] = ["confirmationStep": restartOrder.confirmationStep]
      }
      emitEvent(
        "agentEvent",
        body: [
          "sessionId": sessionId,
          "agentEvent": dict,
        ]
      )
    case .agentText(let text):
      emitEvent(
        "agentText",
        body: [
          "sessionId": sessionId,
          "text": text,
        ]
      )
    case .speechRecognition(let speech):
      emitEvent(
        "speechRecognition",
        body: [
          "sessionId": sessionId,
          "speechRecognition": [
            "transcript": speech.transcript,
            "languageCode": speech.languageCode,
            "isFinal": speech.isFinal,
          ],
        ]
      )
    case .suggestedOptions(let options):
      if let dict = encodeToDictionary(options) {
        emitEvent(
          "suggestedOptions",
          body: [
            "sessionId": sessionId,
            "suggestedOptions": dict,
          ]
        )
      }
    case .recommendedOrders(let recommended):
      if let dict = encodeToDictionary(recommended) {
        emitEvent(
          "recommendedOrders",
          body: [
            "sessionId": sessionId,
            "recommendedOrders": dict,
          ]
        )
      }
    case .turnCompleted:
      emitEvent("turnCompleted", body: ["sessionId": sessionId])
    @unknown default:
      break
    }
  }

  // MARK: - Native -> JS Request Continuation Helpers

  private func isUnimplementedDelegateError(_ error: Error) -> Bool {
    let message = error.localizedDescription
    return message == "UNIMPLEMENTED" || message.hasPrefix("No React Native listeners")
  }

  private func defaultFinalizeOrderResponse() -> FinalizeOrderResponse {
    guard let paymentInfo = latestSessionUserInfo?.paymentInfo else {
      return FinalizeOrderResponse(paymentFlowEnabled: false, paymentInfo: nil)
    }
    let lastFourDigits =
      paymentInfo.creditCardLastFourDigits?.isEmpty == false
      ? paymentInfo.creditCardLastFourDigits : nil
    let paymentMethod =
      (paymentInfo.paymentMethod != nil && paymentInfo.paymentMethod != .unspecified)
      ? paymentInfo.paymentMethod : nil
    guard lastFourDigits != nil || paymentMethod != nil else {
      return FinalizeOrderResponse(paymentFlowEnabled: false, paymentInfo: nil)
    }
    return FinalizeOrderResponse(
      paymentFlowEnabled: true,
      paymentInfo: PaymentInfo(
        creditCardLastFourDigits: lastFourDigits,
        paymentMethod: paymentMethod
      )
    )
  }

  private func parseLogLevel(_ rawValue: String?) -> LogLevel {
    switch rawValue?.uppercased() {
    case "DEBUG":
      return .debug
    case "INFO":
      return .info
    case "WARNING", "WARN":
      return .warning
    case "ERROR", "SEVERE":
      return .error
    case "NONE", "OFF":
      return .none
    default:
      return .error
    }
  }

  private func sendDelegateRequest(
    eventName: String,
    requestPayload: [String: Any]
  ) async -> Result<NSDictionary, Error> {
    guard let emit = eventEmitterCallback else {
      return .failure(
        BridgeError.delegateError("No React Native listeners registered for \(eventName).")
      )
    }

    let requestId = UUID().uuidString
    return await withCheckedContinuation { continuation in
      self.requestLock.lock()
      self.pendingDelegateContinuations[requestId] = continuation
      self.requestLock.unlock()

      let envelope: NSDictionary = [
        "requestId": requestId,
        "request": requestPayload,
      ]
      emit(eventName as NSString, envelope)

      Task { [weak self] in
        try? await Task.sleep(nanoseconds: Self.delegateTimeoutNanoseconds)
        self?.completePendingRequest(
          requestId: requestId,
          result: .failure(
            BridgeError.delegateError("Timed out waiting for JS response to \(eventName).")
          )
        )
      }
    }
  }

  private func completePendingRequest(
    requestId: String,
    result: Result<NSDictionary, Error>
  ) {
    requestLock.lock()
    let continuation = pendingDelegateContinuations.removeValue(forKey: requestId)
    requestLock.unlock()
    continuation?.resume(returning: result)
  }

  private func cancelAllPendingDelegateRequests() {
    requestLock.lock()
    let pending = pendingDelegateContinuations.values
    pendingDelegateContinuations.removeAll()
    requestLock.unlock()
    for continuation in pending {
      continuation.resume(
        returning: .failure(BridgeError.delegateError("FoodOrderingModule was released."))
      )
    }
  }

  // MARK: - Stream & Event Helpers

  private func emitOrderUpdate(_ orderState: OrderState, sessionId: String) {
    let statusStr: String
    switch orderState.status {
    case .succeeded:
      statusStr = "SUCCEEDED"
    case .failed:
      statusStr = "FAILED"
    case .unspecified:
      statusStr = "UNSPECIFIED"
    @unknown default:
      statusStr = "UNSPECIFIED"
    }

    let orderDict = orderState.order.flatMap { encodeToDictionary($0) }
    let itemsArr = orderState.items.compactMap { encodeToDictionary($0) }

    var stateDict: [String: Any] = [
      "items": itemsArr,
      "changed": orderState.changed,
      "status": statusStr,
      "detailedMessage": orderState.detailedMessage,
    ]
    if let orderDict = orderDict {
      stateDict["order"] = orderDict
    }

    var body: [String: Any] = [
      "sessionId": sessionId,
      "updatedOrderState": stateDict,
    ]
    if let orderDict = orderDict {
      body["order"] = orderDict
    }
    emitEvent("orderUpdate", body: body)
  }

  private func emitStreamError(_ error: Error, sessionId: String?) {
    let code: String
    if let clientError = error as? FoodOrderingClient.Error {
      switch clientError {
      case .microphonePermissionNotGranted:
        code = "MICROPHONE_PERMISSION_NOT_GRANTED"
      case .invalidSessionConfiguration:
        code = "INVALID_SESSION_CONFIGURATION"
      case .cannotRefreshAuthToken:
        code = "AUTH_TOKEN_REFRESH_FAILURE"
      case .sessionAlreadyStarted:
        code = "SESSION_ALREADY_STARTED"
      case .appInBackground:
        code = "APP_IN_BACKGROUND"
      case .streamClosed:
        code = "STREAM_CLOSED"
      @unknown default:
        code = "UNKNOWN_ERROR"
      }
    } else {
      code = "STREAM_CLOSED"
    }

    var body: [String: Any] = [
      "code": code,
      "message": error.localizedDescription,
    ]
    if let sessionId = sessionId {
      body["sessionId"] = sessionId
    }
    emitEvent("error", body: body)
  }

  private func emitEvent(_ name: String, body: [String: Any]) {
    eventEmitterCallback?(name as NSString, body as NSDictionary)
  }

  private func mapSessionEndType(_ type: OrderResponse.SessionEndedType) -> String {
    switch type {
    case .unspecified:
      return "END_TYPE_UNSPECIFIED"
    case .driveOff:
      return "DRIVE_OFF"
    case .agentEscalation:
      return "AGENT_ESCALATION"
    case .crewInterjection:
      return "CREW_INTERJECTION"
    case .orderCompleted:
      return "ORDER_COMPLETED"
    case .paymentFlowSuccess:
      return "PAYMENT_FLOW_SUCCESS"
    case .paymentFlowFailure:
      return "PAYMENT_FLOW_FAILURE"
    case .clientEscalation:
      return "CLIENT_ESCALATION"
    case .callerHangup:
      return "CALLER_HANGUP"
    case .requestedCheckout:
      return "REQUESTED_CHECKOUT"
    case .requestedOrderStatus:
      return "REQUESTED_ORDER_STATUS"
    case .storeClosed:
      return "STORE_CLOSED"
    @unknown default:
      return "END_TYPE_UNSPECIFIED"
    }
  }

  private func storeCachedToken(token: String, expiryISO8601: String?) {
    let expiryDate = expiryISO8601.flatMap { ISO8601DateFormatter().date(from: $0) }
    requestLock.lock()
    cachedToken = token
    cachedTokenExpiry = expiryDate
    requestLock.unlock()
  }

  private func getFallbackCachedAuthToken() -> FoodOrderingClientAuthToken? {
    requestLock.lock()
    defer { requestLock.unlock() }
    guard let token = cachedToken, !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      return nil
    }
    return FoodOrderingClientAuthToken(token: token, expirationDate: cachedTokenExpiry)
  }

  private func encodeToDictionary<T: Encodable>(_ value: T) -> [String: Any]? {
    guard
      let data = try? JSONEncoder().encode(value),
      let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return nil
    }
    return dict
  }

  private func decodeModel<T: Decodable>(_ type: T.Type, from dict: NSDictionary) -> T? {
    guard
      let data = try? JSONSerialization.data(withJSONObject: dict),
      let decoded = try? JSONDecoder().decode(T.self, from: data)
    else {
      return nil
    }
    return decoded
  }
}
