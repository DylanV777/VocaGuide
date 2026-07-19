const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(method, path, body) {
  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((error) => error.msg).join(" ")
      : detail ?? "Error inesperado";
    throw new Error(message);
  }

  return data;
}

function apiPost(path, body) {
  return apiRequest("POST", path, body);
}

function apiGet(path) {
  return apiRequest("GET", path);
}

function apiPut(path, body) {
  return apiRequest("PUT", path, body);
}

function apiDelete(path) {
  return apiRequest("DELETE", path);
}
