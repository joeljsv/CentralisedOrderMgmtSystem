import client from "./client";

// Strip falsy/empty values so URLs stay clean (e.g. page=1 is sent, low_stock=false is not)
const clean = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== "" && v !== false)
  );

// --- Products ---
export const Products = {
  list: (params = {}) => client.get("/products", { params: clean(params) }).then((r) => r.data),
  get: (id) => client.get(`/products/${id}`).then((r) => r.data),
  create: (data) => client.post("/products", data).then((r) => r.data),
  update: (id, data) => client.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/products/${id}`).then((r) => r.data),
};

// --- Customers ---
export const Customers = {
  list: (params = {}) => client.get("/customers", { params: clean(params) }).then((r) => r.data),
  get: (id) => client.get(`/customers/${id}`).then((r) => r.data),
  orders: (id) => client.get(`/customers/${id}/orders`).then((r) => r.data),
  create: (data) => client.post("/customers", data).then((r) => r.data),
  remove: (id) => client.delete(`/customers/${id}`).then((r) => r.data),
};

// --- Orders ---
export const Orders = {
  list: (params = {}) => client.get("/orders", { params: clean(params) }).then((r) => r.data),
  get: (id) => client.get(`/orders/${id}`).then((r) => r.data),
  create: (data) => client.post("/orders", data).then((r) => r.data),
  updateStatus: (id, status) =>
    client.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => client.delete(`/orders/${id}`).then((r) => r.data),
};

// --- Dashboard ---
export const Dashboard = {
  summary: () => client.get("/dashboard/summary").then((r) => r.data),
};
