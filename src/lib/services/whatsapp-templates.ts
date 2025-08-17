export interface WhatsAppTemplate {
  sid: string;
  name: string;
  variables: string[];
  description: string;
}

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplate> = {
  APPOINTMENT_CONFIRMATION: {
    sid: "HX83e3aa2f09fbac9e466cdb57d0ca9aa2",
    name: "notifications_appointment_confirmation_template",
    variables: ["first_name", "date", "time"],
    description: "Appointment confirmation with RSVP buttons"
  },
  WELCOME: {
    sid: "HX2fce8b8f6408779c04b3af92633170f8",
    name: "notifications_welcome_template", 
    variables: ["first_name"],
    description: "Welcome message with call to action"
  },
  ORDER_UPDATE: {
    sid: "HXc6f64dbdffb379a7d54a7c694d9c8a46",
    name: "notifications_order_update_template",
    variables: ["date", "time"],
    description: "Order update with delivery scheduling"
  }
};

export interface TemplateVariables {
  [key: string]: string;
}

export function buildTemplateVariables(variables: TemplateVariables): string {
  // Convert variables object to Twilio's expected format
  // Twilio expects: {"1": "value1", "2": "value2", ...}
  const twilioVariables: Record<string, string> = {};
  
  Object.entries(variables).forEach(([key, value], index) => {
    twilioVariables[(index + 1).toString()] = value;
  });
  
  return JSON.stringify(twilioVariables);
}

export function getInvitationTemplate(guestName: string, eventName: string, eventDate: string, eventTime: string = "TBD") {
  const template = WHATSAPP_TEMPLATES.APPOINTMENT_CONFIRMATION;
  
  const variables = buildTemplateVariables({
    first_name: guestName,
    date: eventDate,
    time: eventTime
  });
  
  return {
    contentSid: template.sid,
    contentVariables: variables
  };
}

export function getWelcomeTemplate(guestName: string) {
  const template = WHATSAPP_TEMPLATES.WELCOME;
  
  const variables = buildTemplateVariables({
    first_name: guestName
  });
  
  return {
    contentSid: template.sid,
    contentVariables: variables
  };
}