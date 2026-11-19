// Command directory and developer tool actions
function filterCommands() {
  let q = (document.getElementById("commandSearch")?.value || "").toLowerCase();
  let list = document.getElementById("commandList");
  if (!list) return;
  let found = Commands.filter((c) => c.join(" ").toLowerCase().includes(q));
  list.innerHTML =
    found
      .map(
        (c) =>
          `<div class="command-item"><div><strong>${c[0]}</strong><small>${c[1]}</small></div><div class="quick"><button class="btn ghost mini" onclick="copyCommand('${c[0]}')">Copy</button><button class="btn mini" onclick="runCommand('${c[0]}')">Run</button></div></div>`,
      )
      .join("") || '<div class="empty">No matching commands.</div>';
}
function copyCommand(c) {
  if (navigator.clipboard?.writeText)
    navigator.clipboard
      .writeText(c)
      .then(() => toast("Command copied"))
      .catch(() => toast("Select and copy command manually"));
  else toast("Clipboard not available");
}
function runCommand(c) {
  if (c === "/menu") {
    go("dashboard");
    return;
  }
  if (c === "/status") {
    toast(`Vault ready • ${filesCache.length} stored files`);
    return;
  }
  if (c === "/reset") {
    document.getElementById("commandSearch").value = "";
    document.getElementById("commandTask").value = "";
    filterCommands();
    toast("Command selections reset");
    return;
  }
  if (c === "/help") {
    go("command");
    toast("Command directory opened");
    return;
  }
  let prompts = {
    "/code": "Generate code for: ",
    "/debug": "Debug this issue: ",
    "/explain": "Explain this code or concept: ",
    "/optimize": "Optimize this code or workflow: ",
    "/review": "Review this code: ",
    "/build": "Help me build this project: ",
  };
  document.getElementById("commandTask").value = prompts[c] || c + " ";
  go("command");
  document.getElementById("commandTask").focus();
}
function launchTool(name) {
  document.getElementById("commandTask").value = name + ": ";
  document.getElementById("commandTask").focus();
  toast(name + " selected");
}
function sendCommandTask() {
  let task = document.getElementById("commandTask").value.trim(),
    category = document.getElementById("commandCategory").value;
  if (!task) {
    toast("Enter a request first");
    return;
  }
  toast("Request ready — copy it and use your coding assistant");
  let full = `Core : ${category} task — ${task}`;
  if (navigator.clipboard?.writeText)
    navigator.clipboard
      .writeText(full)
      .then(() => toast("Request copied. Paste it into your coding assistant."))
      .catch(() => toast(full));
  else alert(full);
}
