#!/usr/bin/env python3
import urllib.request
import xml.etree.ElementTree as ET
import json
import os

# TODO: Replace this with your actual Goodreads RSS link from the bottom of your "My Books" page!
# Example: "https://www.goodreads.com/review/list_rss/YOUR_ID?shelf=read"
RSS_URL = "https://www.goodreads.com/review/list_rss/169030200?key=WaNG-sDlbje1OYzX-whcfE25JmOCrHFgOyxKlxuGQvP4QijB&shelf=read"
OUTPUT_FILE = "_data/books.yml"

def fetch_books():
    if "YOUR_ID" in RSS_URL:
        print("Please replace YOUR_ID in utilities/fetch_books.py with your actual Goodreads RSS link!")
        return

    print(f"Fetching books from {RSS_URL}...")
    req = urllib.request.Request(RSS_URL, headers={'User-Agent': 'Mozilla/5.0'})
    
    try:
        response = urllib.request.urlopen(req)
        xml_data = response.read()
    except Exception as e:
        print(f"Error fetching RSS feed: {e}")
        return

    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return

    books = []
    
    # Goodreads RSS puts items directly under channel
    for item in root.findall('./channel/item'):
        title = item.find('title')
        link = item.find('link')
        author = item.find('author_name')
        image_url = item.find('book_image_url')
        rating = item.find('user_rating')
        
        if title is not None and link is not None:
            book_title = title.text.strip()
            # Goodreads RSS title format is sometimes "Author: Title" but usually just "Title"
            
            # Clean up the image URL to get the higher resolution image instead of the thumbnail
            img_url = image_url.text.strip() if image_url is not None else ""
            img_url = img_url.replace("SX50", "SX300").replace("SY75", "SY400").replace("_SX98_", "")
            
            local_img_path = ""
            if img_url:
                import hashlib
                img_name = hashlib.md5(img_url.encode()).hexdigest() + ".jpg"
                local_dir = "assets/img/books"
                os.makedirs(local_dir, exist_ok=True)
                local_path = os.path.join(local_dir, img_name)
                
                if not os.path.exists(local_path):
                    try:
                        req_img = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req_img) as resp_img, open(local_path, 'wb') as out_img:
                            out_img.write(resp_img.read())
                        local_img_path = "/" + local_path
                    except Exception as e:
                        print(f"Failed to download {img_url}: {e}")
                        local_img_path = img_url
                else:
                    local_img_path = "/" + local_path
            
            books.append({
                'title': book_title,
                'author': author.text.strip() if author is not None else "Unknown",
                'link': link.text.strip(),
                'image_url': local_img_path or img_url,
                'rating': int(rating.text) if rating is not None and rating.text.isdigit() else 0
            })
            
    # Save to _data/books.yml
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for book in books:
            f.write(f"- title: {json.dumps(book['title'])}\n")
            f.write(f"  author: {json.dumps(book['author'])}\n")
            f.write(f"  link: {json.dumps(book['link'])}\n")
            f.write(f"  image_url: {json.dumps(book['image_url'])}\n")
            f.write(f"  rating: {book['rating']}\n\n")
        
    print(f"Successfully saved {len(books)} books to {OUTPUT_FILE}!")

if __name__ == "__main__":
    fetch_books()
