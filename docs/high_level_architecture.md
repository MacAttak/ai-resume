# AI Resume Architecture Design
## Intelligent Career Assistant Platform

**Version:** 5.0  
**Date:** November 2025  
**Author:** Daniel McCarthy

---

## Executive Summary

This document outlines the architecture for an AI-powered Resume Assistant that demonstrates production-grade AI engineering capabilities while serving as an interactive career showcase. The system uses Retrieval-Augmented Generation (RAG) to provide accurate, contextual responses about professional experience.

The architecture prioritises production readiness, security, observability, and cost protection through a modern stack featuring Next.js, Portkey AI Gateway, and Pinecone vector database.

---

## 1. System Purpose

The AI Resume Assistant serves three core objectives:

**Functional Goal**: Answer questions about professional experience with high accuracy and contextual relevance

**Technical Demonstration**: Showcase expertise in building production AI systems through the implementation itself

**User Experience**: Provide an engaging, conversational interface that feels natural and responsive

---

## 2. Architecture Philosophy

The design follows these principles:

- **Simplicity First**: Proven patterns with complexity added only where it adds clear value
- **Observable by Default**: Complete visibility through Portkey's comprehensive observability
- **Security in Depth**: Multiple layers of protection against prompt injection and abuse
- **Modular Design**: Components can be upgraded or replaced independently
- **Cost Protected**: Authentication, rate limiting, and intelligent caching to prevent runaway costs

---

## 3. Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | Next.js 15 + shadcn/ui | Modern stack, excellent DX, full control over UX |
| **Authentication** | Clerk | Simple integration, handles user management |
| **AI Gateway** | Portkey | Unified API for 250+ models, built-in observability, semantic caching |
| **Backend API** | FastAPI + Python 3.12 | Async support, comprehensive AI library ecosystem |
| **Orchestration** | LangGraph | Superior workflow management for complex RAG pipelines |
| **Vector Database** | Pinecone Serverless | Zero operational overhead, automatic scaling |
| **Knowledge Graph** | Neo4j AuraDB | Managed graph database for relationship queries |
| **Rate Limiting** | Redis | Fast, reliable usage tracking |
| **Deployment** | Railway (Backend) + Vercel (Frontend) | Simple deployment, good free tiers |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        U[User Browser]
        M[Mobile App]
    end
    
    subgraph "Edge Layer (Vercel)"
        N[Next.js Frontend]
        C[Clerk Auth]
        V[Vercel AI SDK]
    end
    
    subgraph "Gateway Layer"
        P[Portkey AI Gateway]
        PC[Semantic Cache]
        PO[Observability]
        PG[Guardrails]
    end
    
    subgraph "Application Layer (Railway)"
        F[FastAPI Backend]
        L[LangGraph Orchestrator]
        R[Redis Rate Limiter]
    end
    
    subgraph "Knowledge Layer"
        RAG[RAG Pipeline]
        PIN[Pinecone Vector DB]
        NEO[Neo4j Graph DB]
        DOC[Document Processor]
    end
    
    subgraph "LLM Providers"
        OAI[OpenAI]
        ANT[Anthropic]
        LOC[Local Models]
    end
    
    U --> N
    M --> N
    N --> C
    N --> V
    V --> P
    P --> PC
    P --> PO
    P --> PG
    P --> F
    F --> L
    F --> R
    L --> RAG
    RAG --> PIN
    RAG --> NEO
    RAG --> DOC
    P --> OAI
    P --> ANT
    P --> LOC
    
    style P fill:#f96,stroke:#333,stroke-width:4px
    style PC fill:#9f6,stroke:#333,stroke-width:2px
    style RAG fill:#69f,stroke:#333,stroke-width:2px
```

### 4.2 Request Flow Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant C as Clerk
    participant P as Portkey
    participant F as FastAPI
    participant R as Redis
    participant RAG as RAG Pipeline
    participant LLM as LLM Provider
    
    U->>N: Submit Query
    N->>C: Verify Auth
    C-->>N: User Token
    N->>P: Request + Metadata
    
    alt Cache Hit
        P->>P: Check Semantic Cache
        P-->>N: Cached Response (20x faster)
    else Cache Miss
        P->>F: Forward Request
        F->>R: Check Rate Limit
        R-->>F: Usage OK
        F->>RAG: Process Query
        RAG->>RAG: Retrieve Context
        RAG-->>F: Enriched Prompt
        F->>P: LLM Request
        P->>LLM: Route to Provider
        LLM-->>P: Response
        P->>P: Cache Response
        P->>P: Log Observability
        P-->>F: Response
        F-->>N: Stream Response
    end
    
    N-->>U: Display Result
```

