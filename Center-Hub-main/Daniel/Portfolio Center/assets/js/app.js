// Application startup
(async () => {
  try {
    await openDB();
    showAuth();
  } catch (e) {
    document.body.innerHTML =
      '<p style="color:#f66;padding:30px">IndexedDB is unavailable in this browser context. Try HTTPS or localhost.</p>';
  }
})();
