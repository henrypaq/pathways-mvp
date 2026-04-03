"""
scraper.py — HTTP scraper for IRCC and Canadian immigration sources.

Strategy:
  - Uses requests + BeautifulSoup (no headless browser needed for gov.ca)
  - Strips nav/footer/cookie banners → clean article text
  - Converts to structured markdown with section headings preserved
  - Saves raw .md files to data/raw/<slug>.md
  - Returns clean text to the caller for hashing + chunking

Politeness:
  - 1.5s delay between requests (government servers)
  - Respects HTTP 429 with exponential backoff
  - User-Agent identifies the bot as Pathways research tool
"""

import re
import time
import logging
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup, Tag

RAW_DIR = Path(__file__).parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scraper")

HEADERS = {
    "User-Agent": (
        "PathwaysBot/1.0 (AI immigration assistant research crawler; "
        "contact: pathways-bot@example.com) "
        "requests/2.x Python/3.12"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-CA,en;q=0.9",
}

# Elements to strip from gov.ca pages before parsing
STRIP_SELECTORS = [
    "header", "footer", "nav",
    ".gcweb-menu", ".wb-bar-lg", ".gcweb-a11y-link",
    "#wb-tphp",        # skip to main link
    ".pagedetails",    # page details / feedback widget
    ".gc-sub-footer",
    "[id='wb-sm']",    # site menu
    "[id='wb-bc']",    # breadcrumbs (we keep section from metadata)
    ".alert-info",     # generic alert banners
    "script", "style", "noscript",
    # NOTE: .mwsgeneric-base-html is intentionally NOT stripped — Canada.ca uses it
    # for main article content sections, not just navigation boilerplate.
]


def url_to_slug(url: str) -> str:
    """canada.ca/en/immigration.../express-entry → express-entry"""
    slug = re.sub(r"https?://[^/]+", "", url)
    slug = re.sub(r"[^a-z0-9]+", "-", slug.lower())
    return slug.strip("-")[:120]


def html_to_markdown(soup: BeautifulSoup, url: str, display_name: str) -> str:
    """
    Convert a cleaned BeautifulSoup tree to structured markdown.
    Preserves headings, paragraphs, lists, and tables.
    """
    lines = []
    lines.append(f"# {display_name}")
    lines.append(f"**Source:** {url}")
    lines.append(f"**Scraped:** {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
    lines.append("")

    main = (
        soup.find("main")
        or soup.find(id="maincontent")
        or soup.find(class_="container")
        or soup.find("article")
        or soup.body
    )

    if not main:
        return "\n".join(lines) + "\n\n[No main content found]"

    def process_node(node):
        if not isinstance(node, Tag):
            return

        tag = node.name.lower() if node.name else ""

        if tag in ("h1", "h2", "h3", "h4"):
            level = int(tag[1])
            text = node.get_text(strip=True)
            if text:
                lines.append("")
                lines.append("#" * level + " " + text)
                lines.append("")

        elif tag == "p":
            text = node.get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text)
            if text:
                lines.append(text)
                lines.append("")

        elif tag in ("ul", "ol"):
            for i, li in enumerate(node.find_all("li", recursive=False)):
                text = li.get_text(separator=" ", strip=True)
                text = re.sub(r"\s+", " ", text)
                if tag == "ol":
                    lines.append(f"{i + 1}. {text}")
                else:
                    lines.append(f"- {text}")
            lines.append("")

        elif tag == "table":
            _process_table(node)

        elif tag in ("div", "section", "article", "aside"):
            for child in node.children:
                process_node(child)

        elif tag in ("strong", "b", "em", "i", "span", "a"):
            pass  # inline — handled by parent's get_text()

    def _process_table(table: Tag):
        rows = table.find_all("tr")
        if not rows:
            return
        table_lines = []
        for r_idx, row in enumerate(rows):
            cells = row.find_all(["th", "td"])
            row_text = " | ".join(c.get_text(separator=" ", strip=True) for c in cells)
            table_lines.append(f"| {row_text} |")
            if r_idx == 0:
                table_lines.append("|" + " --- |" * len(cells))
        lines.extend(table_lines)
        lines.append("")

    for child in main.children:
        process_node(child)

    return "\n".join(lines)


def scrape_page(url: str, display_name: str, retries: int = 3) -> Optional[dict]:
    """
    Fetch a single page and return:
      {
        "url": str,
        "display_name": str,
        "markdown": str,        # clean content for chunking
        "raw_html": str,        # full HTML for hashing
        "raw_path": str,        # path where markdown was saved
        "http_status": int,
        "scraped_at": str,
      }
    Returns None on unrecoverable error.
    """
    slug = url_to_slug(url)
    raw_path = RAW_DIR / f"{slug}.md"

    for attempt in range(1, retries + 1):
        try:
            log.info(f"[{attempt}/{retries}] GET {url}")
            resp = requests.get(url, headers=HEADERS, timeout=20)

            if resp.status_code == 429:
                wait = 5 * attempt
                log.warning(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue

            if resp.status_code == 404:
                log.warning(f"404 Not Found: {url}")
                return {
                    "url": url,
                    "display_name": display_name,
                    "markdown": "",
                    "raw_html": "",
                    "raw_path": str(raw_path),
                    "http_status": 404,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                    "error": "404",
                }

            resp.raise_for_status()

            raw_html = resp.text
            soup = BeautifulSoup(raw_html, "lxml")

            # Strip noise
            for sel in STRIP_SELECTORS:
                for el in soup.select(sel):
                    el.decompose()

            markdown = html_to_markdown(soup, url, display_name)

            # Save markdown to disk
            raw_path.write_text(markdown, encoding="utf-8")

            log.info(f"✓ Scraped {url} → {len(markdown):,} chars → {raw_path.name}")

            return {
                "url": url,
                "display_name": display_name,
                "markdown": markdown,
                "raw_html": raw_html,
                "raw_path": str(raw_path),
                "http_status": resp.status_code,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "error": None,
            }

        except requests.exceptions.ConnectionError as e:
            log.error(f"Connection error on attempt {attempt}: {e}")
            if attempt < retries:
                time.sleep(3 * attempt)
        except requests.exceptions.Timeout:
            log.error(f"Timeout on attempt {attempt} for {url}")
            if attempt < retries:
                time.sleep(2)
        except Exception as e:
            log.error(f"Unexpected error: {e}")
            return None

    return None


def scrape_all(sources: list, delay: float = 1.5) -> list:
    """
    Scrape all sources with a polite delay between requests.
    Returns a list of scrape result dicts.
    """
    results = []
    total = len(sources)

    for i, source in enumerate(sources, 1):
        log.info(f"[{i}/{total}] {source['display_name']}")
        result = scrape_page(source["url"], source["display_name"])

        if result:
            result["section"] = source["section"]
            result["visa_types"] = source["visa_types"]
            result["programs"] = source["programs"]
            result["high_change"] = source["high_change"]
            results.append(result)
        else:
            log.error(f"Failed to scrape: {source['url']}")
            results.append({
                "url": source["url"],
                "display_name": source["display_name"],
                "markdown": "",
                "raw_html": "",
                "error": "scrape_failed",
                "http_status": 0,
            })

        if i < total:
            time.sleep(delay)

    ok = sum(1 for r in results if not r.get("error"))
    log.info(f"\n✅ Scraped {ok}/{total} pages successfully.")
    return results


if __name__ == "__main__":
    # Quick test on one page
    result = scrape_page(
        "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
        "Express Entry — Overview"
    )
    if result:
        print(f"\nFirst 1000 chars:\n{result['markdown'][:1000]}")
