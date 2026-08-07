"""
Download the Bahá'í Prayers compilation from reference.bahai.org.

Writes scratch JSON with one entry per prayer: text, topic, author, link.
Run once; the built library lives in src/data/library.json (see
build-library.py). Polite crawl: 1.2s between requests.
"""

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://reference.bahai.org/en/t/c/BP/"
HEADERS = {"User-Agent": "PeaceAntz-Website/1.0 (personal spiritual research tool)"}
DELAY = 1.2
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "prayers-raw.json")


def get(url: str) -> BeautifulSoup:
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def topic_map(index: BeautifulSoup) -> dict[int, str]:
    """The index lists the topical sections (AID AND ASSISTANCE, DETACHMENT,
    …) against the page each one starts on. Pages between two headings belong
    to the earlier topic, so carry it forward."""
    starts: dict[int, str] = {}
    for a in index.find_all("a", href=True):
        m = re.fullmatch(r"bp-(\d+)\.html", a["href"])
        label = clean(a.get_text(" "))
        if m and label and label.isupper() and len(label) > 2:
            starts.setdefault(int(m.group(1)), label)
    return starts


def main() -> None:
    index = get(BASE)
    starts = topic_map(index)
    pages, seen = [], set()
    for a in index.find_all("a", href=True):
        href = a["href"]
        if re.fullmatch(r"bp-\d+\.html", href) and href not in seen:
            seen.add(href)
            pages.append(urljoin(BASE, href))
    # the index links section starts; walk the full numeric range it implies
    nums = [int(re.search(r"bp-(\d+)", p).group(1)) for p in pages]
    full = [urljoin(BASE, f"bp-{n}.html") for n in range(min(nums), max(nums) + 1)]
    print(f"index listed {len(starts)} topics over {len(full)} pages")

    out = []
    section = "General"
    for i, url in enumerate(full, 1):
        n = int(re.search(r"bp-(\d+)", url).group(1))
        if n in starts:
            section = starts[n]
        try:
            soup = get(url)
        except Exception as e:  # a gap in the numbering is not fatal
            print(f"  [{i}/{len(full)}] {url} -> {e}")
            continue

        topic = section

        blocks = soup.find_all(["div", "p"], class_=["Stext2", "Scitation"])
        current: list[str] = []
        for b in blocks:
            txt = clean(b.get_text(" "))
            if not txt:
                continue
            cls = b.get("class", [])
            if "Scitation" in cls:
                author = txt.strip("—-– ").strip()
                if current:
                    out.append({
                        "text": " ".join(current),
                        "topic": topic,
                        "author": author,
                        "link": url,
                    })
                    current = []
            else:
                current.append(txt)
        if current:  # trailing block with no citation line
            out.append({"text": " ".join(current), "topic": topic, "author": "", "link": url})

        print(f"  [{i}/{len(full)}] {topic[:34]:34} +{len(out)}")
        time.sleep(DELAY)

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nwrote {len(out)} prayers -> {OUT}")


if __name__ == "__main__":
    main()
