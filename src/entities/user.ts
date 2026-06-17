import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  mobilenumber: string;

  @Column({ default: false })
  isSuperAdmin: boolean;

  @Column({default : true})
  Active : boolean;
}

@Entity("user_roles")
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  role_id: number;

  @Column()
  company_id: number;

  @Column({ nullable: true })
  branch_id: number;
}