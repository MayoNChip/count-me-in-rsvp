import twilio, { Twilio, validateRequest } from "twilio";
import { db } from "@/lib/db";
import { whatsappInvitations, whatsappTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";
import { TwilioErrorHandler } from "./twilio-errors";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
  statusCallbackUrl?: string;
}

export interface SendMessageOptions {
  to: string;
  templateName: string;
  variables: Record<string, string>;
  guestId: string;
  eventId: string;
}

export interface TwilioError {
  code: number;
  message: string;
  moreInfo?: string;
}

export const twilioClient = new Twilio();

export class TwilioService {
  private client: twilio.Twilio;
  private whatsappNumber: string;
  private statusCallbackUrl?: string;

  constructor(config?: TwilioConfig) {
    // Use environment variables if config not provided
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber =
      config?.whatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      throw new Error("Twilio configuration is missing required fields");
    }

    this.client = twilio(accountSid, authToken);
    this.whatsappNumber = whatsappNumber.startsWith("whatsapp:")
      ? whatsappNumber
      : `whatsapp:${whatsappNumber}`;
    this.statusCallbackUrl =
      config?.statusCallbackUrl || process.env.TWILIO_STATUS_CALLBACK_URL;
  }

  /**
   * Send a WhatsApp message using a template
   */
  async sendWhatsAppMessage(options: SendMessageOptions): Promise<string> {
    const { to, templateName, variables, guestId, eventId } = options;

    try {
      // Load template from database
      const template = await this.loadTemplate(templateName);
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      // Render message content
      const messageContent = this.renderTemplate(template.content, variables);

      // Format phone number for WhatsApp
      const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

      // Create invitation record
      const [invitation] = await db
        .insert(whatsappInvitations)
        .values({
          guestId,
          eventId,
          templateName,
          templateVariables: variables,
          messageContent,
          twilioStatus: "queued",
        })
        .returning();

      // Send message via Twilio
      const message = await this.client.messages.create({
        from: this.whatsappNumber,
        to: formattedTo,
        body: messageContent,
        statusCallback: this.statusCallbackUrl,
      });

      // Update invitation with Twilio message SID
      await db
        .update(whatsappInvitations)
        .set({
          twilioMessageSid: message.sid,
          twilioStatus: message.status,
          sentAt: new Date(),
        })
        .where(eq(whatsappInvitations.id, invitation.id));

      return message.sid;
    } catch (error) {
      // Handle Twilio-specific errors
      if (this.isTwilioError(error)) {
        const errorDetails = TwilioErrorHandler.parseTwilioError(error);
        await this.recordFailure(
          guestId,
          eventId,
          templateName,
          variables,
          error
        );

        // Use user-friendly message
        const userMessage = TwilioErrorHandler.getUserMessage(
          errorDetails.code
        );
        throw new Error(userMessage);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Send multiple WhatsApp messages
   */
  async sendBulkWhatsAppMessages(messages: SendMessageOptions[]): Promise<{
    successful: string[];
    failed: Array<{ guestId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ guestId: string; error: string }> = [];

    // Process messages with rate limiting
    for (const message of messages) {
      try {
        // Add delay to respect rate limits (1 message per second for WhatsApp)
        await this.delay(1000);

        const sid = await this.sendWhatsAppMessage(message);
        successful.push(sid);
      } catch (error) {
        failed.push({
          guestId: message.guestId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, any>
  ): boolean {
    const webhookSecret = process.env.TWILIO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn(
        "TWILIO_WEBHOOK_SECRET not configured, skipping signature validation"
      );
      return true;
    }

    return validateRequest(webhookSecret, signature, url, params);
  }

  /**
   * Process webhook status update
   */
  async processStatusUpdate(
    messageSid: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    // Find the invitation by Twilio message SID
    const [invitation] = await db
      .select()
      .from(whatsappInvitations)
      .where(eq(whatsappInvitations.twilioMessageSid, messageSid))
      .limit(1);

    if (!invitation) {
      console.warn(`No invitation found for message SID: ${messageSid}`);
      return;
    }

    // Update invitation status
    const updateData: any = {
      twilioStatus: status,
      updatedAt: new Date(),
    };

    // Set appropriate timestamp based on status
    switch (status) {
      case "sent":
        updateData.sentAt = new Date();
        break;
      case "delivered":
        updateData.deliveredAt = new Date();
        break;
      case "read":
        updateData.readAt = new Date();
        break;
      case "failed":
      case "undelivered":
        updateData.failedAt = new Date();
        updateData.twilioErrorCode = errorCode;
        updateData.twilioErrorMessage = errorMessage;

        // Schedule retry if within retry limit and error is retryable
        const errorCodeNum = parseInt(errorCode || "0");
        if (
          invitation.retryCount &&
          invitation.maxRetries &&
          invitation.retryCount < invitation.maxRetries &&
          TwilioErrorHandler.isRetryable(errorCodeNum)
        ) {
          updateData.retryCount = invitation.retryCount + 1;
          const retryDelay = TwilioErrorHandler.getRetryDelay(
            errorCodeNum,
            invitation.retryCount + 1
          );
          if (retryDelay) {
            updateData.nextRetryAt = new Date(Date.now() + retryDelay);
          }
        }
        break;
    }

    await db
      .update(whatsappInvitations)
      .set(updateData)
      .where(eq(whatsappInvitations.id, invitation.id));
  }

  /**
   * Retry failed message
   */
  async retryFailedMessage(invitationId: string): Promise<string> {
    const [invitation] = await db
      .select()
      .from(whatsappInvitations)
      .where(eq(whatsappInvitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (
      invitation.retryCount &&
      invitation.maxRetries &&
      invitation.retryCount >= invitation.maxRetries
    ) {
      throw new Error("Maximum retry attempts exceeded");
    }

    // Send the message again
    return await this.sendWhatsAppMessage({
      to: invitation.guestId, // This needs to be resolved to phone number
      templateName: invitation.templateName,
      variables: invitation.templateVariables as Record<string, string>,
      guestId: invitation.guestId,
      eventId: invitation.eventId,
    });
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<MessageInstance> {
    return await this.client.messages(messageSid).fetch();
  }

  /**
   * Load template from database
   */
  private async loadTemplate(templateName: string) {
    const [template] = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.name, templateName))
      .limit(1);

    return template;
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    content: string,
    variables: Record<string, string>
  ): string {
    let rendered = content;

    // Replace {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      rendered = rendered.replace(regex, value);
    });

    return rendered;
  }

  /**
   * Record message failure
   */
  private async recordFailure(
    guestId: string,
    eventId: string,
    templateName: string,
    variables: Record<string, string>,
    error: TwilioError
  ): Promise<void> {
    await db.insert(whatsappInvitations).values({
      guestId,
      eventId,
      templateName,
      templateVariables: variables,
      twilioStatus: "failed",
      twilioErrorCode: error.code.toString(),
      twilioErrorMessage: error.message,
      failedAt: new Date(),
    });
  }

  /**
   * Check if error is from Twilio
   */
  private isTwilioError(error: any): error is TwilioError {
    return (
      error &&
      typeof error.code === "number" &&
      typeof error.message === "string"
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1min, 2min, 4min, 8min, etc.
    return Math.min(60000 * Math.pow(2, attemptNumber - 1), 3600000); // Max 1 hour
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
