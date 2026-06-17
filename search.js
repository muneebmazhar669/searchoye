/* ── search.js ── SearchOye search logic ── */

// ─────────────────────────────────────────────
// CONFIG — point this to YOUR Cloudflare Worker
// No API key here. Ever.
// ─────────────────────────────────────────────
const WORKER_URL = 'https://muddy-lake-6bdc.muneebmazhar669.workers.dev/';
// Example: 'https://searchoye.your-subdomain.workers.dev'

// ─────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────
const input     = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const container = document.getElementById('results-container');
const metaLine  = document.getElementById('results-meta');

// ─────────────────────────────────────────────
// READ QUERY FROM URL
// ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const query  = params.get('q') || '';

if (input && query) input.value = decodeURIComponent(query);
document.title = query ? `${query} — SearchOye` : 'SearchOye — Results';

// ─────────────────────────────────────────────
// SEARCH BAR — new search from results page
// ─────────────────────────────────────────────
function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    window.location.href = `results.html?q=${encodeURIComponent(q)}`;
}

searchBtn.addEventListener('click', doSearch);
input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// ─────────────────────────────────────────────
// LOADING SKELETONS
// ─────────────────────────────────────────────
function showSkeletons(count = 6) {
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton-line url"></div>
            <div class="skeleton-line title"></div>
            <div class="skeleton-line snip1"></div>
            <div class="skeleton-line snip2"></div>
        </div>
    `).join('');
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showError(msg) {
    container.innerHTML = `<p class="state-message">${msg}</p>`;
    metaLine.textContent = '';
}

// ─────────────────────────────────────────────
// RENDER RESULTS
// ─────────────────────────────────────────────
function renderResults(data) {
    const organic = data.organic || [];

    if (!organic.length) {
        container.innerHTML = `
            <p class="state-message">
                No results found for <span>"${escapeHtml(query)}"</span>.<br>
                Try different keywords.
            </p>`;
        metaLine.textContent = '';
        return;
    }

    const total = data.searchInformation?.totalResults
        ? Number(data.searchInformation.totalResults).toLocaleString()
        : organic.length;
    const time = data.searchInformation?.timeTaken
        ? ` (${data.searchInformation.timeTaken} seconds)`
        : '';
    metaLine.textContent = `About ${total} results${time}`;

    container.innerHTML = organic.map(result => {
        const domain  = getDomain(result.link);
        const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domain)}`;
        const snippet = result.snippet || 'No description available.';
        const title   = result.title   || result.link;

        return `
            <article class="result-card">
                <div class="result-url">
                    <img class="result-favicon" src="${favicon}" alt="" loading="lazy"
                         onerror="this.style.display='none'">
                    <span class="result-domain">${escapeHtml(domain)} › ${escapeHtml(result.link)}</span>
                </div>
                <a class="result-title" href="${escapeHtml(result.link)}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(title)}
                </a>
                <p class="result-snippet">${escapeHtml(snippet)}</p>
            </article>
        `;
    }).join('');
}

// ─────────────────────────────────────────────
// FETCH — calls your Worker, not Serper directly
// ─────────────────────────────────────────────
async function fetchResults(q) {
    const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Worker error: ${response.status}`);
    }

    return response.json();
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
    if (!query) {
        showError('Enter a search query to get started.');
        return;
    }

    if (WORKER_URL === 'YOUR_CLOUDFLARE_WORKER_URL_HERE') {
        showError(
            '⚠ Worker URL not set.<br>' +
            'Open <code>search.js</code> and replace <code>YOUR_CLOUDFLARE_WORKER_URL_HERE</code> ' +
            'with your deployed Worker URL.'
        );
        return;
    }

    showSkeletons();

    try {
        const data = await fetchResults(query);
        renderResults(data);
    } catch (err) {
        console.error(err);
        showError(
            `Something went wrong.<br>
             <span style="font-size:13px;color:#6e7681">${escapeHtml(err.message)}</span>`
        );
    }
}

main();
