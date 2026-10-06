import { CalendarDays, Camera, Home, Refrigerator, User, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const SIDEBAR_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/scan', label: 'Scan', icon: Camera },
  { href: '/pantry', label: 'Pantry', icon: Refrigerator },
  { href: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { href: '/meal-plan', label: 'Meal Plan', icon: CalendarDays },
  { href: '/profile', label: 'Profile', icon: User },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = SIDEBAR_ITEMS.filter((i) => i.href !== '/meal-plan');

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
