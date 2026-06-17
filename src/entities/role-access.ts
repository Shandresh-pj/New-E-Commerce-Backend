import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("role_permissions")
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role_id: number;

  @Column()
  menu: string;

  @Column({ default: false })
  can_view: boolean;

  @Column({ default: false })
  can_add: boolean;

  @Column({ default: false })
  can_edit: boolean;

  @Column({ default: false })
  can_delete: boolean;
}