---

## 5. Frontend Architecture

### 5.1 Technology Choices

**Next.js 15 App Router**: Latest features including React Server Components and streaming

**shadcn/ui Components**: High-quality, customisable components built on Radix UI

**Vercel AI SDK**: Streaming responses, built-in error handling, provider abstraction

**TanStack Query**: Efficient data fetching and caching on the client side

### 5.2 Component Structure

```mermaid
graph TB
    subgraph "Page Components"
        H[Home Page]
        CH[Chat Interface]
        D[Dashboard]
    end
    
    subgraph "Feature Components"
        CI[Chat Input]
        CM[Message List]
        US[Usage Stats]
        SF[Streaming Response]
    end
    
    subgraph "UI Components (shadcn)"
        B[Button]
        I[Input]
        C[Card]
        P[Progress]
        A[Alert]
    end
    
    subgraph "Hooks & Utils"
        UC[useChat Hook]
        UA[useAuth Hook]
        UR[useRateLimit Hook]
        ST[Streaming Utils]
    end
    
    H --> CH
    H --> D
    CH --> CI
    CH --> CM
    CH --> SF
    D --> US
    CI --> B
    CI --> I
    CM --> C
    US --> P
    US --> A
    CH --> UC
    D --> UA
    US --> UR
    SF --> ST
```

### 5.3 State Management

**Conversation State**: Managed through Vercel AI SDK's useChat hook

**User State**: Clerk provides user context and authentication state

**Usage State**: Custom hooks fetch and cache usage data from backend

**UI State**: Local component state for optimistic updates

---

## 6. Portkey Integration

### 6.1 Gateway Configuration

Portkey fully adheres to the OpenAI SDK signature, allowing instant switching with production features out of the box. The integration provides:

**Unified API Access**: Connect to over 250 LLM providers through a unified API with fallbacks, load balancing, and caching capabilities

**Semantic Caching**: Early tests reveal a 20% cache hit rate at 99% accuracy for Q&A use cases, with cached responses served 20x faster

**Comprehensive Observability**: Detailed observability features providing deep insights into traces, errors, and caching

### 6.2 Implementation Architecture

```mermaid
graph LR
    subgraph "Frontend"
        VS[Vercel AI SDK]
    end
    
    subgraph "Portkey Gateway"
        API[Universal API]
        VK[Virtual Keys]
        CFG[Config Management]
        
        subgraph "Reliability"
            FB[Fallbacks]
            RT[Retries]
            LB[Load Balancing]
        end
        
        subgraph "Performance"
            SC[Semantic Cache]
            RC[Request Cache]
            TO[Timeouts]
        end
        
        subgraph "Observability"
            TR[Tracing]
            LG[Logging]
            MT[Metrics]
            AN[Analytics]
        end
    end
    
    subgraph "Providers"
        GPT[GPT-4o]
        CL[Claude 3.5]
        LL[Llama 3]
    end
    
    VS --> API
    API --> VK
    API --> CFG
    CFG --> FB
    CFG --> RT
    CFG --> LB
    API --> SC
    API --> RC
    API --> TO
    API --> TR
    TR --> LG
    TR --> MT
    TR --> AN
    FB --> GPT
    FB --> CL
    LB --> LL
```

### 6.3 Configuration Strategy

**Virtual Keys**: Secure API key management without exposing provider credentials

**Metadata Tracking**: Custom metadata for user sessions, conversation tracking, and analytics

**Cache Namespacing**: Custom cache namespaces allow partitioning cache based on custom strings, providing finer control over cached data

---

## 7. RAG Architecture

### 7.1 Document Processing Pipeline

