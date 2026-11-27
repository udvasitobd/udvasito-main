/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_audit from "../_lib/audit.js";
import type * as _lib_auth from "../_lib/auth.js";
import type * as _lib_errors from "../_lib/errors.js";
import type * as _lib_events from "../_lib/events.js";
import type * as _lib_rateLimits from "../_lib/rateLimits.js";
import type * as _lib_settings from "../_lib/settings.js";
import type * as _lib_visibility from "../_lib/visibility.js";
import type * as admin_bootstrap from "../admin/bootstrap.js";
import type * as admin_ops from "../admin/ops.js";
import type * as admin_seed from "../admin/seed.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as profiles from "../profiles.js";
import type * as public_ from "../public.js";
import type * as rules_hospitals from "../rules/hospitals.js";
import type * as rules_places from "../rules/places.js";
import type * as rules_settings from "../rules/settings.js";
import type * as rules_validation from "../rules/validation.js";
import type * as support from "../support.js";
import type * as supportInternal from "../supportInternal.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/audit": typeof _lib_audit;
  "_lib/auth": typeof _lib_auth;
  "_lib/errors": typeof _lib_errors;
  "_lib/events": typeof _lib_events;
  "_lib/rateLimits": typeof _lib_rateLimits;
  "_lib/settings": typeof _lib_settings;
  "_lib/visibility": typeof _lib_visibility;
  "admin/bootstrap": typeof admin_bootstrap;
  "admin/ops": typeof admin_ops;
  "admin/seed": typeof admin_seed;
  auth: typeof auth;
  http: typeof http;
  profiles: typeof profiles;
  public: typeof public_;
  "rules/hospitals": typeof rules_hospitals;
  "rules/places": typeof rules_places;
  "rules/settings": typeof rules_settings;
  "rules/validation": typeof rules_validation;
  support: typeof support;
  supportInternal: typeof supportInternal;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  pushNotifications: import("@convex-dev/expo-push-notifications/_generated/component.js").ComponentApi<"pushNotifications">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
