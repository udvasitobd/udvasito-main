/** Notification permission on this device: allowed; not yet asked; refused for good (Android settings only); none. */
export type PermissionState = 'granted' | 'ask' | 'blocked' | 'unavailable';

/** Android channel names in the app language (specs §6.8 "Channel names"). */
export type ChannelNames = { bloodRequests: string; updates: string };
