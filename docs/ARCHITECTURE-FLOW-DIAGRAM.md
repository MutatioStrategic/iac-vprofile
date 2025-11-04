# Case Management Pipeline System - Architecture Flow Diagram

## Current System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                │
│  Next.js App Router (SSR + CSR) + SWR + React Components            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Case Detail  │  │  Case List   │  │   Auth UI    │             │
│  │   Page       │  │    Page      │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
│  ┌──────▼──────────────────▼──────────────────▼───────┐            │
│  │         SWR Hooks (Data Fetching + Cache)          │            │
│  │  useCaseData | useCases | useCaseActions           │            │
│  └──────┬──────────────────┬──────────────────┬───────┘            │
│         │                  │                  │                      │
│  ┌──────▼──────────────────▼──────────────────▼───────┐            │
│  │   Context Providers (AuthContext, CaseContext)     │            │
│  └────────────────────────────────────────────────────┘            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ HTTPS + JWT
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    Next.js API Routes Layer                          │
│                   (Server-Side Handlers)                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  GET  /api/cases              → List cases (filter/page)   │    │
│  │  POST /api/cases              → Create new case            │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  GET   /api/cases/[caseId]    → Get case + ViewModel       │    │
│  │  PATCH /api/cases/[caseId]    → Update case metadata       │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  POST /api/cases/[caseId]/actions → Execute actions        │    │
│  │  GET  /api/cases/[caseId]/history → Get audit history      │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  GET /api/pipelines           → List available pipelines   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              Authentication Middleware                      │    │
│  │         (Supabase JWT Verification)                        │    │
│  └───────────────────────┬────────────────────────────────────┘    │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
┌─────────────────▼──────┐   ┌──────────▼──────────────────────────┐
│  Pipeline Engine       │   │   Supabase Edge Functions           │
│  (Server-Side Logic)   │   │   (Low-Latency Actions)             │
│                        │   │                                     │
│ ┌────────────────────┐ │   │ ┌─────────────────────────────────┐ │
│ │ Pipeline Registry  │ │   │ │ execute-case-action             │ │
│ │ - insolvencyConfig │ │   │ │ - Transition execution          │ │
│ │ - familyLawConfig  │ │   │ │ - Field updates                 │ │
│ │ - (extensible)     │ │   │ │ - Document handling             │ │
│ └──────────┬─────────┘ │   │ └─────────────┬───────────────────┘ │
│            │            │   └───────────────┼─────────────────────┘
│ ┌──────────▼─────────┐ │                   │
│ │ PipelineExecutor   │ │                   │
│ │ ┌────────────────┐ │ │                   │
│ │ │getAllowed      │ │ │                   │
│ │ │Transitions     │ │ │                   │
│ │ ├────────────────┤ │ │                   │
│ │ │getEditable     │ │ │                   │
│ │ │Fields          │ │ │                   │
│ │ ├────────────────┤ │ │                   │
│ │ │computeViewModel│ │ │                   │
│ │ ├────────────────┤ │ │                   │
│ │ │executeAction   │ │ │                   │
│ │ │ • transition   │ │ │                   │
│ │ │ • update_fields│ │ │                   │
│ │ │ • add_document │ │ │                   │
│ │ │ • add_note     │ │ │                   │
│ │ └────────────────┘ │ │                   │
│ └──────────┬─────────┘ │                   │
│            │            │                   │
│ ┌──────────▼─────────┐ │                   │
│ │ Validation Layer   │ │                   │
│ │ - Zod Schemas      │ │                   │
│ │ - Role Permissions │ │                   │
│ │ - Business Rules   │ │                   │
│ └──────────┬─────────┘ │                   │
└────────────┼───────────┘                   │
             │                               │
             └───────────┬───────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│                   Supabase Backend                                 │
