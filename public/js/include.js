async function loadPartials() {
  const includes = document.querySelectorAll('[data-include]');
  const promises = [];
  includes.forEach(el => {
    const file = el.getAttribute('data-include');
    const promise = fetch(file)
      .then(resp => {
        if (!resp.ok) throw new Error(`Failed to load ${file}`);
        return resp.text();
      })
      .then(html => {
        el.outerHTML = html;
      })
      .catch(err => {
        console.error(err);
      });
    promises.push(promise);
  });
  await Promise.all(promises);
  document.dispatchEvent(new Event('partials-loaded'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPartials);
} else {
  loadPartials();
}
