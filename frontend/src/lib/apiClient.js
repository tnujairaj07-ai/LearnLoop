const rawEnv = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
const BASE_URL = rawEnv
  ? rawEnv.endsWith("/api")
    ? rawEnv
    : `${rawEnv}/api`
  : "/api";

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const inflightGets = new Map();
let mutationEpoch = 0;

async function executeRequest(path, { method = "GET", body, params, signal, unwrap = true } = {}) {
  let query = "";
  if (params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        usp.set(key, String(value));
      }
    });
    const qs = usp.toString();
    if (qs) query = `?${qs}`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const cleanPath = normalizedPath.startsWith("/api/")
    ? normalizedPath.slice(4)
    : normalizedPath === "/api"
    ? ""
    : normalizedPath;

  let response;
  try {
    const token = localStorage.getItem("authToken");
    const headers = {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    response = await fetch(`${BASE_URL}${cleanPath}${query}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkError) {
    throw new ApiError(
      "Could not reach the LearnLoop backend server. Ensure Flask is running on port 5000.",
      0,
      networkError
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let payload = null;

  if (text) {
    if (contentType.includes("application/json")) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ApiError(
          "The server returned a response that was not valid JSON.",
          response.status,
          text
        );
      }
    } else {
      throw new ApiError(
        response.ok
          ? "No API server found at this address — got HTML instead of JSON."
          : `Request failed (${response.status})`,
        response.status,
        text
      );
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !cleanPath.startsWith("/auth/login")) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("learnloop_user");
    }
    const message = (payload && payload.message) || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  if (
    unwrap &&
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload;
}

function request(path, options = {}) {
  const { method = "GET", params, signal, unwrap = true, dedupe = true } = options;
  if (method !== "GET") {
    mutationEpoch += 1;
    inflightGets.clear();
    return executeRequest(path, options);
  }

  if (!dedupe || signal) {
    return executeRequest(path, options);
  }

  let query = "";
  if (params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        usp.set(key, String(value));
      }
    });
    const qs = usp.toString();
    if (qs) query = `?${qs}`;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const cleanPath = normalizedPath.startsWith("/api/")
    ? normalizedPath.slice(4)
    : normalizedPath === "/api"
    ? ""
    : normalizedPath;
  const token = localStorage.getItem("authToken") || "";
  const dedupeKey = `${BASE_URL}${cleanPath}${query}::${token}::${unwrap ? "u" : "r"}::${mutationEpoch}`;

  if (inflightGets.has(dedupeKey)) {
    return inflightGets.get(dedupeKey);
  }

  const promise = executeRequest(path, options).finally(() => {
    if (inflightGets.get(dedupeKey) === promise) {
      inflightGets.delete(dedupeKey);
    }
  });
  inflightGets.set(dedupeKey, promise);
  return promise;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
