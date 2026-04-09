import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { join } from 'path';
import { ProjectsModule } from './modules/projects/projects.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ConfigsModule } from './modules/configs/configs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'yt_admin',
      autoLoadEntities: true,
      synchronize: true,
      migrations: [join(__dirname, 'database/migrations/*{.ts,.js}')],
      migrationsRun: true,
    }),
    AuthModule,
    ProjectsModule,
    TeamsModule,
    ConfigsModule,
  ],
})
export class AppModule {}