│                   (PostgreSQL + Auth + Storage)                    │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Supabase Auth (JWT)                           │  │
│  │  - User management                                         │  │
│  │  - Role-based permissions                                  │  │
│  │  - Session handling                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                           │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  cases table                                     │     │  │
│  │  │  ├─ id (UUIDv7, time-ordered)                  │     │  │
│  │  │  ├─ matter_type (pipeline key)                 │     │  │
│  │  │  ├─ pipeline_stage (current state)             │     │  │
│  │  │  ├─ pipeline_version                           │     │  │
│  │  │  ├─ status (active/closed)                     │     │  │
│  │  │  ├─ client_id                                  │     │  │
│  │  │  ├─ assigned_lawyer                            │     │  │
│  │  │  ├─ metadata (JSONB - flexible fields)         │     │  │
│  │  │  ├─ created_at, updated_at                     │     │  │
│  │  │  └─ created_by, updated_by                     │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  case_history table (Audit Log)                 │     │  │
│  │  │  ├─ id (UUIDv7)                                 │     │  │
│  │  │  ├─ case_id (FK → cases)                        │     │  │
│  │  │  ├─ action_type (transition/update/etc)         │     │  │
│  │  │  ├─ user_id                                     │     │  │
│  │  │  ├─ from_stage                                  │     │  │
│  │  │  ├─ to_stage                                    │     │  │
│  │  │  ├─ changes (JSONB)                             │     │  │
│  │  │  └─ timestamp                                   │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  Indexes for Performance                        │     │  │
│  │  │  ├─ cases.metadata (GIN index)                  │     │  │
│  │  │  ├─ cases(status, matter_type, updated_at)      │     │  │
│  │  │  └─ case_history(case_id, timestamp DESC)       │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         Server-Authoritative RPC Functions                 │  │
│  │         (Atomic Transactions)                              │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  create_case(...)                                │     │  │
│  │  │  - Insert case with initial stage                │     │  │
│  │  │  - Create initial history entry                  │     │  │
│  │  │  - Return normalized case                        │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  execute_case_transition(...)                    │     │  │
│  │  │  - Optimistic locking (check from_stage)         │     │  │
│  │  │  - Update pipeline_stage                         │     │  │
│  │  │  - Insert history entry                          │     │  │
│  │  │  - Trigger NOTIFY                                │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  execute_case_update(...)                        │     │  │
│  │  │  - Merge metadata updates                        │     │  │
│  │  │  - Track field changes in history                │     │  │
│  │  │  - Return updated case                           │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  get_case_with_history(...)                      │     │  │
│  │  │  - Single query optimization                     │     │  │
│  │  │  - Join case + history                           │     │  │
│  │  │  - Limit history entries                         │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  close_case(...)                                 │     │  │
│  │  │  - Set status to closed                          │     │  │
│  │  │  - Add completion metadata                       │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │          Row Level Security (RLS) Policies                 │  │
│  │  - Lawyers can view their assigned cases                  │  │
│  │  - Admins can view all cases                              │  │
│  │  - Service role bypasses RLS for RPC functions            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │          PostgreSQL NOTIFY/LISTEN                          │  │
│  │          (Real-time Event Streaming)                       │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  Trigger: notify_case_change()                   │     │  │
│  │  │  - Fires on INSERT/UPDATE to cases               │     │  │
│  │  │  - Publishes to 'case_changes' channel           │     │  │
│  │  │  - Payload: {case_id, action, user_id}           │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   Optional: Real-time Layer                         │
│              (Future Enhancement - Not Yet Implemented)             │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │         Supabase Realtime (WebSocket)                      │   │
│  │  - Subscribe to case_changes channel                       │   │
│  │  - Push updates to connected clients                       │   │
│  │  - Room per case_id for targeted updates                   │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      CI/CD Pipeline                                 │
│                                                                     │
│  GitHub Actions                                                     │
│  ├─ Lint + Type Check                                             │
│  ├─ Unit Tests (Vitest)                                           │
│  ├─ Integration Tests (Database)                                  │
│  ├─ E2E Tests (Playwright - Chrome/Firefox/Safari)                │
│  ├─ Coverage Report (70%+ threshold)                              │
│  ├─ Security Audit (npm audit + Snyk)                             │
│  ├─ Build (Next.js)                                               │
│  └─ Deploy to Vercel (main branch)                                │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. Case Creation Flow
```
User (Browser)
    │
    ├─→ POST /api/cases { matterType, metadata }
    │       │
    │       ├─→ Validate JWT (Supabase Auth)
    │       ├─→ Get Pipeline Config from Registry
    │       ├─→ Generate UUIDv7
    │       ├─→ Call RPC: create_case(...)
    │       │       │
    │       │       ├─→ INSERT INTO cases
    │       │       ├─→ INSERT INTO case_history
    │       │       ├─→ NOTIFY 'case_changes'
    │       │       └─→ RETURN case data
    │       │
    │       └─→ Return 201 + case JSON
    │
    └─→ SWR updates cache
        └─→ UI re-renders with new case
```

