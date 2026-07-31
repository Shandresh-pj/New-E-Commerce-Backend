import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { ChatConversation } from "./chat_conversation.entity";
import { User } from "./user";

export enum CallType {
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  MEETING = "MEETING"
}

export enum CallStatus {
  INITIATED = "INITIATED",
  ACTIVE = "ACTIVE",
  ENDED = "ENDED",
  MISSED = "MISSED",
  REJECTED = "REJECTED"
}

@Entity("call_sessions")
export class CallSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100, unique: true })
  meeting_code!: string;

  @Column({ type: "int", nullable: true })
  conversation_id!: number | null;

  @Column({ type: "int" })
  caller_id!: number;

  @Column({ type: "enum", enum: CallType, default: CallType.AUDIO })
  call_type!: CallType;

  @Column({ type: "enum", enum: CallStatus, default: CallStatus.INITIATED })
  status!: CallStatus;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  started_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  ended_at!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  @ManyToOne(() => ChatConversation, { onDelete: "SET NULL" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: ChatConversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: "caller_id" })
  caller!: User;
}
