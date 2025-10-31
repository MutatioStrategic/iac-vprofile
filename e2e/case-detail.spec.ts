/**
 * Case Detail E2E Tests
 *
 * End-to-end tests for the case detail page using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Case Detail Page', () => {
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

    // Mock case API
    await page.route('**/api/cases/case-123', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            case: {
              id: 'case-123',
              matterType: 'insolvency',
              pipelineStage: 'intake',
              status: 'active',
              clientId: 'client-123',
              assignedLawyer: 'lawyer-123',
              metadata: {
                client_name: 'John Doe',
                case_type: 'Chapter 7'
              },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            viewModel: {
              caseId: 'case-123',
              matterType: 'insolvency',
              currentStage: {
                key: 'intake',
                name: 'Intake & Assessment',
                color: '#3B82F6'
              },
              progress: 12.5,
              allowedTransitions: [
                {
                  to: 'document_collection',
                  label: 'Move to Document Collection',
                  requiredFields: ['client_name', 'bankruptcy_type']
                }
              ],
              editableFields: [
                {
                  key: 'client_name',
                  label: 'Client Name',
                  type: 'text'
                },
                {
                  key: 'bankruptcy_type',
                  label: 'Bankruptcy Type',
                  type: 'select',
                  options: ['Chapter 7', 'Chapter 11', 'Chapter 13']
                }
              ],
              displayFields: [
                {
                  key: 'client_name',
                  label: 'Client Name',
                  type: 'text',
                  value: 'John Doe',
                  isEditable: true
                }
              ],
              permissions: {
                canEdit: true,
                canDelete: false,
                canApprove: true
              },
              timeline: {
                stages: [
                  {
                    key: 'intake',
                    name: 'Intake & Assessment',
                    status: 'active',
                    color: '#3B82F6'
                  },
                  {
                    key: 'document_collection',
                    name: 'Document Collection',
                    status: 'pending',
                    color: '#10B981'
                  }
                ]
              }
            },
            pipelineConfig: {
              key: 'insolvency',
              name: 'Insolvency & Bankruptcy'
            },
            history: []
          })
        });
      }
    });
  });

  test('should display case information', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Check for case ID
    await expect(page.getByText('case-123')).toBeVisible();

    // Check for client name
    await expect(page.getByText('John Doe')).toBeVisible();

    // Check for current stage
    await expect(page.getByText('Intake & Assessment')).toBeVisible();
  });

  test('should display pipeline timeline', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Check for timeline stages
    await expect(page.getByText('Intake & Assessment')).toBeVisible();
    await expect(page.getByText('Document Collection')).toBeVisible();

    // Check for progress indicator
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });

  test('should display editable fields', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Enter edit mode
    const editButton = page.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Check for editable fields
    await expect(page.getByLabel('Client Name')).toBeVisible();
    await expect(page.getByLabel('Bankruptcy Type')).toBeVisible();
  });

  test('should update field values', async ({ page }) => {
    // Mock update API
    await page.route('**/api/cases/case-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            case: {
              id: 'case-123',
              metadata: {
                client_name: 'Jane Doe',
                case_type: 'Chapter 7'
              }
            }
          })
        });
      }
    });

    await page.goto('/cases/case-123');

    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click();

    // Update client name
    const clientNameInput = page.getByLabel('Client Name');
    await clientNameInput.fill('Jane Doe');

    // Save changes
    await page.getByRole('button', { name: /save/i }).click();

    // Verify success message
    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });

  test('should display allowed transitions', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Check for transition button
    await expect(
      page.getByRole('button', { name: /move to document collection/i })
    ).toBeVisible();
  });

  test('should execute stage transition', async ({ page }) => {
    // Mock transition API
    await page.route('**/api/cases/case-123/actions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            result: {
              success: true,
              data: {
                caseId: 'case-123',
                newStage: 'document_collection'
              }
            }
          })
        });
      }
    });

    await page.goto('/cases/case-123');

    // Click transition button
    await page.getByRole('button', { name: /move to document collection/i }).click();

    // Confirm transition in modal
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify success message
    await expect(page.getByText(/transition successful/i)).toBeVisible();
  });

  test('should display validation errors', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click();

    // Clear required field
    const clientNameInput = page.getByLabel('Client Name');
    await clientNameInput.fill('');

    // Try to save
    await page.getByRole('button', { name: /save/i }).click();

    // Verify validation error
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('should cancel edit mode', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click();

    // Modify a field
    const clientNameInput = page.getByLabel('Client Name');
    await clientNameInput.fill('Modified Name');

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Verify original value is restored
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should show transition modal with required fields', async ({ page }) => {
    await page.goto('/cases/case-123');

    // Click transition button
    await page.getByRole('button', { name: /move to document collection/i }).click();

    // Verify modal is open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check for required fields warning
    await expect(
      page.getByText(/the following fields are required/i)
    ).toBeVisible();

    // Check for field list
    await expect(page.getByText('Client Name')).toBeVisible();
    await expect(page.getByText('Bankruptcy Type')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/cases/case-123', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      }
    });

    await page.goto('/cases/case-123');

    // Verify error message is displayed
    await expect(page.getByText(/error loading case/i)).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/cases/case-123');

    // Verify timeline switches to vertical layout
    const timeline = page.locator('[data-testid="pipeline-timeline"]');
    await expect(timeline).toBeVisible();

    // Verify content is readable
    await expect(page.getByText('John Doe')).toBeVisible();
  });
});
