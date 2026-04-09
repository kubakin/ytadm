import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('team_views')
export class TeamWatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, nullable: true })
  taskId: string | null;

  @Column()
  teamApiKey: string;

  @Column()
  projectId: string;

  @Column()
  videoId: string;

  @Column({ type: 'varchar', default: 'prepare' })
  status: 'prepare' | 'process' | 'completed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
