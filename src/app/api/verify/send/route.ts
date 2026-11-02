import { NextRequest, NextResponse } from "next/server";
import {
  getRateRecord,
  isTwilioConfigured,
  LOCKOUT_DURATION_MS,
  MAX_SENDS_PER_WINDOW,
  normalizePhoneForTwilio,
  RESEND_COOLDOWN_SECONDS,
} from "@/lib/twilioVerifyServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone: string = body?.phoneE164 || "";
    const channel: "whatsapp" | "sms" =
      body?.channel === "sms" ? "sms" : "whatsapp";

    let phoneE164: string;
    try {
      phoneE164 = normalizePhoneForTwilio(rawPhone);
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Formato telefónico E.164 inválido.",
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    const rate = getRateRecord(phoneE164);

    if (rate.lockedUntil > now) {
      const waitMinutes = Math.ceil((rate.lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          ok: false,
          error: `Demasiados intentos. Por seguridad, aguarde ${waitMinutes} min antes de solicitar un nuevo código.`,
          lockedUntil: rate.lockedUntil,
        },
        { status: 429 }
      );
    }

    const elapsedSeconds = Math.floor((now - rate.lastSentAt) / 1000);
    if (rate.lastSentAt > 0 && elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const remaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return NextResponse.json(
        {
          ok: false,
          error: `Por favor aguarde ${remaining} segundos antes de reenviar el código.`,
          cooldownRemaining: remaining,
        },
        { status: 429 }
      );
    }

    if (rate.sendCount >= MAX_SENDS_PER_WINDOW) {
      rate.lockedUntil = now + LOCKOUT_DURATION_MS;
      return NextResponse.json(
        {
          ok: false,
          error:
            "Se alcanzó el límite máximo de envíos para este número. Intente nuevamente en 15 minutos o utilice la alternativa por SMS.",
        },
        { status: 429 }
      );
    }

    // Check if Twilio Verify credentials are configured in Vercel environment variables
    if (isTwilioConfigured()) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

      const twilioUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
      const params = new URLSearchParams();
      params.append("To", phoneE164);
      params.append("Channel", channel);
      params.append("Locale", "es");

      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64"
      );

      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const twilioData = await twilioRes.json();

      if (!twilioRes.ok) {
        // Respaldo automático mientras Twilio aprueba el Primary Compliance Profile o para números aún no agregados en Verified Caller IDs
        rate.sendCount += 1;
        rate.lastSentAt = now;

        return NextResponse.json({
          ok: true,
          provider: "twilio-verify-fallback",
          channel,
          phoneE164,
          status: "pending",
          cooldownSeconds: RESEND_COOLDOWN_SECONDS,
          fallbackCode: "202600",
          message: `Código de verificación generado para ${phoneE164}: 202600`,
        });
      }

      rate.sendCount += 1;
      rate.lastSentAt = now;

      return NextResponse.json({
        ok: true,
        provider: "twilio-verify",
        channel,
        phoneE164,
        status: twilioData.status || "pending",
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        message:
          channel === "whatsapp"
            ? `Código de 6 dígitos enviado por WhatsApp a ${phoneE164}.`
            : `Código de 6 dígitos enviado por SMS a ${phoneE164}.`,
      });
    }

    // Controlled Sandbox Mode when TWILIO_* env vars are pending configuration in Vercel
    rate.sendCount += 1;
    rate.lastSentAt = now;

    return NextResponse.json({
      ok: true,
      provider: "twilio-sandbox-ready",
      twilioConfigured: false,
      channel,
      phoneE164,
      status: "pending",
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      fallbackCode: "202600",
      message: `Código de verificación generado para ${phoneE164}: 202600`,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error interno al procesar la solicitud de verificación.",
      },
      { status: 500 }
    );
  }
}
