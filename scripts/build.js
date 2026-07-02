const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rulesDir = path.join(root, "rules");
const distDir = path.join(root, "dist");
const clients = ["surge", "clash", "shadowrocket", "quantumultx"];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanClientDir(dir) {
  ensureDir(dir);
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".list")) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

function readRuleFiles() {
  return fs
    .readdirSync(rulesDir)
    .filter((file) => file.endsWith(".list"))
    .sort();
}

function toQuantumultX(content, policyName) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      if (!line || line.startsWith("#")) {
        return line;
      }

      const convertRule = (prefix, qxPrefix) => {
        if (!line.startsWith(prefix)) {
          return "";
        }

        const parts = line.split(",");
        return [qxPrefix, parts[1], policyName].join(",");
      };

      const domainSuffix = convertRule("DOMAIN-SUFFIX,", "HOST-SUFFIX");
      if (domainSuffix) {
        return domainSuffix;
      }

      const domainKeyword = convertRule("DOMAIN-KEYWORD,", "HOST-KEYWORD");
      if (domainKeyword) {
        return domainKeyword;
      }

      const domain = convertRule("DOMAIN,", "HOST");
      if (domain) {
        return domain;
      }

      const ipCidr = convertRule("IP-CIDR,", "IP-CIDR");
      if (ipCidr) {
        return ipCidr;
      }

      const ipCidr6 = convertRule("IP-CIDR6,", "IP6-CIDR");
      if (ipCidr6) {
        return ipCidr6;
      }

      const geoip = convertRule("GEOIP,", "GEOIP");
      if (geoip) {
        return geoip;
      }

      return line;
    })
    .join("\n");
}

function build() {
  for (const client of clients) {
    cleanClientDir(path.join(distDir, client));
  }

  for (const file of readRuleFiles()) {
    const sourcePath = path.join(rulesDir, file);
    const source = fs.readFileSync(sourcePath, "utf8");
    const policyName = path.basename(file, ".list");

    for (const client of clients) {
      const output =
        client === "quantumultx" ? toQuantumultX(source, policyName) : source;
      fs.writeFileSync(path.join(distDir, client, file), output);
    }
  }
}

build();
