/**
 * api.ts — The ONLY file that calls the backend.
 *
 * SHARED CONTRACT — coordinate with Developer A before adding or changing functions here.
 * No component should ever call fetch() directly.
 */

import type {
  UserProfile,
  SearchResponse,
  AnalyzeResponse,
} from "@/lib/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function searchPathways(
  question: string,
  profile?: UserProfile,
  n_results = 5,
): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, profile, n_results }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Search failed: ${res.statusText}`);
  }

  return res.json() as Promise<SearchResponse>;
}

export async function analyzeDocument(
  documentBase64: string,
  documentType?: string,
  profile?: UserProfile,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_base64: documentBase64,
      document_type: documentType,
      profile,
    }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Analyze failed: ${res.statusText}`);
  }

  return res.json() as Promise<AnalyzeResponse>;
}

export async function checkHealth(): Promise<{ status: string; chunks_in_db: number }> {
  const res = await fetch(`${BASE_URL}/health`);

  if (!res.ok) {
    throw new ApiError(res.status, `Health check failed: ${res.statusText}`);
  }

  return res.json() as Promise<{ status: string; chunks_in_db: number }>;
}
