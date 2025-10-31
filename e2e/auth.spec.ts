/**
 * Authentication E2E Tests
 *
 * End-to-end tests for authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    // Mock unauthenticated state
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Not authenticated'
        })
      });
    });

    await page.goto('/cases');

    // Verify redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    // Mock successful login
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { role: 'lawyer' }
          }
        })
      });
    });

    // Fill in login form
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');

    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();

    // Verify redirect to cases page
    await expect(page).toHaveURL(/\/cases/);
  });

  test('should display login error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Mock failed login
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid login credentials'
        })
      });
    });

    // Fill in login form
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();

    // Verify error message
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/auth/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('logout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'user-123',
              email: 'test@example.com'
            }
          })
        });
      }
    });

    await page.goto('/cases');

    // Click user menu
    await page.getByRole('button', { name: /user menu/i }).click();

    // Click logout
    await page.getByRole('menuitem', { name: /logout/i }).click();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should signup successfully', async ({ page }) => {
    await page.goto('/signup');

    // Mock successful signup
    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'new-user-123',
            email: 'newuser@example.com',
            user_metadata: { role: 'paralegal' }
          }
        })
      });
    });

    // Fill in signup form
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');
    await page.getByLabel('Role').selectOption('paralegal');

    // Submit signup
    await page.getByRole('button', { name: /sign up/i }).click();

    // Verify success message
    await expect(page.getByText(/account created successfully/i)).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/signup');

    // Fill in weak password
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('weak');

    // Verify password strength indicator
    await expect(page.getByText(/password too weak/i)).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/signup');

    // Fill in mismatched passwords
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('DifferentPass123!');

    // Try to submit
    await page.getByRole('button', { name: /sign up/i }).click();

    // Verify error message
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should reset password', async ({ page }) => {
    await page.goto('/forgot-password');

    // Mock password reset request
    await page.route('**/auth/v1/recover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Fill in email
    await page.getByLabel('Email').fill('test@example.com');

    // Submit reset request
    await page.getByRole('button', { name: /reset password/i }).click();

    // Verify success message
    await expect(
      page.getByText(/password reset email sent/i)
    ).toBeVisible();
  });

  test('should persist session after page reload', async ({ page }) => {
    // Mock authenticated state with session
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { role: 'lawyer' }
          }
        })
      });
    });

    await page.goto('/cases');

    // Verify user is authenticated
    await expect(page.getByText('test@example.com')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify user is still authenticated
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('should handle role-based access control', async ({ page }) => {
    // Mock paralegal user
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'paralegal-123',
            email: 'paralegal@example.com',
            user_metadata: { role: 'paralegal' }
          }
        })
      });
    });

    await page.goto('/cases/case-123');

    // Verify limited permissions
    // Delete button should not be visible for paralegal
    await expect(
      page.getByRole('button', { name: /delete case/i })
    ).not.toBeVisible();

    // Approve button should not be visible
    await expect(
      page.getByRole('button', { name: /approve/i })
    ).not.toBeVisible();
  });

  test('should refresh expired token', async ({ page }) => {
    let tokenExpired = false;

    await page.route('**/api/cases', async (route) => {
      if (!tokenExpired) {
        tokenExpired = true;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, cases: [] })
        });
      }
    });

    // Mock token refresh
    await page.route('**/auth/v1/token*', async (route) => {
      if (route.request().url().includes('refresh_token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          })
        });
      }
    });

    await page.goto('/cases');

    // Verify that page loads successfully after token refresh
    await expect(page).toHaveURL(/\/cases/);
  });
});