```mermaid
graph TB
    subgraph "Input Documents"
        RES[Resume]
        PRJ[Projects]
        ACH[Achievements]
    end
    
    subgraph "Processing"
        CHK[Chunking Strategy]
        EMB[Embedding Generation]
        META[Metadata Extraction]
        ENT[Entity Recognition]
    end
    
    subgraph "Storage"
        VEC[Vector Store]
        GRP[Graph Store]
        DOC[Document Store]
    end
    
    subgraph "Chunking Details"
        HC[Hierarchical Chunking]
        OV[128 Token Overlap]
        SZ[512 Token Size]
    end
    
    RES --> CHK
    PRJ --> CHK
    ACH --> CHK
    CHK --> HC
    CHK --> OV
    CHK --> SZ
    CHK --> EMB
    CHK --> META
    CHK --> ENT
    EMB --> VEC
    ENT --> GRP
    META --> DOC
```

### 7.2 Retrieval Strategy

**Hybrid Search Pipeline**:
- Dense retrieval using embedding similarity (Pinecone)
- Sparse retrieval with BM25 keyword matching
- Graph queries for relationship-based retrieval (Neo4j)
- Metadata filtering by date, company, technology

**Query Processing**:
- Intent classification to route queries appropriately
- Query expansion using synonyms and related terms
- Hypothetical Document Embeddings (HyDE) for better semantic matching

**Re-ranking**:
- Cross-encoder models for precise relevance scoring
- Diversity sampling to avoid redundant information
- Context window optimisation for token efficiency

### 7.3 Knowledge Graph Structure

```mermaid
graph TB
    subgraph "Entities"
        P[Person: Daniel]
        C1[Company: CommBank]
        C2[Company: Westpac]
        T1[Tech: Python]
        T2[Tech: LangGraph]
        PR1[Project: Feature Agent]
        A1[Achievement: Cost Savings]
    end
    
    subgraph "Relationships"
        P -->|WORKED_AT| C1
        P -->|WORKED_AT| C2
        PR1 -->|BUILT_WITH| T1
        PR1 -->|BUILT_WITH| T2
        PR1 -->|LED_TO| A1
        P -->|LED| PR1
    end
```

---

## 8. Authentication & Usage Management

### 8.1 Authentication Flow

```mermaid
graph TB
    subgraph "User Access"
        NW[New User]
        EU[Existing User]
    end
    
    subgraph "Clerk Auth"
        SI[Sign In]
        SU[Sign Up]
        SSO[SSO Options]
        MFA[MFA Check]
    end
    
    subgraph "User Management"
        UP[User Profile]
        UT[Usage Tracking]
        RL[Rate Limits]
    end
    
    subgraph "Session"
        JWT[JWT Token]
        SM[Session Metadata]
        WH[Webhooks]
    end
    
    NW --> SU
    EU --> SI
    SU --> SSO
    SI --> MFA
    SSO --> UP
    MFA --> UP
    UP --> JWT
    UP --> UT
    UT --> RL
    JWT --> SM
    UP --> WH
```

### 8.2 Usage Limits

Simple daily limits to prevent cost overruns:

| User Type | Daily Messages | Daily Tokens | Requests/Min |
|-----------|---------------|--------------|--------------|
| **Unauthenticated** | 0 | 0 | 0 |
| **Authenticated** | 100 | 100,000 | 10 |

### 8.3 Rate Limiting Implementation

**Token Bucket Algorithm**: Redis-backed with millisecond response times

**Usage Feedback**: Clear indicators showing remaining quota and reset times

**Graceful Degradation**: Progressive warnings as users approach limits

---

## 9. Security Architecture

### 9.1 Defense Layers

```mermaid
graph TB
    subgraph "Input Security"
        IV[Input Validation]
        PS[Pattern Scanning]
        LE[Length Enforcement]
    end
    
    subgraph "Processing Security"
        PI[Prompt Isolation]
        CX[Context Separation]
        GR[Guardrails]
    end
    
    subgraph "Output Security"
        OF[Output Filtering]
        LP[Leakage Prevention]
        CS[Confidence Scoring]
    end
    
    subgraph "Infrastructure"
        TLS[TLS Encryption]
        VK[Virtual Keys]
        AL[Audit Logging]
    end
    
    IV --> PS
    PS --> LE
    LE --> PI
    PI --> CX
    CX --> GR
    GR --> OF
    OF --> LP
    LP --> CS
    
    TLS --> VK
    VK --> AL
```

### 9.2 Prompt Injection Defense

**Input Layer**: Pattern matching, character validation, encoding normalisation

