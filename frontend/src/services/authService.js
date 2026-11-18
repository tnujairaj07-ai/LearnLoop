import { apiClient } from "../lib/apiClient";

export const authService = {
  login: async (credentials) => {
    const data = await apiClient.post("/auth/login", {
      email: credentials.email?.trim(),
      password: credentials.password,
    });
    const user = data?.user || {};
    const token = data?.access_token || data?.token;
    return {
      role: user.role || credentials.role || "student",
      user,
      token,
    };
  },

  register: async (credentials) => {
    const data = await apiClient.post("/auth/register", {
      name: credentials.name,
      email: credentials.email?.trim(),
      password: credentials.password,
      role: credentials.role || "student",
      grade: credentials.grade || "Class 9",
      ...(credentials.class_id ? { class_id: credentials.class_id } : {}),
    });
    const user = data?.user || {};
    const token = data?.access_token || data?.token;
    return {
      role: user.role || credentials.role || "student",
      user,
      token,
    };
  },

  logout: () => apiClient.post("/auth/logout"),
  currentUser: () => apiClient.get("/auth/me"),
};
