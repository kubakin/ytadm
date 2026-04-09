import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;
}
