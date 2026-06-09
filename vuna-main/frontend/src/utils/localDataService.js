const USERS_KEY = 'vuna_users';
const PRODUCTS_KEY = 'vuna_products';
const ORDERS_KEY = 'vuna_orders';
const API_ORIGIN = 'http://localhost:8000';

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

export function normalizeProductImages(product) {
  if (!product) return product;
  let images = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    images = product.images.filter(Boolean);
  } else {
    for (const key of ['image1', 'image2', 'image3']) {
      if (product[key]) images.push(product[key]);
    }
  }
  return {
    ...product,
    images: images.map(resolveImageUrl).filter(Boolean),
  };
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(items) {
  const nums = items.map((i) => Number(String(i.id).replace(/\D/g, '')) || 0);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export function getLocalUsers() {
  return read(USERS_KEY, []);
}

export function saveLocalUser(user) {
  if (!user?.uid) return user;
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.uid === user.uid);
  const entry = { ...user, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...entry };
  } else {
    users.push(entry);
  }
  write(USERS_KEY, users);
  return entry;
}

export function getLocalUser(userId) {
  return getLocalUsers().find((u) => u.uid === userId) || null;
}

export function getLocalProducts() {
  return read(PRODUCTS_KEY, []);
}

export function saveLocalProducts(products) {
  write(PRODUCTS_KEY, products);
}

export function upsertLocalProduct(product) {
  if (!product?.id) return product;
  const products = getLocalProducts();
  const stock = product.stock ?? product.quantity ?? 0;
  const normalized = normalizeProductImages({ ...product, stock, quantity: stock });
  const idx = products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    products[idx] = { ...products[idx], ...normalized };
  } else {
    products.push(normalized);
  }
  write(PRODUCTS_KEY, products);
  return normalized;
}

export function deleteLocalProduct(productId) {
  const products = getLocalProducts().filter((p) => String(p.id) !== String(productId));
  write(PRODUCTS_KEY, products);
}

export function mergeApiProducts(apiProducts = []) {
  const merged = apiProducts.map((p) => {
    const stock = p.quantity ?? p.stock ?? 0;
    const normalized = normalizeProductImages({ ...p, stock, quantity: stock });
    upsertLocalProduct(normalized);
    return normalized;
  });
  return merged;
}

export async function buildLocalProduct(formData, imageFiles, editingProduct) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const stock = parseInt(formData.quantity, 10) || 0;
  const existingImages = editingProduct?.images || [];
  const images = [];

  for (let idx = 0; idx < 3; idx++) {
    const file = imageFiles[idx];
    if (file) {
      images.push(await fileToDataUrl(file));
    } else if (editingProduct && existingImages[idx]) {
      images.push(existingImages[idx]);
    }
  }

  return {
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
    farmer_city: user.city,
    farmer_market: user.market,
    images,
  };
}

export function updateLocalProductStock(productId, delta) {
  const products = getLocalProducts();
  const idx = products.findIndex((p) => p.id === productId);
  if (idx < 0) return null;
  const next = Math.max(0, (products[idx].stock ?? products[idx].quantity ?? 0) + delta);
  products[idx] = { ...products[idx], stock: next, quantity: next };
  write(PRODUCTS_KEY, products);
  return products[idx];
}

export function getLocalOrders() {
  return read(ORDERS_KEY, []);
}

export function saveLocalOrders(orders) {
  write(ORDERS_KEY, orders);
}

export function normalizeOrder(order) {
  const orderDate = order.orderDate || order.created_at || order.placedAt || new Date().toISOString();
  return {
    ...order,
    orderDate,
    created_at: order.created_at || orderDate,
    buyerId: order.buyerId ?? order.buyer,
    sellerId: order.sellerId ?? order.farmer ?? order.seller,
    buyer: order.buyer ?? order.buyerId,
    farmer: order.farmer ?? order.sellerId,
    product: order.product ?? order.productId,
    product_title: order.product_title ?? order.productName,
    product_unit: order.product_unit ?? order.productUnit,
    total_price: order.total_price ?? order.total,
    status: order.status || 'pending',
  };
}

export function upsertLocalOrder(order) {
  const normalized = normalizeOrder(order);
  const orders = getLocalOrders();
  const idx = orders.findIndex((o) => String(o.id) === String(normalized.id));
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...normalized };
  } else {
    orders.unshift(normalized);
  }
  write(ORDERS_KEY, orders);
  return normalized;
}

