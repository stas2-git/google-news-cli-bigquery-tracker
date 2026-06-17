# 📰 Workspace Utilities

This workspace contains two useful utility applications: an interactive terminal CLI to browse Google News, and a premium web-based tracker for BigQuery Release Notes.

---

## 🌐 BigQuery Release Notes Tracker (Web App)

A premium, interactive single-page web application built with **Python Flask** and plain vanilla **HTML/CSS/JS** that fetches, parses, filters, and shares the official Google Cloud BigQuery Release Notes feed.

### ✨ Features
- 🚀 **Atom Feed Parsing**: Fetches release notes directly from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml` on demand.
- 📂 **Item Categorization**: Parses daily release logs and splits individual items into distinct cards (e.g., Features, Announcements, Issues, Deprecations, Changes).
- 📊 **Stats Dashboard**: Displays real-time counts of total updates, features, announcements, and issues in the header.
- ⚡ **Optimized Caching**: Implements an in-memory cache on the Flask server (10-minute expiry) to prevent feed rate limits, with a manual **Force Refresh** button + spinner.
- 🔍 **Real-time Search & Filter**: Instantly search titles/dates/content and filter by category tab. Supports keyboard shortcut `/` to focus search.
- 🐦 **Interactive Twitter/X Composer Modal**: Click "Tweet this" on any release note to open a custom composer. Features:
  - **4 Custom Templates**: Technical, Hype, Professional, and Brief Summary.
  - **Auto-formatting & Smart Truncation**: Ensures content plus doc links fit the 280-character limit.
  - **Copy to Clipboard & Post Web Intent**: Post directly to Twitter or copy text with a single click.

### 🚀 Setup & Run (Web App)

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Run the Flask application**:
   ```bash
   python3 app.py
   ```
3. **Open in your browser**:
   Navigate to [http://127.0.0.1:5001](http://127.0.0.1:5001).

---

## 🗞️ Google News CLI Terminal

A beautiful, interactive command-line interface to read the latest news from Google News directly inside your terminal. Built with Node.js.

### ✨ Features
- 🌈 **Google-branded Interface**: Clean, colorized output matching Google's branding.
- 🗞️ **Top Stories**: Fetch the latest global and national news headlines.
- 🏢 **Google-specific News**: Instantly get news related to Google as a company.
- 🔍 **Custom Topic Search**: Search for articles on any topic or keyword you specify.
- 🌐 **Open in Browser**: Easily open any selected article in your default browser.
- 🕹️ **Interactive Prompts**: Sleek menus for easy keyboard navigation.

### 🚀 Setup & Run (CLI Terminal)

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Run the application**:
   ```bash
   npm start
   # or
   node index.js
   ```

### 🔗 Run Globally
You can link this project globally to run the `google-news` command from any terminal directory:
```bash
npm link
google-news
```

---

## 🛠️ Built With

- **Python Flask** - Light, extensible web microframework.
- **BeautifulSoup4** - Python HTML parsing library.
- **rss-parser** - Node.js XML RSS parsing.
- **picocolors** - Minimal and fast terminal styling.
- **prompts** - Lightweight interactive CLI prompts.

