const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('emarket_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('emarket_token', token);
  } else {
    localStorage.removeItem('emarket_token');
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Đã có lỗi xảy ra khi kết nối máy chủ.');
  }
  return data;
}

export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(Number(amount || 0));
}

