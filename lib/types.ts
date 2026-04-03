/**
 * types.ts — Single source of truth for all shared types.
 *
 * SHARED CONTRACT — coordinate with Developer A before changing anything here.
 * Backend Pydantic models in api/models/ must match these interfaces exactly.
 */

// User profile — matches UserProfile in api/models/requests.py exactly
export interface UserProfile {
  nationality?: string
  destination_country?: string
  purpose?: string
  visa_type?: string
  occupation?: string
  language_score?: string
  preferred_language?: string
}

// Search
export interface SearchRequest {
  question: string
  profile?: UserProfile
  n_results?: number
  /** When false, Python API returns chunks only (no per-query Claude call). */
  include_answer?: boolean
}

export interface SearchResult {
  document: string
  url: string
  display_name: string
  section: string
  similarity: number
  scraped_at: string
  is_stale: boolean
  chunk_index: number
}

export interface SearchResponse {
  results: SearchResult[]
  answer: string
  query_used: string
  profile_applied: boolean
}

// Document analysis
export interface AnalyzeRequest {
  document_base64: string
  document_type?: string
  profile?: UserProfile
}

export interface AnalyzeResponse {
  document_type: string
  extracted_fields: Record<string, string>
  issues: string[]
  missing_for_visa: string[]
  plain_explanation: string
}

// Roadmap
export interface RoadmapStep {
  id: string
  title: string
  status: 'not_started' | 'in_progress' | 'waiting' | 'complete' | 'blocked'
  estimated_weeks?: number
  dependencies: string[]
  deadline?: string
  documents_needed: string[]
  official_url?: string
}

// Recommendations
export interface SourceCitation {
  title: string
  url: string
  scraped_at: string
}

export interface PathwayMatch {
  id: string
  name: string
  category: string
  flag: string
  matchScore: number
  matchReasons: string[]
  requirements: string[]
  estimatedTimeline: string
  processingFeeRange: string
  difficulty: 'Easy' | 'Medium' | 'Complex'
  nextStep: string
  officialUrl: string
  sources: SourceCitation[]
  /** True for pathways scored by the deterministic engine — confirmed legal immigration routes */
  isVerified?: boolean
}

export interface RecommendedRoadmapStep {
  id: string
  title: string
  description: string
  estimatedTime: string
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked'
  dependencies: string[]
  officialUrl?: string
  documents?: string[]
}

export interface RecommendationsResult {
  profileSummary: string
  pathways: PathwayMatch[]
  roadmap: RecommendedRoadmapStep[]
  topPathwayId: string
  sources: SourceCitation[]
  generatedAt: string
}
