import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { VideoEntity } from '../../database/entities/video.entity';
import { TeamWatchEntity } from '../../database/entities/team-watch.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepo: Repository<ProjectEntity>,
    @InjectRepository(VideoEntity)
    private readonly videosRepo: Repository<VideoEntity>,
    @InjectRepository(TeamWatchEntity)
    private readonly viewsRepo: Repository<TeamWatchEntity>,
  ) {}

  async createProject(dto: CreateProjectDto) {
    const channelMeta = await this.resolveChannelMeta(dto.youtubeChannel);
    const project = await this.projectsRepo.save({
      name: dto.name,
      shortDescription: dto.shortDescription,
      youtubeChannel: dto.youtubeChannel.trim(),
      targetViews: dto.targetViews,
      youtubeChannelName:
        dto.youtubeChannelName?.trim() || channelMeta.youtubeChannelName,
      youtubeChannelDescription:
        dto.youtubeChannelDescription !== undefined
          ? dto.youtubeChannelDescription
          : channelMeta.youtubeChannelDescription,
      videoPrefix: dto.videoPrefix?.trim() || '',
      enabled: dto.enabled ?? true,
    });
    const videos = await this.fetchRecentChannelVideos(dto.youtubeChannel);

    if (videos.length > 0) {
      await this.videosRepo.save(
        videos.map((video) => ({
          ...video,
          projectId: project.id,
        })),
      );
    }

    return {
      ...project,
      importedVideosCount: videos.length,
    };
  }

  async listProjects() {
    const projects = await this.projectsRepo.find({
      relations: { videos: true },
      order: { name: 'ASC' },
    });
    const stats = await this.viewsRepo
      .createQueryBuilder('v')
      .select('v.projectId', 'projectId')
      .addSelect("COUNT(*) FILTER (WHERE v.status = 'completed')", 'completedViews')
      .groupBy('v.projectId')
      .getRawMany<{ projectId: string; completedViews: string }>();

    const map = new Map(stats.map((s) => [s.projectId, Number(s.completedViews)]));
    return projects.map((project) => ({
      ...project,
      completedViews: map.get(project.id) ?? 0,
    }));
  }

  async getProjectVideoStats(projectId: string) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const videos = await this.videosRepo.find({ where: { projectId }, order: { title: 'ASC' } });
    const rows = await this.viewsRepo
      .createQueryBuilder('v')
      .select('v.videoId', 'videoId')
      .addSelect("COUNT(*) FILTER (WHERE v.status = 'completed')", 'watchedCount')
      .where('v.projectId = :projectId', { projectId })
      .groupBy('v.videoId')
      .getRawMany<{ videoId: string; watchedCount: string }>();

    const map = new Map(rows.map((row) => [row.videoId, Number(row.watchedCount)]));
    return {
      project: {
        id: project.id,
        name: project.name,
        targetViews: project.targetViews,
      },
      videos: videos.map((video) => ({
        id: video.id,
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        watchedCount: map.get(video.id) ?? 0,
      })),
    };
  }

  async updateProject(projectId: string, patch: UpdateProjectDto) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (patch.name !== undefined) project.name = patch.name;
    if (patch.shortDescription !== undefined) project.shortDescription = patch.shortDescription;
    if (patch.youtubeChannel !== undefined) {
      project.youtubeChannel = patch.youtubeChannel.trim();
    }
    if (patch.targetViews !== undefined) project.targetViews = patch.targetViews;
    if (patch.youtubeChannelName !== undefined) project.youtubeChannelName = patch.youtubeChannelName;
    if (patch.youtubeChannelDescription !== undefined) {
      project.youtubeChannelDescription = patch.youtubeChannelDescription;
    }
    if (patch.videoPrefix !== undefined) project.videoPrefix = patch.videoPrefix.trim();
    if (typeof patch.enabled === 'boolean') project.enabled = patch.enabled;
    return this.projectsRepo.save(project);
  }

  async deleteProject(projectId: string) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    await this.viewsRepo.delete({ projectId });
    await this.projectsRepo.remove(project);
    return { deleted: true, id: projectId };
  }

  private getYoutubeApiKey() {
    return process.env.YOUTUBE_API_KEY?.trim() || null;
  }

  private normalizeChannelInput(input: string) {
    const value = input.trim();
    const channelIdMatch = value.match(/UC[a-zA-Z0-9_-]{22}/);
    if (channelIdMatch) {
      return { channelId: channelIdMatch[0] };
    }

    const handleMatch = value.match(/@([a-zA-Z0-9._-]+)/);
    if (handleMatch) {
      return { searchQuery: handleMatch[1] };
    }

    return { searchQuery: value };
  }

  private async resolveChannelId(channelInput: string) {
    const apiKey = this.getYoutubeApiKey();
    if (!apiKey) {
      throw new BadRequestException('YOUTUBE_API_KEY is missing');
    }
    const normalized = this.normalizeChannelInput(channelInput);
    if (normalized.channelId) {
      return normalized.channelId;
    }
    if (!normalized.searchQuery) {
      throw new BadRequestException('YouTube channel value is empty');
    }

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      maxResults: '1',
      q: normalized.searchQuery,
      key: apiKey,
    });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    );
    if (!response.ok) {
      throw new InternalServerErrorException('Failed to resolve YouTube channel');
    }
    const payload = (await response.json()) as {
      items?: Array<{ snippet?: { channelId?: string } }>;
    };
    const channelId = payload.items?.[0]?.snippet?.channelId;
    if (!channelId) {
      throw new BadRequestException('Cannot resolve YouTube channel from input');
    }
    return channelId;
  }

  private async fetchUploadsPlaylistId(channelId: string) {
    const apiKey = this.getYoutubeApiKey();
    if (!apiKey) {
      throw new BadRequestException('YOUTUBE_API_KEY is missing');
    }
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: channelId,
      key: apiKey,
    });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    );
    if (!response.ok) {
      throw new InternalServerErrorException('Failed to fetch channel details');
    }

    const payload = (await response.json()) as {
      items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
    };
    const uploadsPlaylistId =
      payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new BadRequestException('Cannot access channel uploads playlist');
    }
    return uploadsPlaylistId;
  }

  private async fetchRecentChannelVideos(channelInput: string) {
    const apiKey = this.getYoutubeApiKey();
    if (!apiKey) {
      return this.fetchRecentChannelVideosFallback(channelInput);
    }

    try {
      return await this.fetchRecentChannelVideosWithApi(channelInput);
    } catch {
      return this.fetchRecentChannelVideosFallback(channelInput);
    }
  }

  private async fetchRecentChannelVideosWithApi(channelInput: string) {
    const apiKey = this.getYoutubeApiKey();
    if (!apiKey) {
      throw new BadRequestException('YOUTUBE_API_KEY is missing');
    }
    const channelId = await this.resolveChannelId(channelInput);
    const uploadsPlaylistId = await this.fetchUploadsPlaylistId(channelId);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const collected: Array<{
      title: string;
      youtubeUrl: string;
      youtubeVideoDescription: string;
    }> = [];
    const usedVideoIds = new Set<string>();
    let pageToken: string | undefined = undefined;

    while (collected.length < 300) {
      const params = new URLSearchParams({
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: '50',
        key: apiKey,
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
      );
      if (!response.ok) {
        throw new InternalServerErrorException('Failed to fetch channel videos');
      }

      const payload = (await response.json()) as {
        nextPageToken?: string;
        items?: Array<{
          snippet?: {
            title?: string;
            description?: string;
            publishedAt?: string;
            resourceId?: { videoId?: string };
          };
        }>;
      };

      const items = payload.items ?? [];
      let reachedOldVideos = false;
      for (const item of items) {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;
        const description = item.snippet?.description ?? '';
        const publishedAt = item.snippet?.publishedAt;
        if (!videoId || !title || !publishedAt) {
          continue;
        }

        if (new Date(publishedAt) < oneYearAgo) {
          reachedOldVideos = true;
          continue;
        }

        if (usedVideoIds.has(videoId)) {
          continue;
        }

        usedVideoIds.add(videoId);
        collected.push({
          title,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          youtubeVideoDescription: description,
        });
        if (collected.length >= 300) {
          break;
        }
      }

      if (collected.length >= 300 || reachedOldVideos || !payload.nextPageToken) {
        break;
      }
      pageToken = payload.nextPageToken;
    }

    return collected;
  }

  private buildChannelVideosUrl(channelInput: string) {
    const value = channelInput.trim();
    if (!value) {
      throw new BadRequestException('YouTube channel value is empty');
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      const url = new URL(value);
      const cleanPath = url.pathname.replace(/\/+$/, '');
      if (!cleanPath.endsWith('/videos')) {
        url.pathname = `${cleanPath}/videos`;
      }
      return url.toString();
    }

    if (value.startsWith('@')) {
      return `https://www.youtube.com/${value}/videos`;
    }

    if (/^UC[a-zA-Z0-9_-]{22}$/.test(value)) {
      return `https://www.youtube.com/channel/${value}/videos`;
    }

    throw new BadRequestException(
      'Fallback requires channel URL, @handle, or channelId (UC...)',
    );
  }

  private extractInitialData(html: string) {
    const marker = 'var ytInitialData = ';
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }

    const startIndex = markerIndex + marker.length;
    const endIndex = html.indexOf(';</script>', startIndex);
    if (endIndex < 0) {
      return null;
    }

    const jsonCandidate = html.slice(startIndex, endIndex).trim();
    try {
      return JSON.parse(jsonCandidate) as unknown;
    } catch {
      return null;
    }
  }

  private collectVideoRenderers(
    node: unknown,
    collected: Array<{
      videoId?: string;
      title?: { runs?: Array<{ text?: string }>; simpleText?: string };
      publishedTimeText?: { simpleText?: string; runs?: Array<{ text?: string }> };
    }>,
  ) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if ('videoRenderer' in (node as Record<string, unknown>)) {
      const videoRenderer = (node as { videoRenderer?: unknown }).videoRenderer as {
        videoId?: string;
        title?: { runs?: Array<{ text?: string }>; simpleText?: string };
        publishedTimeText?: { simpleText?: string; runs?: Array<{ text?: string }> };
      };
      if (videoRenderer) {
        collected.push(videoRenderer);
      }
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          this.collectVideoRenderers(child, collected);
        }
      } else {
        this.collectVideoRenderers(value, collected);
      }
    }
  }

  private collectContinuationTokens(node: unknown, collected: Set<string>) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if ('continuationCommand' in (node as Record<string, unknown>)) {
      const token = (node as {
        continuationCommand?: { token?: string };
      }).continuationCommand?.token;
      if (token) {
        collected.add(token);
      }
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          this.collectContinuationTokens(child, collected);
        }
      } else {
        this.collectContinuationTokens(value, collected);
      }
    }
  }

  private extractInnertubeApiKey(html: string) {
    const match = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    return match?.[1] ?? null;
  }

  private ageTextToDays(ageText: string) {
    const normalized = ageText.toLowerCase();
    if (
      normalized.includes('just now') ||
      normalized.includes('сейчас') ||
      normalized.includes('streamed')
    ) {
      return 0;
    }

    const match = normalized.match(
      /(\d+)\s*(minute|minutes|min|hour|hours|day|days|week|weeks|month|months|year|years|мин|минута|минут|час|часа|часов|день|дня|дней|недел|неделя|недели|месяц|месяца|месяцев|год|года|лет)/,
    );
    if (!match) {
      return null;
    }

    const value = Number(match[1]);
    const unit = match[2];
    if (
      unit.startsWith('min') ||
      unit === 'minute' ||
      unit === 'minutes' ||
      unit.startsWith('мин')
    ) {
      return 0;
    }
    if (
      unit.startsWith('hour') ||
      unit === 'час' ||
      unit === 'часа' ||
      unit === 'часов'
    ) {
      return 0;
    }
    if (unit.startsWith('day') || unit.startsWith('дн')) return value;
    if (unit.startsWith('week') || unit.startsWith('недел') || unit === 'неделя' || unit === 'недели') return value * 7;
    if (unit.startsWith('month') || unit.startsWith('меся')) return value * 30;
    if (unit.startsWith('year') || unit === 'год' || unit === 'года' || unit === 'лет') return value * 365;
    return null;
  }

  private extractVideosFromRenderers(
    renderers: Array<{
      videoId?: string;
      title?: { runs?: Array<{ text?: string }>; simpleText?: string };
      publishedTimeText?: { simpleText?: string; runs?: Array<{ text?: string }> };
    }>,
    seenIds: Set<string>,
    result: Array<{ title: string; youtubeUrl: string; youtubeVideoDescription: string }>,
  ) {
    for (const renderer of renderers) {
      if (result.length >= 300) {
        break;
      }

      const videoId = renderer.videoId;
      if (!videoId || seenIds.has(videoId)) {
        continue;
      }

      const ageText =
        renderer.publishedTimeText?.simpleText ??
        renderer.publishedTimeText?.runs?.map((item) => item.text).join(' ') ??
        '';
      const ageDays = this.ageTextToDays(ageText);
      if (ageDays === null || ageDays > 365) {
        continue;
      }

      const title =
        renderer.title?.simpleText ??
        renderer.title?.runs?.map((item) => item.text).join(' ') ??
        `Video ${videoId}`;

      seenIds.add(videoId);
      result.push({
        title,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        youtubeVideoDescription: '',
      });
    }
  }

  private async fetchContinuationData(
    token: string,
    innertubeApiKey: string,
  ): Promise<unknown | null> {
    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/browse?key=${innertubeApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
          continuation: token,
        }),
      },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as unknown;
  }

  private async fetchRecentChannelVideosFallback(channelInput: string) {
    const url = this.buildChannelVideosUrl(channelInput);
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Fallback fetch of channel page failed');
    }

    const html = await response.text();
    const initialData = this.extractInitialData(html);
    if (!initialData) {
      throw new InternalServerErrorException(
        'Could not parse channel page for videos (fallback)',
      );
    }
    const innertubeApiKey = this.extractInnertubeApiKey(html);

    const renderers: Array<{
      videoId?: string;
      title?: { runs?: Array<{ text?: string }>; simpleText?: string };
      publishedTimeText?: { simpleText?: string; runs?: Array<{ text?: string }> };
    }> = [];
    this.collectVideoRenderers(initialData, renderers);

    const result: Array<{
      title: string;
      youtubeUrl: string;
      youtubeVideoDescription: string;
    }> = [];
    const seenIds = new Set<string>();
    this.extractVideosFromRenderers(renderers, seenIds, result);

    if (result.length >= 300 || !innertubeApiKey) {
      return result;
    }

    const tokens = new Set<string>();
    this.collectContinuationTokens(initialData, tokens);
    const visitedTokens = new Set<string>();
    while (tokens.size > 0 && result.length < 300) {
      const token = tokens.values().next().value as string;
      tokens.delete(token);
      if (visitedTokens.has(token)) {
        continue;
      }
      visitedTokens.add(token);

      const continuationData = await this.fetchContinuationData(token, innertubeApiKey);
      if (!continuationData) {
        continue;
      }

      const continuationRenderers: Array<{
        videoId?: string;
        title?: { runs?: Array<{ text?: string }>; simpleText?: string };
        publishedTimeText?: { simpleText?: string; runs?: Array<{ text?: string }> };
      }> = [];
      this.collectVideoRenderers(continuationData, continuationRenderers);
      this.extractVideosFromRenderers(continuationRenderers, seenIds, result);

      this.collectContinuationTokens(continuationData, tokens);
    }

    return result;
  }

  private async resolveChannelMeta(channelInput: string) {
    return {
      youtubeChannelName: channelInput.trim(),
      youtubeChannelDescription: '',
    };
  }
}
