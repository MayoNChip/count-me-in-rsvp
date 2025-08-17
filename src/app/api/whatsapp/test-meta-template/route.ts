import { NextRequest, NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/services/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, guestName, guestId = "test_guest" } = body;

    if (!to || !guestName) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: to, guestName"
      }, { status: 400 });
    }

    const whatsappService = new WhatsAppService();
    
    // Use the Meta-approved template SID: HXeec3bd74dc5a5930101bd7311b0900bf
    const result = await whatsappService.sendInvitation(to, guestName, guestId);

    return NextResponse.json({
      success: true,
      message: "Meta-approved template sent successfully!",
      twilioSid: result.sid,
      status: result.status,
      sentAt: result.dateCreated,
      templateUsed: {
        sid: "HXeec3bd74dc5a5930101bd7311b0900bf",
        name: "notifications_welcome_template",
        variables: {
          first_name: guestName
        }
      },
      data: {
        to,
        guestName,
        guestId
      }
    });

  } catch (error: any) {
    console.error('Meta template send error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to send Meta template",
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}