### 2. Stage Transition Flow
```
User clicks "Move to Review"
    │
    ├─→ POST /api/cases/[caseId]/actions
    │   { action: { type: 'transition', payload: { targetStage: 'review' }}}
    │       │
    │       ├─→ Validate JWT
    │       ├─→ Fetch case from Supabase
    │       ├─→ Load Pipeline Config
    │       ├─→ Create PipelineExecutor instance
    │       ├─→ executor.executeAction(...)
    │       │       │
    │       │       ├─→ Check getAllowedTransitions()
    │       │       ├─→ Validate user role permissions
    │       │       ├─→ Validate required fields
    │       │       ├─→ Call RPC: execute_case_transition(...)
    │       │       │       │
    │       │       │       ├─→ UPDATE cases SET pipeline_stage = 'review'
    │       │       │       │   WHERE id = ? AND pipeline_stage = 'intake'
    │       │       │       │   (Optimistic Locking!)
    │       │       │       │
    │       │       │       ├─→ INSERT INTO case_history
    │       │       │       │   (action_type, from_stage, to_stage, ...)
    │       │       │       │
    │       │       │       └─→ NOTIFY 'case_changes'
    │       │       │
    │       │       └─→ Return ActionResult { success: true, data: {...} }
    │       │
    │       └─→ Return 200 + result JSON
    │
    └─→ SWR mutates cache (optimistic update)
        └─→ UI updates pipeline timeline
            └─→ Success toast notification
```

### 3. ViewModel Computation Flow
```
User opens /cases/[caseId]
    │
    ├─→ useCaseData(caseId) hook fires
    │       │
    │       ├─→ GET /api/cases/[caseId]
    │       │       │
    │       │       ├─→ Validate JWT
    │       │       ├─→ Call RPC: get_case_with_history(caseId, 50)
    │       │       │       │
    │       │       │       └─→ Single query returns case + history
    │       │       │
    │       │       ├─→ Load Pipeline Config from Registry
    │       │       ├─→ Create PipelineExecutor
    │       │       ├─→ executor.computeViewModel(caseDoc, userRole)
    │       │       │       │
    │       │       │       ├─→ getAllowedTransitions()
    │       │       │       ├─→ getEditableFields()
    │       │       │       ├─→ Calculate progress %
    │       │       │       ├─→ Build timeline with stages
    │       │       │       ├─→ Map permissions
    │       │       │       └─→ Return ViewModel object
    │       │       │
    │       │       └─→ Return 200 + { case, viewModel, pipelineConfig, history }
    │       │
    │       └─→ SWR caches response
    │
    └─→ React renders:
        ├─→ PipelineTimeline (with progress)
        ├─→ ActionButtons (allowed transitions)
        ├─→ FieldRenderer (editable fields)
        └─→ CaseHistory (audit log)
```

## Architecture Patterns Used

### 1. **Pipeline Pattern**
- Declarative stage definitions
- Transition rules with conditions
- Dynamic field visibility
- Role-based permissions

### 2. **Server-Authoritative**
- All state changes through RPC functions
- Client cannot directly UPDATE tables
- Optimistic locking prevents race conditions

### 3. **JSONB for Flexibility**
- Metadata stored as JSONB
- GIN indexes for fast queries
- Schema-less field definitions

### 4. **Optimistic UI Updates**
- SWR optimistic mutations
- Instant feedback to user
- Automatic revalidation on error

### 5. **Type-Safe Throughout**
- TypeScript on client and server
- Zod schemas for runtime validation
- Shared types between layers

