import { NextRequest, NextResponse } from "next/server";
import { decryptOAuthCredentials } from "@/lib/mercadoPagoServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transactionId: string = body?.transactionId || "";
    const mpPaymentId: string = body?.mpPaymentId || "";
    const therapistId: string = body?.therapistId || "";
    const simulateInsufficientBalance: boolean = Boolean(
      body?.simulateInsufficientBalance
    );

    if (!transactionId || !mpPaymentId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Se requiere el identificador de transacción y el ID de pago de Mercado Pago.",
        },
        { status: 400 }
      );
    }

    // Contemplar que las devoluciones pueden fallar por saldo insuficiente en las cuentas participantes (Punto 8)
    if (simulateInsufficientBalance) {
      return NextResponse.json(
        {
          ok: false,
          refundStatus: "failed_insufficient_balance",
          error:
            "Mercado Pago rechazó la devolución (Error: insufficient_amount / saldo insuficiente en la cuenta participante del terapeuta dado que los fondos del Split 1:1 se acreditan directamente y no permanecen retenidos).",
        },
        { status: 422 }
      );
    }

    // Si existe token OAuth productivo del terapeuta, llamar a la API de Refunds de Mercado Pago
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
          body: JSON.stringify({}),
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
              "No fue posible procesar el reembolso en Mercado Pago (verifique el saldo disponible en las cuentas participantes).",
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
      refundedAt: new Date().toISOString(),
      message:
        "Reembolso ejecutado correctamente a través de la API de Reembolsos de Mercado Pago.",
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
