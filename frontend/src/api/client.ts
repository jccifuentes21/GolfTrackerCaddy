import axios from "axios";

// Centralizing axios config keeps every API call using the same backend origin and headers.
// The env var is used in deployed environments; localhost keeps local dev simple.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
