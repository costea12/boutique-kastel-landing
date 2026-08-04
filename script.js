// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach((el) => io.observe(el));

// Mobile nav
const navToggle = document.getElementById('navToggle');
const navClose = document.getElementById('navClose');
const mobileNav = document.getElementById('mobileNav');

navToggle?.addEventListener('click', () => mobileNav.classList.add('open'));
navClose?.addEventListener('click', () => mobileNav.classList.remove('open'));
mobileNav?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => mobileNav.classList.remove('open'))
);

// Newsletter form (visual only — will be wired to the n8n backend once it exists)
const newsletterForm = document.getElementById('newsletterForm');
const newsletterNote = document.getElementById('newsletterNote');

newsletterForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  newsletterNote.textContent = 'Mulțumim! Vei fi anunțat la lansare.';
  newsletterForm.reset();
});
