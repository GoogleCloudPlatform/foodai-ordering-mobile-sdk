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

import { DEMO_APP_CONFIG, type DemoAppConfig } from './config.example';

declare const require: (moduleId: string) => {
  readonly AUTH_TOKEN_URL?: string;
  readonly DEMO_APP_CONFIG?: DemoAppConfig;
};

/**
 * Loads `src/config.ts` if the developer has created a local override, falling
 * back to the committed placeholder config in `src/config.example.ts`.
 */
export function loadDemoAppConfig(): DemoAppConfig {
  try {
    const localModule = require('./config');
    if (localModule.DEMO_APP_CONFIG != null) {
      return {
        ...localModule.DEMO_APP_CONFIG,
        authTokenUrl:
          localModule.DEMO_APP_CONFIG.authTokenUrl ?? localModule.AUTH_TOKEN_URL,
      };
    }
  } catch {
    // `src/config.ts` is optional and gitignored; fall back to `src/config.example.ts`.
  }
  return DEMO_APP_CONFIG;
}
