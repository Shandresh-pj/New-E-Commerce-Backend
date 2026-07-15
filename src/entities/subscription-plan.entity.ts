import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { UserSubscription } from "./user-subscription.entity";

@Entity("subscription_plans")
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column("decimal", { precision: 10, scale: 2 })
  monthly_price!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  yearly_price!: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency!: string;

  @Column({ type: "int", default: 0 })
  trial_days!: number;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "json", nullable: true })
  features!: any;

  @Column({ type: "varchar", length: 50, nullable: true })
  badge!: string | null; // e.g. "Recommended", "Most Popular"

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => UserSubscription, (sub) => sub.plan)
  subscriptions!: UserSubscription[];
}
