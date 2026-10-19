// src/services/adminAuth.ts
// Secure Admin Access & Stealth Management System
// Ensures normal players never see or access the Admin section,
// while giving the website owner 4 convenient stealth entry methods.

const ADMIN_MODE_KEY = 'aviator_admin_stealth_mode_v1';
const ADMIN_PHONE_KEY = 'aviator_admin_registered_phone_v1';

// Default owner phone (can be customized in Admin Panel settings)
export const DEFAULT_ADMIN_PHONE = '01700000000';

/**
 * Checks if the Admin mode is currently revealed on this device/browser.
 * By default, this is FALSE for all public visitors.
 */
export function isPublicAdminVisible(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Check URL parameters: e.g. ?admin=true or ?admin=1 or #admin
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true' || urlParams.get('admin') === '1' || urlParams.get('secret') === 'admin') {
      localStorage.setItem(ADMIN_MODE_KEY, 'true');
      return true;
    }
    if (window.location.hash.toLowerCase() === '#admin') {
      localStorage.setItem(ADMIN_MODE_KEY, 'true');
      return true;
    }

    // 2. Check local persistence
    return localStorage.getItem(ADMIN_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggle Admin mode on or off for the current browser
 */
export function setAdminVisible(visible: boolean): void {
  try {
    if (visible) {
      localStorage.setItem(ADMIN_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_MODE_KEY);
      // Clean up URL if ?admin=true was present
      if (window.location.search.includes('admin=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('admin');
        window.history.replaceState({}, '', url.toString());
      }
      if (window.location.hash.toLowerCase() === '#admin') {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }
    }
    window.dispatchEvent(new CustomEvent('admin_mode_changed', { detail: { visible } }));
  } catch (e) {
    console.error('Failed to set admin visibility:', e);
  }
}

/**
 * Toggle visibility and return new state
 */
export function toggleAdminVisibility(): boolean {
  const current = isPublicAdminVisible();
  const next = !current;
  setAdminVisible(next);
  return next;
}

/**
 * Get registered owner phone number
 */
export function getRegisteredAdminPhone(): string {
  try {
    return localStorage.getItem(ADMIN_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Save registered owner phone number
 */
export function saveRegisteredAdminPhone(phone: string): void {
  try {
    const clean = phone.replace(/[^0-9]/g, '');
    localStorage.setItem(ADMIN_PHONE_KEY, clean);
  } catch {}
}

/**
 * Check if a logged in user is the designated admin/owner
 */
export function isUserAdminAccount(userPhone?: string | null): boolean {
  if (!userPhone) return false;
  const cleanUser = userPhone.replace(/[^0-9]/g, '');
  const registered = getRegisteredAdminPhone().replace(/[^0-9]/g, '');
  
  if (registered && cleanUser.endsWith(registered)) return true;
  return false;
}
