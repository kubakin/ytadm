import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, IsNull, Or, Repository } from 'typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { TeamWatchEntity } from '../../database/entities/team-watch.entity';
import { VideoEntity } from '../../database/entities/video.entity';
import { ConfigEntryEntity } from '../../database/entities/config-entry.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepo: Repository<ProjectEntity>,
    @InjectRepository(VideoEntity)
    private readonly videosRepo: Repository<VideoEntity>,
    @InjectRepository(TeamWatchEntity)
    private readonly viewsRepo: Repository<TeamWatchEntity>,
    @InjectRepository(ConfigEntryEntity)
    private readonly configRepo: Repository<ConfigEntryEntity>,
  ) {}

  registerTeam() {
    return { teamApiKey: randomUUID() };
  }

  async getNextVideo(clientIp: string, fallbackTeamApiKey?: string) {
    const resolvedTeamApiKey = this.buildTeamIdentity(clientIp, fallbackTeamApiKey);
    const projects = await this.projectsRepo.find({
      where: [{ enabled: true }, { enabled: IsNull() }],
    });
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const project of projects) {
      const completedViews = await this.viewsRepo.count({
        where: { projectId: project.id, status: 'completed' },
      });
      if (completedViews >= project.targetViews) {
        continue;
      }

      const recentRows = await this.viewsRepo
        .createQueryBuilder('task')
        .select('task.videoId', 'videoId')
        .where('task.teamApiKey = :teamApiKey', { teamApiKey: resolvedTeamApiKey })
        .andWhere('task.projectId = :projectId', { projectId: project.id })
        .andWhere('task.createdAt >= :oneDayAgo', { oneDayAgo })
        .getRawMany<{ videoId: string }>();
      const blockedVideoIds = recentRows.map((row) => row.videoId);

      const qb = this.videosRepo
        .createQueryBuilder('video')
        .where('video.projectId = :projectId', { projectId: project.id })
        .orderBy('video.id', 'ASC');
      if (blockedVideoIds.length > 0) {
        qb.andWhere('video.id NOT IN (:...blockedVideoIds)', { blockedVideoIds });
      }
      const video = await qb.getOne();

      if (!video) {
        continue;
      }

      const configRows = await this.configRepo.find();
      const config = Object.fromEntries(configRows.map((item) => [item.key, item.value]));

      const taskId = randomUUID();
      await this.viewsRepo.save({
        taskId,
        teamApiKey: resolvedTeamApiKey,
        projectId: project.id,
        videoId: video.id,
        status: 'prepare',
      });

      return {
        hasTask: true,
        teamApiKey: resolvedTeamApiKey,
        tastId: taskId,
        taskId,
        youtubeVideoUrl: video.youtubeUrl,
        youtubeChannelUrl: project.youtubeChannelUrl || project.youtubeChannel || '',
        youtubeChannelName: project.youtubeChannelName || project.youtubeChannel || '',
        youtubeChanngelDescription: project.youtubeChannelDescription || '',
        youtubeVideoDescription: video.youtubeVideoDescription || '',
        config,
      };
    }

    return { hasTask: false, teamApiKey: resolvedTeamApiKey };
  }

  async reportTaskStatus(taskId: string, status: string, clientIp: string) {
    const nextStatus = status.toLowerCase();
    if (!['prepare', 'process', 'completed'].includes(nextStatus)) {
      throw new BadRequestException('Status must be one of: prepare, process, completed');
    }

    const task = await this.viewsRepo.findOne({ where: { taskId } });
    if (!task) {
      return { accepted: false, reason: 'Task not found' };
    }
    const requesterKey = this.buildTeamIdentity(clientIp);
    if (task.teamApiKey !== requesterKey) {
      return { accepted: false, reason: 'Task belongs to another team' };
    }

    task.status = nextStatus as 'prepare' | 'process' | 'completed';
    await this.viewsRepo.save(task);

    return { accepted: true, taskId: task.taskId, status: task.status };
  }

  async getCurrentTasks() {
    const tasks = await this.viewsRepo
      .createQueryBuilder('task')
      .where('task.status IN (:...statuses)', { statuses: ['prepare', 'process'] })
      .orderBy('task.updatedAt', 'DESC')
      .getMany();

    const videoIds = [...new Set(tasks.map((task) => task.videoId))];
    const projectIds = [...new Set(tasks.map((task) => task.projectId))];
    const videos = videoIds.length
      ? await this.videosRepo.findBy({ id: In(videoIds) })
      : [];
    const projects = projectIds.length
      ? await this.projectsRepo.findBy({ id: In(projectIds) })
      : [];

    const videoMap = new Map(videos.map((video) => [video.id, video]));
    const projectMap = new Map(projects.map((project) => [project.id, project]));

    return tasks.map((task) => ({
      taskId: task.taskId,
      teamApiKey: task.teamApiKey,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      videoId: task.videoId,
      youtubeVideoUrl: videoMap.get(task.videoId)?.youtubeUrl ?? '',
      youtubeVideoTitle: videoMap.get(task.videoId)?.title ?? '',
      projectId: task.projectId,
      projectName: projectMap.get(task.projectId)?.name ?? '',
    }));
  }

  private buildTeamIdentity(clientIp?: string, fallbackTeamApiKey?: string) {
    const ip = clientIp?.trim();
    if (ip) {
      return `ip:${ip}`;
    }
    return fallbackTeamApiKey?.trim() || `guest-${randomUUID()}`;
  }
}
