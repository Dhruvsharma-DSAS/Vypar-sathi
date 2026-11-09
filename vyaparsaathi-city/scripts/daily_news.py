import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from config import DAILY

QUERIES = {
    "bengaluru": ["Koramangala", "Indiranagar", "BTM Layout", "Bengaluru street vendors", "Namma Metro"],
    "pune": ["Viman Nagar", "Kharadi", "Yerawada", "Pune street vendors", "Pune Metro"],
}

TAGS = {
    "demand_up": ["opens", "opening", "inaugurat", "launch", "new office", "tech park", "ridership"],
    "risk": ["closure", "closed", "eviction", "encroachment", "road work", "diversion", "flood", "fine"],
    "festival": ["festival", "diwali", "deepavali", "ganesh", "navratri", "eid", "christmas", "karaga", "fair"],
}


def rss(query):
    q = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={q}&hl=en-IN&gl=IN&ceid=IN:en"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        root = ET.fromstring(r.read())
    items = []
    for it in root.iter("item"):
        items.append({"title": it.findtext("title", ""), "link": it.findtext("link", ""), "date": it.findtext("pubDate", "")})
    return items[:8]


def tag(title):
    low = title.lower()
    for name, words in TAGS.items():
        for w in words:
            if w in low:
                return name
    return "other"


def summarise(city, titles):
    key = os.environ.get("GROQ_API_KEY", "")
    if key == "" or len(titles) == 0:
        return "Top local headlines collected. Open each item for details."
    prompt = ("You help street vendors in " + city + ". From these headlines, write 3 short lines: "
              "what may increase customers, what is a risk, and one action. Use simple English.\n- " + "\n- ".join(titles[:15]))
    body = json.dumps({"model": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
                       "messages": [{"role": "user", "content": prompt}], "max_tokens": 200, "temperature": 0.3}).encode()
    req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=body,
                                 headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"].strip()


def main():
    out = {"date": str(date.today()), "sample": False}
    for city, queries in QUERIES.items():
        seen = set()
        items = []
        for q in queries:
            try:
                for it in rss(q):
                    if it["title"] in seen:
                        continue
                    seen.add(it["title"])
                    it["tag"] = tag(it["title"])
                    items.append(it)
            except Exception as e:
                print("feed failed:", q, e)
        useful = [i for i in items if i["tag"] != "other"][:10]
        try:
            summary = summarise(city, [i["title"] for i in useful])
        except Exception:
            summary = "Saved local headlines. Open each item for details; no AI summary available."
        out[city] = {"summary": summary, "items": useful}
    (DAILY / "news_today.json").write_text(json.dumps(out, indent=1))
    print("news_today.json updated")


if __name__ == "__main__":
    main()
