import dataSource from "../config/database";
import { ChatConversation } from "../entities/chat_conversation.entity";
import { ChatMessage, MessageMediaType } from "../entities/chat_message.entity";
import { ChatParticipant } from "../entities/chat_participant.entity";
import { User } from "../entities/user";
import { Like, In } from "typeorm";

export class ChatService {
  private conversationRepo = dataSource.getRepository(ChatConversation);
  private messageRepo = dataSource.getRepository(ChatMessage);
  private participantRepo = dataSource.getRepository(ChatParticipant);
  private userRepo = dataSource.getRepository(User);

  private inMemoryStatuses: any[] = [
    {
      id: 101,
      userId: 1,
      userName: "PJSV Super Admin",
      mediaUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
      time: "Today, 10:45 AM",
      type: "IMAGE"
    },
    {
      id: 102,
      userId: 2,
      userName: "App Admin",
      text: "🚀 Enterprise Communication & E2EE Workspace is live across all departments!",
      time: "Today, 8:30 AM",
      type: "TEXT"
    }
  ];

  async getCompanyStatuses(companyId: number) {
    return this.inMemoryStatuses;
  }

  async createStatus(data: { user_id: number; media_url?: string; text?: string; type: string }) {
    const user = await this.userRepo.findOne({ where: { id: data.user_id } });
    const newStatus = {
      id: Date.now(),
      userId: data.user_id,
      userName: user ? user.name : `User #${data.user_id}`,
      mediaUrl: data.media_url || null,
      text: data.text || null,
      type: data.type || "TEXT",
      time: "Just now",
      createdAt: new Date().toISOString(),
    };
    this.inMemoryStatuses.unshift(newStatus);
    return newStatus;
  }

