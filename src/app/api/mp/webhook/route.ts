import { NextRequest, NextResponse } from "next/server";
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadoPagoServer";

export async function POST(req: NextRequest) {
  try {
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");
    const body = await req.json();

    const dataId = String(body?.data?.id || body?.id || "");
    const topic = String(body?.type || body?.topic || "payment");

    // 1. Validar autenticidad de la firma del Webhook de Mercado Pago
    const sigCheck = verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });

    if (!sigCheck.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: "Firma x-signature del Webhook de Mercado Pago inválida.",
        },
        { status: 401 }
      );
    }

    // 2. Consultar estado real del pago si MP_MARKETPLACE_ACCESS_TOKEN está configurado
    let verifiedStatus: string = body?.simulatedStatus || "approved";
    let externalReference: string = body?.external_reference || "";

    if (process.env.MP_MARKETPLACE_ACCESS_TOKEN && dataId && topic === "payment") {
      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_MARKETPLACE_ACCESS_TOKEN}`,
          },
        }
      );
      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        verifiedStatus = paymentData.status || verifiedStatus;
        externalReference =
          paymentData.external_reference || externalReference;
      }
    }

    return NextResponse.json({
      ok: true,
      webhookVerified: true,
      signatureVerificationMode: sigCheck.mode,
      topic,
      paymentId: dataId,
      externalReference,
      verifiedStatus,
      processedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error al procesar el Webhook de Mercado Pago." },
      { status: 500 }
    );
  }
}
