import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { BiometricVerificationStatus } from "@/lib/biometricIdentity";

/**
 * Registro en memoria para procesamiento idempotente de Webhooks de proveedores
 * (Didit / Valida). Evita reprocesar el mismo evento dos veces.
 */
const PROCESSED_WEBHOOK_EVENTS = new Map<
  string,
  {
    processedAt: string;
    status: BiometricVerificationStatus;
    externalOperationId: string;
  }
>();

function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const cleanSig = signatureHeader.replace(/^sha256=/i, "").trim();
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    const a = Buffer.from(cleanSig, "hex");
    const b = Buffer.from(computed, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-didit-signature") ||
      req.headers.get("x-valida-signature");

    const webhookSecret =
      process.env.DIDIT_WEBHOOK_SECRET ||
      process.env.VALIDA_WEBHOOK_SECRET ||
      process.env.BIOMETRIC_WEBHOOK_SECRET ||
      "";

    // Si hay secreto de webhook configurado en el servidor, exigir validación criptográfica HMAC
    if (webhookSecret) {
      const isValidSig = verifyWebhookSignature(
        rawBody,
        signatureHeader,
        webhookSecret
      );
      if (!isValidSig) {
        return NextResponse.json(
          { ok: false, error: "Firma criptográfica de webhook inválida." },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody || "{}") as {
      eventId?: string;
      externalOperationId?: string;
      userId?: string;
      status?: BiometricVerificationStatus;
      reason?: string;
    };

    const eventKey =
      payload.eventId ||
      `${payload.externalOperationId || "op"}:${payload.status || "unknown"}`;

    // Idempotencia: si el evento ya fue procesado, devolver 200 sin duplicar
    const existing = PROCESSED_WEBHOOK_EVENTS.get(eventKey);
    if (existing) {
      return NextResponse.json({
        ok: true,
        idempotentReplay: true,
        processedAt: existing.processedAt,
        status: existing.status,
      });
    }

    const mappedStatus: BiometricVerificationStatus =
      payload.status &&
      [
        "no_iniciada",
        "pendiente",
        "verificada",
        "rechazada",
        "revision_requerida",
      ].includes(payload.status)
        ? payload.status
        : "pendiente";

    const processedAt = new Date().toISOString();
    PROCESSED_WEBHOOK_EVENTS.set(eventKey, {
      processedAt,
      status: mappedStatus,
      externalOperationId: payload.externalOperationId || "",
    });

    return NextResponse.json({
      ok: true,
      idempotentReplay: false,
      processedAt,
      externalOperationId: payload.externalOperationId || null,
      status: mappedStatus,
    });
  } catch {
    // Registrar error sin exponer información sensible
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la notificación del webhook." },
      { status: 400 }
    );
  }
}
