import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
