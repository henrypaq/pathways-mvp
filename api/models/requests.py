"""Request models — matches UserProfile / SearchRequest / AnalyzeRequest in lib/types.ts exactly."""

from pydantic import BaseModel


class UserProfile(BaseModel):
    nationality: str | None = None
    destination_country: str | None = None
    purpose: str | None = None
    visa_type: str | None = None
    occupation: str | None = None
    language_score: str | None = None
    preferred_language: str | None = None


class SearchRequest(BaseModel):
    question: str
    profile: UserProfile | None = None
    n_results: int = 5


class AnalyzeRequest(BaseModel):
    document_base64: str
    document_type: str | None = None
    profile: UserProfile | None = None
