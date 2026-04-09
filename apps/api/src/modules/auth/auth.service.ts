import {
  Injectable,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUserEntity } from '../../database/entities/admin-user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminsRepo: Repository<AdminUserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async onApplicationBootstrap() {
    const email = process.env.ADMIN_EMAIL ?? 'admin@local.dev';
    const password = process.env.ADMIN_PASSWORD ?? 'admin123';
    const existing = await this.adminsRepo.findOne({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 10);
      await this.adminsRepo.save({ email, passwordHash });
    }
  }

  async login(email: string, password: string) {
    const admin = await this.adminsRepo.findOne({ where: { email } });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
    });

    return { accessToken };
  }
}
