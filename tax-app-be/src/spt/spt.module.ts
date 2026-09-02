import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SptController } from './spt.controller';
import { SptService } from './spt.service';

@Module({
  imports: [AuthModule],
  controllers: [SptController],
  providers: [SptService],
})
export class SptModule {}
