import api from './api';
import {
  mergeApiOrders,
  mergeApiProducts,
  getOrdersForBuyer,
  getOrdersForSeller,
  createLocalOrder,
  updateLocalOrderStatus,
  upsertLocalOrder,
  upsertLocalProduct,
  saveLocalUser,
  getLocalProducts,
  normalizeOrder,
} from './localDataService';

function isNetworkError(err) {
  return !err?.response;
}

export async function fetchBuyerOrders(buyerId) {
  try {
    const res = await api.get('orders/');
    mergeApiOrders(res.data);
    return res.data.map(normalizeOrder);
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    return getOrdersForBuyer(buyerId);
  }
}

export async function fetchSellerOrders(sellerId) {
  try {
    const res = await api.get('orders/');
    mergeApiOrders(res.data);
    return res.data.map(normalizeOrder);
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    return getOrdersForSeller(sellerId);
  }
}

export async function fetchAllProducts() {
  try {
    const res = await api.get('products/');
    return mergeApiProducts(res.data);
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    return getLocalProducts();
  }
}

export async function fetchMyProducts() {
  try {
    const res = await api.get('products/?my_listings=true');
    res.data.forEach(upsertLocalProduct);
    return mergeApiProducts(res.data);
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return getLocalProducts().filter((p) => p.farmer === user.uid);
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
    if (!isNetworkError(err)) throw err;
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
    if (!isNetworkError(err)) throw err;
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
    upsertLocalProduct(res.data);
    return res.data;
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const stock = parseInt(formData.quantity, 10) || 0;
    const local = {
      id: editingProduct?.id || Date.now(),
      title: formData.title,
      commodity: formData.commodity,
      unit: formData.unit,
      price_per_unit: formData.price_per_unit,
      quantity: stock,
      stock,
      delivery_time_manual: formData.delivery_time_manual,
      delivery_time_varies: formData.delivery_time_varies,
      farmer: user.uid,
      farmer_name: user.full_name,
      images: editingProduct?.images || [],
    };
    upsertLocalProduct(local);
    return local;
  }
}

export async function syncProfile(user, profileForm, profilePreview) {
  try {
    const res = await api.put('profile/', profileForm);
    const updated = { ...user, ...res.data };
    saveLocalUser(updated);
    return updated;
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    const updated = { ...user, ...profileForm };
    saveLocalUser(updated);
    return updated;
  }
}

export function syncAuthUser(user) {
  if (user) saveLocalUser(user);
}
