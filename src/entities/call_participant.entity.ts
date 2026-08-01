import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { CallSession } from "./call_session.entity";
import { User } from "./user";

export enum CallParticipantStatus {
  INVITED = "INVITED",
  CONNECTED = "CONNECTED",
  MUTED = "MUTED",
  VIDEO_OFF = "VIDEO_OFF",
  SCREEN_SHARING = "SCREEN_SHARING",
  LEFT = "LEFT"
}

@Entity("call_participants")
export class CallParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  session_id!: number;

  @Column({ type: "int" })
  user_id!: number;

  @Column({ type: "enum", enum: CallParticipantStatus, default: CallParticipantStatus.INVITED })
  status!: CallParticipantStatus;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  joined_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  left_at!: Date | null;

  @ManyToOne(() => CallSession, { onDelete: "CASCADE" })
  @JoinColumn({ name: "session_id" })
  session!: CallSession;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
