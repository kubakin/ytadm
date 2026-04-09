import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { VideoEntity } from './video.entity';

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  shortDescription: string;

  @Column()
  youtubeChannel: string;

  @Column({ default: '' })
  youtubeChannelUrl: string;

  @Column({ default: '' })
  youtubeChannelName: string;

  @Column({ type: 'text', default: '' })
  youtubeChannelDescription: string;

  @Column({ type: 'int' })
  targetViews: number;

  /** If false, project is hidden from team task assignment but kept in admin. */
  @Column({ default: true })
  enabled: boolean;

  @OneToMany(() => VideoEntity, (video) => video.project)
  videos: VideoEntity[];
}
