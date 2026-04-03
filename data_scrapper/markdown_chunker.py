"""
Semantic markdown chunking for IRCC pages — token-aware, heading-first.

- Target size: ~300–800 tokens per chunk (cl100k_base, same family as OpenAI embeddings).
- Prefer splits at ## / ### boundaries; merge small sections; oversized blocks use
  sentences then token windows with overlap.
"""

from __future__ import annotations

import re
from functools import lru_cache

# OpenAI / Claude ecosystem standard; good proxy for embedding input length
TIKTOKEN_ENCODING = "cl100k_base"

MIN_CHUNK_TOKENS = 300
MAX_CHUNK_TOKENS = 800
OVERLAP_TOKENS = 80


@lru_cache(maxsize=1)
def _encoder():
    import tiktoken

    return tiktoken.get_encoding(TIKTOKEN_ENCODING)


def count_tokens(text: str) -> int:
    if not text:
        return 0
    return len(_encoder().encode(text))


def _split_by_h2_h3(text: str) -> list[str]:
    """Split on ## or ### at line start; keep heading lines attached to their section."""
    pattern = re.compile(r"(?=^#{2,3}\s+)", re.MULTILINE)
    parts = pattern.split(text)
    return [p.strip() for p in parts if p.strip()]


def _token_windows(text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
    """Hard fallback: fixed-size token windows with overlap."""
    enc = _encoder()
    ids = enc.encode(text)
    if len(ids) <= max_tokens:
        return [text]
    out: list[str] = []
    start = 0
    while start < len(ids):
        end = min(start + max_tokens, len(ids))
        out.append(enc.decode(ids[start:end]))
        if end >= len(ids):
            break
        start = max(0, end - overlap_tokens)
    return out


def _join_fragments(parts: list[str]) -> str:
    return "\n\n".join(p.strip() for p in parts if p.strip())


def _split_oversized_block(text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
    """
    Break a block that exceeds max_tokens using paragraphs / sentences,
    then token windows if a single fragment is still too large.
    """
    if count_tokens(text) <= max_tokens:
        return [text]

    # Paragraphs first
    paras = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    if len(paras) <= 1:
        paras = [text]

    chunks: list[str] = []
    buf: list[str] = []

    def flush_buf() -> None:
        nonlocal buf
        if buf:
            chunks.append(_join_fragments(buf))
            buf = []

    for para in paras:
        pt = count_tokens(para)
        if pt > max_tokens:
            flush_buf()
            # Try sentences inside huge paragraph
            sents = re.split(r"(?<=[.!?])\s+", para)
            sents = [s.strip() for s in sents if s.strip()]
            if len(sents) <= 1:
                chunks.extend(_token_windows(para, max_tokens, overlap_tokens))
                continue
            sbuf: list[str] = []
            for s in sents:
                ct = count_tokens(s)
                if ct > max_tokens:
                    if sbuf:
                        chunks.append(" ".join(sbuf))
                        sbuf = []
                    chunks.extend(_token_windows(s, max_tokens, overlap_tokens))
                    continue
                cand = " ".join(sbuf + [s])
                if count_tokens(cand) <= max_tokens:
                    sbuf.append(s)
                else:
                    if sbuf:
                        chunks.append(" ".join(sbuf))
                    sbuf = [s]
            if sbuf:
                chunks.append(" ".join(sbuf))
            continue

        cand = _join_fragments(buf + [para]) if buf else para
        ct = count_tokens(cand)
        if ct <= max_tokens:
            buf.append(para)
        else:
            flush_buf()
            buf = [para]

    flush_buf()
    return chunks


def _merge_undersized_neighbors(chunks: list[str], min_tokens: int, max_tokens: int) -> list[str]:
    """Merge chunks below min_tokens into the previous chunk when under max_tokens."""
    if not chunks:
        return []
    out: list[str] = [chunks[0]]
    for c in chunks[1:]:
        if count_tokens(c) < min_tokens and out:
            merged = out[-1] + "\n\n" + c
            if count_tokens(merged) <= max_tokens:
                out[-1] = merged
                continue
        out.append(c)
    if len(out) >= 2 and count_tokens(out[-1]) < min_tokens:
        merged = out[-2] + "\n\n" + out[-1]
        if count_tokens(merged) <= max_tokens:
            out[-2] = merged
            out.pop()
    return out


def split_into_semantic_chunks(
    text: str,
    min_tokens: int = MIN_CHUNK_TOKENS,
    max_tokens: int = MAX_CHUNK_TOKENS,
    overlap_tokens: int = OVERLAP_TOKENS,
) -> list[str]:
    """
    Split markdown into chunks suitable for embedding.

    1. If whole document <= max_tokens → single chunk.
    2. Else split on ## / ###; merge adjacent sections until within max_tokens,
       targeting at least min_tokens when possible.
    3. Any section larger than max_tokens is split with _split_oversized_block.
    4. Post-merge fragments below min_tokens into neighbors when under max_tokens.
    """
    text = (text or "").strip()
    if not text:
        return []

    total = count_tokens(text)
    if total <= max_tokens:
        return [text]

    sections = _split_by_h2_h3(text)
    if len(sections) == 0:
        return _split_oversized_block(text, max_tokens, overlap_tokens)

    # No h2/h3 structure: treat whole doc as one logical block
    if len(sections) == 1:
        return _split_oversized_block(sections[0], max_tokens, overlap_tokens)

    chunks: list[str] = []
    buffer: list[str] = []

    def flush_buffer() -> None:
        nonlocal buffer
        if buffer:
            chunks.append(_join_fragments(buffer))
            buffer = []

    for sec in sections:
        st = count_tokens(sec)
        if st > max_tokens:
            flush_buffer()
            chunks.extend(_split_oversized_block(sec, max_tokens, overlap_tokens))
            continue

        candidate = _join_fragments(buffer + [sec]) if buffer else sec
        ct = count_tokens(candidate)
        if ct <= max_tokens:
            buffer.append(sec)
        else:
            if buffer:
                chunks.append(_join_fragments(buffer))
                buffer = []
            buffer.append(sec)

    flush_buffer()
    chunks = [c for c in chunks if c.strip()]
    chunks = _merge_undersized_neighbors(chunks, min_tokens, max_tokens)

    # Final pass: split anything that still exceeds max (e.g. after merge skipped)
    final: list[str] = []
    for c in chunks:
        if count_tokens(c) <= max_tokens:
            final.append(c)
        else:
            final.extend(_split_oversized_block(c, max_tokens, overlap_tokens))

    return [c for c in final if c.strip()]
