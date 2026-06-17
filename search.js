/* ── search.js ── SearchOye search logic ── */

const WORKER_URL = 'https://muddy-lake-6bdc.muneebmazhar669.workers.dev';

// ── DOM REFS ──
const input      = document.getElementById('search-input');
const searchBtn  = document.getElementById('search-btn');
const container  = document.getElementById('results-container');
const metaLine   = document.getElementById('results-meta');
const tabBtns    = document.querySelectorAll('.tab-btn');
const suggestBox = document.getElementById('suggestions-box');

// ── STATE ──
const params   = new URLSearchParams(window.location.search);
const query    = params.get('q') || '';
let activeTab  = 'all';
let suggestTimer = null;

// ── INIT ──
if (input && query) input.value = decodeURIComponent(query);
document.title = query ? `${query} — SearchOye` : 'SearchOye — Results';

// ── SEARCH REDIRECT ──
function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    window.location.href = `results.html?q=${encodeURIComponent(q)}`;
}

searchBtn.addEventListener('click', doSearch);
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { hideSuggestions(); doSearch(); }
    if (e.key === 'Escape') hideSuggestions();
});

// ── TABS ──
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        loadTab(activeTab);
    });
});

// ── SUGGESTIONS ──
input.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    const q = input.value.trim();
    if (!q) { hideSuggestions(); return; }
    suggestTimer = setTimeout(() => fetchSuggestions(q), 200);
});

input.addEventListener('blur', () => {
    setTimeout(hideSuggestions, 150);
});

async function fetchSuggestions(q) {
    try {
        const res  = await fetch(`${WORKER_URL}?suggest=${encodeURIComponent(q)}`);
        const suggestions = await res.json();
        renderSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch { hideSuggestions(); }
}

function renderSuggestions(items) {
    if (!items.length) { hideSuggestions(); return; }
    suggestBox.innerHTML = items.map(s => `
        <div class="suggestion-item" data-q="${escapeHtml(s)}">
            <i class="icon-search"></i>
            ${escapeHtml(s)}
        </div>
    `).join('');
    suggestBox.classList.add('visible');

    suggestBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('mousedown', () => {
            input.value = item.dataset.q;
            hideSuggestions();
            doSearch();
        });
    });
}

function hideSuggestions() {
    suggestBox.classList.remove('visible');
    suggestBox.innerHTML = '';
}

// ── HELPERS ──
function getDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showError(msg) {
    container.innerHTML = `<p class="state-message">${msg}</p>`;
    metaLine.textContent = '';
}

// ── SKELETONS ──
function showSkeletons(type = 'all', count = 6) {
    if (type === 'all') {
        container.innerHTML = Array.from({ length: count }, () => `
            <div class="skeleton-card">
                <div class="skeleton-line url"></div>
                <div class="skeleton-line title"></div>
                <div class="skeleton-line snip1"></div>
                <div class="skeleton-line snip2"></div>
            </div>`).join('');
    } else if (type === 'images') {
        container.innerHTML = `<div class="images-grid">
            ${Array.from({ length: 8 }, () => `<div class="skeleton-image"></div>`).join('')}
        </div>`;
    } else if (type === 'videos') {
        container.innerHTML = `<div class="videos-grid">
            ${Array.from({ length: 6 }, () => `<div class="skeleton-video"></div>`).join('')}
        </div>`;
    }
}

