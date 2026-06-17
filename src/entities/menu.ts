import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("menus")
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Dashboard, Users, Orders

  @Column()
  path: string; // /dashboard

  @Column({ nullable: true })
  icon: string;
}

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; 
  // READ, WRITE, DELETE
}

