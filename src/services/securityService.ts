import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from './offlineStorage';
import { Bakery, SubscriptionPlan, SubscriptionStatus } from '@/types/database';

const DEVICE_SALT_STORAGE_KEY = '@bakeflow_anti_bypass_salt_v1';
const CLOCK_TOLERANCE_MS = 60_000; // Allow at most 60 seconds backward clock skew (NTP jitter)
const TRIAL_MAX_ACTIVE_SECONDS = 48 * 3600; // 172,800 seconds (strict 48-hour limit)

export interface SecurityLedgerRow {
  bakery_id: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_start: string | null;
  subscription_end: string | null;
  max_observed_timestamp: number;
  accumulated_active_seconds: number;
  last_heartbeat_timestamp: number;
  clock_tampered: number;
  ledger_signature: string;
  updated_at: string;
}

export interface SecurityStatusResult {
  isValid: boolean;
  isExpired: boolean;
  isTampered: boolean;
  isPendingApproval: boolean;
  reason?: string;
  plan: SubscriptionPlan | null;
  hoursRemaining?: number;
}

/**
 * Pure TypeScript SHA-256 cryptographic hash function.
 * 100% self-contained, zero native dependencies, safe for OTA updates.
 */
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0, j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let wordsLength = 0;
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << ((3 - (i % 4)) * 8));
  }
  wordsLength = words.length;

  words[wordsLength] = 0x80 << ((3 - (ascii.length % 4)) * 8);
  while ((words.length % 16) !== 14) {
    words.push(0);
  }
  words.push((asciiBitLength / maxWord) | 0);
  words.push(asciiBitLength | 0);

  const w = new Array(64);
  for (let chunk = 0; chunk < words.length; chunk += 16) {
    for (i = 0; i < 16; i++) {
      w[i] = words[chunk + i];
    }
    for (i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = ((w[i - 16] + s0 + w[i - 7] + s1) | 0);
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = ((h + S1 + ch + k[i] + w[i]) | 0);
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = ((S0 + maj) | 0);

      h = g;
      g = f;
      f = e;
      e = ((d + temp1) | 0);
      d = c;
      c = b;
      b = a;
      a = ((temp1 + temp2) | 0);
    }

    hash[0] = ((hash[0] + a) | 0);
    hash[1] = ((hash[1] + b) | 0);
    hash[2] = ((hash[2] + c) | 0);
    hash[3] = ((hash[3] + d) | 0);
    hash[4] = ((hash[4] + e) | 0);
    hash[5] = ((hash[5] + f) | 0);
    hash[6] = ((hash[6] + g) | 0);
    hash[7] = ((hash[7] + h) | 0);
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += ('0' + byte.toString(16)).slice(-2);
    }
  }
  return result;
}

let cachedDeviceSalt: string | null = null;

/**
 * Retrieve or generate a persistent device secret salt.
 * Used to sign the local security ledger to prevent offline DB file tampering.
 */
async function getDeviceSalt(): Promise<string> {
  if (cachedDeviceSalt) return cachedDeviceSalt;

  try {
    const existing = await AsyncStorage.getItem(DEVICE_SALT_STORAGE_KEY);
    if (existing && existing.length >= 16) {
      cachedDeviceSalt = existing;
      return existing;
    }
  } catch {}

  const newSalt = `${Date.now()}_${Math.random().toString(36).substring(2)}_${Math.random().toString(36).substring(2)}`;
  try {
    await AsyncStorage.setItem(DEVICE_SALT_STORAGE_KEY, newSalt);
  } catch {}

  cachedDeviceSalt = newSalt;
  return newSalt;
}

/**
 * Compute tamper-evident signature for ledger row.
 */
function computeLedgerSignature(
  bakeryId: string,
  plan: string,
  status: string,
  expiry: string | null,
  maxTimestamp: number,
  activeSeconds: number,
  clockTampered: number,
  salt: string
): string {
  const payload = `${bakeryId}:${plan}:${status}:${expiry ?? 'null'}:${maxTimestamp}:${activeSeconds}:${clockTampered}:${salt}`;
  return sha256(payload);
}

/**
 * Ensure `local_security_ledger` table exists in SQLite.
 */
