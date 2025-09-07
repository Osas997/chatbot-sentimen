import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  imports: [ConfigModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
