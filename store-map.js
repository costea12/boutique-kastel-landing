// Interactive map for the "Magazinul fizic" section (index.html + despre-noi.html).
// Plain Leaflet + OpenStreetMap tiles - no build step, no framework, matches the
// rest of the site's vanilla JS approach.
document.addEventListener('DOMContentLoaded', function () {
  const el = document.getElementById('storeMap');
  if (!el || typeof L === 'undefined') return;

  const storeCoords = [45.75466, 22.89894]; // Bulevardul Libertății 6, Hunedoara

  const map = L.map(el, {
    center: storeCoords,
    zoom: 16,
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  const icon = L.divIcon({
    className: 'store-map-marker',
    html: '<span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  L.marker(storeCoords, { icon }).addTo(map)
    .bindPopup(
      '<strong>Boutique Kastel</strong><br>' +
      'Bulevardul Libertății nr. 6, parter<br>' +
      '331031 Hunedoara<br>' +
      '<a href="https://www.google.com/maps/search/?api=1&query=Boutique%20Kastel%2C%20Bulevardul%20Libert%C4%83%C8%9Bii%206%2C%20Hunedoara" target="_blank" rel="noopener">Deschide în Google Maps</a>'
    );

  // Re-enable scroll zoom only once the visitor deliberately interacts with
  // the map, so page-scroll isn't hijacked while scrolling past it.
  el.addEventListener('click', () => map.scrollWheelZoom.enable());
});
