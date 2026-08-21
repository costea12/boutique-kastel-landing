// Header search dropdown - shared across every page.
// Toggles the search bar under the header, and on submit either reuses the
// in-page catalog search (parfumuri/parfumuri-niche/bauturi/dulciuri) or
// redirects to the perfume catalog with the query pre-filled.
(function () {
  const toggleBtn = document.getElementById('searchToggle');
  const panel = document.getElementById('headerSearch');
  const form = document.getElementById('headerSearchForm');
  const input = document.getElementById('headerSearchInput');
  const closeBtn = document.getElementById('headerSearchClose');
  if (!toggleBtn || !panel || !form || !input) return;

  function openSearch() {
    panel.hidden = false;
    toggleBtn.classList.add('open');
    input.focus();
  }
  function closeSearch() {
    panel.hidden = true;
    toggleBtn.classList.remove('open');
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
