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

import type {
  FoodOrderingClientAuthToken,
  FoodOrderingClientConfig,
  OrderingSessionConfig,
} from '@google-cloud/foodai-ordering-react-native';

declare function fetch(
  input: string,
  init?: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: string;
  }
): Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}>;

/**
 * Shape of the sample application's environment configuration.
 *
 * To configure your local environment without committing credentials or project IDs:
 * 1. Copy `src/config.example.ts` to `src/config.ts` (`src/config.ts` is gitignored).
 * 2. Replace all `<YOUR_...>` placeholders in `src/config.ts` with your project values.
 */
export interface DemoAppConfig {
  readonly authTokenUrl?: string;
  readonly clientConfig: Omit<
    FoodOrderingClientConfig,
    'delegate' | 'authTokenProvider'
  >;
  readonly sessionConfig: OrderingSessionConfig;
  readonly fetchAuthToken: () => Promise<FoodOrderingClientAuthToken>;
}

/**
 * TODO(integrator): Replace with your backend's token endpoint (`https://...`).
 * Note: Android 9+ blocks cleartext `http://` traffic by default in release builds
 * unless explicitly permitted by your app's `android:networkSecurityConfig`.
 */
export const AUTH_TOKEN_URL = '<YOUR_AUTH_TOKEN_URL>';

/**
 * Placeholder SDK and session configuration for the sample application.
 *
 * TODO(integrator): Copy this file to `src/config.ts` and replace the `<YOUR_...>`
 * placeholders below before starting a live ordering session.
 */
export const DEMO_APP_CONFIG: DemoAppConfig = {
  authTokenUrl: AUTH_TOKEN_URL,
  clientConfig: {
    // TODO(integrator): Replace with your Google Cloud project ID/name.
    gcpProjectName: '<YOUR_GCP_PROJECT_ID>',
    // TODO(integrator): Replace with your CES/Food AI location (e.g. 'global' or 'us-central1').
    location: '<YOUR_GCP_LOCATION>',
    // TODO(integrator): Replace with your configured Food AI brand ID.
    brand: '<YOUR_BRAND_ID>',
    logLevel: 'info',
  },
  sessionConfig: {
    // TODO(integrator): Replace with a valid store ID for your brand.
    storeId: '<YOUR_STORE_ID>',
    daypartId: 'lunch',
    userInfo: {
      preferredName: 'Alex',
      // Note: General PaymentInfo never carries a CVV field; creditCardCvv is
      // only provided on SubmitOrderPaymentInfo during handleSubmitOrder.
      paymentInfo: {
        paymentMethod: 'PAYMENT_METHOD_CREDIT_CARD',
        creditCardLastFourDigits: '4242',
      },
      loyaltyInfo: {
        loyaltyAmount: {
          units: 250,
        },
      },
    },
    initialOrder: {
      items: [],
      fulfillment: {
        fulfillmentMethod: 'DRIVE_THRU',
      },
    },
    featureGate: {
      updatedOrderStateEnabled: true,
      revampedPaymentFlowEnabled: true,
      menuResponseEnabled: true,
      enableOrderStatusRetrieval: true,
    },
  },
  fetchAuthToken: async (): Promise<FoodOrderingClientAuthToken> => {
    // TODO(integrator): Point this at your merchant backend endpoint that mints a
    // short-lived OAuth2 access token for the Food AI API. Never ship
    // long-lived credentials in the app.
    // Expected JSON response: { "token": "<access_token>", "expiry": "<ISO 8601>" }
    // (expiry is optional).
    const tokenUrl = DEMO_APP_CONFIG.authTokenUrl ?? AUTH_TOKEN_URL;
    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Auth token request failed: HTTP ${response.status}`);
    }
    const body = (await response.json()) as { token?: string; expiry?: string };
    if (!body.token) {
      throw new Error('Auth token response did not include a "token" field.');
    }
    return { token: body.token, expiry: body.expiry };
  },
};

/**
 * Returns `true` if any required `<YOUR_...>` placeholder in `config` has not
 * been replaced yet.
 */
export function hasUnfilledPlaceholders(config: DemoAppConfig): boolean {
  const values = [
    config.clientConfig.gcpProjectName,
    config.clientConfig.location,
    config.clientConfig.brand,
    config.sessionConfig.storeId,
    config.authTokenUrl ?? AUTH_TOKEN_URL,
  ];
  return values.some(
    (value) => value.trim() === '' || value.includes('<YOUR_')
  );
}