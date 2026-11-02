import { NextRequest, NextResponse } from "next/server";
import { SplitPaymentStatus } from "@/lib/mercadoPagoSplit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reservationId: string = body?.reservationId || "";
    const preferenceId: string = body?.preferenceId || "";
    const reservationExpiresAt: string = body?.reservationExpiresAt || "";
    const requestedOutcome: SplitPaymentStatus =
      body?.requestedOutcome || "approved";
    const simulateLateApprovalAfterExpiry: boolean = Boolean(
      body?.simulateLateApprovalAfterExpiry
    );

    if (!reservationId || !preferenceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan identificadores de transacción o reserva.",
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    const expiresTime = reservationExpiresAt
      ? new Date(reservationExpiresAt).getTime()
      : now + 600000;
    const isExpired = simulateLateApprovalAfterExpiry || now > expiresTime;

    const mpPaymentId = `MP-PAY-${Math.floor(
      1000000000 + Math.random() * 8999999999
    )}`;

    // Regla estricta Punto 4:
    // - Los pagos pendientes o rechazados NO deben confirmar una sesión.
    // - Si un pago se aprueba después de expirar una reserva temporal, no confirma automáticamente y se marca para conciliación.
    const status: SplitPaymentStatus = requestedOutcome;
    const approvedAfterExpiration = status === "approved" && isExpired;
    const sessionConfirmed = status === "approved" && !approvedAfterExpiration;
    const reconciliationRequired = approvedAfterExpiration;

    return NextResponse.json({
      ok: true,
      verifiedByBackend: true,
      reservationId,
      preferenceId,
      mpPaymentId: status === "rejected" ? null : mpPaymentId,
      status,
      sessionConfirmed,
      approvedAfterExpiration,
      reconciliationRequired,
      reconciliationNote: approvedAfterExpiration
        ? "El pago fue aprobado en Mercado Pago luego de haber expirado la reserva temporal del terapeuta. Requiere conciliación administrativa (reprogramación de turno o reembolso)."
        : undefined,
      verifiedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error en el backend al verificar el estado del pago.",
      },
      { status: 500 }
    );
  }
}
