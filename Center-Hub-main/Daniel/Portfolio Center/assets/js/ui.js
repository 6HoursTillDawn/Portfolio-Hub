// Workspace navigation, file vault, upload, settings, and display
let scrollRevealObserver;

function animateOnScroll(root = document) {
  let elements = root.querySelectorAll(
    ".heading, .stat, .panel, .file-row, .command-item",
  );
  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  if (!scrollRevealObserver) {
    scrollRevealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );
  }
  elements.forEach((element, index) => {
    if (element.classList.contains("scroll-reveal")) return;
    element.classList.add("scroll-reveal");
    element.style.setProperty("--reveal-delay", `${(index % 4) * 55}ms`);
    scrollRevealObserver.observe(element);
  });
}

function go(page) {
  document
    .querySelectorAll(".page")
    .forEach((x) => x.classList.remove("active"));
  document.getElementById(page).classList.add("active");
  document
    .querySelectorAll(".nav")
    .forEach((n) => n.classList.toggle("active", n.dataset.page === page));
  animateOnScroll(document.getElementById(page));
}
document
  .querySelectorAll(".nav")
  .forEach((n) => n.addEventListener("click", () => go(n.dataset.page)));
function openUpload() {
  document.getElementById("modalBg").style.display = "flex";
  document.getElementById("modal").innerHTML =
    `<h3>Add files to your vault</h3><p>Files are encrypted before saving. Choose a Code Lab category for organization.</p><div class="field"><label>Category</label><select id="uploadCategory">${cats.map((x) => `<option>${x}</option>`).join("")}</select></div><div class="uploadbox"><input id="fileInput" type="file" multiple onchange="uploadSelected()"><button class="btn primary" onclick="document.getElementById('fileInput').click()">Select files from device</button><p id="uploadMsg">Multiple files supported • browser storage limit applies</p></div><button class="btn ghost" onclick="closeModal()">Close</button>`;
}
async function uploadSelected() {
  let inp = document.getElementById("fileInput"),
    category = document.getElementById("uploadCategory").value;
  if (!inp.files.length) return;
  let count = 0;
  for (let f of inp.files) {
    try {
      let buf = await f.arrayBuffer(),
        box = await encrypt(masterKey, buf);
      let record = {
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        category,
        created: Date.now(),
        box,
      };
      await tx("readwrite", (s) => s.put(record));
      count++;
    } catch (e) {
      console.error(e);
    }
  }
  closeModal();
  await refresh();
  toast(`${count} file(s) securely stored`);
}
function closeModal() {
  document.getElementById("modalBg").style.display = "none";
}
document.getElementById("modalBg").addEventListener("click", (e) => {
  if (e.target.id === "modalBg") closeModal();
});
async function refresh() {
  filesCache = await getAll();
  renderFiles();
  renderRecent();
  document.getElementById("statFiles").textContent = filesCache.length;
  document.getElementById("statProjects").textContent = new Set(
    filesCache.map((f) => f.category),
  ).size;
}
function sizeFmt(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
function iconFor(name) {
  let ext = (name.split(".").pop() || "FILE").slice(0, 4).toUpperCase();
  return ext;
}
function fileRow(f) {
  return `<div class="file-row"><div class="file-icon">${iconFor(f.name)}</div><div class="file-info"><strong title="${esc(f.name)}">${esc(f.name)}</strong><small>${esc(f.category)} • ${sizeFmt(f.size)} • ${new Date(f.created).toLocaleDateString()}</small></div><div class="file-actions"><button class="btn mini ghost" onclick="downloadFile('${f.id}')">Download</button><button class="btn mini danger" onclick="deleteFile('${f.id}')">Delete</button></div></div>`;
}
function renderFiles() {
  let q = (document.getElementById("searchFiles")?.value || "").toLowerCase(),
    cat = document.getElementById("categoryFilter")?.value || "all";
  let fs = filesCache.filter(
    (f) =>
      (f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)) &&
      (cat === "all" || f.category === cat),
  );
  document.getElementById("fileList").innerHTML = fs.length
    ? fs.map(fileRow).join("")
    : `<div class="empty">No files found. Upload a file to start your vault.</div>`;
  document.getElementById("projectList").innerHTML = fs.length
    ? fs.map(fileRow).join("")
    : `<div class="empty">Nothing in this category yet. Use “Add to Code Lab” to upload project files.</div>`;
  animateOnScroll(document.getElementById("fileList"));
  animateOnScroll(document.getElementById("projectList"));
}
function renderRecent() {
  let recent = [...filesCache]
    .sort((a, b) => b.created - a.created)
    .slice(0, 5);
  document.getElementById("recent").innerHTML = recent.length
    ? recent.map(fileRow).join("")
    : `<div class="empty">Your recent uploads will appear here.</div>`;
  animateOnScroll(document.getElementById("recent"));
}
async function downloadFile(id) {
  let f = filesCache.find((x) => x.id === id);
  if (!f) return;
  try {
    let raw = await decrypt(masterKey, f.box),
      blob = new Blob([raw], { type: f.type }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    toast("Unable to decrypt file");
  }
}
async function deleteFile(id) {
  if (!confirm("Delete this stored file permanently?")) return;
  await tx("readwrite", (s) => s.delete(id));
  await refresh();
  toast("File deleted");
}
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function toast(t) {
  let el = document.getElementById("toast");
  el.textContent = t;
  el.style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => (el.style.display = "none"), 3300);
}
function showChangePin() {
  document.getElementById("modalBg").style.display = "flex";
  document.getElementById("modal").innerHTML =
    `<h3>Change vault PIN</h3><div class="field"><label>Current PIN</label><input type="password" id="oldPin"></div><div class="field"><label>New PIN</label><input type="password" id="newPin2"></div><div class="field"><label>Confirm new PIN</label><input type="password" id="newPin3"></div><button class="btn primary" onclick="changePin()">Update PIN</button><button class="btn ghost" onclick="closeModal()">Cancel</button>`;
}
async function changePin() {
  let old = document.getElementById("oldPin").value,
    p = document.getElementById("newPin2").value,
    c = document.getElementById("newPin3").value;
  if (p.length < 4 || p !== c) {
    toast("PIN mismatch or too short");
    return;
  }
  try {
    let raw = await unwrapKey(
        await derive(old, unb64(meta.pinSalt)),
        meta.pinWrap,
      ),
      salt = rand(16),
      key = await derive(p, salt);
    meta.pinSalt = b64(salt);
    meta.pinWrap = await wrapKey(key, raw);
    localStorage.setItem(META, JSON.stringify(meta));
    closeModal();
    toast("PIN changed");
  } catch (e) {
    toast("Current PIN incorrect");
  }
}
function showRecovery() {
  document.getElementById("modalBg").style.display = "flex";
  document.getElementById("modal").innerHTML =
    `<h3>Recovery backup</h3><p>Generate fresh recovery credentials. Your current PIN must be verified before replacing the old key/phrase.</p><div class="field"><label>Current PIN</label><input id="verifyPinRecovery" type="password"></div><button class="btn primary" onclick="regenerateRecovery()">Generate new recovery backup</button><div id="newRecoveryOut"></div><div class="warning">Regenerating invalidates the previous recovery key and phrase. Save the new backup.</div><button class="btn ghost" onclick="closeModal()">Close</button>`;
}
async function regenerateRecovery() {
  let pin = document.getElementById("verifyPinRecovery").value;
  try {
    let raw = await unwrapKey(
        await derive(pin, unb64(meta.pinSalt)),
        meta.pinWrap,
      ),
      keyCode = randomCode(),
      phrase = makePhrase(),
      salt = rand(16),
      phraseSalt = rand(16),
      k1 = await derive(keyCode, salt),
      k2 = await derive(cleanPhrase(phrase), phraseSalt);
    meta.recSalt = b64(salt);
    meta.phraseSalt = b64(phraseSalt);
    meta.recWrap = await wrapKey(k1, raw);
    meta.phraseWrap = await wrapKey(k2, raw);
    localStorage.setItem(META, JSON.stringify(meta));
    let out = document.getElementById("newRecoveryOut");
    out.innerHTML = `<h3>New recovery key</h3><div class="recovery" id="regenKey">${keyCode}</div><button class="btn ghost" onclick="GenCopy(document.getElementById('regenKey').textContent)">Copy key</button><h3>New recovery phrase</h3><div class="recovery" id="regenPhrase">${phrase}</div><button class="btn ghost" onclick="GenCopy(document.getElementById('regenPhrase').textContent)">Copy phrase</button><button class="btn primary" onclick="downloadText('Recovery.txt',recoveryBundle(document.getElementById('regenKey').textContent,document.getElementById('regenPhrase').textContent))">Download backup</button>`;
    toast("New recovery credentials generated; old ones invalidated");
  } catch (e) {
    toast("PIN verification failed");
  }
}
function deleteVaultPrompt() {
  if (
    !confirm(
      "This will permanently delete ALL files and vault credentials stored by this app in this browser. Continue?",
    )
  )
    return;
  if (!confirm("Final confirmation: permanently destroy this local vault?"))
    return;
  localStorage.removeItem(META);
  let req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = () => {
    masterKey = null;
    showAuth();
    toast("Vault deleted");
  };
  req.onerror = () => toast("Could not delete vault database");
}
