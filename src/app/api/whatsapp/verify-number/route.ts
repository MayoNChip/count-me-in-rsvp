import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function GET(request: NextRequest) {
  try {
    // Get all messaging services
    const messagingServices = await twilioClient.messaging.v1.services.list();
    
    // Get phone numbers with WhatsApp capability
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
    
    // Try to find WhatsApp specific configurations
    let whatsappChannels = [];
    for (const service of messagingServices) {
      try {
        const channels = await twilioClient.messaging.v1.services(service.sid)
          .phoneNumbers.list();
        whatsappChannels.push(...channels);
      } catch (e) {
        console.log(`Could not fetch channels for service ${service.sid}`);
      }
    }

    return NextResponse.json({
      success: true,
      configuredNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      messagingServices: messagingServices.map(service => ({
        sid: service.sid,
        friendlyName: service.friendlyName,
        inboundRequestUrl: service.inboundRequestUrl
      })),
      phoneNumbers: phoneNumbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        capabilities: num.capabilities
      })),
      whatsappChannels: whatsappChannels.map(channel => ({
        phoneNumber: channel.phoneNumber,
        countrCode: channel.countryCode,
        capabilities: channel.capabilities
      })),
      debug: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
      }
    });

  } catch (error: any) {
    console.error('Verify number error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to verify number configuration",
      details: error.message,
      code: error.code,
      configuredNumber: process.env.TWILIO_WHATSAPP_NUMBER
    }, { status: 500 });
  }
}