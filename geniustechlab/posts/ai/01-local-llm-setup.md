---
title: "Run Your Own AI Locally: Ollama + Local LLMs on Your NUC"
date: 2026-03-24
category: ai
tags: [ai, llm, local, privacy, automation]
excerpt: "Don't send your data to OpenAI. Run Claude, Llama, and Mistral on your own hardware."
amazon_product: "Intel NUC"
---

# Run Your Own AI Locally: Ollama + Local LLMs on Your NUC

**Your AI doesn't need to call home to OpenAI.** Run it locally, keep your data private, save money.

I run local LLMs on my NUC for personal projects. Zero API costs. Zero data leaks. Just me and the model.

## Why Local?

**Cloud LLMs (ChatGPT, Claude API):**
- $0.01-0.10 per request
- Your data goes to Anthropic/OpenAI
- Rate limited
- Requires internet

**Local LLMs:**
- One-time cost (~$0, if you have the hardware)
- Your data stays on your machine
- No rate limits
- Works offline

**Tradeoff:** Slower (but getting better), less smart (but usable), more setup.

## Hardware Requirements

**Minimum:** 8GB RAM
**Recommended:** 16GB RAM
**Comfortable:** 32GB RAM

Your NUC from the homelab guide? Perfect. 16GB RAM = solid local LLM box.

**GPU acceleration** (optional):
- NVIDIA GPU = 3-10x faster
- Apple Silicon = built-in acceleration
- Intel iGPU = slight speedup
- CPU only = slowest, but works

## Best Local Models (2026)

### **Mistral 7B** — Best Speed/Quality
- 7 billion parameters (small = fast)
- Trained on code + general knowledge
- Runs on 8GB RAM
- Inference: 3-5 tokens/sec (fast enough)

```bash
ollama pull mistral
ollama run mistral "What is a homelab?"
```

### **Llama 2 13B** — Best for Coding
- 13B params (more capable)
- Great at Python/JavaScript/Go
- Needs 16GB+ RAM
- Slower but smarter

```bash
ollama pull llama2:13b
```

### **Neural Chat 7B** — Best for Chat
- Fine-tuned for conversation
- Fast, friendly responses
- 7B = runs anywhere
- Best for personal assistant tasks

```bash
ollama pull neural-chat
```

### **Orca Mini 3B** — Best for Tiny Hardware
- 3B params (runs on 4GB)
- Surprisingly capable
- Slowest, but works

```bash
ollama pull orca-mini
```

## Installation (5 minutes)

### Step 1: Get Ollama
```bash
# macOS / Linux:
curl https://ollama.ai/install.sh | sh

# Windows:
# Download installer from https://ollama.ai/download
```

### Step 2: Start Ollama
```bash
ollama serve
# Default: http://localhost:11434
```

### Step 3: Pull a Model
```bash
ollama pull mistral
# Takes 2-10 min depending on internet
```

### Step 4: Run It
```bash
ollama run mistral
# Type your prompt
# Ctrl+D to exit
```

Done. You're running an LLM locally.

## Use Cases

### 1. Personal Assistant
```bash
ollama run mistral "Summarize the key points of machine learning"
```

### 2. Code Generation
```bash
ollama run llama2:13b "Write a Python function to scrape a webpage with BeautifulSoup"
```

### 3. Document Q&A (RAG)
Use with LangChain or LlamaIndex to chat with your own documents.

```python
from llama_index import GPTSimpleVectorIndex, Document

docs = [Document(text="Your document here")]
index = GPTSimpleVectorIndex.from_documents(docs, llm_model="local")
response = index.query("What's the main topic?")
```

### 4. Homelab Automation
```bash
# Run daily summaries, backups analysis, system health reports
# Via cron job + local LLM
```

## API Server (For Apps)

Ollama exposes a local API. Use it from apps:

```bash
# Start Ollama server
ollama serve

# Curl test
curl -X POST http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",
    "prompt": "What is AI?",
    "stream": false
  }'
```

Use with:
- **LangChain** (Python)
- **LlamaIndex** (Python)
- **OpenAI API wrapper** (any language, just point to localhost:11434)

## Performance Tips

### GPU Acceleration (NVIDIA)
```bash
# Install CUDA
# Ollama will auto-detect and use GPU

# Run bigger models faster
ollama pull llama2:70b
# 70B params = slow on CPU, fast on GPU
```

### Quantization (Smaller Models)
Models come in sizes:
- Full (fp32) = 30GB for 70B model
- Quantized (int4) = 3GB for 70B model

Quantized = faster + smaller, slightly less accurate.

```bash
ollama pull llama2:13b  # Full
ollama pull llama2:13b-q4_K_M  # Quantized (recommended)
```

### Batch Requests
```bash
# Don't fire 100 requests at once
# Queue them, process serially
# Ollama has built-in rate limiting
```

## Privacy Wins

✅ Your data never leaves your machine
✅ No tracking, no analytics
✅ No subscription
✅ No rate limits
✅ Fully offline capable (once model is cached)

**vs.**
❌ ChatGPT sends to OpenAI servers
❌ Claude API tracked by Anthropic
❌ Rate limits + pricing
❌ Internet required

## Cost Analysis

| Approach | Cost | Privacy | Speed |
|----------|------|---------|-------|
| ChatGPT | $20/month | None | Fast |
| Claude API | $0.01/req | None | Fast |
| Local Ollama | $0 (hardware) | 100% | Slower |

If you already have a NUC? Local LLM is free.

## Limitations (Be Real)

- **Speed:** 2-5 tokens/sec vs 20+ for cloud
- **Intelligence:** Mistral 7B ≈ ChatGPT 3.5 (not 4.0)
- **Hallucinations:** More likely than cloud models
- **Latency:** First token takes 1-3 seconds

Best for: Offline work, automation, low-latency needs.
Not for: Real-time chat (better to use cloud).

## Next Steps

1. **Install Ollama** (5 min)
2. **Pull Mistral** (5 min download)
3. **Test it** (ask some questions)
4. **Integrate with your homelab** (Python script, cron job)
5. **Celebrate** (you're running your own AI)

## Resources

- **Ollama:** https://ollama.ai/
- **Available Models:** https://ollama.ai/library
- **LangChain:** https://github.com/hwchase17/langchain
- **LlamaIndex:** https://github.com/jerryjliu/llama_index

---

**Privacy-first tech is possible.** You don't need to send everything to the cloud.

**Next article:** Building a RAG chatbot with your personal documents (advanced).

**Thinking of running local LLMs?** Great choice. Your data, your AI, your rules.
