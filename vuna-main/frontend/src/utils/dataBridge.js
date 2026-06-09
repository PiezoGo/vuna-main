import api from './api';
import {
  mergeApiOrders,
  getOrdersForBuyer,
  getOrdersForSeller,
  createLocalOrder,
  updateLocalOrderStatus,
  upsertLocalOrder,
  upsertLocalProduct,
  deleteLocalProduct,
  saveLocalUser,
  getLocalProducts,
  normalizeOrder,
  normalizeProductImages,
  buildLocalProduct,
  getMergedProductList,
} from './localDataService';

function shouldUseLocalFallback(err) {
  if (!err?.response) return true;
  return err.response.status === 401;
}

export function formatApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (err.message && !err.response) return err.message;
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) {
    if (data.detail === 'Invalid token.' || data.detail === 'Authentication credentials were not provided.') {
      return 'Your session has expired. Please sign in again to sync with the server.';
    }
    return typeof data.detail === 'string' ? data.detail : fallback;
  }
  const parts = Object.entries(data).map(([key, val]) => {
    const msg = Array.isArray(val) ? val.join(' ') : String(val);
    return `${key}: ${msg}`;
  });
  return parts.length ? parts.join(' ') : fallback;
}

export async function fetchBuyerOrders(buyerId) {
  try {
    const res = await api.get('orders/');
    mergeApiOrders(res.data);
    return res.data.map(normalizeOrder);
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    return getOrdersForBuyer(buyerId);
  }
}

export async function fetchSellerOrders(sellerId) {
  try {
    const res = await api.get('orders/');
    mergeApiOrders(res.data);
    return res.data.map(normalizeOrder);
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    return getOrdersForSeller(sellerId);
  }
}

export async function fetchAllProducts() {
  try {
    const res = await api.get('products/');
    const { all } = getMergedProductList(res.data);
    return all;
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    return getLocalProducts().map(normalizeProductImages);
  }
}

export async function fetchMyProducts() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  try {
    const res = await api.get('products/?my_listings=true');
    const { mine } = getMergedProductList(res.data, user.uid);
    return mine;
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    return getLocalProducts()
      .filter((p) => p.farmer === user.uid)
      .map(normalizeProductImages);
  }
}

export async function placeOrder({ product, quantity, buyer }) {
  let apiOrder = null;
  try {
    const res = await api.post('orders/', { product: product.id, quantity });
    apiOrder = res.data;
    upsertLocalOrder(apiOrder);
  } catch (err) {
    if (err.response?.data?.error) {
      throw new Error(err.response.data.error);
    }
    if (!shouldUseLocalFallback(err)) throw err;
  }

  if (!apiOrder) {
    apiOrder = createLocalOrder({
      product,
      quantity,
      buyerId: buyer.uid,
      buyerName: buyer.full_name,
      sellerId: product.farmer,
      sellerName: product.farmer_name,
    });
  }

  return apiOrder;
}

function actorRoleForStatus(actor, status) {
  if (actor.role !== 'both') return actor.role;
  if (status === 'disputed' || status === 'completed') return 'buyer';
  return 'farmer';
}

export async function patchOrderStatus(orderId, status, actor) {
  try {
    const res = await api.patch(`orders/${orderId}/`, { status });
    upsertLocalOrder(res.data);
    return normalizeOrder(res.data);
  } catch (err) {
    if (err.response?.data?.error) {
      throw new Error(err.response.data.error);
    }
    if (!shouldUseLocalFallback(err)) throw err;
    return normalizeOrder(
      updateLocalOrderStatus(orderId, status, {
        actorId: actor.uid,
        actorRole: actorRoleForStatus(actor, status),
      })
    );
  }
}

export async function saveProduct(formData, imageFiles, editingProduct) {
  const data = new FormData();
  Object.entries(formData).forEach(([key, val]) => {
    if (key === 'delivery_time_manual' && formData.delivery_time_varies) return;
    data.append(key, val);
  });
  imageFiles.forEach((file, idx) => {
    if (file) data.append(`image${idx + 1}`, file);
  });

  try {
    const res = editingProduct
      ? await api.patch(`products/${editingProduct.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      : await api.post('products/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
    let saved = normalizeProductImages(res.data);
    if (!saved.images?.length && imageFiles.some(Boolean)) {
      const withImages = await buildLocalProduct(formData, imageFiles, editingProduct);
      saved = { ...saved, images: withImages.images };
    }
    upsertLocalProduct(saved);
    return saved;
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    const local = await buildLocalProduct(formData, imageFiles, editingProduct);
    upsertLocalProduct(local);
    return local;
  }
}

export async function deleteProduct(productId) {
  try {
    await api.delete(`products/${productId}/`);
    deleteLocalProduct(productId);
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    deleteLocalProduct(productId);
  }
}

export async function syncProfile(user, profileForm, profilePreview) {
  try {
    const res = await api.put('profile/', profileForm);
    const updated = { ...user, ...res.data };
    saveLocalUser(updated);
    return updated;
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    const updated = { ...user, ...profileForm };
    saveLocalUser(updated);
    return updated;
  }
}

export function syncAuthUser(user) {
  if (user) saveLocalUser(user);
}
