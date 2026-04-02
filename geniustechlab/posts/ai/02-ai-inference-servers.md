---
title: "Self-Hosted AI Inference: Run LLMs at Scale on Your Homelab"
date: 2026-03-24
category: ai
tags: [ai, infrastructure, inference, scaling, kubernetes]
excerpt: "Ollama is cute. vLLM is production. How to run inference servers that scale."
amazon_product: "NVIDIA RTX GPU"
---

# Self-Hosted AI Inference: Run LLMs at Scale on Your Homelab

**Ollama is fun for hobby projects. vLLM is for when you're serious.**

I run 4 inference servers on my homelab handling 10K+ requests/day. Zero cloud costs. Full control.

This is advanced — skip if you're happy with Ollama.

## Ollama vs vLLM vs TGI

| Tool | Ease | Performance | Features | Cost |
|------|------|-------------|----------|------|
| Ollama | ⭐⭐⭐⭐⭐ | Medium | Basic | Free |
| vLLM | ⭐⭐⭐ | Very Fast | Advanced | Free |
| TGI (HF) | ⭐⭐ | Fast | Enterprise | Free |
| Ray Serve | ⭐ | Scalable | Complex | Free |

**My choice:** vLLM + Kubernetes on homelab.

## vLLM (Fastest Open-Source)

**What it does:**
- Batches requests (Ollama doesn't)
- GPU memory optimization (PagedAttention)
- 5-10x faster than Ollama with same hardware
- Production-ready

**Hardware needed:**
- NVIDIA GPU (RTX 4090 optimal, RTX 3080 ok, even 2080 works)
- 32GB+ RAM
- 500GB SSD

### Installation

```bash
# Python 3.10+
pip install vllm

# Start server
python -m vllm.entrypoints.openai_compatible_server \
  --model mistral/Mistral-7B-Instruct-v0.1 \
  --gpu-memory-utilization 0.9 \
  --host 0.0.0.0 \
  --port 8000

# Takes 1-2 min to load model, then ready for requests
```

### Load Testing

```bash
# Single request
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral/Mistral-7B-Instruct-v0.1",
    "messages": [{"role": "user", "content": "What is AI?"}]
  }'

# Batch 100 requests concurrently
ab -n 100 -c 100 http://localhost:8000/v1/chat/completions

# Real benchmark: ApacheBench, locust, k6
```

**Performance on RTX 3080:**
- Ollama: ~4 tokens/sec
- vLLM: ~45 tokens/sec (10x faster!)
- Cost per 1M tokens: $0 (hardware amortized)

## Multi-GPU Setup (Scaling)

One GPU maxes out. Add more:

### Tensor Parallelism (1 model, multiple GPUs)
```bash
python -m vllm.entrypoints.openai_compatible_server \
  --model meta-llama/Llama-2-70b-hf \
  --tensor-parallel-size 4  # Split across 4 GPUs
  --gpu-memory-utilization 0.9
```

Llama 70B (~130GB) split across 4x RTX 3080s (~24GB each).

### Pipeline Parallelism (Advanced)
For 200B+ models, split model layers.

```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Llama-2-70b-hf",
    pipeline_parallel_size=2,  # 2 GPUs per pipeline
    tensor_parallel_size=2,     # 2 GPUs for tensor ops
)
```

Result: 4 GPUs running one huge model efficiently.

## Kubernetes Deployment

This is where it gets serious.

### Single Node (Homelab Box)
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
    spec:
      containers:
      - name: vllm
        image: vllm/vllm-openai:latest
        ports:
        - containerPort: 8000
        env:
        - name: MODEL_NAME
          value: "mistral/Mistral-7B-Instruct-v0.1"
        resources:
          limits:
            nvidia.com/gpu: "1"
            memory: "32Gi"
          requests:
            nvidia.com/gpu: "1"
            memory: "24Gi"
        volumeMounts:
        - name: models
          mountPath: /root/.cache/huggingface
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: vllm-models

---
apiVersion: v1
kind: Service
metadata:
  name: vllm-svc
spec:
  selector:
    app: vllm
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f deployment.yaml
# Verify: kubectl port-forward svc/vllm-svc 8000:8000
```

### Multi-Node (Multiple Servers)
```yaml
# Multiple replicas behind load balancer
spec:
  replicas: 3  # Run 3 inference servers
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - vllm
              topologyKey: kubernetes.io/hostname
```

Result: 3 servers, each handling requests independently, load-balanced.

## Request Batching (The Secret Sauce)

vLLM batches requests automatically. This is why it's fast.

Request 1: "What is AI?" → 100 tokens
Request 2: "Summarize quantum..." → 50 tokens

**Ollama:** Process 1, then 2 (sequential)
**vLLM:** Process both in batch (simultaneous, shared GPU memory)

Result: Much higher throughput.

## Monitoring (Prometheus + Grafana)

Track:
- Requests/sec
- Token/sec throughput
- GPU utilization
- Queue depth
- Cache hit rate

```python
# vLLM exports metrics to Prometheus automatically
# Scrape at :8000/metrics
```

Grafana dashboard:
```
- Real-time throughput
- GPU memory usage
- Model latency (p50, p99)
- Error rate
```

## Cost Analysis (Homelab vs Cloud)

### Cloud (OpenAI API)
- $0.0015 per 1K input tokens
- $0.002 per 1K output tokens
- 1M tokens/month = ~$50

### Self-Hosted (vLLM)
- RTX 4090: $1,500 (1-3 year amortization)
- Electricity: $5-10/month
- 1M tokens/month = $0 (hardware cost + power)

**Breakeven:** 3 months of heavy use.

## Gotchas

❌ **NVIDIA GPU required** — no CUDA = no vLLM advantage
❌ **Memory bandwidth is the bottleneck** — not compute
❌ **HuggingFace model loading is slow** — cache properly
❌ **Scaling is hard** — Kubernetes adds complexity

✅ But when it works? Insanely fast and cheap.

## Next Steps

1. **Get a GPU** (RTX 3080+ if possible)
2. **Install vLLM** (pip, takes 5 min)
3. **Test locally** (single model, one GPU)
4. **Add K8s** (if you have multiple servers)
5. **Monitor & scale** (based on load)

## Resources

- **vLLM Docs:** https://github.com/lm-sys/vllm
- **LLM Perf Leaderboard:** https://huggingface.co/spaces/optimum/llm-perf-leaderboard
- **K8s GPU Plugin:** https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/

---

**Running inference at scale is hard.** But it's worth it once you own the hardware.

**Next:** Building a RAG pipeline with vLLM + vector DBs (LangChain integration).

**Questions on setup?** Drop them. I've debugged GPU memory leaks so you don't have to.
