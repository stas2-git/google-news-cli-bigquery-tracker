/* ==========================================================================
   BigQuery Release Notes Tracker - Premium JavaScript Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let releaseNotes = [];
    let filteredNotes = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let sortOrder = 'newest';
    let selectedNote = null;
    let activeTemplate = 'tech';

    // DOM Element References
    const elements = {
        btnRefresh: document.getElementById('btn-refresh'),
        btnExportCsv: document.getElementById('btn-export-csv'),
        spinnerIcon: document.getElementById('spinner-icon'),
        cacheStatusText: document.getElementById('cache-status-text'),
        cacheIndicator: document.getElementById('cache-indicator'),
        
        // Stats
        statTotal: document.querySelector('#stat-total .stat-value'),
        statFeatures: document.querySelector('#stat-features .stat-value'),
        statAnnouncements: document.querySelector('#stat-announcements .stat-value'),
        statIssues: document.querySelector('#stat-issues .stat-value'),
        
        // Search & Filter
        searchInput: document.getElementById('search-input'),
        btnClearSearch: document.getElementById('btn-clear-search'),
        categoryTabsContainer: document.getElementById('category-tabs-container'),
        sortSelect: document.getElementById('sort-select'),
        
        // Feed States
        loadingSkeleton: document.getElementById('feed-loading-skeleton'),
        errorContainer: document.getElementById('feed-error-container'),
        errorMessage: document.getElementById('error-message'),
        btnRetry: document.getElementById('btn-retry'),
        emptyContainer: document.getElementById('feed-empty-container'),
        btnResetFilters: document.getElementById('btn-reset-filters'),
        feedContentContainer: document.getElementById('feed-content-container'),
        
        // Tweet Modal
        tweetModal: document.getElementById('tweet-modal'),
        previewDate: document.getElementById('preview-date'),
        previewCategory: document.getElementById('preview-category'),
        previewText: document.getElementById('preview-text'),
        tweetTextarea: document.getElementById('tweet-textarea'),
        charCounter: document.getElementById('char-counter'),
        charWarning: document.getElementById('char-warning'),
        btnSubmitTweet: document.getElementById('btn-submit-tweet'),
        btnCopyTweet: document.getElementById('btn-copy-tweet'),
        copyBtnText: document.getElementById('copy-btn-text'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        templateChips: document.querySelectorAll('.chip-template'),
        
        // Toast
        toast: document.getElementById('toast-notification'),
        toastMessage: document.getElementById('toast-message')
    };

    // ==========================================================================
    // 1. Data Fetching & UI State Management
    // ==========================================================================

    async function fetchReleaseNotes(forceRefresh = false) {
        showLoadingState();
        
        try {
            const url = `/api/release-notes${forceRefresh ? '?force=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server returned HTTP status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error parsing notes');
            }
            
            releaseNotes = result.data;
            updateCacheIndicator(result.source, result.timestamp);
            updateDashboardStats();
            applyFiltersAndRender();
            
        } catch (error) {
            showErrorState(error.message);
        }
    }

    function showLoadingState() {
        elements.spinnerIcon.classList.add('spinning');
        elements.btnRefresh.disabled = true;
        
        elements.loadingSkeleton.style.display = 'grid';
        elements.errorContainer.style.display = 'none';
        elements.emptyContainer.style.display = 'none';
        elements.feedContentContainer.style.display = 'none';
    }

    function showErrorState(message) {
        elements.spinnerIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
        
        elements.loadingSkeleton.style.display = 'none';
        elements.errorContainer.style.display = 'flex';
        elements.errorMessage.textContent = message;
        elements.feedContentContainer.style.display = 'none';
    }

    function updateCacheIndicator(source, timestamp) {
        elements.spinnerIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
        
        const date = new Date(timestamp * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let label = '';
        let dotColor = '#10b981'; // green
        
        if (source === 'network') {
            label = `Synced: ${timeStr}`;
            dotColor = '#10b981';
        } else if (source === 'cache') {
            label = `Cached: ${timeStr}`;
            dotColor = '#3b82f6'; // blue
        } else if (source === 'cache_fallback') {
            label = `Offline Fallback: ${timeStr}`;
            dotColor = '#f59e0b'; // orange
        }
        
        elements.cacheStatusText.textContent = label;
        const pulseDot = elements.cacheIndicator.querySelector('.pulse-dot');
        pulseDot.style.backgroundColor = dotColor;
        pulseDot.style.boxShadow = `0 0 0 0 ${dotColor}b3`;
    }

    function updateDashboardStats() {
        if (!releaseNotes || releaseNotes.length === 0) return;
        
        const stats = {
            total: releaseNotes.length,
            features: 0,
            announcements: 0,
            issues: 0
        };
        
        releaseNotes.forEach(note => {
            const cat = note.category.toLowerCase();
            if (cat === 'feature') {
                stats.features++;
            } else if (cat === 'announcement') {
                stats.announcements++;
            } else if (cat === 'issue' || cat === 'deprecation') {
                stats.issues++;
            }
        });
        
        elements.statTotal.textContent = stats.total;
        elements.statFeatures.textContent = stats.features;
        elements.statAnnouncements.textContent = stats.announcements;
        elements.statIssues.textContent = stats.issues;
    }

    // ==========================================================================
    // 2. Filter & Sort Logic
    // ==========================================================================

    function applyFiltersAndRender() {
        // Filter by category
        filteredNotes = releaseNotes.filter(note => {
            if (activeCategory === 'all') return true;
            return note.category.toLowerCase() === activeCategory.toLowerCase();
        });

        // Filter by search query
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            filteredNotes = filteredNotes.filter(note => {
                return (
                    note.category.toLowerCase().includes(query) ||
                    note.date.toLowerCase().includes(query) ||
                    note.description_text.toLowerCase().includes(query)
                );
            });
        }

        // Sort
        filteredNotes.sort((a, b) => {
            const dateA = new Date(a.updated || a.date);
            const dateB = new Date(b.updated || b.date);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        renderFeed();
    }

    // ==========================================================================
    // 3. UI Rendering
    // ==========================================================================

    function renderFeed() {
        elements.loadingSkeleton.style.display = 'none';
        
        if (filteredNotes.length === 0) {
            elements.feedContentContainer.style.display = 'none';
            elements.emptyContainer.style.display = 'flex';
            return;
        }

        elements.emptyContainer.style.display = 'none';
        elements.feedContentContainer.style.display = 'grid';
        elements.feedContentContainer.innerHTML = '';

        filteredNotes.forEach(note => {
            const card = createReleaseCard(note);
            elements.feedContentContainer.appendChild(card);
        });
    }

    function createReleaseCard(note) {
        const card = document.createElement('article');
        card.className = 'release-card';
        
        // Define color accents for specific categories
        let accentColor = 'var(--primary)';
        let glowColor = 'var(--primary-glow)';
        let badgeClass = 'badge-general';
        const cat = note.category.toLowerCase();
        
        if (cat === 'feature') {
            accentColor = 'var(--color-feature)';
            glowColor = 'var(--color-feature-glow)';
            badgeClass = 'badge-feature';
        } else if (cat === 'announcement') {
            accentColor = 'var(--color-announcement)';
            glowColor = 'var(--color-announcement-glow)';
            badgeClass = 'badge-announcement';
        } else if (cat === 'issue') {
            accentColor = 'var(--color-issue)';
            glowColor = 'var(--color-issue-glow)';
            badgeClass = 'badge-issue';
        } else if (cat === 'deprecation') {
            accentColor = 'var(--color-deprecation)';
            glowColor = 'var(--color-deprecation-glow)';
            badgeClass = 'badge-deprecation';
        } else if (cat === 'change') {
            accentColor = 'var(--color-change)';
            glowColor = 'var(--color-change-glow)';
            badgeClass = 'badge-change';
        }

        card.style.setProperty('--color-accent', accentColor);
        card.style.setProperty('--color-glow', glowColor);

        // Build Card Header
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const meta = document.createElement('div');
        meta.className = 'card-meta';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'card-date';
        dateSpan.textContent = note.date;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `category-badge ${badgeClass}`;
        badgeSpan.textContent = note.category;
        
        meta.appendChild(dateSpan);
        meta.appendChild(badgeSpan);
        header.appendChild(meta);

        // Header Action Buttons
        const headerActions = document.createElement('div');
        headerActions.className = 'card-header-actions';
        
        const btnCopyLink = document.createElement('button');
        btnCopyLink.className = 'btn-icon-action';
        btnCopyLink.title = 'Copy link to this release note';
        btnCopyLink.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
        `;
        btnCopyLink.addEventListener('click', () => {
            navigator.clipboard.writeText(note.link);
            showToast('Link copied to clipboard!');
        });
        
        headerActions.appendChild(btnCopyLink);
        header.appendChild(headerActions);
        card.appendChild(header);

        // Card Description Body
        const body = document.createElement('div');
        body.className = 'card-description';
        body.innerHTML = note.description_html;
        card.appendChild(body);

        // Card Footer Actions
        const footer = document.createElement('div');
        footer.className = 'card-footer';
        
        const btnTweet = document.createElement('button');
        btnTweet.className = 'btn-tweet';
        btnTweet.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Tweet this</span>
        `;
        btnTweet.addEventListener('click', () => openTweetModal(note));
        
        const btnLink = document.createElement('a');
        btnLink.className = 'btn-card-link';
        btnLink.href = note.link;
        btnLink.target = '_blank';
        btnLink.rel = 'noopener noreferrer';
        btnLink.innerHTML = `
            <span>Source</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
            </svg>
        `;
        
        const btnCopyContent = document.createElement('button');
        btnCopyContent.className = 'btn-card-link';
        btnCopyContent.title = 'Copy release note text to clipboard';
        btnCopyContent.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span class="btn-text">Copy</span>
        `;
        btnCopyContent.addEventListener('click', () => {
            navigator.clipboard.writeText(note.description_text).then(() => {
                const textSpan = btnCopyContent.querySelector('.btn-text');
                textSpan.textContent = 'Copied!';
                showToast('Release note text copied!');
                setTimeout(() => {
                    textSpan.textContent = 'Copy';
                }, 2000);
            });
        });
        
        footer.appendChild(btnLink);
        footer.appendChild(btnCopyContent);
        footer.appendChild(btnTweet);
        card.appendChild(footer);

        return card;
    }

    // ==========================================================================
    // 4. Custom Tweet Composer Modal
    // ==========================================================================

    function openTweetModal(note) {
        selectedNote = note;
        elements.previewDate.textContent = note.date;
        elements.previewCategory.textContent = note.category;
        
        // Remove badge classes first and add matching category class
        elements.previewCategory.className = 'category-badge';
        const cat = note.category.toLowerCase();
        if (cat === 'feature') elements.previewCategory.classList.add('badge-feature');
        else if (cat === 'announcement') elements.previewCategory.classList.add('badge-announcement');
        else if (cat === 'issue') elements.previewCategory.classList.add('badge-issue');
        else if (cat === 'deprecation') elements.previewCategory.classList.add('badge-deprecation');
        else if (cat === 'change') elements.previewCategory.classList.add('badge-change');
        else elements.previewCategory.classList.add('badge-general');
        
        elements.previewText.textContent = note.description_text;
        
        // Reset template selection to Technical
        elements.templateChips.forEach(chip => {
            if (chip.dataset.template === 'tech') chip.classList.add('active');
            else chip.classList.remove('active');
        });
        activeTemplate = 'tech';
        
        generateTweetText();
        
        elements.tweetModal.classList.add('active');
        elements.tweetModal.setAttribute('aria-hidden', 'false');
        elements.tweetTextarea.focus();
    }

    function closeTweetModal() {
        elements.tweetModal.classList.remove('active');
        elements.tweetModal.setAttribute('aria-hidden', 'true');
        selectedNote = null;
    }

    // Smart Truncation for Tweets
    function getCleanSnippet(text, limit = 130) {
        if (text.length <= limit) return text;
        const slice = text.substring(0, limit);
        const lastSpace = slice.lastIndexOf(' ');
        if (lastSpace > limit - 25) {
            return slice.substring(0, lastSpace).trim() + '...';
        }
        return slice.trim() + '...';
    }

    function generateTweetText() {
        if (!selectedNote) return;

        const date = selectedNote.date;
        const category = selectedNote.category;
        const link = selectedNote.link;
        const rawText = selectedNote.description_text;

        let tweetText = '';
        
        switch (activeTemplate) {
            case 'tech':
                // Detailed Technical snippet
                const techSnippet = getCleanSnippet(rawText, 140);
                tweetText = `⚡ #BigQuery Update [${date}]:\n🛠️ Category: ${category}\n\n"${techSnippet}"\n\nRead more details here:\n👉 ${link}\n#GoogleCloud #DataEngineering`;
                break;
                
            case 'hype':
                // High excitement release announcement
                const hypeSnippet = getCleanSnippet(rawText, 120);
                tweetText = `🔥 New features added to Google Cloud BigQuery! (${date})\n\n🚀 [${category}]: ${hypeSnippet}\n\nGet all the details and optimize your queries now! 👇\n🔗 ${link}\n#BigQuery #GoogleCloud #CloudComputing`;
                break;
                
            case 'professional':
                // Clean corporate/professional briefing
                const profSnippet = getCleanSnippet(rawText, 130);
                tweetText = `Google Cloud has announced a BigQuery update on ${date}.\n\n🔹 Update Category: ${category}\n🔹 Details: ${profSnippet}\n\nFull release notes at: ${link}\n#BigQuery #GoogleCloud Platform`;
                break;
                
            case 'summary':
                // Absolute short summary to ensure it fits easily
                const shortSnippet = getCleanSnippet(rawText, 180);
                tweetText = `BigQuery [${date}] - ${category}:\n${shortSnippet}\n\n${link}`;
                break;
        }

        elements.tweetTextarea.value = tweetText;
        updateCharCounter();
    }

    function updateCharCounter() {
        const count = elements.tweetTextarea.value.length;
        elements.charCounter.textContent = `${count} / 280`;

        // Style warnings based on character counts
        if (count > 280) {
            elements.charCounter.className = 'char-counter error';
            elements.charWarning.style.display = 'block';
            elements.btnSubmitTweet.disabled = true;
        } else if (count > 250) {
            elements.charCounter.className = 'char-counter warning';
            elements.charWarning.style.display = 'none';
            elements.btnSubmitTweet.disabled = false;
        } else {
            elements.charCounter.className = 'char-counter';
            elements.charWarning.style.display = 'none';
            elements.btnSubmitTweet.disabled = false;
        }

        if (count === 0) {
            elements.btnSubmitTweet.disabled = true;
        }
    }

    // ==========================================================================
    // 5. Toast Notifications
    // ==========================================================================

    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('show');
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2500);
    }

    // ==========================================================================
    // 6. Interactive Event Listeners
    // ==========================================================================

    // Refresh Button Click
    elements.btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Export CSV Button Click
    elements.btnExportCsv.addEventListener('click', () => {
        if (!filteredNotes || filteredNotes.length === 0) {
            showToast('No notes available to export!');
            return;
        }

        const escapeCSV = (text) => {
            if (!text) return '';
            // Escape double quotes by doubling them, and wrap cell in double quotes
            return '"' + text.replace(/"/g, '""') + '"';
        };

        const csvRows = [
            ["Date", "Category", "Link", "Description"].map(escapeCSV).join(",")
        ];

        filteredNotes.forEach(note => {
            csvRows.push([
                note.date,
                note.category,
                note.link,
                note.description_text
            ].map(escapeCSV).join(","));
        });

        const csvContent = csvRows.join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const safeCategory = activeCategory.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `bigquery_releases_${safeCategory}_${timestamp}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('CSV export successful!');
    });

    // Retry Button Click (in error state)
    elements.btnRetry.addEventListener('click', () => {
        fetchReleaseNotes(false);
    });

    // Reset Filters Button Click (in empty state)
    elements.btnResetFilters.addEventListener('click', () => {
        searchQuery = '';
        activeCategory = 'all';
        elements.searchInput.value = '';
        elements.btnClearSearch.style.display = 'none';
        
        // Reset category tabs in UI
        const tabs = elements.categoryTabsContainer.querySelectorAll('.tab-chip');
        tabs.forEach(tab => {
            if (tab.dataset.category === 'all') {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });

        applyFiltersAndRender();
    });

    // Search Input Field
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.length > 0) {
            elements.btnClearSearch.style.display = 'block';
        } else {
            elements.btnClearSearch.style.display = 'none';
        }
        applyFiltersAndRender();
    });

    // Clear Search Input Button
    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.btnClearSearch.style.display = 'none';
        elements.searchInput.focus();
        applyFiltersAndRender();
    });

    // Keyboard shortcut '/' to focus search
    window.addEventListener('keydown', (e) => {
        // Only trigger if not typing in text inputs or textarea
        const active = document.activeElement.tagName.toLowerCase();
        if (active !== 'input' && active !== 'textarea') {
            if (e.key === '/') {
                e.preventDefault();
                elements.searchInput.focus();
                elements.searchInput.select();
            }
        }
    });

    // Category Filter Selection Tabs
    elements.categoryTabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab-chip');
        if (!tab) return;

        // Reset tabs states
        const tabs = elements.categoryTabsContainer.querySelectorAll('.tab-chip');
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });

        // Set active tab
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        activeCategory = tab.dataset.category;

        applyFiltersAndRender();
    });

    // Sort order selection drop-down
    elements.sortSelect.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        applyFiltersAndRender();
    });

    // --- Tweet Modal Event Listeners ---
    
    // Close Modal Button
    elements.btnCloseModal.addEventListener('click', closeTweetModal);
    
    // Clicking backdrop closes modal
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });

    // Esc Key closes Modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });

    // Textarea editing char listener
    elements.tweetTextarea.addEventListener('input', updateCharCounter);

    // Template Selector Chip Clicks
    elements.templateChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            elements.templateChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            activeTemplate = e.target.dataset.template;
            generateTweetText();
        });
    });

    // Copy Tweet Text Action
    elements.btnCopyTweet.addEventListener('click', () => {
        const text = elements.tweetTextarea.value;
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            elements.copyBtnText.textContent = 'Copied!';
            showToast('Tweet copied to clipboard!');
            setTimeout(() => {
                elements.copyBtnText.textContent = 'Copy Text';
            }, 2000);
        });
    });

    // Submit / Post Tweet Action (Twitter Web Intent)
    elements.btnSubmitTweet.addEventListener('click', () => {
        const text = elements.tweetTextarea.value;
        if (!text) return;

        // Build Twitter Intent URL
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    });

    // Start Fetching Data immediately on Load
    fetchReleaseNotes(false);
});