export function mergeApiOrders(apiOrders = []) {
  apiOrders.forEach((o) => upsertLocalOrder(o));
  return apiOrders.map(normalizeOrder);
}

export function getOrdersForBuyer(buyerId) {
  return getLocalOrders()
    .map(normalizeOrder)
    .filter((o) => o.buyerId === buyerId || o.buyer === buyerId)
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
}

export function getOrdersForSeller(sellerId) {
  return getLocalOrders()
    .map(normalizeOrder)
    .filter((o) => o.sellerId === sellerId || o.farmer === sellerId)
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
}

export function createLocalOrder({
  product,
  quantity,
  buyerId,
  buyerName,
  sellerId,
  sellerName,
}) {
  const stock = product.stock ?? product.quantity ?? 0;
  if (stock <= 0) {
    throw new Error('This product is out of stock.');
  }
  if (stock < quantity) {
    throw new Error('Insufficient stock for this order.');
  }

  const total = (parseFloat(product.price_per_unit) * quantity).toFixed(2);
  const orderDate = new Date().toISOString();
  const order = normalizeOrder({
    id: nextId(getLocalOrders()),
    product: product.id,
    productId: product.id,
    product_title: product.title,
    product_unit: product.unit,
    quantity,
    total_price: total,
    buyerId,
    buyer: buyerId,
    buyer_name: buyerName,
    sellerId,
    farmer: sellerId,
    farmer_name: sellerName,
    status: 'pending',
    orderDate,
    created_at: orderDate,
  });
  upsertLocalOrder(order);
  return order;
}

export function updateLocalOrderStatus(orderId, status, { actorId, actorRole } = {}) {
  const orders = getLocalOrders();
  const idx = orders.findIndex((o) => String(o.id) === String(orderId));
  if (idx < 0) throw new Error('Order not found.');

  const order = normalizeOrder(orders[idx]);
  const current = order.status;

  if (status === 'delivery_in_progress') {
    if (actorRole !== 'farmer' && actorRole !== 'seller' && actorRole !== 'both') {
      throw new Error('Only the seller can start delivery.');
    }
    if (current !== 'pending') {
      throw new Error('Only pending orders can be moved to delivery in progress.');
    }
    const products = getLocalProducts();
    const product = products.find((p) => p.id === order.product);
    const available = product?.stock ?? product?.quantity ?? 0;
    if (available < order.quantity) {
      throw new Error('Insufficient stock to fulfill this order.');
    }
    updateLocalProductStock(order.product, -order.quantity);
  }

  if (status === 'delivered') {
    const isSeller = actorId === order.sellerId || actorId === order.farmer;
    const isBuyer = actorId === order.buyerId || actorId === order.buyer;
    if (isSeller && !['delivery_in_progress', 'disputed'].includes(current)) {
      throw new Error('Order must be in delivery or disputed before marking delivered.');
    }
    if (isBuyer && current !== 'disputed') {
      throw new Error('Only disputed orders can be marked complete by the buyer.');
    }
    if (!isSeller && !isBuyer) {
      throw new Error('Not authorized to update this order.');
    }
  }

  if (status === 'disputed') {
    if (actorRole !== 'buyer' && actorRole !== 'both') {
      throw new Error('Only the buyer can dispute the order.');
    }
    if (current !== 'delivery_in_progress') {
      throw new Error('Only orders in delivery can be disputed.');
    }
  }

  if (status === 'completed') {
    if (actorRole !== 'buyer' && actorRole !== 'both') {
      throw new Error('Only the buyer can complete the order.');
    }
    if (current !== 'delivered') {
      throw new Error('Order must be delivered before completion.');
    }
  }

  orders[idx] = { ...order, status };
  write(ORDERS_KEY, orders);
  return orders[idx];
}

export function getMergedProductList(apiProducts = [], sellerId = null) {
  const merged = mergeApiProducts(apiProducts);
  const localOnly = getLocalProducts()
    .filter((p) => !merged.some((m) => String(m.id) === String(p.id)))
    .map(normalizeProductImages);
  const all = [...merged, ...localOnly];
  if (sellerId) {
    return {
      mine: all.filter((p) => p.farmer === sellerId || p.sellerId === sellerId),
      all,
    };
  }
  return { mine: [], all };
}
