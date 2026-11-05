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
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64"
      );

      const sendViaTwilio = async (
        targetPhone: string,
        targetChannel: "whatsapp" | "sms"
      ) => {
        const params = new URLSearchParams();
        params.append("To", targetPhone);
        params.append("Channel", targetChannel);
        params.append("Locale", "es");

        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      };

      let resolvedPhone = phoneE164;
      let resolvedChannel: "whatsapp" | "sms" = channel;
      let attempt = await sendViaTwilio(resolvedPhone, resolvedChannel);

      // Si es un móvil de Argentina (+549...) y Twilio requiere el formato sin el 9 (+54...), reintentar automáticamente
      if (!attempt.ok && resolvedPhone.startsWith("+549") && resolvedPhone.length === 14) {
        const altPhone = `+54${resolvedPhone.slice(4)}`;
        const altAttempt = await sendViaTwilio(altPhone, resolvedChannel);
        if (altAttempt.ok) {
          resolvedPhone = altPhone;
          attempt = altAttempt;
        }
      }

      // Si el canal WhatsApp no pudo despachar, reintentar automáticamente por SMS real de Twilio Verify
      if (!attempt.ok && resolvedChannel === "whatsapp") {
        const smsAttempt = await sendViaTwilio(phoneE164, "sms");
        if (smsAttempt.ok) {
          resolvedPhone = phoneE164;
          resolvedChannel = "sms";
          attempt = smsAttempt;
        } else if (phoneE164.startsWith("+549") && phoneE164.length === 14) {
          const altPhone = `+54${phoneE164.slice(4)}`;
          const altSmsAttempt = await sendViaTwilio(altPhone, "sms");
          if (altSmsAttempt.ok) {
            resolvedPhone = altPhone;
            resolvedChannel = "sms";
            attempt = altSmsAttempt;
          }
        }
      }

      if (!attempt.ok) {
        const twilioErrCode = attempt.data?.code;
        const twilioErrMsg =
          attempt.data?.message ||
          "No se pudo enviar el código de verificación a ese número. Verificá que el número sea válido.";
        return NextResponse.json(
          {
            ok: false,
            error: `Twilio Verify (${twilioErrCode || attempt.status}): ${twilioErrMsg}`,
          },
          { status: 400 }
        );
      }

      rate.sendCount += 1;
      rate.lastSentAt = now;

      return NextResponse.json({
        ok: true,
        provider: "twilio-verify",
        channel: resolvedChannel,
        phoneE164: resolvedPhone,
        status: attempt.data?.status || "pending",
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        message:
          resolvedChannel === "whatsapp"
            ? `Código de 6 dígitos enviado por WhatsApp a ${resolvedPhone}.`
            : `Código de 6 dígitos enviado por SMS a ${resolvedPhone}.`,
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
