import { NextRequest, NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/services/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      to, 
      guestName, 
      eventName, 
      eventDate, 
      eventTime = "TBD",
      templateType = "invitation" 
    } = body;

    if (!to || !guestName || !eventName || !eventDate) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: to, guestName, eventName, eventDate"
      }, { status: 400 });
    }

    const whatsappService = new WhatsAppService();
    
    let result;
    if (templateType === "invitation") {
      result = await whatsappService.sendInvitation(
        to,
        guestName,
        "test_guest_id"
      );
    } else if (templateType === "welcome") {
      result = await whatsappService.sendMessage(to, "test_guest_id", `Welcome ${guestName}!`, guestName);
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid templateType. Use 'invitation' or 'welcome'"
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${templateType} template sent successfully!`,
      twilioSid: result.sid,
      status: result.status,
      sentAt: result.dateCreated,
      templateType,
      data: {
        to,
        guestName,
        eventName,
        eventDate,
        eventTime
      }
    });

  } catch (error: any) {
    console.error('Template send error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to send template message",
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}