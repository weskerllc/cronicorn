/**
 * Time utilities for tests and fixtures.
 */

/**
 * Parse ISO date string into Date object.
 * Helper for readable test fixtures.
 */
export function at(iso: string): Date {
    return new Date(iso);
}
