import crypto from "crypto";

// ============================================================================
// SEGURIDAD Y TRAZABILIDAD BACKEND — MERCADO PAGO MARKETPLACE SPLIT 1:1
// ============================================================================

export interface EncryptedOAuthTokenRecord {
  therapistId: string;
  mpUserId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  ivHex: string;
  authTagHex: string;
  expiresAt: string;
  updatedAt: string;
}

// Almacén en memoria del servidor para tokens OAuth cifrados con AES-256-GCM e idempotencia
const encryptedTokenVault = new Map<string, EncryptedOAuthTokenRecord>();
const idempotencyStore = new Map<
  string,
  { createdAt: number; responsePayload: Record<string, unknown> }
>();

function getEncryptionKey(): Buffer {
  const secret =
    process.env.MP_TOKEN_ENCRYPTION_KEY ||
    process.env.MP_CLIENT_SECRET ||
    "reiki-online-mp-oauth-aes256-default-vault-key-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Cifra un token OAuth (access_token / refresh_token) con AES-256-GCM antes de almacenarlo.
 */
export function encryptOAuthCredentials(
  therapistId: string,
  mpUserId: string,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds = 15552000 // 180 días por defecto en MP
): EncryptedOAuthTokenRecord {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payload = JSON.stringify({ accessToken, refreshToken });
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const record: EncryptedOAuthTokenRecord = {
    therapistId,
    mpUserId,
    encryptedAccessToken: encrypted.toString("hex"),
    encryptedRefreshToken: "included-in-gcm-payload",
    ivHex: iv.toString("hex"),
    authTagHex: authTag.toString("hex"),
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  encryptedTokenVault.set(therapistId, record);
  return record;
}

/**
 * Descifra el access_token y refresh_token del terapeuta exclusivamente en el backend.
 */
export function decryptOAuthCredentials(therapistId: string): {
  accessToken: string;
  refreshToken: string;
  mpUserId: string;
  expiresAt: string;
} | null {
  const record = encryptedTokenVault.get(therapistId);
  if (!record) return null;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(record.ivHex, "hex");
    const authTag = Buffer.from(record.authTagHex, "hex");
    const encryptedText = Buffer.from(record.encryptedAccessToken, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(decrypted) as {
      accessToken: string;
      refreshToken: string;
    };
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      mpUserId: record.mpUserId,
      expiresAt: record.expiresAt,
    };
  } catch {
    return null;
  }
}

export function revokeOAuthCredentials(therapistId: string): void {
  encryptedTokenVault.delete(therapistId);
}

/**
 * Valida la firma HMAC-SHA256 del Webhook de Mercado Pago (cabecera x-signature y x-request-id).
 */
export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): { valid: boolean; mode: "verified_hmac" | "sandbox_unconfigured" } {
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { valid: true, mode: "sandbox_unconfigured" };
  }

  if (!params.xSignature) {
    return { valid: false, mode: "verified_hmac" };
  }

  const parts = params.xSignature.split(",");
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }

  if (!ts || !v1) {
    return { valid: false, mode: "verified_hmac" };
  }

  const manifest = `id:${params.dataId};request-id:${params.xRequestId || ""};ts:${ts};`;
  const hmac = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(hmac, "utf8"),
    Buffer.from(v1, "utf8")
  );
  return { valid, mode: "verified_hmac" };
}

/**
 * Control de idempotencia para evitar cobros o preferencias duplicadas.
 */
export function getIdempotentResponse(
  idempotencyKey: string
): Record<string, unknown> | null {
  const existing = idempotencyStore.get(idempotencyKey);
  if (!existing) return null;
  // Expira luego de 24 horas
  if (Date.now() - existing.createdAt > 24 * 60 * 60 * 1000) {
    idempotencyStore.delete(idempotencyKey);
    return null;
  }
  return existing.responsePayload;
}

export function setIdempotentResponse(
  idempotencyKey: string,
  responsePayload: Record<string, unknown>
): void {
  idempotencyStore.set(idempotencyKey, {
    createdAt: Date.now(),
    responsePayload,
  });
}

export function isMercadoPagoMarketplaceConfigured(): boolean {
  return Boolean(
    process.env.MP_CLIENT_ID &&
      process.env.MP_CLIENT_SECRET &&
      process.env.MP_MARKETPLACE_ACCESS_TOKEN
  );
}
