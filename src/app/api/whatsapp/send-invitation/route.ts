import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { twilioClient } from "@/lib/services/twilio";
import { WhatsAppService } from "@/lib/services/whatsapp";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  const { guestId } = await request.json();

  const guest = await db.query.guests.findFirst({
    where: eq(guests.id, guestId),
  });

  if (!guest || !guest.phone) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const whatsappService = new WhatsAppService();

  const result = await twilioClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${guest.phone}`,
    // contentSid: "HX128c0311587d83fe66357a936f3ede59",
    body: "Hello, how are you?",
  });

  return NextResponse.json(result);
};
