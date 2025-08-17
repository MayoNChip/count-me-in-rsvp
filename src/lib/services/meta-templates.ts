/**
 * Meta-approved WhatsApp Template Library
 * These are the ONLY templates we can use to start conversations
 */

export interface MetaTemplate {
  sid: string;
  name: string;
  description: string;
  variables: string[];
  category: 'welcome' | 'notification' | 'marketing';
}

export const META_TEMPLATES: Record<string, MetaTemplate> = {
  WELCOME: {
    sid: "HXeec3bd74dc5a5930101bd7311b0900bf",
    name: "notifications_welcome_template",
    description: "Welcome message with call to action",
    variables: ["first_name"],
    category: "welcome"
  },
  // Add more templates as they get approved by Meta
  // APPOINTMENT_CONFIRMATION: {
  //   sid: "HX83e3aa2f09fbac9e466cdb57d0ca9aa2",
  //   name: "notifications_appointment_confirmation_template", 
  //   variables: ["first_name", "date", "time"],
  //   category: "notification"
  // }
};

export interface TemplateVariables {
  [key: string]: string;
}

/**
 * Build template variables in Twilio's expected format
 * Twilio expects: {"1": "value1", "2": "value2", ...}
 */
export function buildMetaTemplateVariables(template: MetaTemplate, variables: TemplateVariables): string {
  const twilioVariables: Record<string, string> = {};
  
  template.variables.forEach((varName, index) => {
    const value = variables[varName];
    if (value) {
      twilioVariables[(index + 1).toString()] = value;
    }
  });
  
  return JSON.stringify(twilioVariables);
}

/**
 * Get template for invitation/welcome messages
 */
export function getInvitationTemplate(guestName: string) {
  const template = META_TEMPLATES.WELCOME;
  
  const variables = buildMetaTemplateVariables(template, {
    first_name: guestName
  });
  
  return {
    contentSid: template.sid,
    contentVariables: variables,
    template
  };
}