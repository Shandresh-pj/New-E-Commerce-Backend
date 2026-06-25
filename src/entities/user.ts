import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Branch } from "./branch";
import { Company } from "./company";
import { Role } from "./roles";
import { StatusType, UserType } from "../utils/Role-Access";

@Entity("users")
export class User {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    unique: true
  })
  email: string;

  @Column()
  password: string;

  @Column({
    nullable: true
  })
  mobilenumber: string;

  @Column({
    type: "enum",
    enum: UserType,
    default: UserType.CUSTOMER
  })
  userType: UserType;

  @Column({
    default: true
  })
  mustChangePassword: boolean;

  @Column({
    default: false
  })
  emailVerified: boolean;

  @Column({
    default: true
  })
  isActive: boolean;

  @Column({
    default: false
  })
  isSuperAdmin: boolean;

  @Column({
    nullable: true
  })
  lastLoginAt: Date;

  @OneToMany(
    () => UserRole,
    role => role.user
  )
  userRoles: UserRole[];

  @Column({
  nullable: true
})
verificationToken: string;

@Column({ nullable: true })
  image!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ default: "ACTIVE" })
  status!: StatusType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


@Entity("user_roles")
export class UserRole {

  @PrimaryGeneratedColumn()
  id: number;

//   @Column()
//  user_id:number;

//  @Column()
//  role_id:number;

//  @Column()
//  company_id:number;

//  @Column()
//  branch_id:number;

 @ManyToOne(()=>User,user=>user.userRoles)
 @JoinColumn({name:"user_id" })user:User;

 @ManyToOne(()=>Role) @JoinColumn({name:"role_id"})role:Role;


 @ManyToOne(()=>Company,company=>company.userRoles)
 @JoinColumn({name:"company_id"})company:Company;


 @ManyToOne(()=>Branch, branch=>branch.userRoles )
 @JoinColumn({ name:"branch_id"})branch:Branch;
}