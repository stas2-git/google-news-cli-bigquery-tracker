# 📰 Workspace Utilities: News & Release Notes Trackers

This repository contains two core utilities to stay up-to-date with Google ecosystem updates:
1. **🌐 BigQuery Release Notes Tracker**: An interactive, glassmorphic Flask web app to browse, search, and share Google Cloud BigQuery release updates.
2. **🗞️ Google News CLI Terminal**: A lightweight Node.js terminal client to read top global and company-specific news.

---

## 🌐 BigQuery Release Notes Tracker (Web App)

A modern, single-page web application that automatically scrapes, categorizes, and displays Google Cloud BigQuery release notes. It features a dashboard with live metrics, on-the-fly search and category filtering, and an automated Twitter/X template composer for social sharing.

### ⚡ Key Features
- **Categorized Releases**: Daily release logs are parsed using `BeautifulSoup` and split by `<h3>` tags into atomic cards (e.g., `Feature`, `Announcement`, `Issue`, `Deprecation`, `Change`).
- **Live Stats Dashboard**: Renders real-time statistics of total updates, features, announcements, and issues in the header.
- **Smart Local Search & Filtering**: Real-time substring matching on categories, dates, and description details.
  - Press `/` to focus the search box.
  - Filter notes instantly by choosing a category tab.
- **Optimized Server Caching**: Caches raw feed results in memory (10-minute expiry) to prevent hitting Google Cloud's rate limits. The **Refresh** button bypasses cache with a loading spinner.
- **Twitter/X Intent Composer Modal**: A custom-made modal to draft posts with one click:
  - **4 Styles**: Technical (⚡), Hype (🔥), Professional (💼), or Brief Summary (📝).
  - **Auto-Formatting**: Dynamically injects notes details, relevant hashtags, and reference links.
  - **Auto-Truncation**: Truncates descriptions to stay within Twitter's 280-character limit.
  - **Clipboard Support**: One-click text copying with transient toast notifications.

### 📐 Scraper Flow & Architecture

```mermaid
graph TD
    User([User Browser]) -->|Request| Flask[Flask App: app.py]
    Flask -->|Fetch API| ApiEndpoint[/api/release-notes]
    ApiEndpoint -->|Check Cache| CacheTime{Cache Valid?}
    
    CacheTime -->|Yes| FetchCache[Serve In-memory JSON]
    CacheTime -->|No / Forced| FetchFeed[Get Google RSS Feed]
    
    FetchFeed -->|Parse XML| ETParser[ElementTree Parser]
    ETParser -->|Extract Entries| BS4[BeautifulSoup4 Processor]
    BS4 -->|Split by h3 & Resolve Links| MakeJSON[Format JSON Objects]
    MakeJSON -->|Update Cache| FetchCache
    FetchCache -->|JSON Response| JS[static/js/app.js]
    JS -->|Compile Templates| DOM[Render Interactive Cards]
```

### 🚀 Setup & Execution

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Start the Flask server**:
   ```bash
   python3 app.py
   ```
3. **Open the browser**:
   Navigate to **[http://127.0.0.1:5001](http://127.0.0.1:5001)**.

### 🔌 API Reference

#### `GET /api/release-notes`
Returns a JSON payload containing the structured array of release note entries.

* **Query Parameters**:
  * `force` (optional): Set to `true` to bypass cache and fetch directly from Google Cloud servers.
* **Sample Response**:
  ```json
  {
    "data": [
      {
        "id": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026_0",
        "date": "June 16, 2026",
        "updated": "2026-06-16T00:00:00-07:00",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026",
        "category": "Announcement",
        "description_html": "<p>Table Explorer behavior is moving...</p>",
        "description_text": "Table Explorer behavior is moving to the Reference panel..."
      }
    ],
    "source": "cache",
    "success": true,
    "timestamp": 1781662502
  }
  ```

---

## 🗞️ Google News CLI Terminal

A Node.js command-line application to read top global stories, corporate search feeds, and custom queries in your terminal.

### ⚡ Key Features
- **Visual Branding**: Text colors formatted with Google's red-yellow-blue-green branding.
- **Top Stories**: Instantly reads top global Google News RSS headlines.
- **Interactive keyboard selection**: Navigate news menus using arrow keys and select options cleanly.
- **Browser Launch**: Open articles in your default web browser directly from the terminal.

### 🚀 Setup & Execution

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```
2. **Run locally**:
   ```bash
   npm start
   # or
   node index.js
   ```
3. **Link CLI globally**:
   ```bash
   npm link
   google-news
   ```

---

## 🛠️ Tech Stack & Dependencies

### Web Application:
- **Backend**: Python 3, Flask, Requests, BeautifulSoup4
- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphic Variables), Vanilla Javascript (ES6)

### CLI Terminal:
- **Runtime**: Node.js
- **Packages**: `rss-parser`, `picocolors`, `prompts`
