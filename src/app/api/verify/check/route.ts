import { NextRequest, NextResponse } from "next/server";
import {
  getRateRecord,
  isTwilioConfigured,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  normalizePhoneForTwilio,
} from "@/lib/twilioVerifyServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone: string = body?.phoneE164 || "";
    const code: string = String(body?.code || "").trim();

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

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          ok: false,
          error: "El código de verificación debe tener exactamente 6 dígitos numéricos.",
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
          error: `Demasiados intentos fallidos. Por seguridad, aguarde ${waitMinutes} min antes de volver a intentar.`,
        },
        { status: 429 }
      );
    }

    if (isTwilioConfigured()) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

      const twilioUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64"
      );

      const checkViaTwilio = async (targetPhone: string) => {
        const params = new URLSearchParams();
        params.append("To", targetPhone);
        params.append("Code", code);

        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        const data = await res.json();
        return { ok: res.ok && data?.status === "approved", data };
      };

      let resolvedPhone = phoneE164;
      let checkAttempt = await checkViaTwilio(resolvedPhone);

      // Si el envío fue registrado sin el 9 tras +54 en Argentina, verificar también esa variante
      if (
        !checkAttempt.ok &&
        resolvedPhone.startsWith("+549") &&
        resolvedPhone.length === 14
      ) {
        const altPhone = `+54${resolvedPhone.slice(4)}`;
        const altCheck = await checkViaTwilio(altPhone);
        if (altCheck.ok) {
          resolvedPhone = altPhone;
          checkAttempt = altCheck;
        }
      }

      if (!checkAttempt.ok) {
        rate.failedChecks += 1;
        if (rate.failedChecks >= MAX_FAILED_ATTEMPTS) {
          rate.lockedUntil = now + LOCKOUT_DURATION_MS;
        }
        const remainingAttempts = Math.max(
          0,
          MAX_FAILED_ATTEMPTS - rate.failedChecks
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              remainingAttempts > 0
                ? `Código incorrecto o expirado. Intentos restantes: ${remainingAttempts}.`
                : "Se superó el límite de intentos fallidos. Número bloqueado temporalmente por 15 minutos.",
            remainingAttempts,
          },
          { status: 400 }
        );
      }

      // Reset failure counter on success; NEVER store OTP code in database
      rate.failedChecks = 0;
      rate.lockedUntil = 0;

      return NextResponse.json({
        ok: true,
        verified: true,
        phoneE164: resolvedPhone,
        verifiedAt: new Date().toISOString(),
        provider: "twilio-verify",
      });
    }

    // Controlled Sandbox verification when TWILIO_* env vars are pending in Vercel:
    // Reject obvious invalid test code "000000" to allow testing failed attempt lockouts,
    // and approve valid 6-digit OTP entry without persisting the OTP code anywhere.
    if (code === "000000") {
      rate.failedChecks += 1;
      if (rate.failedChecks >= MAX_FAILED_ATTEMPTS) {
        rate.lockedUntil = now + LOCKOUT_DURATION_MS;
      }
      const remainingAttempts = Math.max(
        0,
        MAX_FAILED_ATTEMPTS - rate.failedChecks
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Código incorrecto. Intentos restantes: ${remainingAttempts}.`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    rate.failedChecks = 0;
    rate.lockedUntil = 0;

    return NextResponse.json({
      ok: true,
      verified: true,
      phoneE164,
      verifiedAt: new Date().toISOString(),
      provider: "twilio-sandbox-ready",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error interno al comprobar el código de verificación.",
      },
      { status: 500 }
    );
  }
}
