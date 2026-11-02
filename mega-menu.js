// Desktop header mega menu: click (not hover) a top-nav category to reveal
// a dropdown of real subcategories/brands, each linking straight into the
// category page pre-filtered (?tip=slug handled in catalog.js, ?brand=Name
// preselects the brand checkbox). Built from this single table instead of
// duplicating markup in all 14 pages that share the header.
(function () {
  const nav = document.querySelector('nav.main-nav');
  if (!nav) return;

  const MEGA_MENU_DATA = {
    'parfumuri.html': {
      heading: 'Branduri populare',
      links: [
        { label: 'Paco Rabanne', href: 'parfumuri.html?brand=Paco%20Rabanne' },
        { label: 'Rituals', href: 'parfumuri.html?brand=Rituals' },
        { label: 'Jean Paul Gaultier', href: 'parfumuri.html?brand=Jean%20Paul%20Gaultier' },
        { label: 'Versace', href: 'parfumuri.html?brand=Versace' },
        { label: 'Hugo Boss', href: 'parfumuri.html?brand=Hugo%20Boss' },
        { label: 'Carolina Herrera', href: 'parfumuri.html?brand=Carolina%20Herrera' },
        { label: 'Calvin Klein', href: 'parfumuri.html?brand=Calvin%20Klein' },
        { label: 'Chanel', href: 'parfumuri.html?brand=Chanel' },
      ],
      allLabel: 'Toate parfumurile',
      image: 'assets/products/6294015164176-bottle.jpg',
      imageLabel: 'Noua colecție de parfumuri',
    },
    'parfumuri-niche.html': {
      heading: 'Branduri niche',
      links: [
        { label: 'Mancera', href: 'parfumuri-niche.html?brand=Mancera' },
        { label: 'Xerjoff', href: 'parfumuri-niche.html?brand=Xerjoff' },
        { label: 'Montale', href: 'parfumuri-niche.html?brand=Montale' },
        { label: 'Gisada', href: 'parfumuri-niche.html?brand=Gisada' },
        { label: 'Tiziana Terenzi', href: 'parfumuri-niche.html?brand=Tiziana%20Terenzi' },
        { label: 'Amouage', href: 'parfumuri-niche.html?brand=Amouage' },
      ],
      allLabel: 'Toate parfumurile niche',
      image: 'assets/products/701666410195-bottle.jpg',
      imageLabel: 'Esențe rare, de colecție',
    },
    'ingrijire-corporala.html': {
      heading: 'Tip produs',
      links: [
        { label: 'Gel de duș', href: 'ingrijire-corporala.html?tip=gel-dus' },
        { label: 'Cremă de corp', href: 'ingrijire-corporala.html?tip=crema-corp' },
        { label: 'Deodorant', href: 'ingrijire-corporala.html?tip=deo' },
        { label: 'Ulei de corp', href: 'ingrijire-corporala.html?tip=ulei-corp' },
      ],
      allLabel: 'Toate produsele de îngrijire',
      image: 'assets/products/3616302023707-bottle.jpg',
      imageLabel: 'Ritualuri de îngrijire',
    },
    'bauturi.html': {
      heading: 'Tip băutură',
      links: [
        { label: 'Vin', href: 'bauturi.html?tip=vin' },
        { label: 'Whisky', href: 'bauturi.html?tip=whisky' },
        { label: 'Vodcă', href: 'bauturi.html?tip=vodca' },
        { label: 'Rom', href: 'bauturi.html?tip=rom' },
        { label: 'Gin', href: 'bauturi.html?tip=gin' },
        { label: 'Lichior', href: 'bauturi.html?tip=lichior' },
        { label: 'Spumant & Șampanie', href: 'bauturi.html?tip=spumant' },
        { label: 'Bere', href: 'bauturi.html?tip=bere' },
        { label: 'Coniac & Brandy', href: 'bauturi.html?tip=coniac' },
        { label: 'Tequila', href: 'bauturi.html?tip=tequila' },
      ],
      allLabel: 'Toate băuturile',
      image: 'assets/products/5948987001816-bottle.jpg',
      imageLabel: 'Selecția sommelierului',
    },
    'dulciuri.html': {
      heading: 'Tip dulce',
      links: [
        { label: 'Ciocolată', href: 'dulciuri.html?tip=ciocolata' },
        { label: 'Praline', href: 'dulciuri.html?tip=praline' },
        { label: 'Jeleuri', href: 'dulciuri.html?tip=jeleuri' },
        { label: 'Biscuiți', href: 'dulciuri.html?tip=biscuiti' },
        { label: 'Bomboane', href: 'dulciuri.html?tip=bomboane' },
        { label: 'Napolitane', href: 'dulciuri.html?tip=napolitane' },
        { label: 'Caramele', href: 'dulciuri.html?tip=caramele' },
      ],
      allLabel: 'Toate dulciurile',
      image: 'assets/products/5000189363069-bottle.jpg',
      imageLabel: 'Dulciuri de import',
    },
    'cafea.html': {
      heading: 'Tip cafea',
      links: [
        { label: 'Cafea boabe', href: 'cafea.html?tip=boabe' },
        { label: 'Cafea măcinată', href: 'cafea.html?tip=macinata' },
      ],
      allLabel: 'Toată cafeaua',
      image: 'assets/products/CF-DAL-001-bottle.jpg',
      imageLabel: 'Prăjită pentru barista',
    },
  };

  nav.querySelectorAll('a').forEach((trigger) => {
    const href = trigger.getAttribute('href');
    const data = MEGA_MENU_DATA[href];
    if (!data) return;

    const item = document.createElement('div');
    item.className = 'mega-nav-item';
    trigger.parentNode.insertBefore(item, trigger);
    item.appendChild(trigger);
    trigger.classList.add('mega-nav-trigger');

    const panel = document.createElement('div');
    panel.className = 'mega-nav-panel';
    panel.innerHTML = `
      <div class="mega-nav-panel-inner">
        <div class="mega-nav-col">
          <h4>${data.heading}</h4>
          <ul>
            ${data.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}
          </ul>
          <a class="mega-nav-all" href="${href}">${data.allLabel} →</a>
        </div>
        <a class="mega-nav-image" href="${href}">
          <img src="${data.image}" alt="${data.imageLabel}" loading="lazy">
          <span>${data.imageLabel}</span>
        </a>
      </div>
    `;
    item.appendChild(panel);

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = item.classList.contains('is-open');
      closeAll();
      if (!isOpen) item.classList.add('is-open');
    });
  });

  function closeAll() {
    nav.querySelectorAll('.mega-nav-item.is-open').forEach((el) => el.classList.remove('is-open'));
  }

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
})();
