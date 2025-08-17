import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/services/twilio";

export async function GET(request: NextRequest) {
  const twilio_phone_number = process.env.TWILIO_WHATSAPP_NUMBER;
  const twilio_account_sid = process.env.TWILIO_ACCOUNT_SID;
  const twilio_auth_token = process.env.TWILIO_AUTH_TOKEN;

  if (!twilio_phone_number || !twilio_account_sid || !twilio_auth_token) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing Twilio configuration",
      },
      { status: 500 }
    );
  }

  try {
    // Check account info
    const account = await twilioClient.api.v2010
      .accounts(twilio_account_sid)
      .fetch();

    // Get all phone numbers from Twilio account
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();

    // Try to get WhatsApp sender information
    let whatsappSenders = null;
    try {
      whatsappSenders = await twilioClient.messaging.v1.services.list();
    } catch (e) {
      console.log("Couldn't fetch WhatsApp services:", e);
    }

    return NextResponse.json({
      success: true,
      account: {
        sid: account.sid,
        status: account.status,
        type: account.type,
        configuredWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      },
      phoneNumbers: phoneNumbers.map((num) => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        capabilities: num.capabilities,
        status: num.status,
      })),
      whatsappServices:
        whatsappSenders?.map((service) => ({
          sid: service.sid,
          friendlyName: service.friendlyName,
          inboundRequestUrl: service.inboundRequestUrl,
          statusCallback: service.statusCallback,
        })) || "Could not fetch WhatsApp services",
      testSuggestion: {
        message: "Try sending a test message",
        endpoint: "/api/whatsapp/test-direct",
        payload: {
          to: "+972XXXXXXXXX",
          message: "Test message",
        },
      },
    });
  } catch (error) {
    console.error("Twilio debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Twilio account info",
        details: error instanceof Error ? error.message : String(error),
        fullError: error,
        suggestion:
          "Check if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct",
      },
      { status: 500 }
    );
  }
}
