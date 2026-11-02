import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  BiometricProviderId,
  MAX_BIOMETRIC_ATTEMPTS,
} from "@/lib/biometricIdentity";

const SESSION_RATE_LIMIT = new Map<
  string,
  { count: number; lastRequestAt: number }
>();

function getConfiguredProvider(requested?: string): BiometricProviderId {
  const envProvider = (process.env.BIOMETRIC_PROVIDER || "").toLowerCase();
  if (envProvider === "didit" && process.env.DIDIT_API_KEY) {
    return "didit";
  }
  if (envProvider === "valida" && process.env.VALIDA_API_KEY) {
    return "valida";
  }
  if (requested === "didit" || requested === "valida") {
    // Allow provider selection in test mode while running safely in sandbox if production keys are not set
    return requested;
  }
  return "sandbox";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const consentAccepted = Boolean(body?.consentAccepted);
    const currentAttempts = Number(body?.attemptsCount || 0);
    const requestedProvider = String(body?.provider || "sandbox").trim();

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Identificador de usuario requerido." },
        { status: 400 }
      );
    }

    if (!consentAccepted) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Es obligatorio aceptar el consentimiento informado para el tratamiento de datos biométricos.",
        },
        { status: 400 }
      );
    }

    if (currentAttempts >= MAX_BIOMETRIC_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Se alcanzó el límite de intentos de seguridad. Tu caso fue derivado a revisión asistida.",
          status: "revision_requerida",
        },
        { status: 429 }
      );
    }

    const nowMs = Date.now();
    const rateEntry = SESSION_RATE_LIMIT.get(userId);
    if (rateEntry && nowMs - rateEntry.lastRequestAt < 3000) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aguardá unos segundos antes de iniciar una nueva operación.",
        },
        { status: 429 }
      );
    }
    SESSION_RATE_LIMIT.set(userId, {
      count: (rateEntry?.count || 0) + 1,
      lastRequestAt: nowMs,
    });

    const provider = getConfiguredProvider(requestedProvider);
    const externalOperationId = `bio-${provider}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}`;
    const startedAt = new Date().toISOString();

    const secret =
      process.env.BIOMETRIC_SERVER_SECRET ||
      process.env.TWILIO_AUTH_TOKEN ||
      "reiki-online-biometric-server-secret-2026";

    const sessionToken = crypto
      .createHmac("sha256", secret)
      .update(`${userId}:${externalOperationId}:${provider}:${startedAt}`)
      .digest("hex");

    const isSandboxEnvironment =
      provider === "sandbox" ||
      (provider === "didit" && !process.env.DIDIT_API_KEY) ||
      (provider === "valida" && !process.env.VALIDA_API_KEY);

    return NextResponse.json({
      ok: true,
      userId,
      provider,
      externalOperationId,
      startedAt,
      sessionToken,
      sandboxMode: isSandboxEnvironment,
      renaperAvailable: process.env.RENAPER_ENABLED !== "false",
      message:
        "Sesión de verificación biométrica iniciada de forma segura en el servidor.",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo iniciar la sesión de verificación biométrica en este momento.",
      },
      { status: 500 }
    );
  }
}
