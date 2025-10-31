# Testing Guide

Comprehensive testing documentation for the Case Management Pipeline system.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Our testing strategy follows the testing pyramid:

```
        /\
       /E2E\        ← End-to-End Tests (Playwright)
      /------\
     /  API  \      ← Integration Tests (Vitest)
    /----------\
   /   Unit     \   ← Unit Tests (Vitest)
  /--------------\
```

### Test Stack

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Coverage**: V8 Coverage Provider
- **CI/CD**: GitHub Actions

## Test Types

### 1. Unit Tests

Unit tests verify individual components and functions in isolation.

**Location**: `src/__tests__/`

**Examples**:
- `src/__tests__/services/pipeline/PipelineExecutor.test.ts`
- `src/__tests__/lib/utils/uuidv7.test.ts`

**When to write**:
- Testing pure functions
- Testing class methods
- Testing utility functions
- Testing business logic

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { generateUUIDv7 } from '@/lib/utils/uuidv7';

describe('generateUUIDv7', () => {
  it('should generate a valid UUID', () => {
    const uuid = generateUUIDv7();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
```

### 2. Integration Tests

Integration tests verify that multiple components work together correctly.

**Location**: `src/__tests__/integration/`

**Examples**:
- `src/__tests__/integration/database.test.ts`
- `src/__tests__/api/cases/route.test.ts`

**When to write**:
- Testing API routes
- Testing database operations
- Testing component interactions
- Testing service integrations

**Example**:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('/api/cases', () => {
  it('should return list of cases', async () => {
    const { GET } = await import('@/app/api/cases/route');
    const request = new NextRequest('http://localhost:3000/api/cases');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### 3. End-to-End Tests

E2E tests verify complete user workflows in a browser environment.

**Location**: `e2e/`

**Examples**:
- `e2e/case-detail.spec.ts`
- `e2e/case-list.spec.ts`
- `e2e/auth.spec.ts`

**When to write**:
- Testing user workflows
- Testing UI interactions
- Testing cross-browser compatibility
- Testing responsive design

**Example**:
```typescript
import { test, expect } from '@playwright/test';

test('should display case information', async ({ page }) => {
  await page.goto('/cases/case-123');
  await expect(page.getByText('John Doe')).toBeVisible();
});
```

## Running Tests

### Quick Start

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Generate coverage report
npm run test:coverage
```

### Advanced Commands

```bash
# Run specific test file
npm test src/__tests__/services/pipeline/PipelineExecutor.test.ts

# Run tests matching a pattern
npm test -- --grep="PipelineExecutor"

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests on specific browser
npm run test:e2e -- --project=chromium

# Run integration tests only
RUN_INTEGRATION_TESTS=true npm test src/__tests__/integration/
```

### Running Tests Locally with Supabase

For integration tests that require a database:

```bash
# Start local Supabase instance
npx supabase start

# Run integration tests
RUN_INTEGRATION_TESTS=true \
TEST_SUPABASE_URL=http://localhost:54321 \
TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-key \
npm test src/__tests__/integration/

# Stop Supabase
npx supabase stop
```

## Writing Tests

### Best Practices

1. **Follow AAA Pattern** (Arrange, Act, Assert)
```typescript
it('should execute transition', async () => {
  // Arrange
  const executor = new PipelineExecutor(config);
  const action = { type: 'transition', payload: { targetStage: 'review' } };

  // Act
  const result = await executor.executeAction('case-123', action, 'user-123', 'lawyer');

  // Assert
  expect(result.success).toBe(true);
  expect(result.data.newStage).toBe('review');
});
```

2. **Use Descriptive Test Names**
```typescript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('should execute valid transition from intake to review', () => { ... });
```

3. **Test Edge Cases**
```typescript
describe('getAllowedTransitions', () => {
  it('should return transitions for valid stage', () => { ... });
  it('should return empty array for invalid stage', () => { ... });
  it('should respect role permissions', () => { ... });
  it('should handle missing config gracefully', () => { ... });
});
```

4. **Mock External Dependencies**
```typescript
vi.mock('@/services/supabase/client', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
      }))
    }))
  })
}));
```

5. **Use Test Fixtures**
```typescript
// Create reusable test data
const mockCaseDocument = {
  id: 'case-123',
  matterType: 'insolvency',
  pipelineStage: 'intake',
  // ... other fields
};
```

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PipelineTimeline } from '@/components/pipeline/PipelineTimeline';

describe('PipelineTimeline', () => {
  it('should render stages', () => {
    render(
      <PipelineTimeline
        stages={mockStages}
        currentStage="intake"
      />
    );

    expect(screen.getByText('Intake & Assessment')).toBeInTheDocument();
  });

  it('should call onClick when stage is clicked', () => {
    const handleClick = vi.fn();

    render(
      <PipelineTimeline
        stages={mockStages}
        currentStage="intake"
        onStageClick={handleClick}
      />
    );

    fireEvent.click(screen.getByText('Review'));
    expect(handleClick).toHaveBeenCalledWith('review');
  });
});
```

### Testing API Routes

```typescript
import { NextRequest } from 'next/server';

describe('GET /api/cases/[caseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return case with ViewModel', async () => {
    // Mock Supabase response
    mockSupabaseClient.rpc.mockResolvedValue({
      data: [{ case_data: mockCase, history: [] }],
      error: null
    });

    const { GET } = await import('@/app/api/cases/[caseId]/route');
    const request = new NextRequest('http://localhost:3000/api/cases/case-123');
    const response = await GET(request, { params: { caseId: 'case-123' } });

    expect(response.status).toBe(200);
  });
});
```

### Testing E2E Flows

```typescript
test.describe('Case Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication mock
    await page.route('**/auth/v1/**', mockAuthHandler);
    await page.route('**/api/cases/**', mockCasesHandler);
  });

  test('should create and transition case', async ({ page }) => {
    // Navigate to cases page
    await page.goto('/cases');

    // Create new case
    await page.getByRole('button', { name: /create case/i }).click();
    await page.getByLabel('Client Name').fill('John Doe');
    await page.getByRole('button', { name: /submit/i }).click();

    // Verify creation
    await expect(page.getByText(/created successfully/i)).toBeVisible();

    // Transition to next stage
    await page.getByRole('button', { name: /move to review/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify transition
    await expect(page.getByText('Review')).toBeVisible();
  });
});
```

## Coverage Requirements

### Thresholds

Our project maintains the following coverage thresholds:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

### Viewing Coverage

```bash
# Generate and view coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage by Component

