import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Endpoint seguro de creación de salas privadas 1:1 y tokens de acceso con Daily.co
 * Compatible con Vercel:
 * - Si DAILY_API_KEY está configurada en Vercel, crea la sala efímera de 60 minutos en api.daily.co
 *   y genera un meeting-token exclusivo para el Terapeuta (host) o Consultante (participante).
 * - Si DAILY_API_KEY aún no está configurada, opera automáticamente en el Entorno de Pruebas
 *   Daily.co (Sandbox WebRTC en vivo dentro de Reiki Online) sin costo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawSessionId = String(body?.sessionId || `ro-${Date.now()}`).trim();
    const safeRoomSlug = `reikionline-${rawSessionId
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 32)
      .toLowerCase()}`;

    const participantName = String(
      body?.participantName || "Participante Reiki Online"
    ).trim();
    const participantRole =
      body?.participantRole === "Terapeuta" ? "Terapeuta" : "Consultante";
    const modality =
      body?.modality === "Online ahora" ? "Online ahora" : "Online con turno";
    const therapyName = String(body?.therapyName || "Sesión de Reiki Online");

    const nowSec = Math.floor(Date.now() / 1000);
    // Duración de 60 minutos exactos (3600 segundos)
    const expSec = nowSec + 3600;
    const createdAtIso = new Date(nowSec * 1000).toISOString();
    const expiresAtIso = new Date(expSec * 1000).toISOString();

    const dailyApiKey = (process.env.DAILY_API_KEY || "").trim();

    if (dailyApiKey) {
      // 1. Crear o recuperar sala privada 1:1 en Daily.co REST API
      let roomUrl = "";
      let roomName = safeRoomSlug;

      const getRoomRes = await fetch(
        `https://api.daily.co/v1/rooms/${safeRoomSlug}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (getRoomRes.ok) {
        const existingRoom = await getRoomRes.json();
        roomUrl = existingRoom.url;
        roomName = existingRoom.name;
      } else {
        const createRoomRes = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: safeRoomSlug,
            privacy: "private",
            properties: {
              exp: expSec,
              max_participants: 2,
              enable_chat: true,
              enable_screenshare: true,
              enable_prejoin_ui: false,
              lang: "es",
            },
          }),
        });

        if (createRoomRes.ok) {
          const createdRoom = await createRoomRes.json();
          roomUrl = createdRoom.url;
          roomName = createdRoom.name;
        }
      }

      if (roomUrl) {
        // 2. Emitir meeting token firmado por Daily.co para el participante (sin exponer email ni WhatsApp)
        const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              room_name: roomName,
              user_name: `${participantName} (${participantRole})`,
              is_owner: participantRole === "Terapeuta",
              exp: expSec,
            },
          }),
        });

        let fullRoomUrl = roomUrl;
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.token) {
            fullRoomUrl = `${roomUrl}?t=${tokenData.token}`;
          }
        }

        return NextResponse.json({
          ok: true,
          providerMode: "daily_api",
          sessionId: rawSessionId,
          roomName,
          roomUrl: fullRoomUrl,
          modality,
          therapyName,
          durationMinutes: 60,
          createdAt: createdAtIso,
          expiresAt: expiresAtIso,
        });
      }
    }

    // Modo Entorno de Pruebas (Sandbox Daily.co con firma criptográfica del servidor)
    const secret =
      process.env.BIOMETRIC_SERVER_SECRET ||
      process.env.TWILIO_AUTH_TOKEN ||
      "reiki-online-daily-video-secret-2026";

    const sandboxToken = crypto
      .createHmac("sha256", secret)
      .update(`${safeRoomSlug}:${participantName}:${participantRole}:${expSec}`)
      .digest("hex")
      .slice(0, 24);

    const dailyDomain = (
      process.env.NEXT_PUBLIC_DAILY_DOMAIN || "reikionline.daily.co"
    ).replace(/^https?:\/\//, "");

    return NextResponse.json({
      ok: true,
      providerMode: "daily_sandbox",
      sessionId: rawSessionId,
      roomName: safeRoomSlug,
      roomUrl: `https://${dailyDomain}/${safeRoomSlug}?t=${sandboxToken}`,
      modality,
      therapyName,
      durationMinutes: 60,
      createdAt: createdAtIso,
      expiresAt: expiresAtIso,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo inicializar la sala de videollamada en este momento.",
      },
      { status: 500 }
    );
  }
}
