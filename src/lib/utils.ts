import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function getMonthWorkingDays(year: number, month: number) {
  let workingDays = 0;
  const daysInMonth = getDaysInMonth(year, month);
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month - 1, i).getDay();
    if (day !== 0) { // Exclude Sundays
      workingDays++;
    }
  }
  return workingDays;
}
