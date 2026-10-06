import { brandImage } from '@/lib/og/brand-image';

export const runtime = 'edge';
export const alt = 'FrigoChef — AI Kitchen Assistant';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return brandImage();
}
