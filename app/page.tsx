"use client";

import { useEffect, useRef, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";

const MODELS = [
  {
    label: "Phi-3 Mini (fast, recommended)",
    value: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
  },
  {
    label: "Gemma 2B (balanced)",
    value: "gemma-2-2b-it-q4f16_1-MLC",
  },
];

type Message = { role: "user" | "assistant"; content: string };

export default function WebLLMChat() {
  const engineRef = useRef<any>(null);
  const [model, setModel] = useState(MODELS[0].value);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<string>("Idle");

  async function initModel(selectedModel: string) {
    setLoading(true);
    setStatus("Loading model (first time may take a while)...");

    try {
      const engine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (p: any) => {
          setStatus(`${p.text || "Loading..."}`);
        },
      });

      engineRef.current = engine;
      setStatus("Model ready");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load model");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initModel(model);
  }, []);

  async function sendMessage() {
    if (!engineRef.current || !prompt.trim()) return;

    const userMessage: Message = { role: "user", content: prompt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setPrompt("");

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const stream = await engineRef.current.chat.completions.create({
      messages: updatedMessages.slice(-6),
      stream: true,
    });

    let assistantText = "";

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      assistantText += delta;

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: assistantText,
        };
        return copy;
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">WebLLM Starter</h1>
          <p className="text-xs text-gray-400">Runs fully in browser (WebGPU)</p>
        </div>

        <div className="flex gap-2 items-center">
          <select
            className="bg-gray-900 border border-gray-700 px-2 py-1 rounded"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              initModel(e.target.value);
            }}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status */}
      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-800">
        {status}
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-2xl p-3 rounded-lg whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-blue-600 ml-auto"
                : "bg-gray-800 mr-auto"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 rounded"
          value={prompt}
          placeholder="Ask something..."
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
