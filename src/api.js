import axios from "axios";

const API_BASE = "https://cyberbullying-detection-ai.onrender.com";

// withCredentials is required for the session cookie (login state) to be
// sent on cross-origin requests, since the frontend (Vercel) and backend
// (Render) are on different domains.
export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

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

// --- Auth --------------------------------------------------------------

export function fetchMe() {
  return api.get("/api/auth/me").then((res) => res.data);
}

export function loginRequest(username, password) {
  return api.post("/api/auth/login", { username, password }).then((res) => res.data);
}

export function registerRequest(username, password) {
  return api.post("/api/auth/register", { username, password }).then((res) => res.data);
}

export function logoutRequest() {
  return api.post("/api/auth/logout").then((res) => res.data);
}

// --- Forum ---------------------------------------------------------------

export function fetchPosts(page = 1, perPage = 20) {
  return api
    .get("/api/posts", { params: { page, per_page: perPage } })
    .then((res) => res.data);
}

export function createPost(content) {
  return api.post("/api/posts", { content }).then((res) => res.data);
}

export function fetchPost(postId) {
  return api.get(`/api/posts/${postId}`).then((res) => res.data);
}

export function createComment(postId, content, parentCommentId = null) {
  return api
    .post(`/api/posts/${postId}/comments`, {
      content,
      parent_comment_id: parentCommentId,
    })
    .then((res) => res.data);
}

export function reportContent(targetType, targetId, reason) {
  return api
    .post("/api/report", { target_type: targetType, target_id: targetId, reason })
    .then((res) => res.data);
}

// --- Admin: forum queue ---------------------------------------------------

export function fetchForumQueue(adminKey) {
  return api
    .get("/api/admin/forum-queue", { headers: { "X-Admin-Key": adminKey } })
    .then((res) => res.data);
}

export function forumModAction(adminKey, contentType, contentId, action) {
  return api
    .post(
      `/api/admin/forum/${contentType}/${contentId}/${action}`,
      {},
      { headers: { "X-Admin-Key": adminKey } }
    )
    .then((res) => res.data);
}

