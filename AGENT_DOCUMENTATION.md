# 🤖 Self-Healing Agent — Technical Documentation

> **GitHub Repository:** [https://github.com/Harsh-Tandel27/self-heal](https://github.com/Harsh-Tandel27/self-heal)

---

## 1. What the Agent Does

### Core Purpose

The **Self-Healing Agent** is an autonomous support system designed to detect, diagnose, and remediate issues in an e-commerce platform **without human intervention**. It operates on the principle that most recurring support issues follow predictable patterns that can be identified and fixed programmatically.

**Primary Mission:**
- 🔍 **Detect** anomalies and errors from multiple signal sources (webhooks, API errors, support tickets)
- 🧠 **Analyze** patterns using AI to identify root causes
- ⚡ **Decide** on appropriate remediation actions
- 🔧 **Execute** fixes automatically or with human approval
- ✅ **Verify** that the fix was successful

### Role in the System

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Simulated Store │─────▶│  Self-Healing   │─────▶│  Agent Dashboard │
│   (Port 3001)   │      │   Agent Backend │      │   (Port 3000)    │
│                 │◀─────│   (Port 8000)   │      │                  │
└─────────────────┘      └─────────────────┘      └──────────────────┘
       ▲                        │
       │                        ▼
       │                 ┌─────────────┐
       └─────────────────│   MongoDB   │
                         └─────────────┘
```

The agent sits at the center of the ecosystem, receiving error signals from the Simulated Store and providing visibility through the Dashboard.

---

## 2. How the Agent Thinks

### The OODA Loop: Observe → Reason → Decide → Act

```python
# backend/agent/core.py - The main agent loop
async def _run_cycle(self):
    # 1. OBSERVE - Detect patterns from signals
    patterns = await observer.detect_patterns()
    
    # 2. REASON - Analyze with AI to find root cause
    issue = await reasoner.analyze_signals(signals)
    
    # 3. DECIDE - Create remediation workflow
    workflow = await decider.decide_action(issue)
    
    # 4. ACT - Execute the fix
    if workflow.status == WorkflowStatus.APPROVED:
        await executor.execute_workflow(workflow.id)
```

### Decision Logic

| Signal Type | Confidence | Risk Level | Action |
|-------------|------------|------------|--------|
| Checkout Failure | > 90% | Low | Auto-Fix |
| Checkout Failure | > 90% | High | Require Approval |
| API Error | < 70% | Any | Queue for Review |
| Webhook Drop | Any | Critical | Alert + Manual |

### Trigger Conditions

The agent runs in a continuous loop (`agent_loop_interval_seconds = 5`) and is triggered when:
1. **Unprocessed signals exist** in the database
2. **Pattern threshold is met** (2+ similar errors from same source)
3. **Approved workflows** are awaiting execution

---

## 3. System Structure

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Observer** | `agent/observer.py` | Ingests signals, detects patterns, manages signal lifecycle |
| **Reasoner** | `agent/reasoner.py` | AI-powered root cause analysis using Groq LLM |
| **Decider** | `agent/decider.py` | Risk assessment, workflow generation, approval routing |
| **Executor** | `agent/executor.py` | Workflow execution, API calls, verification |
| **Core** | `agent/core.py` | Orchestrates the OODA loop, manages WebSocket updates |

### Data Flow

```
[External Error] 
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Webhooks │───▶│ Observer │───▶│ Reasoner │───▶│ Decider  │  │
│  │ /generic │    │          │    │  (Groq)  │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                        │                               │        │
│                        ▼                               ▼        │
│                 ┌─────────────┐               ┌──────────────┐  │
│                 │   MongoDB   │               │   Executor   │  │
│                 │  (signals,  │               │  (API calls) │  │
│                 │   issues)   │               └──────────────┘  │
│                 └─────────────┘                       │         │
└───────────────────────────────────────────────────────┼─────────┘
                                                        ▼
                                              [Fix Applied to Store]
```

---

## 4. Performance & Efficiency

### Speed Considerations

| Metric | Value | Optimization |
|--------|-------|--------------|
| Agent Loop Interval | 5 seconds | Configurable via `config.py` |
| Signal Batch Size | 50/cycle | Prevents memory overload |
| LLM Response Time | ~2-3 seconds | Groq's fast inference |
| WebSocket Updates | Real-time | Push-based, no polling |

### Resource Usage

```python
# config.py - Resource controls
agent_loop_interval_seconds: int = 5      # CPU-friendly loop
max_signals_per_batch: int = 50           # Memory control
groq_model: str = "llama-3.3-70b-versatile"  # Fast + capable
```

**MongoDB Indexing:**
- Signals indexed by `processed` status for fast filtering
- Issues indexed by `status` and `created_at` for dashboard queries

---

## 5. Built to Work in Reality

### Integration Points

| External System | Integration Method | Purpose |
|-----------------|-------------------|---------|
| **Simulated Store** | REST API (`/api/chaos`) | Receives fix commands |
| **MongoDB Atlas** | Motor (async driver) | Persistent storage |
| **Groq API** | HTTPS | AI reasoning |
| **Dashboard** | WebSocket + REST | Real-time visibility |

### Operational Feasibility

**Deployment:**
```bash
# Single command startup
./start_all.sh
```

**Environment Configuration:**
```bash
# backend/.env
GROQ_API_KEY=your_key_here
MONGODB_URI=mongodb://localhost:27017/self_healing_agent
```

**Monitoring:**
- All actions logged to `audit_logs` collection
- WebSocket broadcasts for real-time status
- Visual evidence via screenshots (`static/evidence/`)

---

## 6. Learning & Improvement

### Feedback Signals

| Signal Type | How It's Used |
|-------------|---------------|
| **Fix Success Rate** | Stored per-workflow, influences future confidence |
| **Audit Logs** | Complete history for pattern analysis |
| **Merchant Impact Count** | Higher impact → higher priority |

### Improving Over Time

```python
# The confidence score directly affects automation level
if confidence >= settings.auto_approve_confidence_threshold:  # 0.9
    return False, 0  # No approval needed
return True, settings.medium_risk_approval_count  # Require human
```

**Current Learning Mechanisms:**
1. **Pattern Detection** — Groups similar errors to boost confidence
2. **Historical Context** — Audit logs inform future decisions
3. **Configurable Thresholds** — Operators can tune risk tolerance

---

## 7. Advanced Intelligence

### ML/AI Usage

| Component | AI Technology | Purpose |
|-----------|---------------|---------|
| **Reasoner** | Groq LLM (Llama 3.3 70B) | Root cause analysis, reasoning chain |
| **Pattern Detection** | Rule-based + Aggregation | Signal clustering by type/merchant |

### Why It Adds Value

**Without AI (Rule-Based Only):**
```
IF error_code == "PAYMENT_TIMEOUT" THEN fix = "restart_gateway"
```
*Problem: Brittle, requires manual rule creation for every case*

**With AI (Groq LLM):**
```python
# reasoner.py - AI generates reasoning autonomously
prompt = f"""Analyze the following signals and determine:
1. The root cause of the issue
2. The category (migration, platform_bug, documentation_gap, merchant_config)
3. The confidence level (0-1)
4. Step-by-step reasoning chain

SIGNALS:
{signal_context}
"""
```

**Value Add:**
- ✅ Handles **novel error patterns** without code changes
- ✅ Provides **explainable reasoning** for audit compliance
- ✅ Outputs **structured JSON** for reliable downstream processing
- ✅ **Fallback mode** works even without API key

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Harsh-Tandel27/self-heal.git
cd self-heal

# Setup backend
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your GROQ_API_KEY

# Setup frontend & store
cd ../frontend && npm install
cd ../simulated-store && npm install

# Run everything
cd .. && ./start_all.sh
```

**Access:**
- 🖥️ Dashboard: http://localhost:3000
- 🛒 Store: http://localhost:3001
- 📡 API Docs: http://localhost:8000/docs

---

## 📊 Demo: The Agent Loop in Action

1. **Enable Chaos** → Go to http://localhost:3001/admin → Toggle "Checkout Failures"
2. **Trigger Error** → Go to http://localhost:3001/cart → Click "Checkout"
3. **Watch Agent** → Dashboard shows detected issue in ~5 seconds
4. **Approve Fix** → Click "Approve" on the remediation workflow
5. **Verify** → Agent disables chaos mode, checkout works again!

---

> Built with ❤️ using FastAPI, Next.js, MongoDB, and Groq AI
