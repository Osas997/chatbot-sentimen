# RAG (Retrieval Augmented Generation) dengan NestJS + LangChain

Implementasi RAG menggunakan NestJS, LangChain, dan Gemini API untuk sistem tanya jawab berbasis dataset UMKM.

## Fitur

- ✅ Load data JSON dari dataset UMKM
- ✅ Embedding menggunakan Google Generative AI Embeddings
- ✅ Vector store in-memory untuk penyimpanan lokal
- ✅ Retrieval dengan k=5 dokumen teratas
- ✅ QA Chain menggunakan Gemini 1.5 Flash
- ✅ REST API endpoint untuk query
- ✅ Health check endpoint

## Setup

### 1. Install Dependencies
Dependencies sudah terinstall di `package.json`.

### 2. Konfigurasi Environment
```bash
# Copy file .env.example ke .env
cp .env.example .env
```

Edit file `.env` dan tambahkan API key Gemini Anda:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Dapatkan API key dari: https://makersuite.google.com/app/apikey

### 3. Jalankan Aplikasi
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### 1. Query RAG
**POST** `/rag/query`

Request body:
```json
{
  "question": "Apa saja kategori UMKM yang ada?"
}
```

Response:
```json
{
  "answer": "Berdasarkan data yang tersedia, terdapat berbagai kategori UMKM seperti Kuliner - Kopi & Minuman, dan kategori lainnya...",
  "sources": [
    "dataset_umkm.json (Document 0)",
    "dataset_umkm.json (Document 1)"
  ]
}
```

### 2. Health Check
**GET** `/rag/health`

Response:
```json
{
  "status": "healthy",
  "ready": true,
  "documentCount": 1
}
```

## Contoh Penggunaan

### Menggunakan curl
```bash
# Health check
curl http://localhost:3000/rag/health

# Query
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Berapa engagement rata-rata untuk brand belikopi?"}'
```

### Menggunakan Postman atau Thunder Client
1. **Health Check**
   - Method: GET
   - URL: `http://localhost:3000/rag/health`

2. **Query**
   - Method: POST
   - URL: `http://localhost:3000/rag/query`
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "question": "Apa saja platform yang digunakan UMKM untuk promosi?"
     }
     ```

## Contoh Pertanyaan

- "Apa saja kategori UMKM yang ada dalam dataset?"
- "Bagaimana sentiment analysis dari brand belikopi?"
- "Platform apa saja yang digunakan untuk promosi UMKM?"
- "Berapa rata-rata engagement untuk kategori Kuliner - Kopi & Minuman?"
- "Brand mana yang memiliki likes tertinggi?"

## Struktur Kode

```
src/
├── rag/
│   ├── rag.service.ts      # Service utama RAG
│   ├── rag.controller.ts   # REST API controller
│   └── rag.module.ts       # Module definition
├── data/
│   └── json/
│       └── dataset_umkm.json  # Dataset UMKM
└── app.module.ts           # Main app module
```

## Troubleshooting

### Error: GEMINI_API_KEY is not configured
- Pastikan file `.env` sudah dibuat dan berisi API key yang valid
- Restart aplikasi setelah menambahkan API key

### Error: Dataset file not found
- Pastikan file `src/data/json/dataset_umkm.json` ada
- Periksa path file sudah benar

### Error: Failed to initialize RAG system
- Periksa koneksi internet untuk akses API Gemini
- Pastikan API key masih valid dan belum expired
- Cek log aplikasi untuk detail error

## Pengembangan Lebih Lanjut

- [ ] Implementasi persistent vector store (ChromaDB/Pinecone)
- [ ] Caching untuk query yang sering digunakan
- [ ] Streaming response untuk query panjang
- [ ] Authentication dan rate limiting
- [ ] Metrics dan monitoring
- [ ] Support untuk multiple file formats (CSV, PDF, etc.)
