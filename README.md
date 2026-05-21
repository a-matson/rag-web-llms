# In-Browser LLM with RAG & Long-Term Memory

An experimental project exploring the capabilities and limitations of running Large Language Models (LLMs) entirely in the browser using WebGPU, and overcoming context window constraints using local Retrieval-Augmented Generation (RAG) and episodic memory.

## 🧠 Motivation

The goal of this project was to test how **in-browser LLMs** perform using tools like `@mlc-ai/web-llm`. Running models locally in the browser is incredible for user privacy and zero-server infrastructure. 

However, I quickly discovered a major issue: **Context Limits**. 
Browser-based LLMs (like Phi-3-mini or Gemma 2B) have strict memory limits due to device constraints (WebGL/WebGPU VRAM). If a conversation goes on too long, or if you paste too much text, the model crashes or forgets the beginning of the conversation. 

To solve this, I implemented a local **RAG (Retrieval-Augmented Generation)** system and a multi-tiered memory architecture. Instead of stuffing everything into the prompt, the app archives old messages and personal facts into a local IndexedDB, embeds them using in-browser transformers, and only retrieves what is strictly necessary for the current prompt.

## 🚀 Evolution of Features (By Commit)

Here is how the system evolved to overcome these limitations:

### 1. Initial WebLLM Setup
* Bootstrapped a Next.js application.
* Integrated `@mlc-ai/web-llm` to download and run quantized models (Phi-3 Mini, Gemma 2B) directly in the browser via WebGPU.
* Created the basic chat UI (`app/page.tsx`).

### 2. Context Budgeting & Sliding Window (`lib/budget.ts`)
* **The Problem:** The app crashed when the conversation exceeded `MAX_CONTEXT_TOKENS`.
* **The Fix:** Implemented a sliding window approach (`getSlidingWindow`) to dynamically truncate the chat history, keeping only the most recent messages that fit within a safe budget margin.

### 3. Local Knowledge Base & RAG (`lib/rag.ts`)
* **The Problem:** The LLM couldn't answer questions about custom documents because I couldn't fit them in the context window.
* **The Fix:** Built an entirely in-browser RAG pipeline.
  * Added `@huggingface/transformers` to generate embeddings (`Xenova/all-MiniLM-L6-v2`) via WebGPU.
  * Chunked large texts automatically (`chunkText`).
  * Stored chunks and embeddings locally in the browser using `idb` (IndexedDB).

### 4. Advanced Retrieval: HyDE & Hybrid Search
* **The Problem:** Standard vector search sometimes missed keyword-specific queries.
* **The Fix:** * Implemented **Hybrid Search**: Combined vector semantic search with fuzzy keyword search using `minisearch`.
  * Implemented **HyDE (Hypothetical Document Embeddings)**: The app now asks the LLM to generate a hypothetical answer to the user's prompt *first*, and uses that answer to search the vector database, vastly improving retrieval accuracy.

### 5. Multi-Tiered Memory: Episodic & Semantic (`lib/memory.ts`)
* **The Problem:** Because of the sliding window, the LLM forgot facts about the user and earlier parts of the conversation.
* **The Fix:** * **Episodic Memory:** When older messages are pushed out of the sliding window, they are automatically embedded and archived into IndexedDB.
  * **Semantic Memory:** The system transparently uses a background LLM call to extract concrete facts ("User likes X", "User's name is Y") from the user's messages and saves them as deduplicated core memories.
  * **Context Injection:** When the user asks a new question, the app does a vector search against the user's Past Conversations and Known Facts, injecting only the relevant context into the prompt.

## 💻 How to Run It

This project is built with Next.js and runs 100% locally. No API keys are required.

### Prerequisites
* A modern browser that supports **WebGPU** (Chrome, Edge, or Brave).
* Node.js installed on your machine.

### Installation

1. Clone the repository and navigate into the directory.
2. Install dependencies using your preferred package manager (the project uses `pnpm`, but `npm` or `yarn` work too):

```bash
npm install
# or
yarn install
# or
pnpm install
```
## Running the Development Server

### Start the local server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open http://localhost:3000 with your browser.

## Usage

1. **Wait for the model to load:** The first time you load the page, your browser will download the LLM weights and the embedding model. This may take a few minutes depending on your internet speed. Subsequent loads will be much faster as the models are cached in your browser.

2. **Add Knowledge:** Click the `+ Add Knowledge` button to paste text. This will chunk, embed, and store the text in your browser's IndexedDB.

3. **Chat:** Ask questions about the knowledge you added, or just chat. Watch how the system seamlessly manages token limits while maintaining long-term memory!

## Stack
- Framework: Next.js
- LLM Engine: WebLLM (@mlc-ai/web-llm)
- Embeddings: Hugging Face Transformers.js (@huggingface/transformers)
- Vector Storage: IndexedDB (idb)
- Keyword Search: MiniSearch (minisearch)