// ── FETCH ──
async function fetchResults(q, type = 'search') {
    const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, type }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Worker error: ${res.status}`);
    }
    return res.json();
}

// ── RENDER ALL ──
function renderAll(data) {
    const organic = data.organic || [];
    if (!organic.length) {
        showError(`No results found for <span>"${escapeHtml(query)}"</span>.<br>Try different keywords.`);
        return;
    }
    const total = data.searchInformation?.totalResults
        ? Number(data.searchInformation.totalResults).toLocaleString() : organic.length;
    const time = data.searchInformation?.timeTaken
        ? ` (${data.searchInformation.timeTaken} seconds)` : '';
    metaLine.textContent = `About ${total} results${time}`;

    container.innerHTML = organic.map(r => {
        const domain  = getDomain(r.link);
        const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domain)}`;
        return `
            <article class="result-card">
                <div class="result-url">
                    <img class="result-favicon" src="${favicon}" alt="" loading="lazy" onerror="this.style.display='none'">
                    <span class="result-domain">${escapeHtml(domain)} › ${escapeHtml(r.link)}</span>
                </div>
                <a class="result-title" href="${escapeHtml(r.link)}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(r.title || r.link)}
                </a>
                <p class="result-snippet">${escapeHtml(r.snippet || 'No description available.')}</p>
            </article>`;
    }).join('');
}

// ── RENDER IMAGES ──
function renderImages(data) {
    const images = data.images || [];
    if (!images.length) {
        showError(`No images found for <span>"${escapeHtml(query)}"</span>.`);
        return;
    }
    metaLine.textContent = `${images.length} images`;
    container.innerHTML = `<div class="images-grid">
        ${images.map(img => `
            <a class="image-card" href="${escapeHtml(img.link || img.imageUrl || '#')}" target="_blank" rel="noopener noreferrer">
                <img src="${escapeHtml(img.imageUrl || img.thumbnailUrl || '')}"
                     alt="${escapeHtml(img.title || '')}"
                     loading="lazy"
                     onerror="this.closest('.image-card').style.display='none'">
                <div class="image-card-info">
                    <div class="image-card-title">${escapeHtml(img.title || 'Image')}</div>
                    <div class="image-card-domain">${escapeHtml(getDomain(img.link || img.source || ''))}</div>
                </div>
            </a>`).join('')}
    </div>`;
}

// ── RENDER VIDEOS ──
function renderVideos(data) {
    const videos = data.videos || [];
    if (!videos.length) {
        showError(`No videos found for <span>"${escapeHtml(query)}"</span>.`);
        return;
    }
    metaLine.textContent = `${videos.length} videos`;
    container.innerHTML = `<div class="videos-grid">
        ${videos.map(v => {
            const thumb = v.imageUrl || v.thumbnailUrl || '';
            const channel = v.channel || v.source || 'Unknown';
            const duration = v.duration ? `<span style="margin-left:auto;color:#6e7681">${escapeHtml(v.duration)}</span>` : '';
            return `
            <a class="video-card" href="${escapeHtml(v.link || '#')}" target="_blank" rel="noopener noreferrer">
                <div class="video-thumbnail-wrap">
                    ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(v.title || '')}" loading="lazy" onerror="this.style.display='none'">` : ''}
                    <div class="video-play-icon"><i class="icon-play"></i></div>
                </div>
                <div class="video-card-info">
                    <div class="video-card-title">${escapeHtml(v.title || 'Video')}</div>
                    <div class="video-card-channel" style="display:flex;align-items:center;gap:4px">
                        <span>${escapeHtml(channel)}</span>${duration}
                    </div>
                </div>
            </a>`;
        }).join('')}
    </div>`;
}

// ── LOAD TAB ──
async function loadTab(tab) {
    if (!query) { showError('Enter a search query to get started.'); return; }
    metaLine.textContent = '';

    const typeMap = { all: 'search', images: 'images', videos: 'videos' };
    const type = typeMap[tab];

    showSkeletons(tab);

    try {
        const data = await fetchResults(query, type);
        if (tab === 'all')    renderAll(data);
        if (tab === 'images') renderImages(data);
        if (tab === 'videos') renderVideos(data);
    } catch (err) {
        console.error(err);
        showError(`Something went wrong.<br><span style="font-size:13px;color:#6e7681">${escapeHtml(err.message)}</span>`);
    }
}

// ── BOOT ──
loadTab('all');
