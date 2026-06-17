from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent overloading Google's feed and speed up responses
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 600  # 10 minutes cache duration in seconds

def parse_release_notes():
    """
    Fetches the BigQuery Atom RSS feed and parses individual release items
    by separating them based on <h3> tags in the entry content.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    xml_data = response.content
    root = ET.fromstring(xml_data)
    
    # Standard Atom feed namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        # Extract title (usually the date, e.g., "June 16, 2026")
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text.strip() if title_elem is not None and title_elem.text else "Unknown Date"
        
        # Extract updated ISO timestamp
        updated_elem = entry.find('atom:updated', ns)
        updated_str = updated_elem.text.strip() if updated_elem is not None and updated_elem.text else ""
        
        # Get alternate link, or default link
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
        link_href = link_elem.attrib.get('href', '') if link_elem is not None else ''
        
        # Extract HTML content
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or content_elem.text is None:
            continue
            
        content_html = content_elem.text
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # Normalize relative links to absolute
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            if href.startswith('/'):
                a_tag['href'] = f"https://cloud.google.com{href}"
            # Ensure target="_blank" and rel="noopener noreferrer" for safety
            a_tag['target'] = '_blank'
            a_tag['rel'] = 'noopener noreferrer'
                
        # Split entry by <h3> tags
        current_category = "Update"
        current_description_parts = []
        item_index = 0
        
        for element in soup.contents:
            # Check if element is an <h3> header representing a new category section
            if getattr(element, 'name', None) == 'h3':
                if current_description_parts:
                    # Save previous item
                    desc_soup = BeautifulSoup("", 'html.parser')
                    for item in current_description_parts:
                        desc_soup.append(item)
                    
                    entries.append({
                        'id': f"{link_href}_{item_index}",
                        'date': date_str,
                        'updated': updated_str,
                        'link': link_href,
                        'category': current_category,
                        'description_html': str(desc_soup),
                        'description_text': desc_soup.get_text().strip()
                    })
                    item_index += 1
                
                current_category = element.get_text().strip()
                current_description_parts = []
            elif element.name is not None or (isinstance(element, str) and element.strip()):
                current_description_parts.append(element)
                
        # Append the final item of the entry
        if current_description_parts:
            desc_soup = BeautifulSoup("", 'html.parser')
            for item in current_description_parts:
                desc_soup.append(item)
            
            entries.append({
                'id': f"{link_href}_{item_index}",
                'date': date_str,
                'updated': updated_str,
                'link': link_href,
                'category': current_category,
                'description_html': str(desc_soup),
                'description_text': desc_soup.get_text().strip()
            })
            
    return entries

@app.route('/')
def index():
    """Renders the main page."""
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    """
    JSON API endpoint to fetch and return release notes.
    Accepts an optional query parameter `force=true` to skip cache and force-fetch.
    """
    force = request.args.get('force', 'false').lower() == 'true'
    now = time.time()
    
    # Check if cache is expired or force fetch requested
    if force or not cache["data"] or (now - cache["last_fetched"] > CACHE_DURATION):
        try:
            cache["data"] = parse_release_notes()
            cache["last_fetched"] = now
            return jsonify({
                "success": True,
                "data": cache["data"],
                "source": "network",
                "timestamp": int(cache["last_fetched"])
            })
        except Exception as e:
            # Failover: if fetching fails, fall back to cached data if we have it
            if cache["data"]:
                return jsonify({
                    "success": True,
                    "data": cache["data"],
                    "source": "cache_fallback",
                    "error": str(e),
                    "timestamp": int(cache["last_fetched"])
                })
            return jsonify({
                "success": False,
                "error": f"Failed to fetch and parse release notes: {str(e)}"
            }), 500
            
    return jsonify({
        "success": True,
        "data": cache["data"],
        "source": "cache",
        "timestamp": int(cache["last_fetched"])
    })

if __name__ == '__main__':
    # Run Flask server locally on port 5001 to avoid conflicts
    app.run(debug=True, port=5001)
