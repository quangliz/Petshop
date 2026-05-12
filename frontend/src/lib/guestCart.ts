export type GuestCartItem = { product_id: string; slug: string; quantity: number; variant_id?: string | null };

const KEY = 'guest_cart';

export function getGuestCartItemKey(item: Pick<GuestCartItem, 'product_id' | 'variant_id'>): string {
  return `${item.product_id}:${item.variant_id ?? 'default'}`;
}

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToGuestCart(product_id: string, slug: string, quantity = 1, variant_id?: string | null): void {
  const cart = getGuestCart();
  const key = getGuestCartItemKey({ product_id, variant_id });
  const existing = cart.find((i) => getGuestCartItemKey(i) === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ product_id, slug, quantity, variant_id: variant_id ?? null });
  }
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((acc, i) => acc + i.quantity, 0);
}

export function clearGuestCart(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