  /**
   * Get all conversations accessible to a user
   */
  async getUserConversations(userId: number, companyId?: number, branchId?: number) {
    const userParticipants = await this.participantRepo.find({
      where: { user_id: userId },
    });

    const conversationIds = userParticipants.map((p: any) => p.conversation_id);
    if (conversationIds.length === 0) {
      return [];
    }

    const conversations = await this.conversationRepo.find({
      where: { id: In(conversationIds) },
      order: { updated_at: "DESC" },
    });

    const result = await Promise.all(
      conversations.map(async (conv: any) => {
        const latestMsg = await this.messageRepo.findOne({
          where: { conversation_id: conv.id },
          order: { created_at: "DESC" },
          relations: { sender: true },
        });

        const unreadCount = await this.messageRepo.count({
          where: { conversation_id: conv.id },
        });

        const participants = await this.participantRepo.find({
          where: { conversation_id: conv.id },
          relations: { user: true },
        });

        return {
          ...conv,
          title: conv.title || (conv.type === "ONE_TO_ONE" ? this.getOneToOneTitle(participants, userId) : "Group Chat"),
          unreadCount,
          latestMessage: latestMsg
            ? {
                ...latestMsg,
                sender_name: latestMsg.sender ? latestMsg.sender.name : `User #${latestMsg.sender_id}`,
              }
            : null,
          participants: participants.map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            role: p.role,
            public_key: p.public_key,
            user_name: p.user ? p.user.name : `User #${p.user_id}`,
            email: p.user ? p.user.email : undefined,
          })),
        };
      })
    );

    return result;
  }

  private getOneToOneTitle(participants: any[], currentUserId: number): string {
    const other = participants?.find((p: any) => p.user_id !== currentUserId);
    return other && other.user ? other.user.name : "Direct Chat";
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: {
    type: string;
    title?: string;
    company_id: number;
    branch_id?: number;
    department_id?: number;
    team_id?: number;
    created_by: number;
    participant_user_ids: number[];
  }) {
    const conv = this.conversationRepo.create({
      type: data.type as any,
      title: data.title || null,
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      department_id: data.department_id || null,
      team_id: data.team_id || null,
      is_encrypted: true,
    });

    const savedConv = await this.conversationRepo.save(conv);

    const allParticipantIds = Array.from(new Set([data.created_by, ...(data.participant_user_ids || [])]));
    const participantEntities = allParticipantIds.map((uId: number) =>
      this.participantRepo.create({
        conversation_id: savedConv.id,
        user_id: uId,
        role: (uId === data.created_by ? "ADMIN" : "MEMBER") as any,
      })
    );

    await this.participantRepo.save(participantEntities);

    return this.getConversationDetails(savedConv.id, data.created_by);
  }

  async getConversationDetails(conversationId: number, currentUserId: number) {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conv) throw new Error("Conversation not found");

    const participants = await this.participantRepo.find({
      where: { conversation_id: conversationId },
      relations: { user: true },
    });

    return {
      ...conv,
      title: conv.title || (conv.type === "ONE_TO_ONE" ? this.getOneToOneTitle(participants, currentUserId) : "Group Chat"),
      participants: participants.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        role: p.role,
        public_key: p.public_key,
        user_name: p.user ? p.user.name : `User #${p.user_id}`,
        email: p.user ? p.user.email : undefined,
      })),
    };
  }

  /**
   * Fetch paginated messages
   */
  async getMessages(conversationId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { conversation_id: conversationId },
      order: { created_at: "ASC" },
      take: limit,
      skip: skip,
      relations: { sender: true },
    });

    return {
      messages: messages.map((m: any) => ({
        ...m,
        sender_name: m.sender ? m.sender.name : `User #${m.sender_id}`,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Save a new message
   */
  async sendMessage(data: {
    conversation_id: number;
    sender_id: number;
    content?: string;
    encrypted_content?: string;
    iv_salt?: string;
    media_url?: string;
    media_type?: MessageMediaType;
    file_name?: string;
    file_size?: number;
    reply_to_id?: number;
  }) {
    const message = this.messageRepo.create({
      conversation_id: data.conversation_id,
      sender_id: data.sender_id,
      content: data.content || null,
      encrypted_content: data.encrypted_content || null,
      iv_salt: data.iv_salt || null,
      media_url: data.media_url || null,
      media_type: data.media_type || MessageMediaType.TEXT,
      file_name: data.file_name || null,
      file_size: data.file_size || null,
      reply_to_id: data.reply_to_id || null,
    });

    const savedMsg = await this.messageRepo.save(message);
    await this.conversationRepo.update(data.conversation_id, { updated_at: new Date() });

    const sender = await this.userRepo.findOne({ where: { id: data.sender_id } });

    return {
      ...savedMsg,
      sender_name: sender ? sender.name : `User #${data.sender_id}`,
    };
  }

  /**
   * Toggle reaction on a message
   */
  async toggleReaction(messageId: number, userId: number, emoji: string) {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new Error("Message not found");

    let reactions = message.reactions || {};
    let users = reactions[emoji] || [];

    if (users.includes(userId)) {
      users = users.filter((id: number) => id !== userId);
    } else {
      users.push(userId);
    }

    if (users.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = users;
    }

    message.reactions = reactions;
    await this.messageRepo.save(message);
    return message;
  }

  /**
   * Directory search for employees & teams
   */
  async searchUsersAndTeams(companyId: number, query: string) {
    const users = await this.userRepo.find({
      where: [
        { name: Like(`%${query}%`) },
        { email: Like(`%${query}%`) },
      ],
      take: 20,
    });

    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.userType,
    }));
  }

  /**
   * Clear all messages in a conversation
   */
  async clearChat(conversationId: number) {
    await this.messageRepo.delete({ conversation_id: conversationId });
    return { success: true, message: "Chat cleared successfully" };
  }

  /**
   * Delete conversation and participants
   */
  async deleteConversation(conversationId: number, userId: number) {
    await this.messageRepo.delete({ conversation_id: conversationId });
    await this.participantRepo.delete({ conversation_id: conversationId });
    await this.conversationRepo.delete({ id: conversationId });
    return { success: true, message: "Conversation deleted successfully" };
  }

  /**
   * Register E2EE Public Key
   */
  async registerPublicKey(userId: number, conversationId: number, publicKey: string) {
    const participant = await this.participantRepo.findOne({
      where: { user_id: userId, conversation_id: conversationId },
    });
    if (participant) {
      participant.public_key = publicKey;
      await this.participantRepo.save(participant);
    }
    return { success: true };
  }
}
