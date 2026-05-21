import { pipeline, FeatureExtractionPipeline } from "@huggingface/transformers";
import { openDB, IDBPDatabase } from "idb";


// embedding
let embedder: FeatureExtractionPipeline | null = null;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      device: "webgpu",
    });
  }
  return embedder;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// vector store
interface RAGDocument {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
}

export async function initDB(): Promise<IDBPDatabase> {
  return openDB("webllm-rag-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" });
      }
    },
  });
}

export async function addDocument(text: string) {
  const db = await initDB();
  const embedding = await getEmbedding(text);
  const doc: RAGDocument = {
    id: crypto.randomUUID(),
    text,
    embedding,
    timestamp: Date.now(),
  };
  await db.put("documents", doc);
}

// retrival
function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchDocuments(query: string, topK: number = 3) {
  const db = await initDB();
  const queryEmbedding = await getEmbedding(query);
  const allDocs: RAGDocument[] = await db.getAll("documents");

  const scoredDocs = allDocs.map((doc) => ({
    ...doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  return scoredDocs.sort((a, b) => b.score - a.score).slice(0, topK);
}