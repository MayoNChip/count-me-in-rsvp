import { twilioClient } from './twilio';
import { getInvitationTemplate, META_TEMPLATES, MetaTemplate } from './meta-templates';
import { ConversationTracker } from './conversation-tracker';

export interface WhatsAppResponse {
  sid: string;
  status: string;
  direction: string;
  dateCreated: Date;
  from: string;
  to: string;
}

export class WhatsAppService {
  private fromNumber: string;
  private conversationTracker: ConversationTracker;

  constructor() {
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
    if (!this.fromNumber) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is required');
    }
    this.conversationTracker = new ConversationTracker();
  }

  /**
   * Send Meta-approved template message (required for conversations >24hrs old)
   */
  async sendMetaTemplate(
    to: string, 
    contentSid: string, 
    contentVariables: string
  ): Promise<WhatsAppResponse> {
    try {
      const message = await twilioClient.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${to}`,
        contentSid: contentSid,
        contentVariables: contentVariables
      });

      return {
        sid: message.sid,
        status: message.status,
        direction: message.direction || 'outbound-api',
        dateCreated: new Date(message.dateCreated),
        from: message.from || `whatsapp:${this.fromNumber}`,
        to: message.to
      };
    } catch (error: any) {
      console.error('Meta template send error:', error);
      throw new Error(`Failed to send Meta template: ${error.message}`);
    }
  }

  /**
   * Send free-form message (only works within 24hrs of template message)
   */
  async sendFreeFormMessage(to: string, body: string): Promise<WhatsAppResponse> {
    try {
      const message = await twilioClient.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${to}`,
        body: body
      });

      return {
        sid: message.sid,
        status: message.status,
        direction: message.direction || 'outbound-api',
        dateCreated: new Date(message.dateCreated),
        from: message.from || `whatsapp:${this.fromNumber}`,
        to: message.to
      };
    } catch (error: any) {
      console.error('Free-form message send error:', error);
      throw new Error(`Failed to send free-form message: ${error.message}`);
    }
  }

  /**
   * Send invitation using Meta-approved welcome template
   */
  async sendInvitation(to: string, guestName: string, guestId: string): Promise<WhatsAppResponse> {
    const { contentSid, contentVariables } = getInvitationTemplate(guestName);
    
    const result = await this.sendMetaTemplate(to, contentSid, contentVariables);
    
    // Record the template message for conversation tracking
    await this.conversationTracker.recordTemplateMessage(guestId, contentSid, result.sid);
    
    return result;
  }

  /**
   * Smart message sending - uses template if needed, free-form if allowed
   */
  async sendMessage(
    to: string,
    guestId: string,
    body?: string,
    guestName?: string
  ): Promise<WhatsAppResponse> {
    const canUseFreeForm = await this.conversationTracker.canSendFreeForm(guestId);

    if (canUseFreeForm && body) {
      // Within 24 hours - can send free-form message
      return this.sendFreeFormMessage(to, body);
    } else {
      // Must use Meta template (>24 hours or first message)
      if (!guestName) {
        throw new Error('Guest name required for template message');
      }
      return this.sendInvitation(to, guestName, guestId);
    }
  }

  /**
   * Update message status from webhook
   */
  async updateMessageStatus(twilioSid: string, status: string): Promise<void> {
    await this.conversationTracker.updateMessageStatus(twilioSid, status);
  }

  /**
   * Check if guest can receive free-form messages
   */
  async canSendFreeForm(guestId: string): Promise<boolean> {
    return this.conversationTracker.canSendFreeForm(guestId);
  }
}