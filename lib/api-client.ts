/**
 * Structured HTTP error carrying the response status code alongside the message.
 *
 * Thrown by `ApiClient` for:
 * - Non-2xx responses (status from the server)
 * - Missing auth token (401)
 * - Request timeout via `AbortController` (408)
 *
 * @example
 * try {
 *   await apiClient.post("create-haul", payload);
 * } catch (err) {
 *   if (err instanceof ApiError && err.status === 422) {
 *     // handle validation error
 *   }
 * }
 */
export class ApiError extends Error {
  /**
   * @param status - HTTP status code or client-side synthetic code (408 for timeout, 401 for no session)
   * @param message - Human-readable message parsed from the response body, or a client-side description
   */
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Configuration for an `ApiClient` instance. */
type ApiClientOptions = {
  /** Base URL prepended to every request path. Should not have a trailing slash. */
  baseUrl: string;

  /**
   * Async or sync factory that returns the current bearer token.
   *
   * Called on every request. Return `null` to signal no active session —
   * the client will throw `ApiError(401)`. Omit for unauthenticated clients.
   *
   * @example
   * getToken: () =>
   *   supabase.auth.getSession()
   *     .then(({ data }) => data.session?.access_token ?? null)
   */
  getToken?: () => Promise<string | null> | string | null;

  /**
   * Default timeout in milliseconds applied to every request.
   * Can be overridden per-request via `RequestOptions.timeout`.
   * Defaults to `30_000` (30 seconds).
   */
  timeout?: number;

  /**
   * Query parameters appended to every request URL.
   * Merged with per-request `params` — per-request wins on collision.
   */
  defaultParams?: Record<string, string>;
};

/** Per-request overrides applied on top of instance-level defaults. */
type RequestOptions = {
  /**
   * Override the instance-level timeout for this request only.
   * Useful for long-running operations like file uploads or AI inference.
   */
  timeout?: number;

  /** Headers merged over the defaults (`Content-Type`, `Authorization`). Latter wins on collision. */
  headers?: Record<string, string>;

  /** Query parameters merged with `defaultParams` for this request. Per-request wins on collision. */
  params?: Record<string, string>;
};

/**
 * Typed HTTP client for JSON APIs.
 *
 * @example
 * const client = new ApiClient({
 *   baseUrl: "https://api.example.com/v1",
 *   getToken: () => authStore.getToken(),
 *   timeout: 15_000,
 *   defaultParams: { access_token: EXPO_PUBLIC_MAPBOX_TOKEN },
 * });
 *
 * const result = await client.post<CreateOrderResponse>("orders", { items });
 */
export class ApiClient {
  /**
   * @param options - Client configuration. See `ApiClientOptions` for full details.
   */
  constructor(private readonly options: ApiClientOptions) {}

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.options.getToken?.();
    if (!token) throw new ApiError(401, "No active session");
    return { Authorization: `Bearer ${token}` };
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.options.baseUrl}/${path}`);
    const merged = { ...this.options.defaultParams, ...params };
    for (const [key, value] of Object.entries(merged)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const timeout = options.timeout ?? this.options.timeout ?? 30_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const authHeaders = this.options.getToken ? await this.getAuthHeaders() : {};
      const res = await fetch(this.buildUrl(path, options.params), {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        let message: string;
        try {
          const json = JSON.parse(text) as { error?: string; message?: string };
          message = json.error ?? json.message ?? text;
        } catch {
          message = text;
        }
        throw new ApiError(res.status, message);
      }

      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError(408, "Request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Issues a GET request to the given path.
   *
   * @template T - Shape of the expected response body.
   * @param path - Path appended to `baseUrl`, e.g. `"users/me"`.
   * @returns Parsed JSON response body typed as `T`.
   * @throws {ApiError} On non-2xx response, missing session, or timeout.
   */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  /**
   * Issues a POST request with a JSON-serialized body.
   *
   * @template T - Shape of the expected response body.
   * @param path - Path appended to `baseUrl`, e.g. `"create-haul"`.
   * @param body - JSON-serializable payload. Omit for bodyless POST.
   * @returns Parsed JSON response body typed as `T`.
   * @throws {ApiError} On non-2xx response, missing session, or timeout.
   */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  /**
   * Issues a PATCH request with a JSON-serialized partial update payload.
   *
   * @template T - Shape of the expected response body.
   * @param path - Path appended to `baseUrl`.
   * @param body - Partial update payload.
   * @returns Parsed JSON response body typed as `T`.
   * @throws {ApiError} On non-2xx response, missing session, or timeout.
   */
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  /**
   * Issues a DELETE request.
   *
   * Defaults `T` to `void` since DELETE typically returns 204 No Content.
   *
   * @template T - Shape of the expected response body. Defaults to `void`.
   * @param path - Path appended to `baseUrl`.
   * @returns `void` on 204 No Content, or parsed JSON typed as `T` if the server returns a body.
   * @throws {ApiError} On non-2xx response, missing session, or timeout.
   */
  del<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}
