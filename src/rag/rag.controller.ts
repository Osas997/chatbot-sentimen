import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { RagService, RagQueryResponse } from './rag.service';
import { CreateQueryDto } from './dtos/create-query.dto';
import { QueryResponseDto } from './dtos/query-response.dto';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() queryDto: CreateQueryDto): Promise<QueryResponseDto> {
    const result: RagQueryResponse = await this.ragService.askQuestion(
      queryDto.question.trim(),
    );

    return {
      answer: result.answer,
      sources: result.sources,
    };
  }
}
