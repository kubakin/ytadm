import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigEntryEntity } from '../../database/entities/config-entry.entity';
import { ConfigsController } from './configs.controller';
import { ConfigsService } from './configs.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigEntryEntity])],
  controllers: [ConfigsController],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