| Component | Target | Current |
|-----------|--------|---------|
| PipelineExecutor | 90% | TBD |
| API Routes | 80% | TBD |
| React Components | 70% | TBD |
| Utilities | 90% | TBD |

### Improving Coverage

1. **Identify uncovered code**:
```bash
npm run test:coverage
# Check coverage/index.html
```

2. **Add missing tests**:
- Focus on critical paths first
- Test edge cases
- Test error scenarios

3. **Avoid coverage for coverage's sake**:
- Don't test third-party code
- Don't test trivial getters/setters
- Focus on business logic

## CI/CD Integration

### GitHub Actions Workflows

#### Main CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and PR:
- Linting and type checking
- Unit and integration tests
- E2E tests (Chrome, Firefox, Safari)
- Build verification
- Coverage reporting
- Security audit
- Deployment (main branch only)

#### PR Checks (`.github/workflows/pr-check.yml`)

Runs on pull requests:
- Quick quality checks
- Dependency review
- Automated PR comments

### Running CI Locally

```bash
# Install act (GitHub Actions locally)
brew install act  # macOS
# or
sudo apt-get install act  # Linux

# Run workflow locally
act -j test
```

### Required Secrets

Configure these secrets in GitHub:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SNYK_TOKEN`

## Troubleshooting

### Common Issues

#### 1. Tests failing locally but passing in CI

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm ci
npm test
```

#### 2. E2E tests timing out

```typescript
// Increase timeout
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  await page.goto('/cases');
  // ...
});
```

#### 3. Mocks not working

```typescript
// Ensure mocks are at top of file
vi.mock('@/services/supabase/client', () => ({ ... }));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

#### 4. Supabase connection issues

```bash
# Check Supabase status
npx supabase status

# Restart Supabase
npx supabase stop
npx supabase start
```

#### 5. TypeScript errors in tests

```typescript
// Add type definitions
import type { Mock } from 'vitest';

const mockFn = vi.fn() as Mock;
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run E2E tests with debug
DEBUG=pw:api npm run test:e2e

# Run single E2E test in debug mode
npx playwright test --debug e2e/case-detail.spec.ts
```

### Performance

```bash
# Run tests in parallel (default)
npm test

# Run tests serially for debugging
npm test -- --no-threads

# Limit workers
npm test -- --max-workers=2
```

## Testing Checklist

Before submitting a PR, ensure:

- [ ] All tests pass locally
- [ ] Coverage meets thresholds
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] E2E tests cover critical paths
- [ ] No console.log statements
- [ ] Mocks are properly cleaned up
- [ ] Test names are descriptive
- [ ] Documentation is updated

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2024-01-31
**Maintained By**: Development Team
