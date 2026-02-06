const fs = require("fs");
const b64 = process.argv[1];
const code = Buffer.from(b64, "base64").toString("utf8");
fs.writeFileSync("C:/Users/e4ell/websites/keplear.com/scratchpad/test-audio-download.js", code);
console.log("Written " + code.length + " bytes");
