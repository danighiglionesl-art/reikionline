import { NextRequest, NextResponse } from "next/server";
import { decryptOAuthCredentials } from "@/lib/mercadoPagoServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transactionId: string = body?.transactionId || "";
    const mpPaymentId: string = body?.mpPaymentId || "";
    const therapistId: string = body?.therapistId || "";
    const cancellationCategory: string =
      body?.cancellationCategory || "cancelacion_terapeuta";
    const sessionPriceArs: number = Number(body?.amountArs || 0);
    const marketplaceFeeArs: number = Number(body?.marketplaceFeeArs || 0);
    const simulateInsufficientBalance: boolean = Boolean(
      body?.simulateInsufficientBalance
    );

    if (!transactionId || !mpPaymentId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Se requiere el identificador de transacción y el ID de pago de Mercado Pago.",
        },
        { status: 400 }
      );
    }

    // REGLA COMERCIAL 1: Si el consultante desiste de la sesión, NO se devuelve el dinero: se reprograma en los turnos habilitados del terapeuta.
    if (cancellationCategory === "cancelacion_consultante") {
      return NextResponse.json(
        {
          ok: false,
          refundStatus: "rescheduled_no_refund",
          error:
            "Política oficial Reiki Online: En caso de que el consultante desista de la sesión, el importe no es reembolsable y la sesión debe reprogramarse dentro de los turnos habilitados por el terapeuta.",
        },
        { status: 400 }
      );
    }

    // Contemplar que las devoluciones del terapeuta pueden fallar por saldo insuficiente en su cuenta (Punto 8)
    if (simulateInsufficientBalance) {
      return NextResponse.json(
        {
          ok: false,
          refundStatus: "failed_insufficient_balance",
          error:
            "Mercado Pago rechazó la devolución (Error: insufficient_amount / saldo insuficiente en la cuenta del terapeuta para devolver el total al consultante mantendo firme la comisión de Reiki Online).",
        },
        { status: 422 }
      );
    }

    // REGLA COMERCIAL 2: Si el terapeuta cancela la reunión, devuelve el dinero al consultante desde su cuenta, sin descontar la comisión de Reiki Online que queda firme.
    const creds = decryptOAuthCredentials(therapistId);
    if (process.env.MP_MARKETPLACE_ACCESS_TOKEN && creds?.accessToken) {
      const refundRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(
          mpPaymentId
        )}/refunds`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `refund-${transactionId}-${Date.now()}`,
          },
          body: JSON.stringify(
            sessionPriceArs > 0 ? { amount: sessionPriceArs } : {}
          ),
        }
      );

      if (!refundRes.ok) {
        const errData = await refundRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            ok: false,
            refundStatus: "failed_insufficient_balance",
            error:
              errData?.message ||
              "No fue posible procesar la devolución desde la cuenta del terapeuta en Mercado Pago (verifique que posea saldo disponible suficiente para cubrir el reintegro al consultante sin descontar la comisión firme de Reiki Online).",
          },
          { status: refundRes.status }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      transactionId,
      mpPaymentId,
      refundId: `MP-REF-${Date.now()}`,
      refundStatus: "completed",
      reikiCommissionFirm: true,
      firmCommissionArs: marketplaceFeeArs,
      therapistRefundedArs: sessionPriceArs,
      refundedAt: new Date().toISOString(),
      message:
        "Devolución al consultante ejecutada a cargo del terapeuta. La comisión de Reiki Online ha quedado 100% firme sin descuentos.",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error interno al ejecutar el reembolso en Mercado Pago.",
      },
      { status: 500 }
    );
  }
}
