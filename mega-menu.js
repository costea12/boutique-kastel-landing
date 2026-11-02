// Desktop header mega menu: click (not hover) a top-nav category to reveal
// a dropdown of real subcategories/brands across several organized columns
// (inspired by BestValue's category menus), plus a clean product shot on
// the right. Built from this single table instead of duplicating markup in
// all 14 pages that share the header. Links jump straight into the category
// page pre-filtered: ?tip=slug (word-boundary filter, handled in
// catalog.js) or ?brand=Name (preselects the brand checkbox).
(function () {
  const nav = document.querySelector('nav.main-nav');
  if (!nav) return;

  const MEGA_MENU_DATA = {
    'parfumuri.html': {
      columns: [
        {
          heading: 'Categorii',
          links: [
            { label: 'Apă de parfum', href: 'parfumuri.html?tip=edp' },
            { label: 'Apă de toaletă', href: 'parfumuri.html?tip=edt' },
            { label: 'Seturi parfumuri', href: 'parfumuri.html?tip=set' },
            { label: 'Parfumuri niche', href: 'parfumuri-niche.html' },
            { label: 'Toate parfumurile', href: 'parfumuri.html' },
          ],
        },
        {
          heading: 'Branduri populare',
          links: [
            { label: 'Paco Rabanne', href: 'parfumuri.html?brand=Paco%20Rabanne' },
            { label: 'Rituals', href: 'parfumuri.html?brand=Rituals' },
            { label: 'Jean Paul Gaultier', href: 'parfumuri.html?brand=Jean%20Paul%20Gaultier' },
            { label: 'Versace', href: 'parfumuri.html?brand=Versace' },
            { label: 'Hugo Boss', href: 'parfumuri.html?brand=Hugo%20Boss' },
          ],
        },
        {
          heading: 'Mai multe branduri',
          links: [
            { label: 'Carolina Herrera', href: 'parfumuri.html?brand=Carolina%20Herrera' },
            { label: 'Calvin Klein', href: 'parfumuri.html?brand=Calvin%20Klein' },
            { label: 'Chanel', href: 'parfumuri.html?brand=Chanel' },
            { label: 'Dior', href: 'parfumuri.html?brand=Dior' },
            { label: 'Yves Saint Laurent', href: 'parfumuri.html?brand=Yves%20Saint%20Laurent' },
          ],
        },
      ],
      image: 'assets/products/6294015164176-bottle.jpg',
      imageLabel: 'Noua colecție de parfumuri',
    },
    'parfumuri-niche.html': {
      columns: [
        {
          heading: 'Branduri niche',
          links: [
            { label: 'Mancera', href: 'parfumuri-niche.html?brand=Mancera' },
            { label: 'Xerjoff', href: 'parfumuri-niche.html?brand=Xerjoff' },
            { label: 'Montale', href: 'parfumuri-niche.html?brand=Montale' },
            { label: 'Gisada', href: 'parfumuri-niche.html?brand=Gisada' },
          ],
        },
        {
          heading: 'Case rare',
          links: [
            { label: 'Tiziana Terenzi', href: 'parfumuri-niche.html?brand=Tiziana%20Terenzi' },
            { label: 'Franck Boclet', href: 'parfumuri-niche.html?brand=Franck%20Boclet' },
            { label: 'By Kilian', href: 'parfumuri-niche.html?brand=By%20Kilian' },
            { label: 'Amouage', href: 'parfumuri-niche.html?brand=Amouage' },
          ],
        },
        {
          heading: 'Descoperă',
          links: [
            { label: 'Toate parfumurile niche', href: 'parfumuri-niche.html' },
            { label: 'Parfumuri', href: 'parfumuri.html' },
          ],
        },
      ],
      image: 'assets/products/701666410195-bottle.jpg',
      imageLabel: 'Esențe rare, de colecție',
    },
    'ingrijire-corporala.html': {
      columns: [
        {
          heading: 'Tip produs',
          links: [
            { label: 'Gel de duș', href: 'ingrijire-corporala.html?tip=gel-dus' },
            { label: 'Cremă de corp', href: 'ingrijire-corporala.html?tip=crema-corp' },
            { label: 'Deodorant', href: 'ingrijire-corporala.html?tip=deo' },
            { label: 'Ulei de corp', href: 'ingrijire-corporala.html?tip=ulei-corp' },
          ],
        },
        {
          heading: 'Branduri',
          links: [
            { label: 'Rituals', href: 'ingrijire-corporala.html?brand=Rituals' },
            { label: 'Moroccanoil', href: 'ingrijire-corporala.html?brand=Moroccanoil' },
            { label: 'Burberry', href: 'ingrijire-corporala.html?brand=Burberry' },
            { label: 'Carolina Herrera', href: 'ingrijire-corporala.html?brand=Carolina%20Herrera' },
          ],
        },
        {
          heading: 'Descoperă',
          links: [{ label: 'Toate produsele de îngrijire', href: 'ingrijire-corporala.html' }],
        },
      ],
      image: 'assets/products/3616302023707-bottle.jpg',
      imageLabel: 'Ritualuri de îngrijire',
    },
    'bauturi.html': {
      columns: [
        {
          heading: 'Tip băutură',
          links: [
            { label: 'Vin', href: 'bauturi.html?tip=vin' },
            { label: 'Whisky', href: 'bauturi.html?tip=whisky' },
            { label: 'Vodcă', href: 'bauturi.html?tip=vodca' },
            { label: 'Rom', href: 'bauturi.html?tip=rom' },
            { label: 'Gin', href: 'bauturi.html?tip=gin' },
          ],
        },
        {
          heading: 'Mai multe tipuri',
          links: [
            { label: 'Lichior', href: 'bauturi.html?tip=lichior' },
            { label: 'Spumant & Șampanie', href: 'bauturi.html?tip=spumant' },
            { label: 'Bere', href: 'bauturi.html?tip=bere' },
            { label: 'Coniac & Brandy', href: 'bauturi.html?tip=coniac' },
            { label: 'Tequila', href: 'bauturi.html?tip=tequila' },
          ],
        },
        {
          heading: 'Branduri populare',
          links: [
            { label: "Jack Daniel's", href: 'bauturi.html?tip=jack' },
            { label: 'Hennessy', href: 'bauturi.html?tip=hennessy' },
            { label: 'Martini', href: 'bauturi.html?tip=martini' },
            { label: 'Jägermeister', href: 'bauturi.html?tip=jagermeister' },
            { label: 'Aperol', href: 'bauturi.html?tip=aperol' },
          ],
        },
      ],
      image: 'assets/products/5948987001816-bottle.jpg',
      imageLabel: 'Selecția sommelierului',
    },
    'dulciuri.html': {
      columns: [
        {
          heading: 'Tip dulce',
          links: [
            { label: 'Ciocolată', href: 'dulciuri.html?tip=ciocolata' },
            { label: 'Praline', href: 'dulciuri.html?tip=praline' },
            { label: 'Jeleuri', href: 'dulciuri.html?tip=jeleuri' },
            { label: 'Biscuiți', href: 'dulciuri.html?tip=biscuiti' },
          ],
        },
        {
          heading: 'Mai multe tipuri',
          links: [
            { label: 'Bomboane', href: 'dulciuri.html?tip=bomboane' },
            { label: 'Napolitane', href: 'dulciuri.html?tip=napolitane' },
            { label: 'Caramele', href: 'dulciuri.html?tip=caramele' },
          ],
        },
        {
          heading: 'Branduri',
          links: [
            { label: 'Lindt', href: 'dulciuri.html?brand=Lindt' },
            { label: 'Haribo', href: 'dulciuri.html?brand=Haribo' },
            { label: 'Ritter Sport', href: 'dulciuri.html?brand=Ritter' },
          ],
        },
      ],
      image: 'assets/products/7610400097093-bottle.jpg',
      imageLabel: 'Dulciuri de import',
    },
    'cafea.html': {
      columns: [
        {
          heading: 'Tip cafea',
          links: [
            { label: 'Cafea boabe', href: 'cafea.html?tip=boabe' },
            { label: 'Cafea măcinată', href: 'cafea.html?tip=macinata' },
          ],
        },
        {
          heading: 'Branduri',
          links: [
            { label: 'Lavazza', href: 'cafea.html?brand=Lavazza' },
            { label: 'Dallmayr', href: 'cafea.html?brand=Dallmayr' },
            { label: 'Jacobs', href: 'cafea.html?brand=Jacobs' },
            { label: 'Illy', href: 'cafea.html?brand=Illy' },
          ],
        },
        {
          heading: 'Descoperă',
          links: [{ label: 'Toată cafeaua', href: 'cafea.html' }],
        },
      ],
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
        <div class="mega-nav-cols">
          ${data.columns.map((col) => `
            <div class="mega-nav-col">
              <h4>${col.heading}</h4>
              <ul>
                ${col.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
        <a class="mega-nav-image" href="${href}">
          <span class="mega-nav-image-frame"><img src="${data.image}" alt="${data.imageLabel}" loading="lazy"></span>
          <span class="mega-nav-image-label">${data.imageLabel}</span>
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
