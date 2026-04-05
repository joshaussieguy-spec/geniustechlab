#!/usr/bin/env node
/**
 * Static site generator for Genius Tech Lab
 * Converts Markdown posts to HTML, builds index, optimizes for SEO
 * Enhanced with reading time, tags, search index, and TOC
 */

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://geniustechlab.com';
const POSTS_DIR = './posts';
const OUTPUT_DIR = './public';
const AMAZON_ID = 'geniustechlab-22';

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Strip HTML tags
function stripHTML(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Parse frontmatter
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    meta[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  });

  // Parse tags if they exist as JSON array or comma-separated string
  if (meta.tags) {
    try {
      meta.tags = typeof meta.tags === 'string' ? JSON.parse(meta.tags) : meta.tags;
    } catch (e) {
      meta.tags = meta.tags.split(',').map(t => t.trim());
    }
  }

  return { meta, body: match[2] };
}

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  // Strip markdown formatting and count words
  const plainText = text
    .replace(/#+\s/g, '') // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/`(.*?)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
    .replace(/>\s*/g, '') // blockquotes
    .replace(/(#{1,6})\s/g, '') // heading markers
    .replace(/[-*+]\s/g, '') // list markers
    .replace(/\d+\.\s/g, '') // numbered list
    .replace(/(~~~|```)[\s\S]*?(~~~|```)/g, '') // code blocks
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
  const words = plainText.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes >= 1 ? `${minutes} min read` : '< 1 min read';
}

// Generate Table of Contents from headings
function generateTOC(html) {
  const headings = html.match(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/g) || [];
  const tocItems = [];

  headings.forEach((heading, index) => {
    const match = heading.match(/<h([2-3])[^>]*>(.*?)<\/h[2-3]>/);
    if (match) {
      const level = parseInt(match[1]);
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      const id = `heading-${index}`;
      tocItems.push({ level, text, id });
    }
  });

  return tocItems;
}

// Generate Amazon affiliate link
function amazonLink(productName) {
  return `https://amazon.com/s?k=${encodeURIComponent(productName)}&tag=${AMAZON_ID}`;
}

// HTML template
function postTemplate(title, date, content, category, tags, amazonProduct, slug, readingTime, tocItems) {
  const affiliateLink = amazonProduct ? amazonLink(amazonProduct) : null;

  // Generate TOC HTML if there are headings
  const tocHtml = tocItems && tocItems.length > 0 ? `
    <nav class="toc">
      <h3>Table of Contents</h3>
      <ul>
        ${tocItems.map(item => `
          <li class="toc-level-${item.level}">
            <a href="#${item.id}">${item.text}</a>
          </li>
        `).join('')}
      </ul>
    </nav>
  ` : '';

  // Generate tags HTML
  const tagsHtml = tags && tags.length > 0 ? `
    <div class="tags">
      ${tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
    </div>
  ` : '';

  // Add IDs to headings for TOC navigation
  let contentWithIds = content;
  if (tocItems && tocItems.length > 0) {
    const turndownService = new TurndownService();
    tocItems.forEach((item, index) => {
      const id = `heading-${index}`;
      const headingRegex = new RegExp(`<h[${item.level}][^>]*>${item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h[${item.level}]>`);
      contentWithIds = contentWithIds.replace(headingRegex, `<h${item.level} id="${id}">${item.text}</h${item.level}>`);
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | Genius Tech Lab</title>
  <meta name="description" content="${readingTime} • ${category} • ${title}">
  <meta property="og:title" content="${title}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${SITE_URL}/${slug}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/styles/main.css">

  <style>
    body {
      background: #0a0a0a;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    
    header nav {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 1rem 2rem;
      border-bottom: 1px solid #333;
    }
    
    header nav h1 a {
      color: #4ca0ff;
      text-decoration: none;
      font-size: 1.5rem;
    }
    
    header nav ul {
      list-style: none;
      display: inline-flex;
      gap: 2rem;
      margin-left: 2rem;
    }
    
    header nav ul a {
      color: #b0b0b0;
      text-decoration: none;
      transition: color 0.3s;
    }
    
    header nav ul a:hover {
      color: #4ca0ff;
    }
    
    main {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 2rem;
    }
    
    article h1 {
      color: #4ca0ff;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    
    .meta {
      color: #888;
      margin-bottom: 1rem;
    }
    
    .meta span {
      margin-right: 1rem;
    }
    
    .content {
      line-height: 1.8;
      font-size: 1.1rem;
    }
    
    .content h2, .content h3 {
      color: #4ca0ff;
      margin-top: 2rem;
    }
    
    .content a {
      color: #4ca0ff;
      text-decoration: none;
      border-bottom: 1px solid #4ca0ff;
    }
    
    .content a:hover {
      background: rgba(76, 160, 255, 0.1);
    }
    
    .content code {
      background: #1a1a2e;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    
    .content pre {
      background: #1a1a2e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
    }
    
    .affiliate {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 2rem;
      margin: 2rem 0;
      color: white;
    }
    
    .affiliate h3 {
      color: white;
      margin-top: 0;
    }
    
    .affiliate .btn {
      display: inline-block;
      background: white;
      color: #667eea;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 1rem;
    }
    
    .affiliate .disclaimer {
      font-size: 0.9rem;
      margin-top: 1rem;
      opacity: 0.9;
    }
    
    .toc {
      background: #1a1a2e;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .toc h3 {
      color: #4ca0ff;
      margin-top: 0;
    }
    
    .toc ul {
      list-style: none;
      padding-left: 0;
    }
    
    .toc li {
      margin: 0.5rem 0;
    }
    
    .toc a {
      color: #b0b0b0;
      text-decoration: none;
    }
    
    .toc a:hover {
      color: #4ca0ff;
    }
    
    .tags {
      margin: 1rem 0;
    }
    
    .tag {
      background: #1a1a2e;
      color: #4ca0ff;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      margin-right: 0.5rem;
      display: inline-block;
      font-size: 0.9rem;
    }
    
    footer {
      background: #1a1a2e;
      color: #888;
      padding: 3rem 2rem 2rem;
      margin-top: 4rem;
      border-top: 1px solid #333;
    }
    
    .newsletter {
      margin-top: 2rem;
    }
    
    .newsletter h4 {
      color: #4ca0ff;
    }
    
    .newsletter-form {
      display: flex;
      gap: 1rem;
      max-width: 400px;
      margin-top: 1rem;
    }
    
    .newsletter-form input {
      flex: 1;
      padding: 0.75rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 8px;
      color: white;
    }
    
    .newsletter-form button {
      padding: 0.75rem 1.5rem;
      background: #4ca0ff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }
    
    /* Email subscription form */
    .email-subscription {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 2rem;
      margin: 3rem 0;
      text-align: center;
    }
    
    .email-subscription h3 {
      color: white;
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    
    .email-subscription p {
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 1.5rem;
    }
    
    .email-form {
      display: flex;
      gap: 1rem;
      max-width: 500px;
      margin: 0 auto;
    }
    
    .email-form input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
    }
    
    .email-form button {
      padding: 0.75rem 2rem;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <nav>
      <h1><a href="/">⚡ Genius Tech Lab</a></h1>
      <ul>
        <li><a href="/" data-category="all">All</a></li>
        <li><a href="/?filter=homelab" data-category="homelab">Homelab</a></li>
        <li><a href="/?filter=networking" data-category="networking">Networking</a></li>
        <li><a href="/?filter=crypto" data-category="crypto">Crypto</a></li>
        <li><a href="/?filter=ai" data-category="ai">AI</a></li>
      </ul>
      <button id="theme-toggle" aria-label="Toggle dark/light mode">🌓</button>
    </nav>
  </header>

  <main>
    <article>
      <header class="article-header">
        <h1>${title}</h1>
        <div class="meta">
          <time>${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <span class="category">${category}</span>
          <span class="reading-time">${readingTime}</span>
        </div>
        ${tagsHtml}
      </header>

      <div class="article-layout">
        ${tocHtml ? `<aside class="toc-sidebar">${tocHtml}</aside>` : ''}
        <div class="content-wrapper">
          <div class="content">
            ${contentWithIds}
          </div>

          ${affiliateLink ? `
          <aside class="affiliate">
            <h3>📦 Recommended Product</h3>
            <p><strong>${amazonProduct}</strong></p>
            <a href="${affiliateLink}" class="btn" target="_blank" rel="noopener">View on Amazon</a>
            <p class="disclaimer">As an Amazon Associate, I earn from qualifying purchases.</p>
          </aside>
          ` : ''}

          
          <!-- Email Subscription -->
          <div class="email-subscription">
            <h3>🚀 Get Expert Tech Guides Weekly</h3>
            <p>Join 50K+ readers getting the best homelab, networking, and hardware recommendations</p>
            <form class="email-form" id="subscribe-form">
              <input type="email" placeholder="Your best email" required id="email-input">
              <button type="submit">Subscribe Free</button>
            </form>
            <div class="email-message" id="subscribe-message" style="color: white; margin-top: 1rem; display: none;"></div>
          </div>
          
          <script>
          document.getElementById('subscribe-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const messageDiv = document.getElementById('subscribe-message');
            
            try {
              const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              
              const data = await response.json();
              messageDiv.textContent = data.message || 'Successfully subscribed!';
              messageDiv.style.display = 'block';
              
              if (response.ok) {
                document.getElementById('email-input').value = '';
              }
            } catch (error) {
              messageDiv.textContent = 'Error subscribing. Please try again.';
              messageDiv.style.display = 'block';
            }
          });
          </script>
<footer class="article-footer">
            <div class="share">
              <span>Share this article:</span>
              <div class="share-buttons">
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(SITE_URL + '/' + slug)}" target="_blank" rel="noopener" class="share-btn twitter">Twitter</a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL + '/' + slug)}" target="_blank" rel="noopener" class="share-btn linkedin">LinkedIn</a>
                <button class="share-btn copy" data-url="${SITE_URL}/${slug}">Copy Link</button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </article>
  </main>

  <footer>
    <div class="footer-content">
      <p>&copy; 2026 Genius Tech Lab. All rights reserved.</p>
      <p class="footer-links">
        <a href="/privacy">Privacy</a> |
        <a href="/about">About</a> |
        <a href="/rss">RSS</a>
      </p>
      <div class="newsletter">
        <h4>Stay in the loop</h4>
        <p>Get weekly posts on homelab, networking, crypto, and AI.</p>
        <form class="newsletter-form" action="#" method="POST">
          <input type="email" placeholder="your@email.com" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </div>
  </footer>

  <div class="progress-container">
    <div class="progress-bar" id="reading-progress"></div>
  </div>

  <script src="/js/app.js"></script>
  <script>
    window.postData = {
      slug: '${slug}',
      title: '${title}',
      category: '${category}',
      tags: ${JSON.stringify(tags || [])}
    };
  </script>
</body>
</html>`;
}

// Index template
function indexTemplate(posts, allTags) {
  const postsList = posts.map(p => `
    <article class="post-preview" data-category="${p.category}" data-tags="${(p.tags || []).join(' ')}">
      <h2><a href="/${p.slug}">${p.title}</a></h2>
      <div class="meta">
        <time>${new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
        <span class="category">${p.category}</span>
        <span class="reading-time">${p.readingTime}</span>
      </div>
      ${p.tags && p.tags.length > 0 ? `
      <div class="tags">
        ${p.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
      </div>
      ` : ''}
      <p>${p.excerpt}</p>
      <a href="/${p.slug}" class="read-more">Read more →</a>
    </article>
  `).join('');

  // Generate tag cloud
  const tagCloudHtml = allTags.length > 0 ? `
    <div class="tag-cloud">
      <h3>Popular Tags</h3>
      <div class="tags">
        ${allTags.sort((a, b) => b.count - a.count).slice(0, 20).map(t => `
          <a href="/?tag=${t.name}" class="tag-cloud-item" data-tag="${t.name}">
            #${t.name} <span class="tag-count">${t.count}</span>
          </a>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Genius Tech Lab | Homelab, Networking, Crypto, AI</title>
  <meta name="description" content="Premium tech tutorials on homelab, networking, crypto hardware, and AI infrastructure">
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <header>
    <nav>
      <h1><a href="/">⚡ Genius Tech Lab</a></h1>
      <div class="nav-search">
        <input type="search" id="search-input" placeholder="Search posts..." aria-label="Search posts">
        <div id="search-results" class="search-results"></div>
      </div>
      <ul>
        <li><a href="/" class="filter-btn active" data-category="all">All</a></li>
        <li><a href="/?filter=homelab" class="filter-btn" data-category="homelab">Homelab</a></li>
        <li><a href="/?filter=networking" class="filter-btn" data-category="networking">Networking</a></li>
        <li><a href="/?filter=crypto" class="filter-btn" data-category="crypto">Crypto</a></li>
        <li><a href="/?filter=ai" class="filter-btn" data-category="ai">AI</a></li>
      </ul>
      <button id="theme-toggle" aria-label="Toggle dark/light mode">🌓</button>
    </nav>

    <hero>
      <h1>Genius Tech Lab</h1>
      <p class="tagline">Premium tutorials on building your own infrastructure</p>
      <p class="subtitle">Homelab • Networking • Crypto Hardware • Self-Hosted AI</p>
    </hero>
  </header>

  <main>
    ${posts.length === 0 ? `
      <div class="no-posts">
        <p>No posts found matching your filters.</p>
        <a href="/" class="btn-primary">View all posts</a>
      </div>
    ` : `
    <section class="posts">
      ${postsList}
    </section>
    `}

    ${tagCloudHtml}
  </main>

  <footer>
    <div class="footer-content">
      <p>&copy; 2026 Genius Tech Lab. All rights reserved.</p>
      <p class="footer-links">
        <a href="/privacy">Privacy</a> |
        <a href="/about">About</a> |
        <a href="/rss">RSS</a>
      </p>
      <div class="newsletter">
        <h4>Stay in the loop</h4>
        <p>Get weekly posts on homelab, networking, crypto, and AI.</p>
        <form class="newsletter-form" action="#" method="POST">
          <input type="email" placeholder="your@email.com" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </div>
  </footer>

  <div class="progress-container">
    <div class="progress-bar" id="reading-progress"></div>
  </div>

  <script src="/js/app.js"></script>
  <script>
    // Pass posts data for search functionality
    window.postsData = ${JSON.stringify(posts.map(p => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      category: p.category,
      tags: p.tags || [],
      content: p.content // Plain text for search
    })))};

    // Parse URL parameters for filtering
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || (urlParams.get('tag') ? 'tag:' + urlParams.get('tag') : 'all');
    
    document.addEventListener('DOMContentLoaded', () => {
      if (initialFilter !== 'all') {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.value = initialFilter.startsWith('tag:') ? '' : initialFilter;
          if (initialFilter.startsWith('tag:')) {
            // Tag filter will be handled by app.js
          } else {
            // Trigger category filter
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
              if (btn.dataset.category === initialFilter) {
                btn.click();
              }
            });
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

// Build site
function build() {
  const posts = [];
  const allTags = new Map();

  // Find all .md files
  const walkDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { meta, body } = parseFrontmatter(content);

        // Convert markdown to HTML
        const html = marked(body);

        // Calculate reading time from markdown (strips formatting internally)
        const readingTime = calculateReadingTime(body);

        // Generate TOC from HTML headings
        const tocItems = generateTOC(html);

        // Plain text for search and excerpt fallback
        const plainText = stripHTML(html);

        const slug = file.replace('.md', '').toLowerCase();
        const category = meta.category || dir.split(path.sep).pop();

        // Collect tags for tag cloud
        if (meta.tags && Array.isArray(meta.tags)) {
          meta.tags.forEach(tag => {
            const tagKey = tag.toLowerCase();
            allTags.set(tagKey, (allTags.get(tagKey) || 0) + 1);
          });
        }

        posts.push({
          title: meta.title || 'Untitled',
          date: meta.date || new Date().toISOString(),
          category: category,
          excerpt: meta.excerpt || plainText.substring(0, 150).replace(/\s+/g, ' ') + '...',
          slug: slug,
          tags: meta.tags || [],
          amazonProduct: meta.amazon_product,
          html: html,
          readingTime: readingTime,
          tocItems: tocItems,
          content: plainText // Plain text for search indexing
        });

        // Write individual post
        const postHtml = postTemplate(
          meta.title,
          meta.date,
          html,
          category,
          meta.tags,
          meta.amazon_product,
          slug,
          readingTime,
          tocItems
        );

        const postPath = path.join(OUTPUT_DIR, `${slug}.html`);
        fs.writeFileSync(postPath, postHtml);
        console.log(`✅ Built: ${slug}.html`);
      }
    });
  };

  walkDir(POSTS_DIR);

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Convert tag map to array for tag cloud
  const tagCloud = Array.from(allTags.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Copy the new index.html template (new dark design) instead of generating it
  // The new template is static and located in the root directory
  const newIndexPath = path.join(__dirname, 'index.html');
  const newIndexContent = fs.readFileSync(newIndexPath, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), newIndexContent);
  console.log(`✅ Built: index.html (new dark design with ${posts.length} posts)`);

  // Copy CSS and other static assets to public/
  const cssSourceDir = path.join(__dirname, 'css');
  const cssDestDir = path.join(OUTPUT_DIR, 'css');
  if (fs.existsSync(cssSourceDir)) {
    if (!fs.existsSync(cssDestDir)) fs.mkdirSync(cssDestDir, { recursive: true });
    const cssFiles = fs.readdirSync(cssSourceDir);
    cssFiles.forEach(file => {
      fs.copyFileSync(path.join(cssSourceDir, file), path.join(cssDestDir, file));
    });
    console.log(`✅ Copied: ${cssFiles.length} CSS files`);
  }

  // Write search index JSON
  const searchIndex = posts.map(p => ({
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    category: p.category,
    tags: p.tags,
    content: p.content
  }));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
  console.log(`✅ Built: search-index.json`);

  // Write sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <priority>1.0</priority>
  </url>
  ${posts.map(p => `
  <url>
    <loc>${SITE_URL}/${p.slug}</loc>
    <lastmod>${p.date}</lastmod>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapXml);
  console.log('✅ Built: sitemap.xml');

  console.log(`\n🎉 Site built! ${posts.length} posts ready.`);
  console.log(`📊 Tags: ${tagCloud.length} unique tags`);
}

build();
