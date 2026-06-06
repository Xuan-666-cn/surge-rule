const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rulesDir = path.join(root, "rules");
const distDir = path.join(root, "dist");
const clients = ["surge", "clash", "shadowrocket", "quantumultx"];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readRuleFiles() {
  return fs
    .readdirSync(rulesDir)
    .filter((file) => file.endsWith(".list"))
    .sort();
}

function toQuantumultX(content) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("DOMAIN-SUFFIX,")) {
        return line.replace("DOMAIN-SUFFIX,", "HOST-SUFFIX,");
      }
      if (line.startsWith("DOMAIN-KEYWORD,")) {
        return line.replace("DOMAIN-KEYWORD,", "HOST-KEYWORD,");
      }
      if (line.startsWith("DOMAIN,")) {
        return line.replace("DOMAIN,", "HOST,");
      }
      return line;
    })
    .join("\n");
}

function build() {
  for (const client of clients) {
    ensureDir(path.join(distDir, client));
  }

  for (const file of readRuleFiles()) {
    const sourcePath = path.join(rulesDir, file);
    const source = fs.readFileSync(sourcePath, "utf8");

    for (const client of clients) {
      const output =
        client === "quantumultx" ? toQuantumultX(source) : source;
      fs.writeFileSync(path.join(distDir, client, file), output);
    }
  }
}

build();

