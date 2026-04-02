from fastapi import APIRouter, HTTPException
from api.services.rag import get_health_stats

router = APIRouter()


@router.get("/health")
async def health():
    try:
        stats = get_health_stats()
        return {"status": "ok", "chunks_in_db": stats["total_chunks"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
