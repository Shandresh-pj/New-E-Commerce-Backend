import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from "typeorm";

@Entity("roles")
export class Role {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true
  })
  name: string;

  @Column({
    default: true
  })
  isActive: boolean;
}