import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, events, whatsappInvitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { WhatsAppService } from "@/lib/services/whatsapp";
import { QueueService, JobPriority } from "@/lib/services/queue";
import { MockQueueService } from "@/lib/services/queue-mock";
import { z } from "zod";

// Request validation schema
const SendTemplateSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  templateType: z.enum(["invitation", "welcome"]).default("invitation"),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON in request body");
    });

    const validation = SendTemplateSchema.safeParse(body);
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

    const { guestId, templateType, eventDate, eventTime, priority } =
      validation.data;

    // Get guest and event information
    const [guest] = await db
      .select({
        id: guests.id,
        name: guests.name,
        phone: guests.phone,
        eventId: guests.eventId,
        eventName: events.name,
        eventDate: events.date,
        eventTime: events.time,
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

    // Check if we recently sent a template message to this guest
    const recentInvitation = await db
      .select()
      .from(whatsappInvitations)
      .where(
        and(
          eq(whatsappInvitations.guestId, guestId),
          eq(whatsappInvitations.twilioStatus, "delivered")
        )
      )
      .orderBy(whatsappInvitations.sentAt)
      .limit(1);

    // Use provided dates or fall back to event dates
    const finalEventDate = eventDate || guest.eventDate || "TBD";
    const finalEventTime = eventTime || guest.eventTime || "TBD";

    // Create WhatsApp service instance
    const whatsappService = new WhatsAppService();

    // Queue the job instead of sending immediately
    const queueService = process.env.KV_REST_API_URL
      ? new QueueService()
      : new MockQueueService();

    const jobPriority =
      priority === "high"
        ? JobPriority.HIGH
        : priority === "low"
        ? JobPriority.LOW
        : JobPriority.NORMAL;

    const jobId = await queueService.addJob(
      {
        type: "whatsapp_send",
        guestId: guest.id,
        eventId: guest.eventId,
        templateName: `whatsapp_${templateType}`,
        phone: guest.phone,
        variables: {
          name: guest.name,
          eventName: guest.eventName,
          eventDate: finalEventDate,
          eventTime: finalEventTime.split(" ")[0],
          eventTimeSuffix: finalEventTime.split(" ")[1],
        },
      },
      jobPriority
    );

    // Create invitation record
    const invitationId = await db.insert(whatsappInvitations).values({
      eventId: guest.eventId,
      guestId: guest.id,
      templateName: `whatsapp_${templateType}`,
      messageContent: `Template ${templateType} message for ${guest.name}`,
      twilioStatus: "queued",
      templateVariables: {
        guestName: guest.name,
        eventName: guest.eventName,
        eventDate: finalEventDate,
        eventTime: finalEventTime,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${templateType} template queued successfully`,
      jobId,
      invitationId,
      templateType,
      preview: {
        to: guest.phone,
        guestName: guest.name,
        eventName: guest.eventName,
        eventDate: finalEventDate,
        eventTime: finalEventTime,
      },
    });
  } catch (error) {
    console.error("Send template error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to queue template message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
