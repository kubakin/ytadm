import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigEntryEntity } from '../../database/entities/config-entry.entity';
import { DEFAULT_CONFIGS } from './default-configs';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class ConfigsService {
  constructor(
    @InjectRepository(ConfigEntryEntity)
    private readonly configsRepo: Repository<ConfigEntryEntity>,
  ) {}

  list() {
    return this.configsRepo.find({ order: { key: 'ASC' } });
  }

  async create(dto: CreateConfigDto) {
    const key = dto.key.trim();
    if (!key) {
      throw new BadRequestException('Config key cannot be empty');
    }
    const exists = await this.configsRepo.findOne({ where: { key } });
    if (exists) {
      throw new BadRequestException('Config key already exists');
    }
    return this.configsRepo.save({
      key,
      value: dto.value,
      description: dto.description,
    });
  }

  async update(id: string, dto: UpdateConfigDto) {
    const row = await this.configsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Config not found');
    }

    if (dto.key && dto.key !== row.key) {
      const exists = await this.configsRepo.findOne({ where: { key: dto.key } });
      if (exists) {
        throw new BadRequestException('Config key already exists');
      }
      row.key = dto.key.trim();
    }
    if (typeof dto.value === 'string') {
      row.value = dto.value;
    }
    if (typeof dto.description === 'string') {
      row.description = dto.description;
    }

    return this.configsRepo.save(row);
  }

  async remove(id: string) {
    const row = await this.configsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Config not found');
    }
    await this.configsRepo.remove(row);
    return { deleted: true };
  }

  // Utility used by migration or manual seed jobs if needed.
  getDefaults() {
    return DEFAULT_CONFIGS;
  }
}
