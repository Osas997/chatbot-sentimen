import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import * as fs from 'fs';
import * as path from 'path';

export interface RagQueryResponse {
  answer: string;
  sources: string[];
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private vectorStore: MemoryVectorStore;
  private qaChain: RetrievalQAChain;
  private embeddings: GoogleGenerativeAIEmbeddings;
  private llm: ChatGoogleGenerativeAI;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeRag();
  }

  private async initializeRag() {
    try {
      this.logger.log('Initializing RAG system...');

      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new BadRequestException('GEMINI_API_KEY is not configured');
      }

      // Initialize embeddings
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: 'embedding-001',
      });

      // Initialize LLM
      this.llm = new ChatGoogleGenerativeAI({
        apiKey,
        model: 'gemini-1.5-flash',
        temperature: 0.7,
      });

      // Load and process documents
      const documents = await this.loadDocuments();

      // Create vector store
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        this.embeddings,
      );

      // Create retriever
      const retriever = this.vectorStore.asRetriever({
        k: 5,
      });

      // Create custom prompt template
      const promptTemplate = PromptTemplate.fromTemplate(`
        Namamu Adalah Chatbot UMKM
        Gunakan konteks berikut untuk menjawab pertanyaan tentang UMKM (Usaha Mikro, Kecil, dan Menengah).
        Berikan jawaban yang informatif dan akurat berdasarkan data yang tersedia.
        
        Konteks:
        {context}
        
        Pertanyaan: {question}
        
        Jawaban:
      `);

      // Create QA chain
      this.qaChain = RetrievalQAChain.fromLLM(this.llm, retriever, {
        prompt: promptTemplate,
        returnSourceDocuments: true,
      });

      this.logger.log('RAG system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RAG system:', error);
      throw error;
    }
  }

  private async loadDocuments(): Promise<Document[]> {
    try {
      const jsonPath = path.join(
        process.cwd(),
        'src',
        'data',
        'json',
        'dataset_umkm.json',
      );

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Dataset file not found at: ${jsonPath}`);
      }

      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const documents: Document[] = [];

      // Convert JSON data to LangChain documents
      if (Array.isArray(jsonData)) {
        jsonData.forEach((item, index) => {
          const content = this.extractContentFromItem(item);
          const metadata = {
            source: `dataset_umkm.json`,
            index: index,
            ...this.extractMetadataFromItem(item),
          };

          documents.push(
            new Document({
              pageContent: content,
              metadata: metadata,
            }),
          );
        });
      } else {
        // Handle single object
        const content = this.extractContentFromItem(jsonData);
        const metadata = {
          source: `dataset_umkm.json`,
          index: 0,
          ...this.extractMetadataFromItem(jsonData),
        };

        documents.push(
          new Document({
            pageContent: content,
            metadata: metadata,
          }),
        );
      }

      this.logger.log(`Loaded ${documents.length} documents from JSON file`);
      return documents;
    } catch (error) {
      this.logger.error('Error loading documents:', error);
      throw error;
    }
  }

  private extractContentFromItem(item: any): string {
    // Extract meaningful content from JSON item
    const contentParts: string[] = [];

    // Common fields that might contain useful content
    const contentFields = [
      'nama',
      'name',
      'title',
      'judul',
      'deskripsi',
      'description',
      'desc',
      'kategori',
      'category',
      'jenis',
      'type',
      'alamat',
      'address',
      'lokasi',
      'location',
      'produk',
      'product',
      'layanan',
      'service',
      'keterangan',
      'info',
      'detail',
    ];

    contentFields.forEach((field) => {
      if (item[field] && typeof item[field] === 'string') {
        contentParts.push(`${field}: ${item[field]}`);
      }
    });

    // If no specific fields found, stringify the entire object
    if (contentParts.length === 0) {
      contentParts.push(JSON.stringify(item, null, 2));
    }

    return contentParts.join('\n');
  }

  private extractMetadataFromItem(item: any): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract metadata fields
    const metadataFields = [
      'id',
      'kategori',
      'category',
      'jenis',
      'type',
      'alamat',
      'address',
      'kota',
      'city',
      'provinsi',
      'province',
    ];

    metadataFields.forEach((field) => {
      if (item[field]) {
        metadata[field] = item[field];
      }
    });

    return metadata;
  }

  async askQuestion(query: string): Promise<RagQueryResponse> {
    try {
      if (!this.qaChain) {
        throw new Error('RAG system is not initialized');
      }

      this.logger.log(`Processing query: ${query}`);

      const result = await this.qaChain.call({
        query: query,
      });

      // Extract sources from source documents
      const sources: string[] = [];
      if (result.sourceDocuments && Array.isArray(result.sourceDocuments)) {
        result.sourceDocuments.forEach((doc: Document, index: number) => {
          const source = doc.metadata?.source || 'Unknown source';
          const docIndex =
            doc.metadata?.index !== undefined ? doc.metadata.index : index;
          sources.push(`${source} (Document ${docIndex})`);
        });
      }

      return {
        answer:
          result.text ||
          result.answer ||
          'Tidak dapat menemukan jawaban yang sesuai.',
        sources: [...new Set(sources)], // Remove duplicates
      };
    } catch (error) {
      this.logger.error('Error processing query:', error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }
}
