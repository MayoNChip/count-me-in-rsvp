import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { WhatsAppService } from "@/lib/services/whatsapp";
import { z } from "zod";

// Request validation schema
const SendMetaInvitationSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  customMessage: z.string().optional(), // Only used if within 24hrs
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON in request body");
    });

    const validation = SendMetaInvitationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { guestId, customMessage } = validation.data;

    // Get guest and event information
    const [guest] = await db
      .select({
        id: guests.id,
        name: guests.name,
        phone: guests.phone,
        eventId: guests.eventId,
        eventName: events.name,
        eventDate: events.date,
      })
      .from(guests)
      .innerJoin(events, eq(guests.eventId, events.id))
      .where(eq(guests.id, guestId))
      .limit(1);

    if (!guest) {
      return NextResponse.json(
        {
          success: false,
          error: "Guest not found",
        },
        { status: 404 }
      );
    }

    if (!guest.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Guest has no phone number",
        },
        { status: 400 }
      );
    }

    // Initialize WhatsApp service
    const whatsappService = new WhatsAppService();

    // Check if we can send free-form message
    const canSendFreeForm = await whatsappService.canSendFreeForm(guestId);

    let result;
    let messageType;

    if (canSendFreeForm && customMessage) {
      // Send custom free-form message (within 24 hours)
      result = await whatsappService.sendMessage(
        guest.phone,
        guestId,
        customMessage
      );
      messageType = "free-form";
    } else {
      // Send Meta template (required for first message or >24 hours)
      result = await whatsappService.sendMessage(
        guest.phone,
        guestId,
        undefined, // no custom body
        guest.name // guest name for template
      );
      messageType = "meta-template";
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent via ${messageType}`,
      twilioSid: result.sid,
      status: result.status,
      messageType,
      canSendFreeForm,
      sentAt: result.dateCreated,
      guest: {
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
      },
      template: messageType === "meta-template" ? {
        sid: "HXeec3bd74dc5a5930101bd7311b0900bf",
        name: "notifications_welcome_template"
      } : null
    });

  } catch (error) {
    console.error("Send Meta invitation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send invitation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}