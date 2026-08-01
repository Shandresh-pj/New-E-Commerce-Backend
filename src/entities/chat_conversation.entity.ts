import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Company } from "./company";
import { Branch } from "./branch";

export enum ConversationType {
  ONE_TO_ONE = "ONE_TO_ONE",
  GROUP = "GROUP",
  TEAM = "TEAM",
  DEPARTMENT = "DEPARTMENT",
  BRANCH = "BRANCH",
  COMPANY_ANNOUNCEMENT = "COMPANY_ANNOUNCEMENT"
}

@Entity("chat_conversations")
export class ChatConversation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  title!: string | null;

  @Column({ type: "enum", enum: ConversationType, default: ConversationType.ONE_TO_ONE })
  type!: ConversationType;

  @Column({ type: "int", nullable: true })
  company_id!: number | null;

  @Column({ type: "int", nullable: true })
  branch_id!: number | null;

  @Column({ type: "int", nullable: true })
  department_id!: number | null;

  @Column({ type: "int", nullable: true })
  team_id!: number | null;

  @Column({ type: "int", nullable: true })
  created_by!: number | null;

  @Column({ type: "boolean", default: true })
  is_encrypted!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatar_url!: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;

  @ManyToOne(() => Company, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: "branch_id" })
  branch!: Branch;
}
