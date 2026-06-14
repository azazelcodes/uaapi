const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const before = process.env.GITHUB_EVENT_BEFORE || `${process.env.GITHUB_SHA}~1`;
const after = process.env.GITHUB_SHA;

const diff = execSync(`git diff --name-status ${before} ${after}`)
  .toString()
  .trim()
  .split("\n");

diff.forEach((line) => {
  if (!line) return;
  const [status, file] = line.split(/\s+/);

  if (!file.endsWith(".json")) return;
  if (file.endsWith(".index.json")) return;
  if (!file.startsWith("items/")) return;

  let oldPrice = null;
  let newPrice = null;

  if (status !== "A") {
    // not new creation
    try {
      const oldContent = execSync(`git show ${before}:${file}`).toString();
      oldPrice = JSON.parse(oldContent).sell ?? null;
    } catch {}
  }
  if (status !== "D") {
    // not deletion
    try {
      const newContent = fs.readFileSync(file, "utf8");
      newPrice = JSON.parse(newContent).sell ?? null;
    } catch {}
  }

  const index = path.join("items", "prices.index.json");
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(index, "utf8"));
  } catch {}

  switch (status) {
    case "M": // modified
      if (oldPrice !== newPrice) {
        delete data[oldPrice];
        data[path.parse(file).name] = newPrice;
      }
      break;

    case "D": // deleted
      delete data[oldPrice];
      break;

    case "A": // created
      data[path.parse(file).name] = newPrice;
      break;

    default: // unknown
      break;
  }

  fs.writeFileSync(index, JSON.stringify(data, null, 2));
});
