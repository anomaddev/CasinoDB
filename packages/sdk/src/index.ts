import type {
  AutocompleteResponse,
  CasinoResponse,
  ListIncidentsQuery,
  ListIncidentsResponse,
  ListReviewsResponse,
  ListTableConditionsResponse,
  NearbyQuery,
  NearbyResponse,
  ReportIncidentBody,
  ReportIncidentResponse,
  ReportTableConditionBody,
  ReportTableConditionResponse,
  StartSessionBody,
  StartSessionResponse,
} from "@casinodb/shared";

export type CasinoDBClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export class CasinoDBError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "CasinoDBError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function joinUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export class CasinoDBClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CasinoDBClientOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private async request<T>(
    method: string,
    path: string,
    init?: { query?: Record<string, unknown>; body?: unknown; auth?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (init?.auth !== false) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const response = await this.fetchImpl(joinUrl(this.baseUrl, path, init?.query), {
      method,
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })
        ?.error;
      throw new CasinoDBError(
        response.status,
        error?.code ?? "internal",
        error?.message ?? `Request failed (${response.status})`,
        error?.details,
      );
    }
    return payload as T;
  }

  health(): Promise<{ ok: true; database: "up" }> {
    return this.request("GET", "/health", { auth: false });
  }

  searchNearby(query: NearbyQuery): Promise<NearbyResponse> {
    return this.request("GET", "/v1/casinos/nearby", { query });
  }

  autocomplete(q: string): Promise<AutocompleteResponse> {
    return this.request("GET", "/v1/casinos/autocomplete", { query: { q } });
  }

  getCasino(placeId: string): Promise<CasinoResponse> {
    return this.request("GET", `/v1/casinos/${encodeURIComponent(placeId)}`);
  }

  startSession(placeId: string, body: StartSessionBody = {}): Promise<StartSessionResponse> {
    return this.request("POST", `/v1/casinos/${encodeURIComponent(placeId)}/sessions`, {
      body,
    });
  }

  reportIncident(placeId: string, body: ReportIncidentBody): Promise<ReportIncidentResponse> {
    return this.request("POST", `/v1/casinos/${encodeURIComponent(placeId)}/incidents`, {
      body,
    });
  }

  listIncidents(placeId: string, query: ListIncidentsQuery = {}): Promise<ListIncidentsResponse> {
    return this.request("GET", `/v1/casinos/${encodeURIComponent(placeId)}/incidents`, {
      query,
    });
  }

  reportTableCondition(
    placeId: string,
    body: ReportTableConditionBody,
  ): Promise<ReportTableConditionResponse> {
    return this.request("POST", `/v1/casinos/${encodeURIComponent(placeId)}/conditions`, {
      body,
    });
  }

  listTableConditions(
    placeId: string,
    query: { current?: boolean; limit?: number } = {},
  ): Promise<ListTableConditionsResponse> {
    return this.request("GET", `/v1/casinos/${encodeURIComponent(placeId)}/conditions`, {
      query: {
        current: query.current === undefined ? undefined : query.current ? "true" : "false",
        limit: query.limit,
      },
    });
  }

  listReviews(placeId: string): Promise<ListReviewsResponse> {
    return this.request("GET", `/v1/casinos/${encodeURIComponent(placeId)}/reviews`);
  }
}

export type {
  AutocompleteResponse,
  CasinoResponse,
  ListIncidentsResponse,
  ListReviewsResponse,
  ListTableConditionsResponse,
  NearbyResponse,
  ReportIncidentBody,
  ReportIncidentResponse,
  ReportTableConditionBody,
  ReportTableConditionResponse,
  StartSessionBody,
  StartSessionResponse,
};
