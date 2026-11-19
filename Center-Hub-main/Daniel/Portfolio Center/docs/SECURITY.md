# Security notes

- The vault stores encrypted file blobs in IndexedDB and credential metadata in localStorage.
- PIN/recovery credentials are used to wrap the vault encryption key; the app does not store the credentials in readable form.
- The recovery phrase is randomly selected from the app's word list. Keep recovery credentials offline and private.
- Emergency reset destroys the vault data held in this browser; it cannot decrypt or recover files.
- This is client-side software, not an audited security product. A compromised device/browser, malicious extensions, weak PIN, or browser data loss can expose or destroy data.
- GitHub Pages serves the app; it does not host uploaded vault files.
