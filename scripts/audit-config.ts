/**
 * Audit configuration.
 *
 * EXPECTED_MIN_ROLES: the minimum number of roles the audit expects to scan.
 * If fewer rows are returned, the audit fails with exit code 2 (setup error).
 *
 * Update this number after bulk ingestions or deletions that permanently
 * change the role count.
 */
export const EXPECTED_MIN_ROLES = 850;
