export type GuestCartItem = { product_id: string; slug: string; quantity: number };

const KEY = 'guest_cart';

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToGuestCart(product_id: string, slug: string, quantity = 1): void {
  const cart = getGuestCart();
  const existing = cart.find((i) => i.product_id === product_id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ product_id, slug, quantity });
  }
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((acc, i) => acc + i.quantity, 0);
}

export function clearGuestCart(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
