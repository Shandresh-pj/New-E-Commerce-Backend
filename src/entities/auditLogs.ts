// AuditLog.ts

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class AuditLog {

@PrimaryGeneratedColumn()
id:number;

@Column()
module:string;
// BRANCH / USER / COMPANY

@Column()
action:string;
// CREATE / UPDATE / DELETE

@Column()
recordId:number;

@Column()
userId:number;

@Column()
roleId:number;

@Column({
nullable:true
})
companyId:number;

@Column({
nullable:true
})
branchId:number;

@Column({
type:"json",
nullable:true
})
oldData:any;

@Column({
type:"json",
nullable:true
})
newData:any;

@CreateDateColumn()
createdAt:Date;

}



// AuditLogBackup.ts

@Entity()
export class AuditLogBackup {

@PrimaryGeneratedColumn()
id:number;

@Column()
module:string;

@Column()
action:string;

@Column()
recordId:number;

@Column()
userId:number;

@Column()
roleId:number;

@Column({
nullable:true
})
companyId:number;

@Column({
nullable:true
})
branchId:number;

@Column({
type:"json",
nullable:true
})
oldData:any;

@Column({
type:"json",
nullable:true
})
newData:any;

@CreateDateColumn()
createdAt:Date;

}