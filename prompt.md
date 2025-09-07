# Prompt

Buatkan saya implementasi **RAG (Retrieval Augmented Generation)** menggunakan **NestJS + LangChain**.

## Stack

- NestJS (TypeScript)
- LangChain
- Gunakan DB Local tidak perlu chromadb
- LLM: Gemini API (`@langchain/google-genai`)
- CSV Loader: bisa gunakan `csv-parse` atau `papaparse`

## Fitur yang Dibutuhkan

1. **Service RAG**
   - Load file JSON (`./data/json/dataset_umkm.json`)
   - Parse isi JSON→ ubah ke dokumen LangChain
   - Buat embedding menggunakan `GoogleGenerativeAIEmbeddings`
   - Simpan embedding local db / inmemory
   - Buat retriever (`k=5`)
   - Buat chain QA (RetrievalQAChain) dengan LLM `gemini-1.5-flash`
   - Method: `askQuestion(query: string)` → return jawaban + sumber dokumen

2. **Controller**
   - Endpoint `POST /rag/query`
   - Body: `{ "question": "..." }`
   - Response: `{ "answer": "...", "sources": [...] }`

3. **Module**
   - `RagModule` yang menggabungkan service + controller
   - Inisialisasi vectorstore sekali (singleton)

4. **Konfigurasi**
   - API Key Gemini diambil dari `.env` → `GEMINI_API_KEY`
   - Gunakan `@nestjs/config` untuk environment variables

## Struktur Folder
