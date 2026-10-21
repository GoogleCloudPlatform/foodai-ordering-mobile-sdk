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

#import "FoodOrderingModule.h"

#if __has_include(<FoodaiOrderingReactNative/FoodaiOrderingReactNative-Swift.h>)
#import <FoodaiOrderingReactNative/FoodaiOrderingReactNative-Swift.h>
#else
#import "FoodaiOrderingReactNative-Swift.h"
#endif

@implementation FoodOrderingModule {
  FoodOrderingSwiftImpl *_swiftImpl;
}

RCT_EXPORT_MODULE(FoodOrderingModule)

- (instancetype)init {
  if (self = [super init]) {
    _swiftImpl = [[FoodOrderingSwiftImpl alloc] init];
    __weak __typeof(self) weakSelf = self;
    _swiftImpl.eventEmitterCallback = ^(NSString *eventName, NSDictionary *body) {
      [weakSelf dispatchEventWithName:eventName body:body];
    };
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)dispatchEventWithName:(NSString *)eventName body:(NSDictionary *)body {
  if ([eventName isEqualToString:@"sessionStarted"]) {
    [self emitOnSessionStarted:body];
  } else if ([eventName isEqualToString:@"orderUpdate"]) {
    [self emitOnOrderUpdate:body];
  } else if ([eventName isEqualToString:@"sessionEnded"]) {
    [self emitOnSessionEnded:body];
  } else if ([eventName isEqualToString:@"turnCompleted"]) {
    [self emitOnTurnCompleted:body];
  } else if ([eventName isEqualToString:@"error"]) {
    [self emitOnError:body];
  } else if ([eventName isEqualToString:@"speechRecognition"]) {
    [self emitOnSpeechRecognition:body];
  } else if ([eventName isEqualToString:@"agentText"]) {
    [self emitOnAgentText:body];
  } else if ([eventName isEqualToString:@"suggestedOptions"]) {
    [self emitOnSuggestedOptions:body];
  } else if ([eventName isEqualToString:@"recommendedOrders"]) {
    [self emitOnRecommendedOrders:body];
  } else if ([eventName isEqualToString:@"agentEvent"]) {
    [self emitOnAgentEvent:body];
  } else if ([eventName isEqualToString:@"interruptionSignal"]) {
    [self emitOnInterruptionSignal:body];
  } else if ([eventName isEqualToString:@"sessionLifecycle"]) {
    [self emitOnSessionLifecycle:body];
  } else if ([eventName isEqualToString:@"audioLevel"]) {
    [self emitOnAudioLevel:body];
  } else if ([eventName isEqualToString:@"onAuthTokenRequested"]) {
    [self emitOnAuthTokenRequested:body];
  } else if ([eventName isEqualToString:@"onFinalizeOrderRequested"]) {
    [self emitOnFinalizeOrderRequested:body];
  } else if ([eventName isEqualToString:@"onSubmitOrderRequested"]) {
    [self emitOnSubmitOrderRequested:body];
  } else if ([eventName isEqualToString:@"onOrderPricesRequested"]) {
    [self emitOnOrderPricesRequested:body];
  } else if ([eventName isEqualToString:@"onOrderStatusRequested"]) {
    [self emitOnOrderStatusRequested:body];
  }
}

#pragma mark - NativeFoodOrderingSpec

- (void)initialize:(NSDictionary *)config
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl initialize:config resolver:resolve rejecter:reject];
}

- (void)setAuthToken:(NSString *)token
              expiry:(NSString * _Nullable)expiry
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl setAuthToken:token expiry:expiry resolver:resolve rejecter:reject];
}

- (void)respondToAuthTokenRequest:(NSString *)requestId
                         response:(NSDictionary *)response {
  [_swiftImpl respondToAuthTokenRequest:requestId response:response];
}

- (void)respondToFinalizeOrder:(NSString *)requestId
                      response:(NSDictionary *)response {
  [_swiftImpl respondToFinalizeOrder:requestId response:response];
}

- (void)respondToSubmitOrder:(NSString *)requestId
                    response:(NSDictionary *)response {
  [_swiftImpl respondToSubmitOrder:requestId response:response];
}

- (void)respondToOrderPrices:(NSString *)requestId
                    response:(NSDictionary *)response {
  [_swiftImpl respondToOrderPrices:requestId response:response];
}

- (void)respondToOrderStatus:(NSString *)requestId
                    response:(NSDictionary *)response {
  [_swiftImpl respondToOrderStatus:requestId response:response];
}

- (void)rejectDelegateRequest:(NSString *)requestId
                 errorMessage:(NSString *)errorMessage {
  [_swiftImpl rejectDelegateRequest:requestId errorMessage:errorMessage];
}

- (void)requestMicrophonePermission:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl requestMicrophonePermission:resolve rejecter:reject];
}

- (void)startSession:(NSDictionary *)config
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl startSession:config resolver:resolve rejecter:reject];
}

- (void)sendText:(NSString *)text
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl sendText:text resolver:resolve rejecter:reject];
}

- (void)updateOrderState:(NSDictionary *)order
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl updateOrderState:order resolver:resolve rejecter:reject];
}

- (void)sendCustomizedInput:(NSDictionary *)parameters
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl sendCustomizedInput:parameters resolver:resolve rejecter:reject];
}

- (void)pauseMicrophone:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl pauseMicrophone:resolve rejecter:reject];
}

- (void)resumeMicrophone:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl resumeMicrophone:resolve rejecter:reject];
}

- (void)endSession:(BOOL)waitUntilComplete
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl endSession:waitUntilComplete resolver:resolve rejecter:reject];
}

- (void)release:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject {
  [_swiftImpl releaseClient:resolve rejecter:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFoodOrderingSpecJSI>(params);
}

@end
