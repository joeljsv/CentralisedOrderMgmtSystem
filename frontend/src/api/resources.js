import client from "./client";

// --- Products ---
export const Products = {
  list: () => client.get("/products").then((r) => r.data),
  get: (id) => client.get(`/products/${id}`).then((r) => r.data),
  create: (data) => client.post("/products", data).then((r) => r.data),
  update: (id, data) => client.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/products/${id}`).then((r) => r.data),
};

// --- Customers ---
export const Customers = {
  list: () => client.get("/customers").then((r) => r.data),
  get: (id) => client.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => client.post("/customers", data).then((r) => r.data),
  remove: (id) => client.delete(`/customers/${id}`).then((r) => r.data),
};

// --- Orders ---
export const Orders = {
  list: () => client.get("/orders").then((r) => r.data),
  get: (id) => client.get(`/orders/${id}`).then((r) => r.data),
  create: (data) => client.post("/orders", data).then((r) => r.data),
  remove: (id) => client.delete(`/orders/${id}`).then((r) => r.data),
};

// --- Dashboard ---
export const Dashboard = {
  summary: () => client.get("/dashboard/summary").then((r) => r.data),
};
