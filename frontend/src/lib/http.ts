import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super("API error");
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchJson<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal
  });

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }

  return payload as T;
}

