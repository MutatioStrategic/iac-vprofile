# Milestone 1: PipelineExecutor + pipelineConfig Refactor

## ✅ Completed

### Core Architecture

1. **PipelineExecutor** (`src/services/pipeline/PipelineExecutor.ts`)
   - Interprets declarative `pipelineConfig` to compute allowed transitions
   - Validates user actions against role permissions and field definitions
   - Generates `ViewModel` for frontend consumption
   - Executes atomic case updates with Postgres transactions
   - Methods:
     - `getAllowedTransitions()` - Compute valid transitions for current state
     - `getEditableFields()` - Get fields user can edit based on role
     - `computeViewModel()` - Generate complete UI model
     - `executeAction()` - Validate and execute case actions
     - `executeTransition()` - Stage transition with transaction
     - `executeFieldUpdate()` - Update case fields

2. **Type Definitions** (`src/types/`)
   - `pipeline.types.ts` - Complete pipeline type system
     - `PipelineConfig` - Declarative config interface
     - `StageDefinition` - Stage metadata
     - `TransitionRule` - Transition logic
     - `FieldDefinition` - Field metadata and validation
     - `RolePermission` - RBAC configuration
     - `ViewModel` - Frontend data model
     - `CaseDocument` - Database schema types
     - `CaseAction` - Action payload types
   - `auth.types.ts` - Auth and permission types
   - `case.types.ts` - Case-specific types

3. **Zod Schemas** (`src/lib/schemas/pipelineConfig.schema.ts`)
   - Runtime validation for all pipeline configs
   - Comprehensive validation rules:
     - All referenced stages must exist
     - All required fields must be defined
     - No orphaned transitions
     - Valid semver for pipeline versions
   - Helper functions:
     - `validatePipelineConfig()` - Throw on invalid config
     - `safeParsePipelineConfig()` - Return errors without throwing
     - `createFieldValidator()` - Generate field-specific validators
     - `createUpdateValidator()` - Generate update payload validators

4. **Example Pipeline** (`src/services/pipelines/insolvency/insolvencyConfig.ts`)
   - Complete insolvency/bankruptcy pipeline
   - **8 stages**: intake → document_collection → means_test → filing_preparation → filed → meeting_of_creditors → pending_discharge → discharged → closed
   - **10 transitions** with conditions and required fields
   - **30+ field definitions** grouped by stage and category
   - **4 role configurations**: admin, lawyer, paralegal, client
   - **3 automations**: filing notification, 341 meeting reminder, discharge notification
   - **3 notification configs**: stage changes, deadlines, assignments

5. **Utilities**
   - `src/lib/utils/uuidv7.ts` - UUIDv7 generation and utilities
     - `generateUUIDv7()` - Time-ordered UUID generation
     - `extractTimestamp()` - Extract timestamp from UUID
     - `isValidUUIDv7()` - Validation
     - `compareUUIDv7()` - Chronological comparison
   - `src/services/supabase/client.ts` - Supabase client setup
     - Browser client with RLS
     - Server client with service role
     - Edge function client with JWT

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  PipelineExecutor                           │
│                                                             │
│  Input: CaseDocument + UserRole + pipelineConfig           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ getAllowedTransitions()                             │   │
│  │ - Filter by current stage                           │   │
│  │ - Check role permissions                            │   │
│  │ - Evaluate transition conditions                    │   │
│  │ - Verify required fields                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ getEditableFields()                                 │   │
│  │ - Get fields for current stage                      │   │
│  │ - Filter by role permissions                        │   │
│  │ - Check editableInStages                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ computeViewModel()                                  │   │
│  │ - Current stage metadata                            │   │
│  │ - Progress calculation                              │   │
│  │ - Allowed transitions                               │   │
│  │ - Display fields with values                        │   │
│  │ - Timeline with completion status                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ executeAction()                                     │   │
│  │ - Validate action against config                    │   │
│  │ - Start Postgres transaction                        │   │
│  │ - Update case row                                   │   │
│  │ - Insert history row (UUIDv7)                       │   │
│  │ - Emit NOTIFY event                                 │   │
│  │ - Commit or rollback                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features

### 1. Declarative Pipeline Configuration

All pipeline logic is now declarative:

```typescript
{
  stages: [...],           // What stages exist
  transitions: [...],      // How to move between stages
  fieldDefinitions: [...], // What data to collect
  rolePermissions: [...],  // Who can do what
  automations: [...],      // What happens automatically
  notifications: [...]     // Who gets notified
}
```

### 2. Type-Safe Configuration

- TypeScript types ensure compile-time safety
- Zod schemas provide runtime validation
- Validation happens in CI before deployment

### 3. Role-Based Access Control

```typescript
rolePermissions: [
  {
    role: 'lawyer',
    canEdit: true,
    canTransitionFrom: ['intake', 'document_collection', ...],
    editableFields: ['*']
  },
  {
    role: 'paralegal',
    canEdit: true,
    canTransitionFrom: ['intake'],
    editableFields: ['client_name', 'documents', ...]
  }
]
```

