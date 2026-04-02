"""Document service — base64 decode, field extraction, and visa gap analysis."""

from api.models.requests import UserProfile
from api.models.responses import AnalyzeResponse


def parse_document(
    document_base64: str,
    document_type: str | None,
    profile: UserProfile | None,
) -> AnalyzeResponse:
    """
    Parse an uploaded document and return structured analysis.

    Currently returns a stub response — full Claude-powered extraction
    will be wired in here by Developer A.
    """
    return AnalyzeResponse(
        document_type="employment_letter",
        extracted_fields={
            "employer": "Acme Corp",
            "position": "Software Engineer",
            "start_date": "2023-01-15",
            "employment_type": "full-time",
            "weekly_hours": None,
            "salary": "85,000 CAD/year",
        },
        issues=["Weekly hours not specified — required for Express Entry NOC validation"],
        missing_for_visa=["Weekly hours worked (minimum 30h/week required for Express Entry)"],
        plain_explanation=(
            "Your employment letter is mostly complete, but it's missing your weekly hours worked. "
            "Express Entry requires proof that you work at least 30 hours per week. "
            "Ask your employer to add a line stating your weekly hours."
        ),
    )
