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

  constructor(private configService: ConfigService) { }

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
        model: 'gemini-2.0-flash',
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
        Namamu Adalah Sentinela
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
        'common',
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

  async getInsights(): Promise<RagQueryResponse> {
    try {
      const prompt = `Buatkan key insight dan key strategy berdasarkan data di atas.
  
  **Pola Penting:**
  1. Hubungan antara sentimen positif dan engagement: Apakah benar konten positif menghasilkan engagement 40% lebih tinggi?
  2. Analisis sentimen netral: Peluang apa yang bisa ditangkap UMKM untuk meningkatkan daya saing dari opini yang belum jelas positif/negative?
  3. Dari sentimen positif, aspek apa yang paling sering dipuji (harga, kualitas, pelayanan, inovasi)? Bagaimana UMKM bisa memanfaatkan hal ini untuk branding?
  4. Berdasarkan analisis sentimen, strategi komunikasi digital apa yang sebaiknya dijalankan UMKM untuk meningkatkan citra di media sosial?
  5. Mengapa hanya 0.6% konten yang berhasil memicu emosi positif?
  6. Potensi Tersembunyi: Apakah ada postingan netral dengan engagement tinggi yang sebenarnya bisa dikategorikan positif?
  7. Analisis bagaimana UMKM lokal di Indonesia saat ini memanfaatkan media sosial untuk membangun citra brand. Identifikasi gap antara penggunaan media sosial tradisional dengan pendekatan analisis sentimen yang lebih canggih. Berikan data statistik terkini dan contoh kasus nyata.
  
  **Arah Analisis:**
  - Fokus pada: Strategi konten
  - Tujuan: Meningkatkan engagement melalui konten yang lebih emosional
  - Stakeholder: Tim marketing
  
  **Format Output:**
  1. **Headline Insight**: 1 kalimat singkat yang paling mencolok
  2. **Data Pendukung**: 3-5 angka kunci terkait
  3. **Analisis Mendalam**:
     - Penyebab potensial
     - Implikasi bisnis
     - Perbandingan dengan benchmark
  4. **Rekomendasi Aksi**:
     - 2-3 langkah konkret
     - Timeline implementasi
     - Metrik sukses
  5. **Risiko & Peluang**:
     - Risiko jika tidak diatasi
     - Peluang yang bisa dimanfaatkan
  6. **Saran dan Strategy**:
     - Saran untuk UMKM kedepannya
     - Strategy yang nanti digunakan kedepannya
  
  **Tingkat Kedalaman:** Komprehensif
  
  Berikan jawaban yang terstruktur dan mendalam berdasarkan data yang tersedia.`;

      const result = await this.askQuestion(prompt);
      return result;
    } catch (error) {
      this.logger.error('Error getting insights:', error);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }
}
