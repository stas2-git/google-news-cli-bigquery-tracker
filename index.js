#!/usr/bin/env node

import Parser from 'rss-parser';
import pc from 'picocolors';
import prompts from 'prompts';
import { execFile } from 'child_process';

const parser = new Parser();

// Clear terminal screen
function clearScreen() {
  process.stdout.write('\x1Bc');
}

// Google branding logo helper
function printHeader() {
  const g = pc.blue('G');
  const o1 = pc.red('o');
  const o2 = pc.yellow('o');
  const g2 = pc.blue('g');
  const l = pc.green('l');
  const e = pc.red('e');
  
  console.log('\n' + pc.bold(`  === ${g}${o1}${o2}${g2}${l}${e} News CLI Terminal ===`) + '\n');
}

// Safely open URL in browser on macOS
function openInBrowser(url) {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    console.log(pc.red('\n  Error: Invalid article URL.'));
    return;
  }
  
  execFile('open', [url], (error) => {
    if (error) {
      console.log(pc.red(`\n  Failed to open URL: ${error.message}`));
    } else {
      console.log(pc.green(`\n  Opened article in browser!`));
    }
  });
}

// Clean and parse article titles
// Google News titles are typically "Headline - Source"
function formatArticleTitle(rawTitle) {
  if (!rawTitle) return { headline: 'No Title', source: 'Unknown' };
  const parts = rawTitle.split(' - ');
  if (parts.length > 1) {
    const source = parts.pop();
    const headline = parts.join(' - ');
    return { headline, source };
  }
  return { headline: rawTitle, source: 'Unknown' };
}

// Helper to format date nicely
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch (e) {
    return dateStr;
  }
}

// Fetch and display articles for a given URL
async function fetchAndBrowseFeed(url, feedTitle) {
  clearScreen();
  printHeader();
  console.log(pc.cyan(`  Loading ${feedTitle}...`));

  try {
    const feed = await parser.parseURL(url);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(pc.yellow('\n  No articles found.'));
      await prompts({
        type: 'text',
        name: 'continue',
        message: 'Press Enter to return to main menu'
      });
      return;
    }

    while (true) {
      clearScreen();
      printHeader();
      console.log(pc.magenta(`  Feed: ${feed.title || feedTitle}`));
      console.log(pc.dim(`  Found ${feed.items.length} articles\n`));

      const choices = feed.items.map((item, index) => {
        const { headline, source } = formatArticleTitle(item.title);
        const timeDiff = item.pubDate ? ` (${new Date(item.pubDate).toLocaleDateString()})` : '';
        return {
          title: `${pc.bold(pc.white(headline))} ${pc.dim(`[${source}]`)}${pc.blue(timeDiff)}`,
          value: index
        };
      });

      choices.push({ title: pc.yellow('<- Go back to main menu'), value: -1 });

      const response = await prompts({
        type: 'select',
        name: 'articleIndex',
        message: 'Select an article to read',
        choices: choices,
        initial: 0
      });

      if (response.articleIndex === undefined || response.articleIndex === -1) {
        break; // Return to main menu
      }

      const article = feed.items[response.articleIndex];
      await browseArticle(article);
    }
  } catch (error) {
    console.log(pc.red(`\n  Error fetching feed: ${error.message}`));
    await prompts({
      type: 'text',
      name: 'continue',
      message: 'Press Enter to return to main menu'
    });
  }
}

// View details of a single article
async function browseArticle(article) {
  const { headline, source } = formatArticleTitle(article.title);

  while (true) {
    clearScreen();
    printHeader();
    console.log(pc.cyan('  ================ Article Details ================'));
    console.log(`  ${pc.bold(pc.white(headline))}`);
    console.log(pc.cyan('  =================================================\n'));
    console.log(`  ${pc.bold('Source:')}    ${pc.green(source)}`);
    console.log(`  ${pc.bold('Published:')} ${formatDate(article.pubDate)}`);
    console.log(`  ${pc.bold('Link:')}      ${pc.blue(article.link)}\n`);
    
    if (article.contentSnippet) {
      console.log(`  ${pc.bold('Snippet:')}\n  ${pc.dim(article.contentSnippet)}\n`);
    }

    const action = await prompts({
      type: 'select',
      name: 'choice',
      message: 'What would you like to do?',
      choices: [
        { title: pc.green('Open in default browser'), value: 'open' },
        { title: pc.yellow('Back to article list'), value: 'list' }
      ]
    });

    if (action.choice === 'open') {
      openInBrowser(article.link);
      // Wait a moment so they can see confirmation
      await new Promise(r => setTimeout(r, 1200));
    } else {
      break; // Back to list
    }
  }
}

// Main CLI loop
async function main() {
  // Handle graceful exits (Ctrl+C)
  process.on('SIGINT', () => {
    clearScreen();
    console.log(pc.yellow('\n  Goodbye!\n'));
    process.exit(0);
  });

  while (true) {
    clearScreen();
    printHeader();
    
    const response = await prompts({
      type: 'select',
      name: 'menuOption',
      message: 'Main Menu',
      choices: [
        { title: 'Top Stories (Global News)', value: 'top' },
        { title: 'Latest News about "Google" (The Company)', value: 'google' },
        { title: 'Search for custom topic', value: 'search' },
        { title: pc.red('Exit'), value: 'exit' }
      ]
    });

    if (response.menuOption === 'exit' || response.menuOption === undefined) {
      clearScreen();
      console.log(pc.yellow('\n  Goodbye!\n'));
      break;
    }

    if (response.menuOption === 'top') {
      const url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
      await fetchAndBrowseFeed(url, 'Top Stories');
    } else if (response.menuOption === 'google') {
      const url = 'https://news.google.com/rss/search?q=Google&hl=en-US&gl=US&ceid=US:en';
      await fetchAndBrowseFeed(url, 'Google News');
    } else if (response.menuOption === 'search') {
      const searchRes = await prompts({
        type: 'text',
        name: 'query',
        message: 'Enter search term:',
        validate: input => input.trim().length > 0 ? true : 'Search term cannot be empty'
      });

      if (searchRes.query) {
        const query = searchRes.query.trim();
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        await fetchAndBrowseFeed(url, `Search: "${query}"`);
      }
    }
  }
}

main();
