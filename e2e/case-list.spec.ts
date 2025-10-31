/**
 * Case List E2E Tests
 *
 * End-to-end tests for the case list page
 */

import { test, expect } from '@playwright/test';

test.describe('Case List Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            user_metadata: { role: 'lawyer' }
          }
        })
      });
    });

    // Mock cases list API
    await page.route('**/api/cases', async (route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const matterType = url.searchParams.get('matterType');
        const status = url.searchParams.get('status');

        let cases = [
          {
            id: 'case-1',
            matterType: 'insolvency',
            pipelineStage: 'intake',
            status: 'active',
            clientId: 'client-1',
            assignedLawyer: 'lawyer-1',
            metadata: { client_name: 'John Doe' },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'case-2',
            matterType: 'insolvency',
            pipelineStage: 'review',
            status: 'active',
            clientId: 'client-2',
            assignedLawyer: 'lawyer-1',
            metadata: { client_name: 'Jane Smith' },
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z'
          },
          {
            id: 'case-3',
            matterType: 'insolvency',
            pipelineStage: 'completed',
            status: 'closed',
            clientId: 'client-3',
            assignedLawyer: 'lawyer-1',
            metadata: { client_name: 'Bob Johnson' },
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-03T00:00:00Z'
          }
        ];

        // Apply filters
        if (matterType) {
          cases = cases.filter(c => c.matterType === matterType);
        }
        if (status) {
          cases = cases.filter(c => c.status === status);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            cases,
            count: cases.length
          })
        });
      }
    });

    // Mock pipelines API
    await page.route('**/api/pipelines', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          pipelines: [
            {
              key: 'insolvency',
              name: 'Insolvency & Bankruptcy',
              version: '1.0.0'
            }
          ]
        })
      });
    });
  });

  test('should display list of cases', async ({ page }) => {
    await page.goto('/cases');

    // Check for case entries
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('Bob Johnson')).toBeVisible();
  });

  test('should filter by matter type', async ({ page }) => {
    await page.goto('/cases');

    // Select matter type filter
    const matterTypeSelect = page.getByLabel('Matter Type');
    await matterTypeSelect.selectOption('insolvency');

    // Verify filtered results
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/cases');

    // Select status filter
    const statusSelect = page.getByLabel('Status');
    await statusSelect.selectOption('active');

    // Verify filtered results show only active cases
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();

    // Closed case should not be visible
    await expect(page.getByText('Bob Johnson')).not.toBeVisible();
  });

  test('should search cases', async ({ page }) => {
    await page.goto('/cases');

    // Enter search query
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Jane');

    // Verify search results
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();
  });

  test('should navigate to case detail', async ({ page }) => {
    await page.goto('/cases');

    // Click on a case
    await page.getByText('John Doe').click();

    // Verify navigation to case detail page
    await expect(page).toHaveURL(/\/cases\/case-1/);
  });

  test('should create new case', async ({ page }) => {
    // Mock create case API
    await page.route('**/api/cases', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            case: {
              id: 'new-case-123',
              matterType: 'insolvency',
              pipelineStage: 'intake',
              status: 'active'
            }
          })
        });
      }
    });

    await page.goto('/cases');

    // Click create case button
    await page.getByRole('button', { name: /create case/i }).click();

    // Fill in create case form
    await page.getByLabel('Matter Type').selectOption('insolvency');
    await page.getByLabel('Client Name').fill('New Client');

    // Submit form
    await page.getByRole('button', { name: /submit/i }).click();

    // Verify success message
    await expect(page.getByText(/case created successfully/i)).toBeVisible();

    // Verify redirect to new case
    await expect(page).toHaveURL(/\/cases\/new-case-123/);
  });

  test('should sort cases', async ({ page }) => {
    await page.goto('/cases');

    // Click on date column header to sort
    await page.getByRole('columnheader', { name: /date/i }).click();

    // Verify sort order (most recent first)
    const cases = page.locator('[data-testid="case-row"]');
    await expect(cases.first()).toContainText('Bob Johnson');
  });

  test('should paginate cases', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/cases*', async (route) => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const allCases = Array.from({ length: 50 }, (_, i) => ({
        id: `case-${i}`,
        matterType: 'insolvency',
        pipelineStage: 'intake',
        status: 'active',
        metadata: { client_name: `Client ${i}` }
      }));

      const paginatedCases = allCases.slice(offset, offset + limit);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          cases: paginatedCases,
          count: allCases.length
        })
      });
    });

    await page.goto('/cases');

    // Verify pagination controls
    await expect(page.getByText(/1-10 of 50/i)).toBeVisible();

    // Go to next page
    await page.getByRole('button', { name: /next/i }).click();

    // Verify new page data
    await expect(page.getByText('Client 10')).toBeVisible();
  });

  test('should display empty state', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/cases', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          cases: [],
          count: 0
        })
      });
    });

    await page.goto('/cases');

    // Verify empty state message
    await expect(page.getByText(/no cases found/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create case/i })).toBeVisible();
  });

  test('should display case status badges', async ({ page }) => {
    await page.goto('/cases');

    // Verify status badges are visible
    const activeBadge = page.getByText('active').first();
    await expect(activeBadge).toBeVisible();

    const closedBadge = page.getByText('closed');
    await expect(closedBadge).toBeVisible();
  });

  test('should handle bulk actions', async ({ page }) => {
    await page.goto('/cases');

    // Select multiple cases
    const checkboxes = page.getByRole('checkbox', { name: /select case/i });
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    // Verify bulk action bar appears
    await expect(page.getByText(/2 cases selected/i)).toBeVisible();

    // Click bulk action
    await page.getByRole('button', { name: /assign/i }).click();

    // Verify bulk action modal
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/cases');

    // Verify mobile layout
    await expect(page.getByText('John Doe')).toBeVisible();

    // Verify filters are in collapsed menu
    const filterButton = page.getByRole('button', { name: /filters/i });
    await expect(filterButton).toBeVisible();
  });
});