**Processing Layer**: System prompt isolation, separate user context, Portkey guardrails

**Output Layer**: Response validation, information leakage prevention

---

## 10. Observability Strategy

### 10.1 Portkey Observability Stack

```mermaid
graph TB
    subgraph "Data Collection"
        REQ[Request Logs]
        TRC[Distributed Traces]
        MET[Metrics]
        ERR[Errors]
    end
    
    subgraph "Processing"
        AGG[Aggregation]
        COR[Correlation]
        ANO[Anomaly Detection]
    end
    
    subgraph "Visualization"
        DSH[Dashboard]
        TRV[Trace Viewer]
        ANA[Analytics]
        ALT[Alerts]
    end
    
    subgraph "Insights"
        CST[Cost Analysis]
        PRF[Performance]
        USG[Usage Patterns]
        QUA[Quality Metrics]
    end
    
    REQ --> AGG
    TRC --> COR
    MET --> AGG
    ERR --> ANO
    
    AGG --> DSH
    COR --> TRV
    AGG --> ANA
    ANO --> ALT
    
    DSH --> CST
    TRV --> PRF
    ANA --> USG
    ALT --> QUA
```

### 10.2 Key Metrics

**Performance Metrics**:
- Response latency (p50, p95, p99)
- Cache hit rates (target: 20%)
- Token consumption per request
- Streaming time to first token

**Business Metrics**:
- Daily active users
- Query patterns and topics
- User satisfaction (implicit feedback)
- Cost per conversation

**System Health**:
- Error rates by component
- Provider availability
- Rate limit utilisation
- Cache effectiveness

---

## 11. Deployment Architecture

### 11.1 Infrastructure Layout

```mermaid
graph TB
    subgraph "Development"
        LD[Local Docker]
        LR[Local Redis]
        LP[Local Postgres]
    end
    
    subgraph "Staging"
        SV[Vercel Preview]
        SR[Railway Staging]
        SP[Portkey Dev]
    end
    
    subgraph "Production"
        subgraph "Frontend (Vercel)"
            VF[Next.js App]
            VE[Edge Functions]
            VC[CDN]
        end
        
        subgraph "Backend (Railway)"
            RF[FastAPI Service]
            RD[PostgreSQL]
            RR[Redis]
            RW[Workers]
        end
        
        subgraph "External Services"
            PC[Portkey Cloud]
            PN[Pinecone]
            CL[Clerk]
            N4[Neo4j Aura]
        end
    end
    
    LD --> SV
    LR --> SR
    LP --> SP
    
    SV --> VF
    SR --> RF
    SP --> PC
    
    VF --> VC
    VE --> PC
    RF --> RD
    RF --> RR
    RF --> RW
    RF --> PN
    RF --> N4
    VF --> CL
```

### 11.2 CI/CD Pipeline

```mermaid
graph LR
    subgraph "Code Phase"
        CM[Commit]
        PR[Pull Request]
    end
    
    subgraph "Build Phase"
        LI[Lint]
        TS[Type Check]
        UT[Unit Tests]
        BLD[Build]
    end
    
    subgraph "Test Phase"
        IT[Integration Tests]
        SEC[Security Scan]
        PC[Performance Check]
    end
    
    subgraph "Deploy Phase"
        STG[Deploy Staging]
        SMK[Smoke Tests]
        PRD[Deploy Production]
        RAG[Update RAG Data]
    end
    
    CM --> PR
    PR --> LI
    LI --> TS
    TS --> UT
    UT --> BLD
    BLD --> IT
    IT --> SEC
    SEC --> PC
    PC --> STG
    STG --> SMK
    SMK --> PRD
    PRD --> RAG
```

### 11.3 Environment Configuration

**Development**: Local development with hot reload and debug tools

**Staging**: Production-like environment for testing

**Production**: Optimised for performance and reliability

---

## 12. Performance Optimisation

### 12.1 Caching Strategy

**Portkey Semantic Cache**: 20% cache hit rate delivering responses 20x faster at zero additional cost

**Application Cache**:
- Embedding cache for repeated queries
- User session cache in Redis
- Static asset caching via CDN

### 12.2 Latency Optimisation

