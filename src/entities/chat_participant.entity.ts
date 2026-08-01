import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { ChatConversation } from "./chat_conversation.entity";
import { User } from "./user";

export enum ParticipantRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}

@Entity("chat_participants")
export class ChatParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  conversation_id!: number;

  @Column({ type: "int" })
  user_id!: number;

  @Column({ type: "enum", enum: ParticipantRole, default: ParticipantRole.MEMBER })
  role!: ParticipantRole;

  @Column({ type: "text", nullable: true })
  public_key!: string | null;

  @Column({ type: "int", nullable: true })
  last_read_message_id!: number | null;

  @Column({ type: "boolean", default: false })
  is_muted!: boolean;

  @CreateDateColumn({ name: "joined_at" })
  joined_at!: Date;

  @ManyToOne(() => ChatConversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: ChatConversation;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
