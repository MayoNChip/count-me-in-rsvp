import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function POST(request: NextRequest) {
  const twilio_phone_number = process.env.TWILIO_WHATSAPP_NUMBER;
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing 'to' or 'message' in request body",
        },
        { status: 400 }
      );
    }

    // Send WhatsApp message directly via Twilio
    const twilioMessage = await twilioClient.messages.create({
      from: `whatsapp:${twilio_phone_number}`, // Your Twilio WhatsApp number
      to: `whatsapp:${to}`, // Recipient's WhatsApp number
      body: message,
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp message sent successfully",
      twilioSid: twilioMessage.sid,
      status: twilioMessage.status,
    });
  } catch (error) {
    console.error("Direct WhatsApp send error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send WhatsApp message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
