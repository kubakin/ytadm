import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VideoEntity } from './video.entity';
import { ThemeEntity } from './theme.entity';

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  shortDescription: string;

  /** Channel URL, @handle, or channel id (UC…); single source for imports and team API. */
  @Column()
  youtubeChannel: string;

  @Column({ default: '' })
  youtubeChannelName: string;

  @Column({ type: 'text', default: '' })
  youtubeChannelDescription: string;

  @Column({ default: '' })
  videoPrefix: string;

  @Column({ type: 'int' })
  targetViews: number;

  /** If false, project is hidden from team task assignment but kept in admin. */
  @Column({ default: true })
  enabled: boolean;

  @ManyToOne(() => ThemeEntity, (theme) => theme.projects, { nullable: true })
  @JoinColumn({ name: 'themeId' })
  theme: ThemeEntity | null;

  @Column({ type: 'uuid', nullable: true })
  themeId: string | null;

  @OneToMany(() => VideoEntity, (video) => video.project)
  videos: VideoEntity[];
}
