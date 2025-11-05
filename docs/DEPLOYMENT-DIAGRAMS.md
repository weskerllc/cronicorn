# Deployment Architecture Diagrams

This document contains visual diagrams of the Cronicorn deployment architecture.

## Deployment Flow

### Automatic Staging Deployment

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as GitHub Main
    participant SR as Semantic Release
    participant GHA as GitHub Actions
    participant GHCR as GitHub Container Registry
    participant Dok as Dokploy Staging
    
    Dev->>Git: Push semantic commit
    Git->>SR: Trigger release
    SR->>Git: Create release & tag
    Git->>GHA: Trigger release workflow
    GHA->>GHA: Build Docker images
    GHA->>GHCR: Push images with version + latest tags
    GHA->>GHA: Trigger deploy workflow
    GHA->>Dok: Call webhook with version info
    Dok->>GHCR: Pull latest images
    Dok->>Dok: Redeploy services
```

### Manual Production Deployment

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GHA as GitHub Actions UI
    participant Workflow as Deploy Workflow
    participant Dok as Dokploy Production
    participant GHCR as GitHub Container Registry
    
    Dev->>GHA: Click "Run workflow"
    Dev->>GHA: Select version (e.g., v1.6.1)
    GHA->>Workflow: Start deployment
    Workflow->>Dok: Call webhook with version
    Dok->>GHCR: Pull images with version tag
    Dok->>Dok: Redeploy services
    Workflow->>GHA: Show deployment summary
```

## Infrastructure Architecture

### Staging Environment

```mermaid
graph TB
    subgraph "GitHub Container Registry"
        API[api:latest]
        SCH[scheduler:latest]
        AIP[ai-planner:latest]
        WEB[web:latest]
        DOCS[docs:latest]
        MIG[migrator:latest]
    end
    
    subgraph "Dokploy Staging"
        subgraph "Docker Compose"
            DB[(PostgreSQL)]
            MIGR[Migrator]
            APIS[API Service]
            SCHED[Scheduler Service]
            AIPL[AI Planner Service]
            WEBS[Web Service]
            DOCSS[Docs Service]
        end
    end
    
    API --> APIS
    SCH --> SCHED
    AIP --> AIPL
    WEB --> WEBS
    DOCS --> DOCSS
    MIG --> MIGR
    
    MIGR --> DB
    APIS --> DB
    SCHED --> DB
    AIPL --> DB
    
    WEBS --> APIS
```

### Production Environment

```mermaid
graph TB
    subgraph "GitHub Container Registry"
        API[api:v1.6.1]
        SCH[scheduler:v1.6.1]
        AIP[ai-planner:v1.6.1]
        WEB[web:v1.6.1]
        DOCS[docs:v1.6.1]
        MIG[migrator:v1.6.1]
    end
    
    subgraph "Dokploy Production"
        subgraph "Docker Compose"
            DB[(PostgreSQL)]
            MIGR[Migrator]
            APIS[API Service]
            SCHED[Scheduler Service]
            AIPL[AI Planner Service]
            WEBS[Web Service]
            DOCSS[Docs Service]
        end
    end
    
    API --> APIS
    SCH --> SCHED
    AIP --> AIPL
    WEB --> WEBS
    DOCS --> DOCSS
    MIG --> MIGR
    
    MIGR --> DB
    APIS --> DB
    SCHED --> DB
    AIPL --> DB
    
    WEBS --> APIS
```

## Workflow Triggers

```mermaid
graph LR
    A[Code Pushed to Main] --> B{Semantic Commit?}
    B -->|Yes| C[Semantic Release]
    B -->|No| D[No Release]
    
    C --> E[Create GitHub Release]
    E --> F[Build Docker Images]
    F --> G[Push to GHCR]
    G --> H[Auto Deploy to Staging]
    
    I[Manual Trigger] --> J[Select Environment & Version]
    J --> K{Environment?}
    K -->|Staging| L[Deploy to Staging]
    K -->|Production| M[Deploy to Production]
```

## Environment Variable Flow

```mermaid
graph TB
    subgraph "Configuration Sources"
        ENV1[.env.staging.example]
        ENV2[.env.production.example]
    end
    
    subgraph "Dokploy Staging"
        SENV[Environment Variables]
        SDC[docker-compose.staging.yml]
        SC[Running Containers]
    end
    
    subgraph "Dokploy Production"
        PENV[Environment Variables]
        PDC[docker-compose.production.yml]
        PC[Running Containers]
    end
    
    ENV1 -.Template.-> SENV
    SENV --> SDC
    SDC --> SC
    
    ENV2 -.Template.-> PENV
    PENV --> PDC
    PDC --> PC
```

## Rollback Process

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GHA as GitHub Actions
    participant Dok as Dokploy Production
    participant GHCR as GHCR
    
    Dev->>GHA: Run workflow with old version
    Note right of Dev: e.g., v1.5.0 instead of v1.6.1
    GHA->>Dok: Webhook with v1.5.0
    Dok->>GHCR: Pull v1.5.0 images
    Dok->>Dok: Redeploy with old version
    Note over Dok: System rolled back
```

## Key Differences: Staging vs Production

| Aspect | Staging | Production |
|--------|---------|------------|
| **Deployment Trigger** | Automatic (on release) | Manual (GitHub Actions UI) |
| **Image Tag** | `latest` | Specific version (e.g., `v1.6.1`) |
| **Update Frequency** | Every release | On-demand |
| **Database** | `cronicorn-staging-db` | `cronicorn-production-db` |
| **OAuth App** | Staging GitHub App | Production GitHub App |
| **Stripe** | Test mode | Live mode |
| **Risk Level** | Low (testing) | High (production) |
| **Rollback** | Switch to version tag | Select previous version |

## Security Boundaries

```mermaid
graph TB
    subgraph "GitHub"
        SECRETS[GitHub Secrets<br/>- Webhook URLs]
        ACTIONS[GitHub Actions]
    end
    
    subgraph "Dokploy Staging"
        SENV[Staging Env Vars<br/>- Test credentials<br/>- Staging domains]
        SCOMP[Staging Compose]
    end
    
    subgraph "Dokploy Production"
        PENV[Production Env Vars<br/>- Live credentials<br/>- Production domains]
        PCOMP[Production Compose]
    end
    
    SECRETS -.Webhook.-> SCOMP
    SECRETS -.Webhook.-> PCOMP
    ACTIONS --> SECRETS
    
    SENV --> SCOMP
    PENV --> PCOMP
    
    style SENV fill:#e1f5e1
    style PENV fill:#ffe1e1
    style SECRETS fill:#e1e8f5
```
