import { isValidE164 } from "@/lib/geoData";

interface RateRecord {
  sendCount: number;
  lastSentAt: number;
  failedChecks: number;
  lockedUntil: number;
}

// In-memory rate-limiting store (per E.164 phone / IP window).
// IMPORTANT: Never stores OTP codes, in compliance with Reiki Online security rules.
const rateLimitStore = new Map<string, RateRecord>();

export const RESEND_COOLDOWN_SECONDS = Number(
  process.env.NEXT_PUBLIC_VERIFY_COOLDOWN_SECONDS || 60
);
export const MAX_SENDS_PER_WINDOW = 5;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function getRateRecord(key: string): RateRecord {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing) {
    const fresh: RateRecord = {
      sendCount: 0,
      lastSentAt: 0,
      failedChecks: 0,
      lockedUntil: 0,
    };
    rateLimitStore.set(key, fresh);
    return fresh;
  }
  // Reset window if more than 30 minutes elapsed since last send and not locked
  if (now > existing.lockedUntil && now - existing.lastSentAt > 30 * 60 * 1000) {
    existing.sendCount = 0;
    existing.failedChecks = 0;
    existing.lockedUntil = 0;
  }
  return existing;
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

/**
 * Formats an Argentine E.164 number for Twilio WhatsApp if needed (ensures +549... or standard E.164).
 */
export function normalizePhoneForTwilio(e164: string): string {
  const trimmed = e164.trim();
  if (!isValidE164(trimmed)) {
    throw new Error("El número debe estar en formato internacional E.164 válido (ej: +5493584244165).");
  }
  return trimmed;
}
