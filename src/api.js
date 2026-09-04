import axios from "axios";

const API_BASE = "https://cyberbullying-detection-ai.onrender.com";

export const api = axios.create({ baseURL: API_BASE });

export function moderateText(text) {
  return api.post("/api/moderate", { text }).then((res) => res.data);
}

export function fetchHistory(page = 1, perPage = 20) {
  return api
    .get("/api/history", { params: { page, per_page: perPage } })
    .then((res) => res.data);
}

export function fetchStats() {
  return api.get("/api/stats").then((res) => res.data);
}

export function fetchAdminQueue(adminKey) {
  return api
    .get("/api/admin/queue", { headers: { "X-Admin-Key": adminKey } })
    .then((res) => res.data);
}

export function reviewItem(adminKey, id, note = "") {
  return api
    .post(
      `/api/admin/review/${id}`,
      { note },
      { headers: { "X-Admin-Key": adminKey } }
    )
    .then((res) => res.data);
}
