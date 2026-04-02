"""Claude service — all Anthropic API calls live here."""

from api.models.requests import UserProfile


def _build_search_prompt(profile: UserProfile, context: str) -> str:
    nationality = profile.nationality or "not specified"
    purpose = profile.purpose or "not specified"
    visa_type = profile.visa_type or "not specified"
    preferred_language = profile.preferred_language or "en"

    return f"""You are Pathways, an AI immigration assistant. You help immigrants understand Canadian immigration procedures.

Answer the user's question using ONLY the provided official source excerpts below.
Every factual claim must reference its source URL.
Format citations inline as [Source: <display_name> - <url>].

If the answer cannot be found in the provided sources, say exactly:
"I couldn't find specific information about this in the official sources I have access to. Please check canada.ca directly."

User profile:
- Nationality: {nationality}
- Purpose: {purpose}
- Visa type of interest: {visa_type}
- Preferred language: {preferred_language}

Respond in {preferred_language}. If preferred_language is not English, translate your full answer.
This is not legal advice. Always recommend verifying with an authorized immigration consultant.

Sources:
{context}"""


def call_search(anthropic_client, question: str, profile: UserProfile, context: str) -> str:
    """Call Claude to generate a sourced answer for the given question and context."""
    system_prompt = _build_search_prompt(profile, context)
    message = anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": question}],
    )
    return message.content[0].text
