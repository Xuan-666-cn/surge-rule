const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rulesDir = path.join(root, "rules");
const supportedTypes = new Set([
  "DOMAIN",
  "DOMAIN-SUFFIX",
  "DOMAIN-KEYWORD",
  "IP-CIDR",
  "IP-CIDR6",
  "GEOIP",
]);

let hasError = false;
const seen = new Map();

function fail(file, lineNumber, message) {
  hasError = true;
  console.error(`${file}:${lineNumber}: ${message}`);
}

for (const file of fs.readdirSync(rulesDir).filter((name) => name.endsWith(".list")).sort()) {
  const fullPath = path.join(rulesDir, file);
  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    if (line !== trimmed) {
      fail(file, lineNumber, "rule has leading or trailing whitespace");
    }

    const [type, value] = trimmed.split(",");
    if (!supportedTypes.has(type)) {
      fail(file, lineNumber, `unsupported rule type: ${type}`);
    }

    if (!value) {
      fail(file, lineNumber, "rule is missing a value");
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      fail(file, lineNumber, `duplicate rule also found in ${seen.get(key)}`);
    } else {
      seen.set(key, `${file}:${lineNumber}`);
    }
  });
}

if (hasError) {
  process.exitCode = 1;
} else {
  console.log("Rule lint passed.");
}

