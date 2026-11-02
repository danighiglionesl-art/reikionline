import { NextRequest, NextResponse } from "next/server";
import {
  AttentionModality,
  BookingTimingType,
  calculateSplitAmounts,
  CommissionConfigState,
  DEFAULT_COMMISSION_CONFIG,
  resolveApplicableCommission,
} from "@/lib/mercadoPagoSplit";
import {
  decryptOAuthCredentials,
  getIdempotentResponse,
  isMercadoPagoMarketplaceConfigured,
  setIdempotentResponse,
} from "@/lib/mercadoPagoServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      body?.idempotencyKey ||
      `idem-${Date.now()}`;

    // 1. Verificar idempotencia para evitar cobros o preferencias duplicadas
    const cached = getIdempotentResponse(idempotencyKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        idempotentReplay: true,
      });
    }

    const sessionPriceArs = Number(body?.sessionPriceArs || 0);
    if (!sessionPriceArs || sessionPriceArs <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "El precio de la sesión debe ser mayor a $0 ARS.",
        },
        { status: 400 }
      );
    }

    const therapistId: string = body?.therapistId || "";
    const therapistName: string = body?.therapistName || "Terapeuta";
    const therapistNickname: string = body?.therapistNickname || "";
    const therapistMpLinked: boolean = Boolean(body?.therapistMpLinked);

    if (!therapistId || !therapistMpLinked) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pueden habilitar sesiones pagas hasta que la cuenta de Mercado Pago del terapeuta esté correctamente vinculada vía OAuth.",
        },
        { status: 400 }
      );
    }

    const attentionModality: AttentionModality =
      body?.attentionModality || "distancia_con_video";
    const bookingTiming: BookingTimingType =
      body?.bookingTiming || "con_turno";
    const therapyName: string = body?.therapyName || "Sesión Reiki Online";
    const scheduledSlotLabel: string =
      body?.scheduledSlotLabel || "Turno confirmado";
    const consultanteEmail: string = body?.consultanteEmail || "";
    const consultanteName: string = body?.consultanteName || "Consultante";
    const integrationMode: "checkout_pro" | "checkout_api" =
      body?.integrationMode === "checkout_api"
        ? "checkout_api"
        : "checkout_pro";

    const commissionConfig: CommissionConfigState =
      body?.commissionConfig || DEFAULT_COMMISSION_CONFIG;

    // 2. Resolver el porcentaje aplicable en el backend y crear copia inalterable
    const commissionSnapshot = resolveApplicableCommission(
      commissionConfig,
      attentionModality,
      bookingTiming,
      therapistId,
      therapistNickname
    );

    // 3. Calcular en dinero (ARS) el marketplace_fee / application_fee (Mercado Pago recibe dinero, no porcentaje)
    const splitAmounts = calculateSplitAmounts(
      sessionPriceArs,
      commissionSnapshot.appliedPercentage
    );

    const reservationId =
      body?.reservationId || `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const reservationDurationMs =
      bookingTiming === "inmediata" ? 10 * 60 * 1000 : 15 * 60 * 1000;
    const reservationExpiresAt = new Date(
      Date.now() + reservationDurationMs
    ).toISOString();

    let preferenceId = `PREF-MP-SPLIT-${Date.now()}`;
    let initPointUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`;

    // 4. Si las credenciales productivas de Mercado Pago están configuradas y el terapeuta tiene token OAuth en bóveda, crear la preferencia oficial en Preferences API con marketplace_fee
    const decryptedSellerToken = decryptOAuthCredentials(therapistId);
    if (isMercadoPagoMarketplaceConfigured() && decryptedSellerToken?.accessToken) {
      const mpPreferencePayload = {
        items: [
          {
            id: reservationId,
            title: `${therapyName} — ${therapistName} (${scheduledSlotLabel})`,
            description: `Sesión en Reiki Online (${attentionModality} / ${bookingTiming})`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: splitAmounts.sessionPriceArs,
          },
        ],
        payer: {
          name: consultanteName,
          email: consultanteEmail,
        },
        // Split de Pagos 1:1 oficial en Checkout Pro: marketplace_fee expresado en dinero (ARS)
        marketplace_fee: splitAmounts.marketplaceFeeArs,
        external_reference: reservationId,
        notification_url:
          process.env.MP_WEBHOOK_URL ||
          "https://www.reikionline.com.ar/api/mp/webhook",
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: reservationExpiresAt,
        back_urls: {
          success: "https://www.reikionline.com.ar/?mp_status=approved",
          pending: "https://www.reikionline.com.ar/?mp_status=pending",
          failure: "https://www.reikionline.com.ar/?mp_status=rejected",
        },
        auto_return: "approved",
        metadata: {
          reservation_id: reservationId,
          therapist_id: therapistId,
          therapist_nickname: therapistNickname,
          applied_percentage: commissionSnapshot.appliedPercentage,
          marketplace_fee_ars: splitAmounts.marketplaceFeeArs,
          therapist_gross_ars: splitAmounts.therapistGrossShareArs,
        },
      };

      const mpRes = await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${decryptedSellerToken.accessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(mpPreferencePayload),
        }
      );

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        preferenceId = mpData.id || preferenceId;
        initPointUrl = mpData.init_point || initPointUrl;
      }
    }

    const responsePayload = {
      ok: true,
      idempotencyKey,
      reservationId,
      preferenceId,
      initPointUrl,
      integrationMode,
      feeFieldUsed:
        integrationMode === "checkout_pro"
          ? "marketplace_fee (Preferences API)"
          : "application_fee (Payments API)",
      splitAmounts,
      commissionSnapshot,
      reservationExpiresAt,
    };

    setIdempotentResponse(idempotencyKey, responsePayload);

    return NextResponse.json(responsePayload);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error interno al calcular el Split 1:1 y generar la preferencia de Mercado Pago.",
      },
      { status: 500 }
    );
  }
}
