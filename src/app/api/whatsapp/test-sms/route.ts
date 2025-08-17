import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json({
        success: false,
        error: "Missing 'to' or 'message' in request body"
      }, { status: 400 });
    }

    // Send regular SMS (not WhatsApp) - should work with trial account
    const twilioMessage = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER, // Use same number but for SMS
      to: to, // Regular phone number (no whatsapp: prefix)
      body: message
    });

    return NextResponse.json({
      success: true,
      message: "SMS sent successfully",
      twilioSid: twilioMessage.sid,
      status: twilioMessage.status,
      note: "This was sent as SMS, not WhatsApp"
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to send SMS",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}