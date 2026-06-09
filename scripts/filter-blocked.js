const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const candidatesDir = path.join(root, "candidates");
const rulesDir = path.join(root, "rules");
const reportsDir = path.join(root, "reports");
const gfwlistPath =
  process.env.GFWLIST_PATH || path.join(root, "data", "gfwlist.txt");
const manualIncludePath =
  process.env.MANUAL_INCLUDE_PATH || path.join(root, "data", "manual-include.list");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
  ensureDir(dir);
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".list")) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

function normalizeDomain(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
}

function isDomain(value) {
  return (
    value.includes(".") &&
    !value.includes("*") &&
    !value.includes("/") &&
    !value.includes(":") &&
    !/^\d+(\.\d+){3}$/.test(value)
  );
}

function decodeGfwList(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\s+/g, "");
  return Buffer.from(raw, "base64").toString("utf8");
}

function extractHostFromUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function extractGfwDomains(decoded) {
  const domains = new Set();

  for (const rawLine of decoded.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (
      !line ||
      line.startsWith("!") ||
      line.startsWith("[") ||
      line.startsWith("@@") ||
      line.startsWith("/") ||
      line.includes("$")
    ) {
      continue;
    }

    if (line.startsWith("||")) {
      line = line.slice(2);
    } else if (line.startsWith("|")) {
      line = line.slice(1);
    }

    if (line.startsWith("http://") || line.startsWith("https://")) {
      line = extractHostFromUrl(line);
    }

    line = line
      .split("^")[0]
      .split("/")[0]
      .split("%")[0]
      .split("?")[0]
      .split("#")[0]
      .replace(/^\*+/, "")
      .replace(/\*+$/, "");

    const domain = normalizeDomain(line);
    if (isDomain(domain)) {
      domains.add(domain);
    }
  }

  return domains;
}

function readManualIncludes(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }

  return new Set(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.toLowerCase()),
  );
}

function hasGfwEvidence(domain, gfwDomains) {
  const normalized = normalizeDomain(domain);

  for (const evidence of gfwDomains) {
    if (
      normalized === evidence ||
      normalized.endsWith(`.${evidence}`) ||
      evidence.endsWith(`.${normalized}`)
    ) {
      return evidence;
    }
  }

  return "";
}

function generateFile(file, gfwDomains, manualIncludes) {
  const sourcePath = path.join(candidatesDir, file);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const output = [];
  const report = [];
  let currentHeader = "";
  let activeOutputHeader = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (output[output.length - 1] !== "") {
        output.push("");
      }
      continue;
    }

    if (trimmed.startsWith("#")) {
      currentHeader = trimmed;
      continue;
    }

    const [type, value, ...rest] = trimmed.split(",");
    if (!["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD"].includes(type)) {
      report.push(`SKIP unsupported: ${trimmed}`);
      continue;
    }

    if (currentHeader && activeOutputHeader !== currentHeader) {
      if (output.length && output[output.length - 1] !== "") {
        output.push("");
      }
      output.push(currentHeader);
      activeOutputHeader = currentHeader;
    }

    output.push([type, value, ...rest].join(","));

    const manualKey = trimmed.toLowerCase();
    if (manualIncludes.has(manualKey)) {
      report.push(`KEEP ${trimmed} <= manual-include`);
    } else if (type === "DOMAIN-KEYWORD") {
      report.push(`KEEP ${trimmed} <= candidate-keyword`);
    } else {
      const evidence = hasGfwEvidence(value, gfwDomains);
      report.push(`KEEP ${trimmed} <= ${evidence || "candidate"}`);
    }
  }

  while (output[output.length - 1] === "") {
    output.pop();
  }

  fs.writeFileSync(path.join(rulesDir, file), `${output.join("\n")}\n`);
  fs.writeFileSync(path.join(reportsDir, file.replace(/\.list$/, ".report.txt")), `${report.join("\n")}\n`);
}

function main() {
  if (!fs.existsSync(gfwlistPath)) {
    throw new Error(`GFWList snapshot not found: ${gfwlistPath}`);
  }

  ensureDir(candidatesDir);
  cleanDir(rulesDir);
  ensureDir(reportsDir);

  const decoded = decodeGfwList(gfwlistPath);
  const gfwDomains = extractGfwDomains(decoded);
  const manualIncludes = readManualIncludes(manualIncludePath);
  const files = fs
    .readdirSync(candidatesDir)
    .filter((file) => file.endsWith(".list"))
    .sort();

  for (const file of files) {
    generateFile(file, gfwDomains, manualIncludes);
  }

  console.log(
    `Generated ${files.length} rule files from candidates with ${gfwDomains.size} GFWList evidence domains and ${manualIncludes.size} manual includes.`,
  );
}

main();
