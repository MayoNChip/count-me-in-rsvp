import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    console.log('Testing WhatsApp with:', {
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`,
      accountSid: process.env.TWILIO_ACCOUNT_SID
    });

    // Try to send WhatsApp message with detailed error handling
    const twilioMessage = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message || "Test message from Count Me In"
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp message sent successfully!",
      twilioSid: twilioMessage.sid,
      status: twilioMessage.status,
      direction: twilioMessage.direction,
      dateCreated: twilioMessage.dateCreated,
      from: twilioMessage.from,
      to: twilioMessage.to
    });

  } catch (error: unknown) {
    const twilioError = error as { message?: string; code?: number; status?: number; moreInfo?: string; details?: string };
    
    console.error('WhatsApp send error details:', {
      message: twilioError.message,
      code: twilioError.code,
      status: twilioError.status,
      moreInfo: twilioError.moreInfo,
      details: twilioError.details
    });

    // Provide specific troubleshooting based on error code
    let troubleshooting = "";
    if (twilioError.code === 63016) {
      troubleshooting = "The number is not a valid WhatsApp number or hasn't opted in to receive messages from your WhatsApp Business number.";
    } else if (twilioError.code === 63015) {
      troubleshooting = "The WhatsApp template is not approved or message doesn't match an approved template.";
    } else if (twilioError.code === 63014) {
      troubleshooting = "Your WhatsApp Business number is not approved or properly configured.";
    } else if (twilioError.message?.includes("Channel")) {
      troubleshooting = "WhatsApp sender number configuration issue. Check Twilio Console > Messaging > WhatsApp > Senders.";
    }

    return NextResponse.json({
      success: false,
      error: "Failed to send WhatsApp message",
      errorCode: twilioError.code,
      details: twilioError.message,
      moreInfo: twilioError.moreInfo,
      troubleshooting,
      suggestions: [
        "1. Check that +15558157377 is properly configured in Twilio Console",
        "2. Verify WhatsApp Business profile is approved",
        "3. Ensure recipient number is a valid WhatsApp number",
        "4. For business numbers, you may need approved message templates"
      ]
    }, { status: 500 });
  }
}