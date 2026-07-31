import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { ChatConversation } from "./chat_conversation.entity";
import { User } from "./user";

export enum MessageMediaType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO_VOICE_NOTE = "AUDIO_VOICE_NOTE",
  DOCUMENT = "DOCUMENT",
  FILE = "FILE"
}

@Entity("chat_messages")
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  conversation_id!: number;

  @Column({ type: "int" })
  sender_id!: number;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "text", nullable: true })
  encrypted_content!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  iv_salt!: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  media_url!: string | null;

  @Column({ type: "enum", enum: MessageMediaType, default: MessageMediaType.TEXT })
  media_type!: MessageMediaType;

  @Column({ type: "varchar", length: 255, nullable: true })
  file_name!: string | null;

  @Column({ type: "int", nullable: true })
  file_size!: number | null;

  @Column({ type: "int", nullable: true })
  reply_to_id!: number | null;

  @Column({ type: "json", nullable: true })
  reactions!: Record<string, number[]> | null; // e.g. { "👍": [userId1, userId2], "❤️": [userId3] }

  @Column({ type: "boolean", default: false })
  is_edited!: boolean;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  @ManyToOne(() => ChatConversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: ChatConversation;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sender_id" })
  sender!: User;
}
