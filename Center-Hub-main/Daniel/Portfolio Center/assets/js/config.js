// Portfolio Center configuration and shared globals
const DB_NAME = "PortfolioVault",
  DB_VERSION = 1,
  STORE = "files",
  META = "VaultMeta";
let db,
  masterKey = null,
  meta = null,
  filesCache = [];
const cats = [
  "Java",
  "Python",
  "JavaScript",
  "HTML / CSS",
  "C#",
  "Unity",
  "Android Development",
  "API Development",
  "Project Architecture",
  "Other",
];
const Commands = [
  ["/help", "Show command list"],
  ["/menu", "Open workspace dashboard"],
  ["/code", "Generate code"],
  ["/debug", "Analyze and fix a bug"],
  ["/explain", "Explain code or concepts"],
  ["/optimize", "Improve performance"],
  ["/review", "Review code quality"],
  ["/build", "Plan or build a project"],
  ["/status", "Show workspace status"],
  ["/reset", "Reset command selections"],
];