### 4. Conditional Transitions

```typescript
{
  from: 'filing_preparation',
  to: 'filed',
  requiredFields: ['petition_complete', 'filing_fee_paid'],
  requiresApproval: true,
  conditions: [
    {
      type: 'role_required',
      roles: ['lawyer', 'admin'],
      message: 'Only lawyers can file petitions'
    }
  ]
}
```

### 5. Field-Level Permissions

```typescript
{
  key: 'means_test_result',
  type: 'select',
  stages: ['means_test', 'filing_preparation'],
  editableInStages: ['means_test'],
  validation: {
    required: true,
    options: [...]
  }
}
```

## 📁 File Structure

```
src/
├── types/
│   ├── pipeline.types.ts          ✅ Complete type system
│   ├── auth.types.ts              ✅ Auth types
│   └── case.types.ts              ✅ Case types
│
├── services/
│   ├── pipeline/
│   │   └── PipelineExecutor.ts    ✅ Core executor
│   │
│   ├── pipelines/
│   │   └── insolvency/
│   │       └── insolvencyConfig.ts ✅ Example pipeline
│   │
│   └── supabase/
│       └── client.ts              ✅ Supabase clients
│
└── lib/
    ├── schemas/
    │   └── pipelineConfig.schema.ts ✅ Zod validation
    │
    └── utils/
        └── uuidv7.ts              ✅ UUID utilities
```

## 🚀 Next Steps (Milestone 2)

1. **Pipeline Registry**
   - `src/services/pipelines/registry.ts`
   - Register all pipelines
   - Version management
   - Config caching

2. **Postgres Migration**
   - Add `matter_type` column
   - Add `pipeline_version` column
   - Add `metadata` JSONB column
   - Create GIN indexes for JSONB
   - Create compound indexes for queries

3. **Supabase Edge Function**
   - `/execute-case-action` endpoint
   - JWT validation
   - Action execution
   - Transaction handling
   - NOTIFY emission

4. **Frontend Components**
   - Case detail page
   - Generic field renderers
   - Pipeline timeline
   - Action buttons

5. **Tests**
   - Unit tests for PipelineExecutor
   - Integration tests with Postgres
   - Pipeline config validation tests

6. **CI Pipeline**
   - Lint and typecheck
   - Schema validation
   - Unit tests
   - Integration tests

## 📝 Usage Example

```typescript
import { createPipelineExecutor } from '@/services/pipeline/PipelineExecutor';
import { insolvencyPipelineConfig } from '@/services/pipelines/insolvency/insolvencyConfig';

// Create executor
const executor = createPipelineExecutor(insolvencyPipelineConfig);

// Get view model for frontend
const viewModel = executor.computeViewModel(caseDoc, 'lawyer');
// Returns:
// {
//   currentStage: { key: 'intake', name: 'Intake & Assessment', ... },
//   progress: 12.5,
//   allowedTransitions: [{ to: 'document_collection', ... }],
//   editableFields: [...],
//   displayFields: [...],
//   timeline: { stages: [...] }
// }

// Get allowed transitions
const transitions = executor.getAllowedTransitions(caseDoc, 'paralegal');
// Returns: [{ to: 'document_collection', label: 'Start...', ... }]

// Execute transition
const result = await executor.executeAction(
  caseId,
  {
    type: 'transition',
    payload: { targetStage: 'document_collection' }
  },
  userId,
  'lawyer'
);
// Executes Postgres transaction, updates case, inserts history
```

## ✨ Benefits

1. **Single Source of Truth**: Pipeline logic in config, not scattered in code
2. **Type Safety**: TypeScript + Zod ensure correctness
3. **Runtime Validation**: Invalid configs caught early
4. **Easy Extension**: Add new pipelines without touching executor
5. **Frontend Agnostic**: ViewModel works with any UI framework
6. **Testable**: Pure functions, easy to unit test
7. **Auditable**: All state changes tracked with UUIDv7 timestamps

## 📋 Checklist for Reviewers

- [ ] PipelineExecutor correctly interprets config
- [ ] Type definitions are complete and accurate
- [ ] Zod schemas validate all edge cases
- [ ] Insolvency config is realistic and complete
- [ ] UUIDv7 generation is correct
- [ ] Supabase client setup is secure
- [ ] Code follows TypeScript best practices
- [ ] No circular dependencies
- [ ] Imports use `@/` aliases

## 🔄 Migration Path

Current codebase has:
- Code-first pipelines (defaultPipeline, insolvencyPipeline)
- Manual state transitions
- Mixed permission logic

Migration strategy:
1. Keep existing pipelines working
2. Add new config-based pipelines in parallel
3. Migrate one matter type at a time
4. Use feature flags for gradual rollout
5. Backfill `matter_type` and `pipeline_version` columns
6. Deprecate old pipelines after migration complete

---

**Status**: ✅ Milestone 1 Complete - Ready for Review

**Next**: Milestone 2 - Frontend Components & API Routes
