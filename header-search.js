// Header search dropdown - shared across every page.
// Toggles the search bar under the header, shows live product suggestions
// while typing (fetching catalog.json itself so it works even on pages with
// no catalog.js), and on submit either reuses the in-page catalog search
// (parfumuri/parfumuri-niche/bauturi/dulciuri) or redirects to the perfume
// catalog with the query pre-filled.
(function () {
  const toggleBtn = document.getElementById('searchToggle');
  const panel = document.getElementById('headerSearch');
  const form = document.getElementById('headerSearchForm');
  const input = document.getElementById('headerSearchInput');
  const closeBtn = document.getElementById('headerSearchClose');
  const results = document.getElementById('headerSearchResults');
  if (!toggleBtn || !panel || !form || !input) return;

  const MAX_SUGGESTIONS = 6;

  let catalogPromise = null;
  let activeIndex = -1; // -1 = nothing highlighted, Enter falls through to normal submit

  function ensureCatalogLoaded() {
    if (!catalogPromise) {
      catalogPromise = fetch('catalog.json').then((r) => r.json()).catch(() => []);
      catalogPromise.then(() => {
        if (input.value.trim()) renderSuggestions();
      });
    }
    return catalogPromise;
  }

  function openSearch() {
    panel.hidden = false;
    toggleBtn.classList.add('open');
    input.focus();
    ensureCatalogLoaded();
    if (input.value.trim()) renderSuggestions();
  }
  function closeSearch() {
    panel.hidden = true;
    toggleBtn.classList.remove('open');
    activeIndex = -1;
    if (results) results.hidden = true;
  }

  function rowEls() {
    if (!results) return [];
    return Array.from(results.querySelectorAll('.header-search-link, .header-search-seeall-btn'));
  }

  function setActive(index) {
    const rows = rowEls();
    rows.forEach((el, i) => el.classList.toggle('is-active', i === index));
    activeIndex = index;
    if (index >= 0 && rows[index]) rows[index].scrollIntoView({ block: 'nearest' });
  }

  function renderSuggestions() {
    if (!results) return;
    const q = input.value.trim();
    activeIndex = -1;

    if (!q) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }

    if (!catalogPromise) {
      ensureCatalogLoaded();
    }

    // Show a lightweight loading state until the (memoized) fetch resolves.
    results.hidden = false;
    results.innerHTML = '<p class="header-search-loading">Se caută...</p>';

    catalogPromise.then((products) => {
      // The input may have changed (or been cleared) while the fetch was in flight -
      // always react to what's in the box right now, not what it was when we started.
      const currentQ = input.value.trim();
      if (currentQ !== q) return; // a newer render is already in flight/rendered
      if (!currentQ) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }

      const matches = products
        .filter((p) => fuzzyMatch(currentQ, p.name) || fuzzyMatch(currentQ, p.brand))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (matches.length === 0) {
        results.innerHTML = '<p class="header-search-empty">Niciun produs găsit pentru această căutare.</p>';
        return;
      }

      const top = matches.slice(0, MAX_SUGGESTIONS);
      const rowsHtml = top.map((p) => `
        <li class="header-search-item">
          <a href="produs.html?cod=${encodeURIComponent(p.cod)}" class="header-search-link">
            <span class="header-search-text">
              <span class="header-search-name">${p.name}</span>
              <span class="header-search-brand">${p.brand}${p.stock <= 0 ? ' · Stoc epuizat' : ''}</span>
            </span>
            <img class="header-search-thumb" src="${p.bottle_image}" alt="" loading="lazy">
          </a>
        </li>
      `).join('');

      const seeAllHtml = matches.length > MAX_SUGGESTIONS
        ? `<li class="header-search-item header-search-seeall">
             <button type="button" class="header-search-seeall-btn" id="headerSearchSeeAll">Vezi toate cele ${matches.length} rezultate</button>
           </li>`
        : '';

      results.innerHTML = rowsHtml + seeAllHtml;
      results.querySelector('#headerSearchSeeAll')?.addEventListener('click', () => form.requestSubmit());
    });
  }

  toggleBtn.addEventListener('click', () => {
    if (panel.hidden) openSearch(); else closeSearch();
  });
  closeBtn?.addEventListener('click', closeSearch);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closeSearch();
  });
  document.addEventListener('click', (e) => {
    if (panel.hidden || panel.contains(e.target) || toggleBtn.contains(e.target)) return;
    closeSearch();
  });

  input.addEventListener('input', renderSuggestions);

  input.addEventListener('keydown', (e) => {
    const rows = rowEls();
    if (!rows.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      rows[activeIndex].click();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    const localSearchBox = document.getElementById('searchBox');
    if (localSearchBox) {
      // Already on a catalog page - reuse its existing live-filter search box.
      localSearchBox.value = q;
      localSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
      closeSearch();
      document.getElementById('productGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = `parfumuri.html?q=${encodeURIComponent(q)}`;
    }
  });

  // Prefill the dropdown too if we arrived here via a redirected search.
  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) input.value = initialQuery;
})();
