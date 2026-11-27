import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const bloodGroup = v.union(v.literal("A+"), v.literal("A-"), v.literal("B+"), v.literal("B-"),
  v.literal("AB+"), v.literal("AB-"), v.literal("O+"), v.literal("O-"));
export const requestGroup = v.union(bloodGroup, v.literal("any"), v.literal("not_sure"));
export const component = v.union(v.literal("whole_blood"), v.literal("platelets"));
export const lang = v.union(v.literal("en"), v.literal("bn"));
export const role = v.union(v.literal("member"), v.literal("volunteer"), v.literal("admin"), v.literal("superadmin"));
export const callMode = v.union(v.literal("mutual"), v.literal("donor_calls"));

export default defineSchema({
  // ── People ───────────────────────────────────────────────
  profiles: defineTable({
    authUserId: v.string(),                       // Better Auth user id (component tables hold email/Google data)
    name: v.string(),                             // VAL-01
    firstName: v.string(),                        // first word of name — the only name shown to other members
    dateOfBirth: v.string(),                      // "YYYY-MM-DD" (VAL-02); admins see age only
    language: lang,
    role,
    phone: v.string(),                            // "+8801XXXXXXXXX" — read only via visibility.ts
    phoneVerified: v.boolean(),
    phoneVerifiedAt: v.optional(v.number()),
    phoneVerifiedVia: v.optional(v.union(v.literal("telegram"), v.literal("whatsapp"), v.literal("in_person"))),
    phoneVerifiedBy: v.optional(v.id("profiles")),  // verifier for in_person (D-R1)
    practiceId: v.optional(v.string()),           // "P-07" — practice accounts only (D-R4)
    status: v.union(v.literal("active"), v.literal("frozen"), v.literal("suspended"), v.literal("banned"),
      v.literal("deletion_pending"), v.literal("underage_blocked")),
    statusReason: v.optional(v.string()),
    statusUntil: v.optional(v.number()),          // suspension end
    deletionRequestedAt: v.optional(v.number()),
    consentVersion: v.string(),                   // latest accepted terms/privacy version
    lastActiveAt: v.number(),
    campaignCode: v.optional(v.string()),         // V07 campus drive attribution
    isDemo: v.boolean(),
  }).index("by_authUserId", ["authUserId"])
    .index("by_phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["isDemo", "role"] }),

  donorProfiles: defineTable({
    profileId: v.id("profiles"),
    bloodGroup: v.union(bloodGroup, v.literal("unknown")),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("unspecified")),
    divisionId: v.id("places"), districtId: v.id("places"), upazilaId: v.id("places"),
    areaText: v.optional(v.string()),             // VAL-23
    institution: v.optional(v.string()),          // VAL-22
    travelRange: v.union(v.literal("thana"), v.literal("district")),
    neverDonated: v.boolean(),
    lastDonationDate: v.optional(v.string()),     // "YYYY-MM-DD"
    lastDonationType: v.optional(component),
    plateletOptIn: v.boolean(),
    availability: v.union(v.literal("available"), v.literal("paused"), v.literal("unavailable")),
    pausedUntil: v.optional(v.number()),
    availabilityConfirmedAt: v.number(),          // for the 90-day freshness metric
    eligibleFrom: v.number(),                     // computed by rules/eligibility.ts on every change
    eligibleFromPlatelets: v.number(),
    callMode,                                     // D16 default per donor
    volunteersMayCall: v.boolean(),               // V10 opt-in
    verifiedRequestsOnly: v.boolean(),
    alertCapPerDay: v.number(),                   // default S-20
    quietStart: v.string(), quietEnd: v.string(), // "HH:mm"
    urgentOverride: v.boolean(),
    hidden: v.boolean(),
    live: v.boolean(),                            // derived: verified phone && consent && group known && !hidden && status active
    selfCheckAt: v.number(),                      // checklist confirmed
    healthConsentVersion: v.string(),
    noShowAt: v.array(v.number()),                // timestamps (last 90 days kept)
    isDemo: v.boolean(),
  }).index("by_profile", ["profileId"])
    .index("by_match", ["isDemo", "live", "bloodGroup", "districtId"])
    .index("by_upazila", ["isDemo", "live", "upazilaId"]),

  volunteerProfiles: defineTable({
    profileId: v.id("profiles"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("revoked")),
    upazilaIds: v.array(v.id("places")),
    districtIds: v.array(v.id("places")),         // "whole district" shortcut
    institution: v.optional(v.string()),
    motivation: v.string(),
    numberDisplayConsentAt: v.number(),
    onDuty: v.boolean(),
    onDutySince: v.optional(v.number()),
    lastShownAt: v.optional(v.number()),          // least-busy rotation (V09)
    activeClaims: v.number(),
    reviewedBy: v.optional(v.id("profiles")), reviewedAt: v.optional(v.number()), reviewReason: v.optional(v.string()),
    isDemo: v.boolean(),
  }).index("by_profile", ["profileId"])
    .index("by_status", ["status"])
    .index("by_duty", ["isDemo", "status", "onDuty"]),

  consents: defineTable({
    profileId: v.id("profiles"),
    kind: v.union(v.literal("terms_privacy"), v.literal("donor_health_contact"), v.literal("volunteer_number_display")),
    version: v.string(), lang, acceptedAt: v.number(),
  }).index("by_profile_kind", ["profileId", "kind"]),

  phoneVerifications: defineTable({
    profileId: v.id("profiles"),
    method: v.union(v.literal("telegram"), v.literal("whatsapp"), v.literal("in_person")),
    token: v.string(),                            // 32-char random, Telegram deep-link payload
    code: v.optional(v.string()),                 // 6-char code for WhatsApp text or in-person check (VAL-26)
    verifierId: v.optional(v.id("profiles")),     // in_person only
    expiresAt: v.number(),                        // +10 min
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("mismatch"), v.literal("expired")),
    verifiedPhone: v.optional(v.string()),
    externalUserId: v.optional(v.string()),       // Telegram user id / WhatsApp wa_id
  }).index("by_token", ["token"]).index("by_code", ["code"]).index("by_profile", ["profileId"])
    .index("by_external", ["externalUserId"]),   // Telegram contact → the chat's open row

  blocks: defineTable({ blockerId: v.id("profiles"), blockedId: v.id("profiles") })
    .index("by_blocker", ["blockerId"]).index("by_pair", ["blockerId", "blockedId"]),

  // ── Reference data ───────────────────────────────────────
  places: defineTable({
    level: v.union(v.literal("division"), v.literal("district"), v.literal("upazila")),
    code: v.string(), nameEn: v.string(), nameBn: v.string(),
    parentId: v.optional(v.id("places")),
    lat: v.number(), lng: v.number(),
    isMetroThana: v.boolean(),
    neighbourIds: v.array(v.id("places")),        // upazilas within S-32 km (pre-computed at seed)
  }).index("by_level_parent", ["level", "parentId"]).index("by_code", ["code"]),

  hospitals: defineTable({
    nameEn: v.string(), nameBn: v.string(),
    aliases: v.array(v.string()),                 // short names people actually type: "CMCH", "চমেক", "Chittagong Medical", "Medical"
    searchText: v.string(),                       // lower-cased nameEn + nameBn + aliases, written by the seed/import script and admin edits
    type: v.union(v.literal("hospital"), v.literal("blood_bank"), v.literal("clinic")),
    divisionId: v.id("places"), districtId: v.id("places"), upazilaId: v.id("places"),
    address: v.optional(v.string()),
    bloodBankPhone: v.optional(v.string()),       // public institutional number
    lat: v.number(), lng: v.number(),
    active: v.boolean(), isDemo: v.boolean(),
  }).index("by_district", ["isDemo", "active", "districtId"])
    .searchIndex("search_all", { searchField: "searchText", filterFields: ["isDemo", "active", "districtId"] }),

  // ── Requests and responses ───────────────────────────────
  requests: defineTable({
    requesterId: v.id("profiles"),
    createdByVolunteerId: v.optional(v.id("profiles")),
    source: v.union(v.literal("form"), v.literal("voice"), v.literal("text"), v.literal("paste"), v.literal("volunteer_paste")),
    clientId: v.string(),                         // idempotency key from the device (uuid v4)
    bloodGroup: requestGroup,
    component, isDengue: v.boolean(),
    unitsNeeded: v.number(), unitsConfirmed: v.number(),
    hospitalId: v.optional(v.id("hospitals")),
    placeText: v.optional(v.string()),
    divisionId: v.id("places"), districtId: v.id("places"), upazilaId: v.id("places"),
    approxLat: v.number(), approxLng: v.number(), // hospital point or pin rounded to 3 decimals
    neededBy: v.number(),
    urgency: v.union(v.literal("now"), v.literal("today"), v.literal("later")),
    patientName: v.optional(v.string()), ward: v.optional(v.string()), note: v.optional(v.string()),
    contactPhone: v.string(),                     // read only via visibility.ts
    contactPhoneVerified: v.boolean(),
    lang,
    publicSlug: v.string(),                       // 10-char random, for /r/<slug>
    status: v.union(v.literal("live"), v.literal("covered"), v.literal("closed")),
    closeReason: v.optional(v.union(v.literal("fulfilled"), v.literal("not_needed"), v.literal("expired"), v.literal("removed"), v.literal("merged"))),
    closedAt: v.optional(v.number()),
    wave: v.number(),                             // 0 before first wave
    nextWaveAt: v.optional(v.number()),
    volunteerShownIds: v.array(v.id("volunteerProfiles")),
    volunteerShownAt: v.optional(v.number()),
    fallbackShown: v.boolean(),
    claimedByVolunteerId: v.optional(v.id("volunteerProfiles")),
    escalatedAt: v.optional(v.number()),
    zeroEligibleAtPublish: v.boolean(),
    verifiedBadge: v.boolean(),
    slipStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    slipFileId: v.optional(v.id("_storage")),
    slipReviewedBy: v.optional(v.id("profiles")), slipReviewReason: v.optional(v.string()),
    mergedIntoId: v.optional(v.id("requests")),
    revealsFrozen: v.boolean(),
    hiddenByModerator: v.boolean(),
    aiAssisted: v.boolean(),
    personalDataPurgedAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_clientId", ["clientId"])
    .index("by_requester_status", ["requesterId", "status"])
    .index("by_status_district", ["isDemo", "status", "districtId"])
    .index("by_status_neededBy", ["status", "neededBy"])
    .index("by_publicSlug", ["publicSlug"])
    .index("by_dup", ["isDemo", "status", "bloodGroup", "hospitalId"])
    .index("by_closedAt", ["closedAt"]),

  responses: defineTable({
    requestId: v.id("requests"),
    donorProfileId: v.id("donorProfiles"),
    donorId: v.id("profiles"),
    wave: v.number(),                             // 0 = asked by a volunteer
    viaVolunteerId: v.optional(v.id("profiles")),
    state: v.union(v.literal("notified"), v.literal("opened"), v.literal("accepted"), v.literal("confirmed"),
      v.literal("standby"), v.literal("declined"), v.literal("withdrew"), v.literal("not_responding")),
    notifiedAt: v.number(), openedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()), confirmedAt: v.optional(v.number()),
    acceptClientId: v.optional(v.string()),
    declineReason: v.optional(v.union(v.literal("busy"), v.literal("far"), v.literal("donated"), v.literal("unwell"), v.literal("other"))),
    callMode,
    stillComingAskedAt: v.optional(v.number()),
    stillComingAnswer: v.optional(v.union(v.literal("yes"), v.literal("cant"))),
    stillComingAnsweredAt: v.optional(v.number()),
    outcomeDonor: v.optional(v.union(v.literal("donated"), v.literal("did_not_donate"), v.literal("not_yet"))),
    outcomeDonorAt: v.optional(v.number()),
    outcomeRequester: v.optional(v.union(v.literal("donated"), v.literal("did_not_donate"), v.literal("not_yet"))),
    outcomeRequesterAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_request_state", ["requestId", "state"])
    .index("by_donor_state", ["donorId", "state"])
    .index("by_request_donor", ["requestId", "donorProfileId"]),

  contactReveals: defineTable({
    requestId: v.id("requests"),
    viewerId: v.id("profiles"), subjectId: v.id("profiles"),
    subjectRole: v.union(v.literal("donor"), v.literal("requester"), v.literal("volunteer")),
    reason: v.union(v.literal("confirmed_slot"), v.literal("volunteer_hotline"), v.literal("volunteer_optin_call"),
      v.literal("admin_reveal"), v.literal("volunteer_case")),
    reasonText: v.optional(v.string()),           // required for admin_reveal / volunteer_optin_call
    expiresAt: v.number(),
    isDemo: v.boolean(),
  }).index("by_viewer_request", ["viewerId", "requestId"])
    .index("by_subject", ["subjectId"])
    .index("by_request", ["requestId"]),

  // ── Notifications ────────────────────────────────────────
  notifications: defineTable({
    recipientId: v.id("profiles"),
    template: v.string(),                         // NTF-xx
    requestId: v.optional(v.id("requests")),
    channel: v.union(v.literal("expo"), v.literal("webpush"), v.literal("email"), v.literal("inapp")),
    status: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    failure: v.optional(v.string()),
    openedAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_recipient", ["recipientId"])
    .index("by_request", ["requestId"]),

  webPushSubscriptions: defineTable({
    profileId: v.id("profiles"), endpoint: v.string(), p256dh: v.string(), auth: v.string(),
    userAgent: v.optional(v.string()), lastSuccessAt: v.optional(v.number()), failures: v.number(),
  }).index("by_profile", ["profileId"]).index("by_endpoint", ["endpoint"]),
  // Expo push tokens are stored by the @convex-dev/expo-push-notifications component.

  // ── Trust & safety ───────────────────────────────────────
  reports: defineTable({
    reporterId: v.id("profiles"), subjectId: v.id("profiles"), requestId: v.optional(v.id("requests")),
    reason: v.union(v.literal("fake"), v.literal("money"), v.literal("harassment"), v.literal("other")),
    details: v.optional(v.string()),
    autoAction: v.optional(v.union(v.literal("account_frozen"), v.literal("reveals_frozen"))),
    moderationItemId: v.id("moderationItems"),
    isDemo: v.boolean(),
  }).index("by_subject", ["subjectId"]),

  moderationItems: defineTable({
    type: v.union(v.literal("report"), v.literal("flag")),
    kind: v.union(v.literal("fake"), v.literal("money"), v.literal("harassment"), v.literal("other"),
      v.literal("request_farming"), v.literal("money_mention"), v.literal("reveal_volume"), v.literal("signup_burst")),
    subjectId: v.optional(v.id("profiles")), requestId: v.optional(v.id("requests")),
    severity: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    status: v.union(v.literal("open"), v.literal("decided")),
    decision: v.optional(v.union(v.literal("dismiss"), v.literal("warn"), v.literal("hide_request"),
      v.literal("suspend"), v.literal("ban"), v.literal("restore"))),
    decisionReason: v.optional(v.string()), decidedBy: v.optional(v.id("profiles")), decidedAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_status", ["isDemo", "status"]),

  auditLog: defineTable({
    actorId: v.optional(v.id("profiles")),        // undefined = system
    actorRole: v.string(),
    action: v.string(),                           // see §6.6 audit action list
    targetType: v.string(), targetId: v.string(),
    reason: v.optional(v.string()),
    meta: v.optional(v.any()),                    // never phone numbers or free text from users
  }).index("by_actor", ["actorId"]).index("by_action", ["action"]),

  // ── Configuration & content ──────────────────────────────
  settings: defineTable({ key: v.string(), value: v.any(), updatedBy: v.optional(v.id("profiles")) })
    .index("by_key", ["key"]),

  faqEntries: defineTable({
    questionEn: v.string(), questionBn: v.string(), answerEn: v.string(), answerBn: v.string(),
    tags: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("approved")),
    approvedBy: v.optional(v.id("profiles")), approvedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .searchIndex("search_en", { searchField: "questionEn", filterFields: ["status"] })
    .searchIndex("search_bn", { searchField: "questionBn", filterFields: ["status"] }),

  campaigns: defineTable({ code: v.string(), name: v.string(), institution: v.optional(v.string()), active: v.boolean() })
    .index("by_code", ["code"]),

  invitations: defineTable({                      // A07 import — invited, never matchable until they sign up
    phone: v.string(), name: v.string(), bloodGroup: v.optional(bloodGroup),
    source: v.string(), consentEvidence: v.string(), status: v.union(v.literal("pending"), v.literal("joined")),
  }).index("by_phone", ["phone"]),

  // ── AI, events, stats, files ─────────────────────────────
  aiCalls: defineTable({
    feature: v.union(v.literal("intake"), v.literal("duplicate"), v.literal("assistant"), v.literal("appeal"), v.literal("summary")),
    model: v.string(), ok: v.boolean(), errorKind: v.optional(v.string()),
    inputRedacted: v.string(), output: v.string(), latencyMs: v.number(),
    profileId: v.optional(v.id("profiles")), isDemo: v.boolean(),
  }),                                              // deleted after S-36 days by the retention cron

  aiQuota: defineTable({ day: v.string(), model: v.string(), count: v.number() })   // day in America/Los_Angeles (quota reset)
    .index("by_day_model", ["day", "model"]),

  events: defineTable({
    name: v.string(), requestId: v.optional(v.id("requests")), actorRole: v.optional(v.string()),
    props: v.optional(v.any()), isDemo: v.boolean(),
  }).index("by_name", ["name"]).index("by_request", ["requestId"]),

  dailyRollups: defineTable({ day: v.string(), metric: v.string(), dims: v.optional(v.any()), value: v.number() })
    .index("by_metric_day", ["metric", "day"]),

  statsSnapshots: defineTable({ key: v.union(v.literal("public"), v.literal("admin")), data: v.any(), computedAt: v.number() })
    .index("by_key", ["key"]),

  usageCounters: defineTable({ day: v.string(), service: v.string(), metric: v.string(), value: v.number() })
    .index("by_service_day", ["service", "day"]),

  exports: defineTable({
    kind: v.union(v.literal("my_data"), v.literal("anon_stats"), v.literal("personal_data"), v.literal("daily_backup")),
    requestedBy: v.optional(v.id("profiles")), fileId: v.id("_storage"), expiresAt: v.number(),
  }).index("by_requestedBy", ["requestedBy"]),
});
