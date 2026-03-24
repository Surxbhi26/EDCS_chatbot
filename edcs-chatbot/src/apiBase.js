const rawBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
export const API_BASE = rawBase.replace(/\/+$/, '');

export const apiUrl = (path) => {
  if (!path) return API_BASE;
  return path.startsWith('/')
    ? `${API_BASE}${path}`
    : `${API_BASE}/${path}`;
};
