import { db } from "@/lib/db";
import { whatsappInvitations, guests } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export class ConversationTracker {
  /**
   * Check if we can send a free-form message to a guest
   * Returns true if last template message was sent <24 hours ago
   */
  async canSendFreeForm(guestId: string): Promise<boolean> {
    try {
      // Get the most recent successful message to this guest
      const lastMessage = await db
        .select({
          sentAt: whatsappInvitations.sentAt,
          twilioStatus: whatsappInvitations.twilioStatus,
          templateName: whatsappInvitations.templateName
        })
        .from(whatsappInvitations)
        .where(
          and(
            eq(whatsappInvitations.guestId, guestId),
            // Only consider delivered/sent messages
            eq(whatsappInvitations.twilioStatus, "delivered")
          )
        )
        .orderBy(desc(whatsappInvitations.sentAt))
        .limit(1);

      if (!lastMessage.length) {
        // No previous messages - must use template
        return false;
      }

      const lastMessageTime = new Date(lastMessage[0].sentAt || new Date());
      const now = new Date();
      const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

      // WhatsApp allows free-form messages for 24 hours after template
      return hoursSinceLastMessage < 24;

    } catch (error) {
      console.error('Error checking conversation status:', error);
      // Default to requiring template for safety
      return false;
    }
  }

  /**
   * Record that a template message was sent
   */
  async recordTemplateMessage(guestId: string, templateSid: string, twilioSid: string): Promise<void> {
    try {
      // Get the guest to find their eventId
      const guest = await db
        .select({ eventId: guests.eventId })
        .from(guests)
        .where(eq(guests.id, guestId))
        .limit(1);

      if (!guest.length) {
        console.error('Guest not found for conversation tracking');
        return;
      }

      await db.insert(whatsappInvitations).values({
        guestId,
        eventId: guest[0].eventId,
        templateName: `meta_template_${templateSid}`,
        twilioMessageSid: twilioSid,
        twilioStatus: "queued",
        sentAt: new Date(),
        messageContent: `Template message: ${templateSid}`
      });
    } catch (error) {
      console.error('Error recording template message:', error);
    }
  }

  /**
   * Update message status when we get webhook updates
   */
  async updateMessageStatus(twilioSid: string, status: string): Promise<void> {
    try {
      await db
        .update(whatsappInvitations)
        .set({ 
          twilioStatus: status,
          updatedAt: new Date()
        })
        .where(eq(whatsappInvitations.twilioMessageSid, twilioSid));
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  /**
   * Get conversation history for a guest
   */
  async getConversationHistory(guestId: string, limit: number = 10) {
    try {
      return await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.guestId, guestId))
        .orderBy(desc(whatsappInvitations.sentAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }
}