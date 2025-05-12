import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";

/**
 * Combines class names with Tailwind's merge utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a readable format
 */
export function formatDate(date: Date | string, formatStr: string = "PPP") {
  return format(new Date(date), formatStr);
}

/**
 * Formats a date to relative time (e.g. "2 days ago")
 */
export function formatRelativeDate(date: Date | string) {
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
}

/**
 * Formats a currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Creates a delay promise
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncates a string to a certain length
 */
export function truncateString(str: string, num: number) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + "...";
}

/**
 * Generates a random string
 */
export function generateRandomString(length: number) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Returns an array of numbers from start to end
 */
export function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Determines if an object has been modified compared to the original
 */
export function isObjectModified<T extends object>(
  original: T,
  current: Partial<T>
): boolean {
  return Object.keys(current).some((key) => {
    const typedKey = key as keyof T;
    return (
      current[typedKey] !== undefined &&
      current[typedKey] !== original[typedKey]
    );
  });
}
