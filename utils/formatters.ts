/**
 * Utility functions for formatting and calculations
 */

// =============================================================================
// Time Formatting
// =============================================================================

/**
 * Formats milliseconds to MM:SS format
 * @param ms - Time in milliseconds
 * @returns Formatted string (e.g., "3:45")
 */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats milliseconds to HH:MM:SS format (for long durations)
 * @param ms - Time in milliseconds
 * @returns Formatted string (e.g., "1:23:45")
 */
export function formatLongDuration(ms: number): string {
  if (!ms || ms < 0) return '0:00:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// =============================================================================
// File Size Formatting
// =============================================================================

/**
 * Formats bytes to human readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "4.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// =============================================================================
// Track Count Formatting
// =============================================================================

/**
 * Formats track count with proper pluralization
 * @param count - Number of tracks
 * @returns Formatted string (e.g., "5 canciones")
 */
export function formatTrackCount(count: number): string {
  if (count === 1) return '1 canción';
  return `${count} canciones`;
}

// =============================================================================
// Progress Calculation
// =============================================================================

/**
 * Calculates progress percentage
 * @param current - Current value
 * @param total - Total value
 * @returns Progress as percentage (0-100)
 */
export function calculateProgress(current: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (current / total) * 100));
}

// =============================================================================
// Shuffling
// =============================================================================

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Truncates text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalizes first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
