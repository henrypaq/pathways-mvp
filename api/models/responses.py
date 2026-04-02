"""Response models — matches SearchResult / SearchResponse / AnalyzeResponse in lib/types.ts exactly."""

from pydantic import BaseModel


class SearchResult(BaseModel):
    document: str
    url: str
    display_name: str
    section: str
    similarity: float
    scraped_at: str | None
    is_stale: bool
    chunk_index: int


class SearchResponse(BaseModel):
    results: list[SearchResult]
    answer: str
    query_used: str
    profile_applied: bool


class AnalyzeResponse(BaseModel):
    document_type: str
    extracted_fields: dict
    issues: list[str]
    missing_for_visa: list[str]
    plain_explanation: str
