import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    console.log('Testing with different WhatsApp approaches...');

    // Test 1: Try with a simple approved template message
    try {
      const templateMessage = await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${to}`,
        body: "Hello! Your appointment is coming up."  // Simple template-like message
      });

      return NextResponse.json({
        success: true,
        method: "Template-style message",
        message: "WhatsApp message sent successfully!",
        twilioSid: templateMessage.sid,
        status: templateMessage.status,
        from: templateMessage.from,
        to: templateMessage.to
      });

    } catch (templateError: any) {
      console.log('Template approach failed:', templateError.message);
      
      // Test 2: Try using ContentSid for approved templates
      try {
        const contentMessage = await twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${to}`,
          contentSid: 'HXb5b7f0f9b1a3b2e8e7c6d5a4f3b2c1d0', // Generic template
          contentVariables: JSON.stringify({
            1: "Count Me In",
            2: "Test"
          })
        });

        return NextResponse.json({
          success: true,
          method: "ContentSid template",
          message: "WhatsApp template message sent!",
          twilioSid: contentMessage.sid,
          status: contentMessage.status
        });

      } catch (contentError: any) {
        console.log('ContentSid approach failed:', contentError.message);
        
        // Test 3: Try the exact format from Twilio docs
        try {
          const directMessage = await twilioClient.messages.create({
            from: 'whatsapp:+15558157377', // Hardcoded exact format
            to: `whatsapp:${to}`,
            body: "Your Count Me In invitation is ready!"
          });

          return NextResponse.json({
            success: true,
            method: "Direct hardcoded format",
            message: "WhatsApp message sent with hardcoded format!",
            twilioSid: directMessage.sid,
            status: directMessage.status
          });

        } catch (directError: any) {
          
          return NextResponse.json({
            success: false,
            error: "All WhatsApp methods failed",
            attempts: [
              {
                method: "Template-style",
                error: templateError.message,
                code: templateError.code
              },
              {
                method: "ContentSid",
                error: contentError.message,
                code: contentError.code
              },
              {
                method: "Direct hardcoded",
                error: directError.message,
                code: directError.code
              }
            ],
            suggestion: "Check if you need to create and approve message templates in Twilio Console"
          }, { status: 500 });
        }
      }
    }

  } catch (error: any) {
    console.error('WhatsApp test error:', error);
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error.message
    }, { status: 500 });
  }
}