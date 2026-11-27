/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_alertText from "../_lib/alertText.js";
import type * as _lib_audit from "../_lib/audit.js";
import type * as _lib_auth from "../_lib/auth.js";
import type * as _lib_copy from "../_lib/copy.js";
import type * as _lib_donors from "../_lib/donors.js";
import type * as _lib_environment from "../_lib/environment.js";
import type * as _lib_errors from "../_lib/errors.js";
import type * as _lib_events from "../_lib/events.js";
import type * as _lib_network from "../_lib/network.js";
import type * as _lib_places from "../_lib/places.js";
import type * as _lib_push from "../_lib/push.js";
import type * as _lib_random from "../_lib/random.js";
import type * as _lib_rateLimits from "../_lib/rateLimits.js";
import type * as _lib_requestPlace from "../_lib/requestPlace.js";
import type * as _lib_settings from "../_lib/settings.js";
import type * as _lib_telegram from "../_lib/telegram.js";
import type * as _lib_verification from "../_lib/verification.js";
import type * as _lib_visibility from "../_lib/visibility.js";
import type * as admin_bootstrap from "../admin/bootstrap.js";
import type * as admin_ops from "../admin/ops.js";
import type * as admin_seed from "../admin/seed.js";
import type * as admin_seedStaging from "../admin/seedStaging.js";
import type * as auth from "../auth.js";
import type * as consents from "../consents.js";
import type * as donors from "../donors.js";
import type * as hospitals from "../hospitals.js";
import type * as http from "../http.js";
import type * as matching from "../matching.js";
import type * as notifications from "../notifications.js";
import type * as phoneVerification from "../phoneVerification.js";
import type * as places from "../places.js";
import type * as profiles from "../profiles.js";
import type * as public_ from "../public.js";
import type * as push from "../push.js";
import type * as requests from "../requests.js";
import type * as responses from "../responses.js";
import type * as rules_compatibility from "../rules/compatibility.js";
import type * as rules_donor from "../rules/donor.js";
import type * as rules_eligibility from "../rules/eligibility.js";
import type * as rules_environment from "../rules/environment.js";
import type * as rules_hospitals from "../rules/hospitals.js";
import type * as rules_limits from "../rules/limits.js";
import type * as rules_places from "../rules/places.js";
import type * as rules_ranking from "../rules/ranking.js";
import type * as rules_request from "../rules/request.js";
import type * as rules_responses from "../rules/responses.js";
import type * as rules_settings from "../rules/settings.js";
import type * as rules_time from "../rules/time.js";
import type * as rules_validation from "../rules/validation.js";
import type * as rules_verification from "../rules/verification.js";
import type * as rules_waves from "../rules/waves.js";
import type * as support from "../support.js";
import type * as supportInternal from "../supportInternal.js";
import type * as telegram from "../telegram.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/alertText": typeof _lib_alertText;
  "_lib/audit": typeof _lib_audit;
  "_lib/auth": typeof _lib_auth;
  "_lib/copy": typeof _lib_copy;
  "_lib/donors": typeof _lib_donors;
  "_lib/environment": typeof _lib_environment;
  "_lib/errors": typeof _lib_errors;
  "_lib/events": typeof _lib_events;
  "_lib/network": typeof _lib_network;
  "_lib/places": typeof _lib_places;
  "_lib/push": typeof _lib_push;
  "_lib/random": typeof _lib_random;
  "_lib/rateLimits": typeof _lib_rateLimits;
  "_lib/requestPlace": typeof _lib_requestPlace;
  "_lib/settings": typeof _lib_settings;
  "_lib/telegram": typeof _lib_telegram;
  "_lib/verification": typeof _lib_verification;
  "_lib/visibility": typeof _lib_visibility;
  "admin/bootstrap": typeof admin_bootstrap;
  "admin/ops": typeof admin_ops;
  "admin/seed": typeof admin_seed;
  "admin/seedStaging": typeof admin_seedStaging;
  auth: typeof auth;
  consents: typeof consents;
  donors: typeof donors;
  hospitals: typeof hospitals;
  http: typeof http;
  matching: typeof matching;
  notifications: typeof notifications;
  phoneVerification: typeof phoneVerification;
  places: typeof places;
  profiles: typeof profiles;
  public: typeof public_;
  push: typeof push;
  requests: typeof requests;
  responses: typeof responses;
  "rules/compatibility": typeof rules_compatibility;
  "rules/donor": typeof rules_donor;
  "rules/eligibility": typeof rules_eligibility;
  "rules/environment": typeof rules_environment;
  "rules/hospitals": typeof rules_hospitals;
  "rules/limits": typeof rules_limits;
  "rules/places": typeof rules_places;
  "rules/ranking": typeof rules_ranking;
  "rules/request": typeof rules_request;
  "rules/responses": typeof rules_responses;
  "rules/settings": typeof rules_settings;
  "rules/time": typeof rules_time;
  "rules/validation": typeof rules_validation;
  "rules/verification": typeof rules_verification;
  "rules/waves": typeof rules_waves;
  support: typeof support;
  supportInternal: typeof supportInternal;
  telegram: typeof telegram;
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