```mermaid
graph LR
    subgraph "Optimisation Techniques"
        ST[Streaming Responses]
        PC[Parallel Retrieval]
        EC[Edge Computing]
        CC[Connection Pooling]
    end
    
    subgraph "Target Metrics"
        TM1[TTFB < 200ms]
        TM2[Complete < 2s]
        TM3[Cache Hit > 20%]
    end
    
    ST --> TM1
    PC --> TM2
    EC --> TM1
    CC --> TM2
```

### 12.3 Cost Optimisation

**Token Management**:
- Efficient prompt design
- Context window optimisation
- Smart truncation strategies

**Caching Benefits**:
- 20% reduction in API calls via semantic cache
- Reduced latency improves user experience
- Lower operational costs

---

## 13. Development Roadmap

### Phase 1: Core Foundation (Weeks 1-2)
- Basic Next.js frontend with shadcn/ui
- Clerk authentication integration
- Portkey setup with virtual keys
- Basic RAG pipeline
- Redis rate limiting

### Phase 2: Enhancement (Week 3)
- Knowledge graph integration
- Advanced retrieval strategies
- Semantic caching configuration
- Streaming response implementation
- Usage analytics dashboard

### Phase 3: Production Hardening (Week 4)
- Security implementation and testing
- Performance optimisation
- Comprehensive error handling
- Documentation completion
- Deployment automation

### Phase 4: Growth Features (Post-Launch)
- Voice interface
- Multi-language support
- Advanced analytics
- A/B testing for prompts

---

## 14. Success Metrics

### Technical Performance
- Response time < 2 seconds (p95)
- Cache hit rate > 20%
- Retrieval accuracy > 90%
- Zero security incidents
- 99.9% uptime

### User Experience
- Time to first token < 500ms
- Conversation completion rate > 80%
- No abuse incidents
- Positive user feedback

### Cost Management
- Average cost per conversation < $0.02
- Cache savings > 20% of LLM costs
- Sustainable token consumption
- Efficient resource utilisation

---

## 15. Risk Management

### Technical Risks

**Model Hallucination**
- Mitigation: Strict RAG grounding, Portkey guardrails, confidence scoring

**Performance Issues**
- Mitigation: Semantic caching, load balancing, monitoring

**Provider Outages**
- Mitigation: Portkey fallbacks, multi-provider support

### Operational Risks

**Cost Overruns**
- Mitigation: Hard usage limits, Portkey budget controls, semantic caching

**Abuse Attempts**
- Mitigation: Authentication requirement, rate limiting, pattern detection

**Data Loss**
- Mitigation: Regular backups, version control, disaster recovery plan

---

## 16. Integration Details

### 16.1 Portkey Configuration

**Initial Setup**:
- Create Portkey account and obtain API key
- Configure virtual keys for each LLM provider
- Set up semantic caching with 7-day TTL
- Configure fallback chains for reliability

**Request Flow**:
- Add trace IDs for conversation tracking
- Include user metadata for analytics
- Set cache namespace per user for personalisation
- Configure guardrails for content filtering

### 16.2 Data Flow

```mermaid
graph TB
    subgraph "Request Enrichment"
        Q[User Query]
        MD[Metadata]
        TID[Trace ID]
        NS[Cache Namespace]
    end
    
    subgraph "Portkey Processing"
        CH[Cache Check]
        GC[Guardrail Check]
        RT[Route Selection]
        EX[Execution]
    end
    
    subgraph "Response Handling"
        CA[Cache Storage]
        OB[Observability Log]
        ST[Stream Response]
    end
    
    Q --> MD
    MD --> TID
    TID --> NS
    NS --> CH
    CH --> GC
    GC --> RT
    RT --> EX
    EX --> CA
    EX --> OB
    EX --> ST
```

---

## Conclusion

This architecture provides a robust, production-ready foundation for an AI Resume Assistant that balances sophistication with simplicity. Through the strategic use of modern technologies—particularly the powerful combination of Next.js, Portkey, and Pinecone—the system achieves:

- **High Performance**: Sub-2-second responses with 20x faster cached queries
- **Cost Efficiency**: 20% reduction in LLM costs through intelligent caching
- **Production Reliability**: Built-in fallbacks, monitoring, and security
- **Excellent Developer Experience**: Clean architecture with comprehensive observability

The architecture serves as both a functional tool and a portfolio piece, demonstrating the ability to design and build production-grade AI systems with appropriate safeguards and optimisations.