export async function initSecurityLedger(): Promise<void> {
  const db = getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS local_security_ledger (
      bakery_id TEXT PRIMARY KEY NOT NULL,
      subscription_plan TEXT NOT NULL,
      subscription_status TEXT NOT NULL,
      subscription_start TEXT,
      subscription_end TEXT,
      max_observed_timestamp INTEGER NOT NULL,
      accumulated_active_seconds INTEGER NOT NULL DEFAULT 0,
      last_heartbeat_timestamp INTEGER NOT NULL,
      clock_tampered INTEGER NOT NULL DEFAULT 0,
      ledger_signature TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Synchronize local security ledger with verified server data from Supabase.
 * Re-anchors monotonic time, resets clock tamper flag upon legitimate cloud verification,
 * and seals the row with the cryptographic signature.
 */
export async function syncSecurityLedgerWithServer(bakery: Bakery): Promise<void> {
  if (!bakery.id || !bakery.subscription_plan) return;

  const db = getDatabase();
  const salt = await getDeviceSalt();
  const now = Date.now();

  const existing = await db.getFirstAsync<SecurityLedgerRow>(
    'SELECT * FROM local_security_ledger WHERE bakery_id = ?',
    [bakery.id]
  );

  const prevMaxTime = existing?.max_observed_timestamp ?? 0;
  const prevActiveSecs = existing?.accumulated_active_seconds ?? 0;

  const maxTimestamp = Math.max(prevMaxTime, now);
  const activeSeconds = prevActiveSecs;
  const clockTampered = 0; // Cleared by authoritative cloud verification

  const status = bakery.subscription_status ?? 'none';
  const plan = bakery.subscription_plan;
  const expiry = bakery.subscription_end ?? null;
  const start = bakery.subscription_start ?? null;

  const signature = computeLedgerSignature(
    bakery.id,
    plan,
    status,
    expiry,
    maxTimestamp,
    activeSeconds,
    clockTampered,
    salt
  );

  const nowIso = new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO local_security_ledger (
      bakery_id, subscription_plan, subscription_status, subscription_start, subscription_end,
      max_observed_timestamp, accumulated_active_seconds, last_heartbeat_timestamp,
      clock_tampered, ledger_signature, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bakery.id,
      plan,
      status,
      start,
      expiry,
      maxTimestamp,
      activeSeconds,
      now,
      clockTampered,
      signature,
      nowIso,
    ]
  );
}

/**
 * Record a security heartbeat tick (called every 15-30s and before checkout).
 * Detects system clock rollback, accumulates monotonic active POS runtime,
 * and enforces strict 48-hour trial expiration.
 */
export async function recordSecurityHeartbeat(bakery: Bakery | null): Promise<SecurityStatusResult> {
  if (!bakery?.id) {
    return {
      isValid: false,
      isExpired: false,
      isTampered: false,
      isPendingApproval: false,
      reason: 'No active bakery session.',
      plan: null,
    };
  }

  const db = getDatabase();
  const salt = await getDeviceSalt();
  const now = Date.now();

  let row = await db.getFirstAsync<SecurityLedgerRow>(
    'SELECT * FROM local_security_ledger WHERE bakery_id = ?',
    [bakery.id]
  );

  // If no row exists yet, initialize from bakery object
  if (!row) {
    await syncSecurityLedgerWithServer(bakery);
    row = await db.getFirstAsync<SecurityLedgerRow>(
      'SELECT * FROM local_security_ledger WHERE bakery_id = ?',
      [bakery.id]
    );
    if (!row) {
      return {
        isValid: false,
        isExpired: false,
        isTampered: false,
        isPendingApproval: false,
        reason: 'Unable to initialize security ledger.',
        plan: null,
      };
    }
  }

  // 1. Verify cryptographic signature against direct DB tampering
  const expectedSig = computeLedgerSignature(
    row.bakery_id,
    row.subscription_plan,
    row.subscription_status,
    row.subscription_end,
    row.max_observed_timestamp,
    row.accumulated_active_seconds,
    row.clock_tampered,
    salt
  );

  let isTampered = row.clock_tampered === 1 || row.ledger_signature !== expectedSig;

  // 2. Anti-Clock Rollback Check:
  // If current device time is behind our monotonic high-water mark by more than CLOCK_TOLERANCE_MS,
  // clock has been set backward (e.g. user trying to prolong 48-hour trial).
  if (row.max_observed_timestamp > 0 && now < row.max_observed_timestamp - CLOCK_TOLERANCE_MS) {
    isTampered = true;
  }

  // 3. Monotonic High-Water Mark Update:
  // Timestamp only advances forward. Never goes backward.
  const newMaxTime = Math.max(row.max_observed_timestamp, now);

  // 4. Elapsed Active POS Time Metering:
  // Increment active seconds based on time elapsed since last heartbeat (capped at 60s max per tick)
  const elapsedSeconds = Math.min(
    60,
    Math.max(0, Math.floor((now - row.last_heartbeat_timestamp) / 1000))
  );
  const newActiveSecs = row.accumulated_active_seconds + elapsedSeconds;

  // 5. Expiration Enforcement:
  let newStatus: SubscriptionStatus = row.subscription_status;
  const expiryTime = row.subscription_end ? new Date(row.subscription_end).getTime() : 0;

  if (row.subscription_plan === 'trial') {
    // 48-hour trial rule:
    // Expires if monotonic clock reaches expiry time OR active usage reaches 172,800 seconds
    const reachedWallClockExpiry = expiryTime > 0 && newMaxTime >= expiryTime;
    const reachedActiveQuota = newActiveSecs >= TRIAL_MAX_ACTIVE_SECONDS;

    if (reachedWallClockExpiry || reachedActiveQuota) {
      newStatus = 'expired';
    }
  } else {
    // Paid plans (8-month and 1-year):
    if (expiryTime > 0 && newMaxTime >= expiryTime) {
      newStatus = 'expired';
    }
  }

  const clockTamperedFlag = isTampered ? 1 : 0;
  const newSignature = computeLedgerSignature(
    row.bakery_id,
    row.subscription_plan,
    newStatus,
    row.subscription_end,
    newMaxTime,
    newActiveSecs,
    clockTamperedFlag,
    salt
  );

  // Update SQLite ledger
  await db.runAsync(
    `UPDATE local_security_ledger SET
      subscription_status = ?,
      max_observed_timestamp = ?,
      accumulated_active_seconds = ?,
      last_heartbeat_timestamp = ?,
      clock_tampered = ?,
      ledger_signature = ?,
      updated_at = ?
    WHERE bakery_id = ?`,
    [
      newStatus,
      newMaxTime,
      newActiveSecs,
      now,
      clockTamperedFlag,
      newSignature,
      new Date().toISOString(),
      bakery.id,
    ]
  );

  const isExpired = newStatus === 'expired';
  const isPendingApproval = newStatus === 'pending_approval';
  const isValid = !isTampered && !isExpired && newStatus === 'active';

  let reason: string | undefined;
  if (isTampered) {
    reason = 'System clock rollback detected. Connect to the internet to re-verify POS time.';
  } else if (isExpired) {
    reason =
      row.subscription_plan === 'trial'
        ? 'Your 48-hour free trial has ended. Please upgrade to continue POS billing.'
        : 'Your subscription has expired. Please renew to continue.';
  } else if (isPendingApproval) {
    reason = 'Subscription is awaiting admin approval.';
  }

  let hoursRemaining: number | undefined;
  if (expiryTime > 0) {
    const diffMs = Math.max(0, expiryTime - newMaxTime);
    hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  }

  return {
    isValid,
    isExpired,
    isTampered,
    isPendingApproval,
    reason,
    plan: row.subscription_plan,
    hoursRemaining,
  };
}

/**
 * Hard guard function: Throws an explicit error if the bakery's subscription is invalid,
 * expired, or tampered. MUST be executed before submitting orders or writing to SQLite order queue.
 */
export async function assertSubscriptionActive(
  bakeryId: string,
  bakery?: Bakery | null
): Promise<void> {
  const db = getDatabase();
  const row = await db.getFirstAsync<SecurityLedgerRow>(
    'SELECT * FROM local_security_ledger WHERE bakery_id = ?',
    [bakeryId]
  );

  if (!row) {
    if (bakery) {
      await syncSecurityLedgerWithServer(bakery);
      return;
    }
    throw new Error('SUBSCRIPTION_REQUIRED: Store subscription verification record not found.');
  }

  const salt = await getDeviceSalt();
  const expectedSig = computeLedgerSignature(
    row.bakery_id,
    row.subscription_plan,
    row.subscription_status,
    row.subscription_end,
    row.max_observed_timestamp,
    row.accumulated_active_seconds,
    row.clock_tampered,
    salt
  );

  const now = Date.now();

  // Check 1: Clock rollback tamper detection
  if (
    row.clock_tampered === 1 ||
    row.ledger_signature !== expectedSig ||
    (row.max_observed_timestamp > 0 && now < row.max_observed_timestamp - CLOCK_TOLERANCE_MS)
  ) {
    throw new Error(
      'SECURITY_ALERT: Device clock tampering detected. Offline billing is locked. Please reconnect to internet to sync time.'
    );
  }

  // Check 2: Expiration check (monotonic wall-clock and active usage)
  const expiryTime = row.subscription_end ? new Date(row.subscription_end).getTime() : 0;
  const currentMaxTime = Math.max(row.max_observed_timestamp, now);

  const hasExceededWallClock = expiryTime > 0 && currentMaxTime >= expiryTime;
  const hasExceededActiveQuota =
    row.subscription_plan === 'trial' &&
    row.accumulated_active_seconds >= TRIAL_MAX_ACTIVE_SECONDS;

  if (row.subscription_status === 'expired' || hasExceededWallClock || hasExceededActiveQuota) {
    throw new Error(
      row.subscription_plan === 'trial'
        ? 'TRIAL_EXPIRED: Your 48-hour free trial has expired. POS checkout is locked until upgraded.'
        : 'SUBSCRIPTION_EXPIRED: Your subscription period has ended. Please renew to continue billing.'
    );
  }

  // Check 3: Active status check
  if (row.subscription_status !== 'active') {
    throw new Error(
      row.subscription_status === 'pending_approval'
        ? 'PENDING_APPROVAL: Your plan request is waiting for admin verification in Supabase.'
        : 'SUBSCRIPTION_INACTIVE: POS checkout requires an active subscription.'
    );
  }
}
