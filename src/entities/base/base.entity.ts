import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * AbstractBaseEntity — reusable base for all entities.
 *
 * Every entity that extends this class automatically gets:
 *  • id          — auto-increment primary key
 *  • created_at  — set once on INSERT
 *  • updated_at  — updated on every UPDATE
 *
 * Usage:
 *   @Entity("my_table")
 *   export class MyModel extends AbstractBaseEntity { ... }
 */
export abstract class AbstractBaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}
