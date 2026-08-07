"""
Build src/data/library.json — the Quote Card Creator's passage library.

Sources:
  * the 7-text corpus indexed by the BahAI Workforce (texts/*.json)
  * the Bahá'í Prayers compilation (fetch-prayers.py output)

Every entry is a VERBATIM contiguous run of whole sentences from the source —
nothing is paraphrased, reworded, or stitched across gaps — and carries its
author, source title, and a link back to reference.bahai.org. Passages are
capped at PRINT_MAX chars because that is roughly what a 3.5x2in card can
hold at the workforce's readable floor (26px at 300dpi).

Usage: python scripts/build-library.py <texts_dir> <prayers_raw.json>
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT = ROOT / "public" / "data" / "library.json"

MIN_LEN, MAX_LEN = 70, 300      # quotes: comfortable on a card
PRAYER_MIN, PRAYER_MAX = 90, 620  # prayers run longer; 620 ~ the print floor
LONG_AT = 330                    # flagged so the UI can warn about small type

THEMES: dict[str, tuple[str, ...]] = {
    "unity": ("unity", "one country", "mankind its citizens", "oneness", "concord",
              "fellowship", "harmony", "united", "one soul", "diversity"),
    "peace": ("peace", "tranquil", "war", "strife", "reconcil", "serenity"),
    "love": ("love", "loving", "beloved", "affection", "friendship", "kindness",
             "kindly", "compassion"),
    "justice": ("justice", "just ", "equity", "fair", "oppress", "tyranny", "rights"),
    "knowledge": ("knowledge", "science", "learning", "wisdom", "understand",
                  "education", "school", "arts", "study", "truth"),
    "service": ("service", "serve", "servant", "deeds", "work", "craft",
                "occupation", "help", "poor", "needy", "orphan"),
    "detachment": ("detach", "world", "riches", "wealth", "renounce", "vanit",
                   "transitory", "dust"),
    "steadfastness": ("steadfast", "patience", "firm", "endure", "test",
                      "tribulation", "perseve", "constancy", "trial"),
    "the heart": ("heart", "soul", "spirit", "inner", "mirror", "purity", "pure"),
    "joy": ("joy", "gladness", "rejoice", "happy", "radiant", "delight"),
    "humility": ("humil", "meek", "lowly", "pride", "self", "ego"),
    "speech": ("word", "speech", "tongue", "utter", "speak", "silence"),
    "trustworthiness": ("trust", "honest", "truthful", "sincer", "faithful",
                        "pledge", "integrity"),
    "creation": ("garden", "flower", "tree", "sun", "ocean", "sea", "bird",
                 "nature", "earth", "rose", "nightingale", "seed"),
    "guidance": ("light", "lamp", "guid", "path", "way", "star", "dawn",
                 "morn", "illumine"),
    "prayer": ("prayer", "pray", "supplic", "commune", "worship", "meditat"),
}

_ABBR = re.compile(r"\b(?:Mr|Mrs|Dr|St|vs|e\.g|i\.e)\.$")

# A card passage has to stand alone. Anything opening with a connective or a
# bare pronoun is a fragment of a longer argument — it reads as if the reader
# walked in halfway.
_BAD_OPENERS = re.compile(
    r"^(And|But|For|Yet|Thus|Therefore|Hence|Wherefore|Moreover|Nevertheless|"
    r"However|Then|So|Also|Nay|Whereas|Since|Because|Although|Though|While|"
    r"He|She|It|They|This|That|These|Those|Such|Him|Her|Them|Their|His|Its|"
    r"Neither|Nor|Otherwise|Likewise|Furthermore|Again|Now)\b",
    re.I,
)
# Editorial apparatus, cross-references, and citation scaffolding.
_BAD_CONTENT = re.compile(
    r"(\.\.\.|…|\[|\]|footnote|ibid|op\. cit|see page|cf\.|chapter [ivxl\d]|"
    r"aforementioned|as We have (?:already )?(?:said|mentioned|revealed)|"
    r"in the (?:preceding|foregoing)|hereinbefore|hath been mentioned|"
    # points at a specific text the reader does not have in front of them
    r"Tablet of|My Books|My Scriptures|Scrolls|this Tablet|the aforesaid|"
    r"said Tablet|We say that|as stated|as mentioned)",
    re.I,
)
# These are giveaway cards meant to uplift a stranger. Passages of rebuke,
# judgement, or exclusion are filtered out — not censorship of the source,
# just the wrong instrument for this purpose.
_UNSUITED = re.compile(
    r"\b(disbeliev|unbeliev|infidel|heedless|imprecation|enormit|wrath|"
    r"perdition|damned|torment|chastise|abase|accursed|hellfire|hell\b|"
    r"punish|avenge|condemn|wicked|evildoer|perverse|iniquit|blasphem|"
    r"gainsay|repudiat|denier|waywardness)",
    re.I,
)
# A bare invocation ("O ye embodiments of justice!") is an address, not a
# thought — require real substance after the salutation.
_SALUTATION = re.compile(r"^O [^.!?]{0,90}[!,]")
# Much of Selections/Paris Talks is correspondence and travel narrative:
# true, but addressed to one person about one occasion, not counsel a
# stranger can carry in a pocket.
_PERSONAL = re.compile(
    r"((thy|your|the) (letter|epistle|missive)|hath been received|"
    r"news of (thy|your|the)|thy health|well-being|inviting me|"
    r"I am likewise|Look at me|I am so |thy petition|hath reached me|"
    r"reached this (servant|prisoner)|in thy letter|didst write|"
    r"I have read|convey my|give my (love|greeting)|"
    # narration about a specific unnamed person or occasion
    r"we testify|highly-honou?red|hath evinced|that lady|this servant|"
    r"in this field|the dream thou hast dreamed|one of the heroes)",
    re.I,
)


def unbalanced_quotes(text: str) -> bool:
    """An inner quotation opened but never closed means the passage was cut
    mid-citation — it would print with a dangling quote mark."""
    if text.count("“") != text.count("”"):
        return True
    return text.count("‘") > text.count("’")
# Openings that tend to mark a self-contained aphorism, counsel, or address.
_GOOD_OPENERS = re.compile(
    r"^(O |Blessed|Verily|Say|Know|Let |Be |Consider|Behold|Beware|Ponder|"
    r"Happy|Well is it|Whoso|Every|No |None|Nothing|Man |Love|Justice|Truth|"
    r"Knowledge|The best|The essence|The source|The purpose|The fruits?|"
    r"The greatest|The most|The first|One |A |An |We |Ye |Do not|Seek|Arise|"
    r"Regard|Look|Guard|Cleave|Walk|Turn|Bring|Show|Speak|Deal|Strive)",
)


def quality(text: str) -> int:
    """Rough card-worthiness score; higher is better. Negative = reject."""
    if _BAD_CONTENT.search(text) or _UNSUITED.search(text) or _PERSONAL.search(text):
        return -1
    if _BAD_OPENERS.match(text) or unbalanced_quotes(text):
        return -1
    if not text[0].isupper() and not text.startswith(("“", "‘")):
        return -1
    m = _SALUTATION.match(text)
    if m and len(text) - m.end() < 55:   # salutation with nothing behind it
        return -1
    score = 0
    if _GOOD_OPENERS.match(text):
        score += 4
    n_sent = len(sentences(text))
    if n_sent == 1:
        score += 3
    elif n_sent == 2:
        score += 1
    if 90 <= len(text) <= 230:
        score += 3
    elif len(text) <= 270:
        score += 1
    # second person / imperative voice travels well on a giveaway card
    if re.search(r"\b(thou|thee|thy|thine|ye|your|you)\b", text, re.I):
        score += 2
    if text.count(",") > 6:      # long periodic sentences read poorly small
        score -= 2
    if re.search(r"(Bahá|Báb|Abdu)", text):
        score -= 2               # usually expository, or addressed inward
    if re.search(r"\b(I|me|my|myself)\b", text):
        score -= 1               # first-person narration reads as memoir
    return score


def clean(t: str) -> str:
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"(?<=[a-z,;]) \d{1,4} (?=[A-Za-z])", " ", t)   # page-number artifacts
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    return t.strip()


def sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z“"‘\'(])', text)
    out: list[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if out and _ABBR.search(out[-1]):
            out[-1] += " " + p
        else:
            out.append(p)
    return out


def tidy_opener(t: str) -> str:
    """The Hidden Words open in full caps (O SON OF SPIRIT!) — title-case them."""
    return re.sub(
        r"^O ([A-Z][A-Z !]+?)!",
        lambda m: "O " + m.group(1).title().replace(" Of ", " of ") + "!",
        t,
    )


def themes_for(text: str, limit: int = 3) -> list[str]:
    low = " " + text.lower() + " "
    scored = []
    for name, keys in THEMES.items():
        n = sum(low.count(k) for k in keys)
        if n:
            scored.append((n, name))
    scored.sort(reverse=True)
    return [n for _, n in scored[:limit]] or ["reflection"]


def norm_key(t: str) -> str:
    return re.sub(r"[^a-z]", "", t.lower())[:130]


def build_quotes(texts_dir: Path) -> list[dict]:
    entries: list[dict] = []
    seen: set[str] = set()
    for f in sorted(texts_dir.glob("*.json")):
        doc = json.loads(f.read_text(encoding="utf-8"))
        title, author = doc["title"], doc["author"]
        for p in doc["passages"]:
            text = clean(p["text"])
            sents = sentences(text)
            i = 0
            while i < len(sents):
                # grow a run of whole sentences until it lands in the window
                chunk, j = "", i
                while j < len(sents):
                    cand = (chunk + " " + sents[j]).strip()
                    if len(cand) > MAX_LEN:
                        break
                    chunk, j = cand, j + 1
                    if len(chunk) >= MIN_LEN:
                        break
                if chunk and MIN_LEN <= len(chunk) <= MAX_LEN:
                    chunk = tidy_opener(chunk)
                    k = norm_key(chunk)
                    q = quality(chunk)
                    if q > 0 and k not in seen and chunk[-1] in ".!?”\"'":
                        seen.add(k)
                        entries.append({
                            "t": chunk,
                            "a": author,
                            "s": title,
                            "k": "quote",
                            "th": themes_for(chunk),
                            "u": p.get("link", ""),
                            "q": q,
                        })
                i = max(j, i + 1)
    return entries


def select(entries: list[dict], target: int) -> list[dict]:
    """Keep the strongest passages while holding a spread across sources and
    themes, so the library does not collapse onto one book or one subject."""
    entries.sort(key=lambda e: (-e["q"], len(e["t"])))
    per_source_cap = max(40, target // 4)
    per_theme_cap = max(30, target // 8)
    src_n: dict[str, int] = {}
    th_n: dict[str, int] = {}
    kept: list[dict] = []
    for e in entries:
        if len(kept) >= target:
            break
        s = e["s"]
        primary = e["th"][0]
        if src_n.get(s, 0) >= per_source_cap or th_n.get(primary, 0) >= per_theme_cap:
            continue
        src_n[s] = src_n.get(s, 0) + 1
        th_n[primary] = th_n.get(primary, 0) + 1
        kept.append(e)
    # second pass: fill any shortfall with the next-best regardless of caps
    if len(kept) < target:
        have = {id(e) for e in kept}
        for e in entries:
            if len(kept) >= target:
                break
            if id(e) not in have:
                kept.append(e)
    for e in kept:
        e.pop("q", None)
    return kept


def build_ruhi(path: Path) -> list[dict]:
    """Ruhi Institute Book 1's own reference passages, transcribed and
    verified by the workforce. These bypass the automatic scorer entirely —
    they are already a human-curated selection, and their citations are the
    book's own, which is the authoritative form for study-circle use.
    """
    if not path.exists():
        print(f"  ! {path} not found — skipping Ruhi material")
        return []
    entries: list[dict] = []
    for q in json.loads(path.read_text(encoding="utf-8")):
        text = clean(q["text"])
        if len(text) > PRAYER_MAX:      # a handful run past what a card holds
            continue
        source = q["source"]
        author, _, work = source.partition(", ")
        entries.append({
            "t": text,
            "a": author.strip(),
            "s": work.strip() or "Ruhi Book 1",
            "k": "quote",
            "th": themes_for(text),
            "u": "",
            "ruhi": True,
            **({"long": True} if len(text) > LONG_AT else {}),
        })
    return entries


def build_prayers(raw_path: Path) -> list[dict]:
    """Only prayers that fit on a card WHOLE are included — a prayer is not
    excerpted to make it fit. Obligatory prayers are left out entirely: they
    carry specific devotional conditions and do not belong on a giveaway card.
    """
    if not raw_path.exists():
        print(f"  ! {raw_path} not found — skipping prayers")
        return []
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    entries: list[dict] = []
    seen: set[str] = set()
    for p in raw:
        author = (p.get("author") or "").strip()
        if not author or len(author) > 40:
            continue
        topic_raw = (p.get("topic") or "").strip()
        if "OBLIGATORY" in topic_raw.upper():
            continue
        text = clean(p["text"])
        if not (PRAYER_MIN <= len(text) <= PRAYER_MAX):
            continue
        k = norm_key(text)
        if k in seen:
            continue
        seen.add(k)
        topic = topic_raw.title() if topic_raw else "General"
        entries.append({
            "t": text,
            "a": author,
            "s": "Bahá’í Prayers",
            "k": "prayer",
            "th": [topic.lower()],
            "u": p.get("link", ""),
            **({"long": True} if len(text) > LONG_AT else {}),
        })
    return entries


def main() -> None:
    texts_dir = Path(sys.argv[1])
    prayers_raw = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("prayers-raw.json")
    target = int(sys.argv[3]) if len(sys.argv) > 3 else 620

    ruhi = build_ruhi(ROOT / "scripts" / "ruhi-book1.json")
    quotes = select(build_quotes(texts_dir), target)
    prayers = build_prayers(prayers_raw)

    # Ruhi passages win any overlap: same words, but the book's own citation.
    ruhi_keys = {norm_key(r["t"]) for r in ruhi}
    quotes = [q for q in quotes if norm_key(q["t"]) not in ruhi_keys]

    # The hand-picked passages used elsewhere on the site lead the library and
    # are guaranteed present even if the automatic scorer would have cut them.
    curated_path = ROOT / "src" / "data" / "quotes.json"
    featured: list[dict] = []
    if curated_path.exists():
        have = {norm_key(q["t"]) for q in quotes}
        for c in json.loads(curated_path.read_text(encoding="utf-8"))["quotes"]:
            k = norm_key(c["text"])
            for q in quotes:
                if norm_key(q["t"]) == k:
                    q["feat"] = True
                    break
            else:
                featured.append({
                    "t": c["text"], "a": c["author"], "s": c["source"],
                    "k": "quote", "th": [c["theme"]], "u": c.get("link", ""),
                    "feat": True,
                })
            have.add(k)
    quotes = featured + ruhi + quotes
    items = quotes + prayers

    # Intern repeated strings — authors, titles, chapter links, theme names —
    # so the payload stays small enough to ship to a browser.
    srcs: list[list[str]] = []
    src_ix: dict[tuple[str, str], int] = {}
    links: list[str] = []
    link_ix: dict[str, int] = {}
    tags: list[str] = []
    tag_ix: dict[str, int] = {}

    def intern(seq, ix, key, val):
        if key not in ix:
            ix[key] = len(seq)
            seq.append(val)
        return ix[key]

    out = []
    for it in items:
        si = intern(srcs, src_ix, (it["a"], it["s"]), [it["a"], it["s"]])
        li = intern(links, link_ix, it["u"], it["u"]) if it["u"] else -1
        ti = [intern(tags, tag_ix, t, t) for t in it["th"]]
        row = {"t": it["t"], "s": si, "g": ti, "k": 0 if it["k"] == "quote" else 1}
        if li >= 0:
            row["l"] = li
        if it.get("long"):
            row["x"] = 1
        if it.get("feat"):
            row["f"] = 1
        if it.get("ruhi"):
            row["r"] = 1
        out.append(row)

    quote_tags = sorted({t for it in quotes for t in it["th"]})
    prayer_tags = sorted({t for it in prayers for t in it["th"]})
    payload = {
        "sources": srcs,
        "links": links,
        "tags": tags,
        "quoteTags": quote_tags,
        "prayerTags": prayer_tags,
        "items": out,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"quotes  {len(quotes)}")
    print(f"prayers {len(prayers)}")
    print(f"themes  {', '.join(quote_tags)}")
    print(f"topics  {', '.join(prayer_tags[:18])}{' …' if len(prayer_tags) > 18 else ''}")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
