from fastapi import APIRouter, HTTPException, Request
from api.models.requests import SearchRequest, UserProfile
from api.models.responses import SearchResult, SearchResponse
from api.services import rag, claude

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest, request: Request):
    profile = req.profile or UserProfile()
    profile_applied = req.profile is not None

    # 1. Query vector store (Supabase pgvector)
    try:
        raw_results = rag.run_query(
            question=req.question,
            collection=getattr(request.app.state, "collection", None),
            n_results=req.n_results,
            filter_visa_type=profile.visa_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Vector search failed: {e}"})

    # 2. Optional Claude answer (chat UI). Recommendations only need vector results — skipping saves latency.
    if req.include_answer:
        context_parts = [
            f"[Source: {r['display_name']} - {r['url']}]\n{r['document']}"
            for r in raw_results
        ]
        context = "\n\n---\n\n".join(context_parts) if context_parts else "(No sources found)"
        try:
            answer = claude.call_search(
                anthropic_client=request.app.state.anthropic,
                question=req.question,
                profile=profile,
                context=context,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail={"error": f"Claude API call failed: {e}"})
    else:
        answer = ""

    # 4. Build response
    results = [
        SearchResult(
            document=r["document"],
            url=r["url"],
            display_name=r["display_name"],
            section=r["section"],
            similarity=r["similarity"],
            scraped_at=r.get("scraped_at"),
            is_stale=bool(r.get("is_stale", False)),
            chunk_index=r.get("chunk_index", 0),
        )
        for r in raw_results
    ]

    return SearchResponse(
        results=results,
        answer=answer,
        query_used=req.question,
        profile_applied=profile_applied,
    )
