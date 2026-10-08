import { auth } from '../../firebase';

export async function announcementApi(path = '', { authenticated = false, method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (authenticated) {
    if (!auth.currentUser) throw new Error('Zaloguj się, aby wykonać tę operację.');
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/announcements${path}`, { method, headers, signal, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'Nie udało się pobrać danych. Spróbuj ponownie.'), { status: response.status, code: data.code });
  return data;
}
