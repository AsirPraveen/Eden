import { differenceInDays, format, isAfter, isBefore, isToday } from 'date-fns';
import { PAYMENT_URGENCY } from './constants';

/**
 * Format currency in INR
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy');
};

/**
 * Format date with time
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy, hh:mm a');
};

/**
 * Get days remaining until a due date.
 * Positive = days left, Negative = overdue by X days.
 */
export const getDaysRemaining = (dueDate: Date | string): number => {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return differenceInDays(due, new Date());
};

/**
 * Get payment urgency level and color based on days remaining
 */
export const getPaymentUrgency = (
  daysRemaining: number
): { level: string; color: string; label: string } => {
  if (daysRemaining < 0) {
    return {
      level: 'overdue',
      color: '#991B1B',
      label: `Overdue by ${Math.abs(daysRemaining)} days`,
    };
  }
  if (daysRemaining === 0) {
    return { level: 'today', color: '#DC3545', label: 'Due Today' };
  }
  if (daysRemaining <= PAYMENT_URGENCY.CRITICAL) {
    return {
      level: 'critical',
      color: '#EA580C',
      label: `${daysRemaining} days left`,
    };
  }
  if (daysRemaining <= PAYMENT_URGENCY.WARNING) {
    return {
      level: 'warning',
      color: '#D97706',
      label: `${daysRemaining} days left`,
    };
  }
  return {
    level: 'safe',
    color: '#10B981',
    label: `${daysRemaining} days left`,
  };
};

/**
 * Convert Firestore Timestamp to JS Date
 */
export const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

/**
 * Generate a short readable ID (for prescription numbers, etc.)
 */
export const generateShortId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indian phone number
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Get greeting based on time of day
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Parse dosage string to morning/afternoon/night counts
 * e.g., "1-0-1" → { morning: 1, afternoon: 0, night: 1 }
 */
export const parseDosage = (dosage: string): { morning: number; afternoon: number; night: number } => {
  const parts = dosage.split('-').map(Number);
  return {
    morning: parts[0] || 0,
    afternoon: parts[1] || 0,
    night: parts[2] || 0,
  };
};
