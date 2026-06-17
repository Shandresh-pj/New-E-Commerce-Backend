import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Status master (e.g. ACTIVE / INACTIVE), grouped by StatusFor (e.g. "COMMON").
 * PascalCase properties => PascalCase JSON keys (Id, StatusCode) consumed by the
 * Angular admin UI dropdowns.
 */
@Entity("statuses_1")
export class Status {

  @PrimaryGeneratedColumn()
  Id!: number;

  @Column()
  StatusCode!: string;

  @Column({ default: "COMMON" })
  StatusFor!: string;

  @CreateDateColumn()
  CreatedAt!: Date;

  @UpdateDateColumn()
  UpdatedAt!: Date;
}
