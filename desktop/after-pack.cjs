const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const locales = path.join(context.appOutDir, "locales");
  if (fs.existsSync(locales)) {
    for (const name of fs.readdirSync(locales)) {
      if (name !== "en-US.pak") fs.rmSync(path.join(locales, name), { force: true });
    }
  }
  const license = path.join(context.appOutDir, "LICENSES.chromium.html");
  fs.rmSync(license, { force: true });
};
