// Setup, login, recovery UI, and vault session
function showAuth() {
  document.getElementById("workspace").style.display = "none";
  let a = document.getElementById("auth");
  a.style.display = "block";
  if (!localStorage.getItem(META)) {
    a.innerHTML = `<div class="eyebrow">INITIAL SETUP</div><h2>Create your private vault</h2><p>Choose your own PIN to encrypt your personal portfolio files. A recovery key will be generated too.</p><div class="field"><label>Create PIN (4–32 characters)</label><div class="pin-input"><input id="newPin" type="password" autocomplete="new-password" placeholder="Create PIN or passphrase"><button class="btn ghost pin-toggle" type="button" aria-controls="newPin" aria-pressed="false" onclick="togglePinVisibility('newPin', this)">Show</button></div></div><div class="field"><label>Confirm PIN</label><div class="pin-input"><input id="confirmPin" type="password" placeholder="Repeat PIN"><button class="btn ghost pin-toggle" type="button" aria-controls="confirmPin" aria-pressed="false" onclick="togglePinVisibility('confirmPin', this)">Show</button></div></div><button class="btn primary" onclick="createVault()">Create vault</button><div id="setupResult"></div><p class="security-caption">Choose a strong PIN/passphrase. Your recovery key is the only fallback if you forget it.</p>`;
  } else {
    a.innerHTML = `<div class="eyebrow">VAULT LOCKED</div><h2>Welcome back</h2><p>Enter your PIN to decrypt and open your workspace.</p><div class="field"><label>PIN / passphrase</label><input id="loginPin" type="password" autocomplete="current-password" placeholder="Enter PIN" onkeydown="if(event.key==='Enter')login()"></div><button class="btn primary" style="width:100%" onclick="login()">Unlock vault</button><p><button class="btn ghost" onclick="forgotPin()">Forgot PIN / recovery</button></p>`;
  }
}
function togglePinVisibility(id, button) {
  let input = document.getElementById(id),
    visible = input.type === "password";
  input.type = visible ? "text" : "password";
  button.textContent = visible ? "Hide" : "Show";
  button.setAttribute("aria-pressed", String(visible));
}
async function createVault() {
  let p = document.getElementById("newPin").value,
    c = document.getElementById("confirmPin").value;
  if (p.length < 4) {
    toast("PIN must be at least 4 characters.");
    return;
  }
  if (p !== c) {
    toast("PINs do not match.");
    return;
  }
  try {
    let creds = await setup(p),
      recovery = creds.recovery,
      phrase = creds.phrase;
    document.getElementById("setupResult").innerHTML =
      `<div class="warning"><b>BACK UP YOUR RECOVERY DETAILS.</b> A backup text file will download automatically. Store it privately/offline. These credentials are not saved in readable form in the app.</div><h3>Recovery key</h3><div class="recovery" id="recoveryCode">${recovery}</div><button class="btn ghost" onclick="copyRecovery()">Copy key</button><h3 style="margin-top:15px">12-word recovery phrase</h3><div class="recovery" id="recoveryPhrase">${phrase}</div><button class="btn ghost" onclick="copyPhrase()">Copy phrase</button><button class="btn primary" onclick="downloadRecoveryBundle()">Download recovery backup again</button><button class="btn primary" onclick="enterWorkspace()">I've backed it up — continue</button>`;
    downloadText("Recovery.txt", recoveryBundle(recovery, phrase));
  } catch (e) {
    toast("Setup failed: " + e.message);
  }
}
function copyRecovery() {
  GenCopy(document.getElementById("recoveryCode").textContent);
}
function copyPhrase() {
  GenCopy(document.getElementById("recoveryPhrase").textContent);
}
function downloadRecoveryBundle() {
  downloadText(
    "Recovery.txt",
    recoveryBundle(
      document.getElementById("recoveryCode").textContent,
      document.getElementById("recoveryPhrase").textContent,
    ),
  );
  toast("Recovery backup downloaded");
}
function GenCopy(t) {
  navigator.clipboard
    ?.writeText(t)
    .then(() => toast("Copied to clipboard"))
    .catch(() => toast("Copy unavailable — select and copy manually"));
}
async function login() {
  try {
    await unlock(document.getElementById("loginPin").value);
    enterWorkspace();
  } catch (e) {
    toast("Incorrect PIN or vault data error.");
  }
}
function forgotPin() {
  document.getElementById("auth").innerHTML =
    `<div class="eyebrow">RECOVERY</div><h2>Reset PIN using recovery key</h2><p>Enter the recovery key you saved during setup, then choose a new PIN.</p><div class="field"><label>Recovery key</label><input id="recoveryInput" placeholder="XXXX-XXXX-XXXX-XXXX"></div><div class="field"><label>New PIN (min 4 characters)</label><input id="resetPin" type="password"></div><div class="field"><label>Confirm new PIN</label><input id="resetConfirm" type="password"></div><button class="btn primary" style="width:100%" onclick="resetWithRecovery()">Recover & reset PIN</button><div class="warning">Forgot both PIN and recovery key/phrase? Emergency reset permanently destroys encrypted files.</div><button class="btn danger" style="width:100%" onclick="emergencyReset()">Emergency: erase vault & start over</button><p><button class="btn ghost" onclick="showAuth()">Back to login</button></p>`;
}
async function resetWithRecovery() {
  let code = document.getElementById("recoveryInput").value,
    p = document.getElementById("resetPin").value,
    c = document.getElementById("resetConfirm").value;
  if (p.length < 4 || p !== c) {
    toast("PINs must match and be at least 4 characters.");
    return;
  }
  try {
    await recover(code, p);
    enterWorkspace();
    toast("PIN reset successfully");
  } catch (e) {
    toast("Recovery key or phrase invalid.");
  }
}
function emergencyReset() {
  if (
    !confirm(
      "Forgot both PIN and recovery credentials? This permanently deletes encrypted files stored in this browser. Continue?",
    )
  )
    return;
  if (
    !confirm(
      "FINAL WARNING: This erases all vault files and cannot be undone. Are you absolutely sure?",
    )
  )
    return;
  localStorage.removeItem(META);
  try {
    db?.close();
  } catch (e) {}
  let req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = () => {
    masterKey = null;
    filesCache = [];
    showAuth();
    toast("Vault reset. Create a new vault.");
  };
  req.onerror = () =>
    toast("Reset failed. Close other tabs using this vault and retry.");
  req.onblocked = () =>
    toast("Reset is blocked by another open tab. Close other tabs and retry.");
}
function enterWorkspace() {
  document.getElementById("auth").style.display = "none";
  document.getElementById("workspace").style.display = "grid";
  go("dashboard");
  filterCommands();
  refresh();
}
function lockVault() {
  masterKey = null;
  filesCache = [];
  showAuth();
  toast("Vault locked");
}
