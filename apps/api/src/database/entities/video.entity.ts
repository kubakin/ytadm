import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('videos')
export class VideoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  youtubeUrl: string;

  @Column({ type: 'text', default: '' })
  youtubeVideoDescription: string;

  @ManyToOne(() => ProjectEntity, (project) => project.videos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity;

  @Column()
  projectId: string;
}
