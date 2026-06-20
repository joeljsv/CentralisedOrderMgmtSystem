import axios from "axios";

// Base URL is injected at build time by Vite from VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL });

// Normalize backend error messages into a single throwable string.
export function apiError(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    // FastAPI/Pydantic validation errors
    return detail.map((d) => `${d.loc?.slice(-1)[0] ?? "field"}: ${d.msg}`).join("; ");
  }
  if (typeof detail === "string") return detail;
  return error?.message || "Unexpected error";
}

export default client;
