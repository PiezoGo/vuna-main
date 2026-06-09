export const DISPUTE_WINDOW_MS = 30 * 1000;

const PROFILE_PIC_KEY = 'vuna_profile_pictures';
const ONLINE_KEY = 'vuna_online_users';

export function getProductStock(product) {
  return product?.stock ?? product?.quantity ?? 0;
}

export function isOutOfStock(product) {
  return getProductStock(product) <= 0;
}

export function getProfilePicture(userId) {
  if (!userId) return null;
  try {
    const pics = JSON.parse(localStorage.getItem(PROFILE_PIC_KEY) || '{}');
    return pics[userId] || null;
  } catch {
    return null;
  }
}

export function setProfilePicture(userId, dataUrl) {
  const pics = JSON.parse(localStorage.getItem(PROFILE_PIC_KEY) || '{}');
  if (dataUrl) {
    pics[userId] = dataUrl;
  } else {
    delete pics[userId];
  }
  localStorage.setItem(PROFILE_PIC_KEY, JSON.stringify(pics));
}

export function markUserOnline(userId) {
  if (!userId) return;
  const online = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
  online[userId] = Date.now();
  localStorage.setItem(ONLINE_KEY, JSON.stringify(online));
}

export function isUserOnline(userId, maxAgeMs = 60000) {
  if (!userId) return false;
  try {
    const online = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
    const lastSeen = online[userId];
    return lastSeen && Date.now() - lastSeen < maxAgeMs;
  } catch {
    return false;
  }
}

export function getOrderDate(order) {
  return order.orderDate || order.created_at || order.placedAt;
}

export function isDisputeWindowOpen(order) {
  const orderDate = getOrderDate(order);
  if (!orderDate) return true;
  return Date.now() - new Date(orderDate).getTime() < DISPUTE_WINDOW_MS;
}

export function getDisputeWindowRemaining(order) {
  const orderDate = getOrderDate(order);
  if (!orderDate) return 0;
  const elapsed = Date.now() - new Date(orderDate).getTime();
  return Math.max(0, DISPUTE_WINDOW_MS - elapsed);
}

export function formatStatus(status) {
  if (status === 'delivery_in_progress') return 'delivery in progress';
  return status || 'pending';
}

export function statusBadgeClass(status) {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-600';
    case 'delivered':
      return 'bg-blue-50 text-blue-600';
    case 'disputed':
      return 'bg-red-50 text-red-600';
    case 'delivery_in_progress':
      return 'bg-orange-50 text-orange-600';
    default:
      return 'bg-yellow-50 text-yellow-600';
  }
}
