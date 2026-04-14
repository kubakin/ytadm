import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { TeamWatchEntity } from '../../database/entities/team-watch.entity';
import { VideoEntity } from '../../database/entities/video.entity';
import { ConfigEntryEntity } from '../../database/entities/config-entry.entity';
import { ThemeEntity } from '../../database/entities/theme.entity';
import { TeamThemeKnowledgeEntity } from '../../database/entities/team-theme-knowledge.entity';
import { youtubeChannelToCanonicalUrl } from '../../common/youtube-channel.util';

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
    @InjectRepository(ThemeEntity)
    private readonly themesRepo: Repository<ThemeEntity>,
    @InjectRepository(TeamThemeKnowledgeEntity)
    private readonly knowledgeRepo: Repository<TeamThemeKnowledgeEntity>,
  ) {}

  registerTeam() {
    return { teamApiKey: randomUUID() };
  }

  async getNextVideo(clientIp: string, fallbackTeamApiKey?: string) {
    const resolvedTeamApiKey = this.buildTeamIdentity(clientIp, fallbackTeamApiKey);
    const activePrepareTask = await this.viewsRepo.findOne({
      where: { teamApiKey: resolvedTeamApiKey, status: 'prepare' },
      order: { updatedAt: 'DESC' },
    });
    if (activePrepareTask?.taskId) {
      const [project, video, configRows] = await Promise.all([
        this.projectsRepo.findOne({
          where: { id: activePrepareTask.projectId },
          relations: { theme: true },
        }),
        this.videosRepo.findOne({ where: { id: activePrepareTask.videoId } }),
        this.configRepo.find(),
      ]);
      if (project && video) {
        const config = this.normalizeRuntimeConfig(
          Object.fromEntries(configRows.map((item) => [item.key, item.value])),
        );
        return this.buildAssignedTaskResponse(project, video, resolvedTeamApiKey, activePrepareTask.taskId, config);
      }
    }

    const teamIp = this.normalizeClientIp(clientIp);
    const projects = await this.projectsRepo.find({ where: { enabled: true }, relations: { theme: true } });
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const knownThemeIds = new Set(
      (await this.knowledgeRepo.find({ where: { teamIp } })).map((item) => item.themeId),
    );
    const knownThemeProjects = projects.filter(
      (project) => !!project.themeId && knownThemeIds.has(project.themeId),
    );
    const newThemeProjects = projects.filter(
      (project) => !!project.themeId && !knownThemeIds.has(project.themeId),
    );

    const ownTask = await this.pickTaskForProjectList(
      knownThemeProjects,
      resolvedTeamApiKey,
      oneDayAgo,
      true,
    );
    if (ownTask) {
      return ownTask;
    }

    const learningTask = await this.pickTaskForProjectList(
      newThemeProjects,
      resolvedTeamApiKey,
      oneDayAgo,
      false,
    );
    if (learningTask) {
      if ('themeId' in learningTask && learningTask.themeId && !knownThemeIds.has(learningTask.themeId)) {
        await this.knowledgeRepo.save({ teamIp, themeId: learningTask.themeId });
      }
      return learningTask;
    }

    return { hasTask: false, teamApiKey: resolvedTeamApiKey };
  }

  private async pickTaskForProjectList(
    projects: ProjectEntity[],
    resolvedTeamApiKey: string,
    oneDayAgo: Date,
    assignTask: boolean,
  ) {
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
      const config = this.normalizeRuntimeConfig(
        Object.fromEntries(configRows.map((item) => [item.key, item.value])),
      );
      if (!assignTask) {
        return {
          type: 'test' as const,
          theme: project.theme?.name || '',
          keywords: project.theme?.keywords || [],
          vkGroup: project.theme?.vkGroup || '',
          landingUrl: project.theme?.landingUrl || '',
          themeId: project.themeId,
          config,
        };
      }

      const taskId = randomUUID();
      await this.viewsRepo.save({
        taskId,
        teamApiKey: resolvedTeamApiKey,
        projectId: project.id,
        videoId: video.id,
        status: 'prepare',
      });

      return this.buildAssignedTaskResponse(project, video, resolvedTeamApiKey, taskId, config);
    }
    return null;
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

  async removeCurrentTask(taskId: string) {
    const task = await this.viewsRepo.findOne({ where: { taskId } });
    if (!task) {
      return { deleted: false, reason: 'Task not found' };
    }
    await this.viewsRepo.remove(task);
    return { deleted: true, taskId };
  }

  async getTeamKnowledgeOverview() {
    const [themes, knownRows, teamViewRows] = await Promise.all([
      this.themesRepo.find(),
      this.knowledgeRepo.find(),
      this.viewsRepo.find({ select: { teamApiKey: true } }),
    ]);
    const themeMap = new Map(themes.map((theme) => [theme.id, theme]));
    const byIp = new Map<
      string,
      { teamIp: string; knownThemes: Array<{ id: string; name: string }> }
    >();
    const ensureRow = (teamIp: string) => {
      if (!byIp.has(teamIp)) {
        byIp.set(teamIp, { teamIp, knownThemes: [] });
      }
      return byIp.get(teamIp)!;
    };

    for (const item of knownRows) {
      const theme = themeMap.get(item.themeId);
      if (!theme) continue;
      ensureRow(item.teamIp).knownThemes.push({ id: theme.id, name: theme.name });
    }
    for (const row of teamViewRows) {
      const teamIp = this.teamApiKeyToIp(row.teamApiKey);
      if (teamIp) {
        ensureRow(teamIp);
      }
    }

    return Array.from(byIp.values()).sort((a, b) => a.teamIp.localeCompare(b.teamIp));
  }

  async removeTeamKnowledge(teamIp: string, themeId: string) {
    const normalizedIp = this.normalizeClientIp(teamIp);
    await this.knowledgeRepo.delete({ teamIp: normalizedIp, themeId });
    return { deleted: true };
  }

  private buildTeamIdentity(clientIp?: string, fallbackTeamApiKey?: string) {
    const ip = this.normalizeClientIp(clientIp);
    if (ip) {
      return `ip:${ip}`;
    }
    return fallbackTeamApiKey?.trim() || `guest-${randomUUID()}`;
  }

  private normalizeClientIp(clientIp?: string) {
    return clientIp?.trim() || '';
  }

  private teamApiKeyToIp(teamApiKey: string) {
    if (!teamApiKey.startsWith('ip:')) {
      return '';
    }
    return teamApiKey.slice(3).trim();
  }

  private normalizeRuntimeConfig(rawConfig: Record<string, string>) {
    const config = { ...rawConfig };
    const legacyVariants = config.variants || config.VARIANTS;
    if (!config.strategies && !config.STRATEGIES && legacyVariants) {
      config.strategies = legacyVariants;
    }
    if (!config.strategies && !config.STRATEGIES) {
      config.strategies = 'classicStrategy,vkStrategy';
    }
    return config;
  }

  private buildAssignedTaskResponse(
    project: ProjectEntity,
    video: VideoEntity,
    resolvedTeamApiKey: string,
    taskId: string,
    config: Record<string, string>,
  ) {
    return {
      hasTask: true,
      theme: project.theme?.name || '',
      keywords: project.theme?.keywords || [],
      teamApiKey: resolvedTeamApiKey,
      tastId: taskId,
      taskId,
      youtubeVideoUrl: video.youtubeUrl,
      youtubeChannelUrl: youtubeChannelToCanonicalUrl(project.youtubeChannel || ''),
      youtubeChannelName: project.youtubeChannelName || project.youtubeChannel || '',
      youtubeChanngelDescription: project.youtubeChannelDescription || '',
      youtubeVideoDescription: video.youtubeVideoDescription || '',
      videoPrefix: project.videoPrefix || '',
      vkGroup: project.theme?.vkGroup || '',
      landingUrl: project.theme?.landingUrl || '',
      config,
    };
  }
}
