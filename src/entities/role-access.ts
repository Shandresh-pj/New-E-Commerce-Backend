import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("role_access")
export class RoleAccess {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_id!: number;

  @Column({
    nullable: true,
  })
  branch_id!: number;

  @Column()
  role_name!: string;

  @Column()
  module_name!: string;

  @Column({
    default: false,
  })
  can_view!: boolean;

  @Column({
    default: false,
  })
  can_add!: boolean;

  @Column({
    default: false,
  })
  can_edit!: boolean;

  @Column({
    default: false,
  })
  can_delete!: boolean;

  @Column({
    default: false,
  })
  can_approve!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}