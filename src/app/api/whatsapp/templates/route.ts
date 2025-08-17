import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function GET(request: NextRequest) {
  try {
    // Get approved WhatsApp templates
    const templates = await twilioClient.content.v1.contents.list();

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        sid: template.sid,
        friendlyName: template.friendlyName,
        language: template.language,
        variables: template.variables,
        types: template.types
      })),
      count: templates.length,
      usage: {
        note: "Use contentSid for first message to guest",
        example: {
          from: "whatsapp:+15558157377",
          to: "whatsapp:+972XXXXXXXXX",
          contentSid: "TEMPLATE_SID_HERE",
          contentVariables: JSON.stringify({
            "1": "Guest Name",
            "2": "Event Name",
            "3": "Event Date"
          })
        }
      }
    });

  } catch (error: any) {
    console.error('Templates fetch error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch WhatsApp templates",
      details: error.message,
      code: error.code,
      suggestion: "You may need to create WhatsApp templates in Twilio Console → Messaging → Content Template Builder"
    }, { status: 500 });
  }
}