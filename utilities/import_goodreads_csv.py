#!/usr/bin/env python3
"""Rebuild _data/books.yml from a Goodreads library export.

Goodreads' RSS feed (utilities/fetch_books.py) started returning 404 in
Nov 2026, so this reads the CSV export instead: My Books -> Import and
export -> Export Library, saved as utilities/goodreads_library_export.csv
(gitignored; it holds the whole library, not just the read shelf).

Covers: a book already in books.yml keeps its downloaded cover. New books
get one from Open Library by ISBN; books without a match render a text card.

Usage: python3 utilities/import_goodreads_csv.py
"""
import csv
import hashlib
import json
import os
import re
import urllib.request

CSV_FILE = "utilities/goodreads_library_export.csv"
OUTPUT_FILE = "_data/books.yml"
COVER_DIR = "assets/img/books"


def norm(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())


def short(title):
    """Title without subtitle or series tag, so "X: Y (Series, #1)" matches "X"."""
    return norm(re.split(r"[:(]", title)[0])


def existing_covers():
    """Map normalized title -> image_url from the current books.yml."""
    covers = {}
    if not os.path.exists(OUTPUT_FILE):
        return covers
    title = None
    for line in open(OUTPUT_FILE, encoding="utf-8"):
        if line.startswith("- title: "):
            title = json.loads(line[len("- title: "):])
        elif line.startswith("  image_url: ") and title:
            url = json.loads(line[len("  image_url: "):])
            if url:
                covers[norm(title)] = url
                covers.setdefault(short(title), url)
    return covers


def open_library_cover(isbn):
    """Download an Open Library cover for an ISBN; return its site path or ''."""
    if not isbn:
        return ""
    local_path = os.path.join(COVER_DIR, hashlib.md5(("ol:" + isbn).encode()).hexdigest() + ".jpg")
    if os.path.exists(local_path):
        return "/" + local_path
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "dayitva.github.io books import"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
    except Exception:
        return ""
    if len(data) < 1000:  # placeholder pixel, not a real cover
        return ""
    os.makedirs(COVER_DIR, exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(data)
    return "/" + local_path


def clean_isbn(value):
    return value.strip().strip('="')


def main():
    rows = [r for r in csv.DictReader(open(CSV_FILE, encoding="utf-8")) if r["Exclusive Shelf"] == "read"]
    # Newest first: by date read, falling back to date added.
    rows.sort(key=lambda r: (r["Date Read"] or r["Date Added"]), reverse=True)

    covers = existing_covers()
    books, missing = [], []
    for r in rows:
        image = covers.get(norm(r["Title"])) or covers.get(short(r["Title"])) or open_library_cover(clean_isbn(r["ISBN13"]) or clean_isbn(r["ISBN"]))
        if not image:
            missing.append(r["Title"])
        books.append({
            "title": r["Title"],
            "author": r["Author"] or "Unknown",
            "link": f"https://www.goodreads.com/book/show/{r['Book Id']}",
            "image_url": image,
            "rating": int(float(r["My Rating"] or 0)),
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for b in books:
            f.write(f"- title: {json.dumps(b['title'])}\n")
            f.write(f"  author: {json.dumps(b['author'])}\n")
            f.write(f"  link: {json.dumps(b['link'])}\n")
            f.write(f"  image_url: {json.dumps(b['image_url'])}\n")
            f.write(f"  rating: {b['rating']}\n\n")

    print(f"Saved {len(books)} books to {OUTPUT_FILE}.")
    if missing:
        print(f"No cover for {len(missing)}: " + "; ".join(missing))


if __name__ == "__main__":
    main()
