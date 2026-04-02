from fastapi import APIRouter
from api.models.requests import AnalyzeRequest
from api.models.responses import AnalyzeResponse
from api.services import document

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    return document.parse_document(
        document_base64=req.document_base64,
        document_type=req.document_type,
        profile=req.profile,
    )
