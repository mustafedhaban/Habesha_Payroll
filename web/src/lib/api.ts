async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: {},
    credentials: 'same-origin',
  };

  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(path, opts);
  let data: { error?: string } | null = null;
  const text = await res.text();

  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const Api = {
  get<T>(path: string) {
    return request<T>('GET', path);
  },
  post<T>(path: string, body: unknown = {}) {
    return request<T>('POST', path, body);
  },
  put<T>(path: string, body: unknown = {}) {
    return request<T>('PUT', path, body);
  },
  del<T>(path: string) {
    return request<T>('DELETE', path);
  },
};
