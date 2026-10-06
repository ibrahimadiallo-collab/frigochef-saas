import { CalendarDays, Camera, Home, Refrigerator, ShoppingCart, User, UtensilsCrossed, type LucideIcon } from 'lucide-react';

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
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
];

// Mobile: 6 voci (Meal Plan è raggiungibile da dashboard e Shopping List).
export const BOTTOM_NAV_ITEMS: NavItem[] = SIDEBAR_ITEMS.filter((i) => i.href !== '/meal-plan').map((i) =>
  i.href === '/shopping-list' ? { ...i, label: 'List' } : i,
);

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
