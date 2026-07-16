const API_BASE_URL = "http://127.0.0.1:8000";

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((error) => error.msg).join(" ")
      : detail ?? "Error inesperado";
    throw new Error(message);
  }

  return data;
}
