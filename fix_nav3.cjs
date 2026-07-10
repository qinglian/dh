const fs = require("fs");
const navPath = "E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/NavPageSettings.jsx";
let nav = fs.readFileSync(navPath, "utf8");

// Add to destructuring
nav = nav.replace(
  /(onUpdateSpotlightColorMix,)/,
  "$1\n  spotlightFeather,\n  onUpdateSpotlightFeather,"
);

// Find the spotlight colorMix row end and insert feather slider after it
var colorMixEnd = nav.indexOf('spotlightColorMix + "%"}');
if (colorMixEnd !== -1) {
  // Find the end of this row (closing span and div)
  var afterSpan = nav.indexOf("</span>", colorMixEnd);
  var afterDiv = nav.indexOf("</div>", afterSpan);
  if (afterDiv !== -1) {
    var nextLine = nav.indexOf("\n", afterDiv);
    var insertStr = "\n\n" +
      "                {/* 羽化值 */}\n" +
      "                <div style={{ display: '\\''flex'\\'', alignItems: '\\''center'\\'', gap: 8, marginTop: 8 }}>\n" +
      "                  <span style={{ fontSize: 11, color: '\\''var(--text-tertiary)'\\'', minWidth: 44, flexShrink: 0 }}>羽化值</span>\n" +
      "                  <input\n" +
      "                    type=\"range\"\n" +
      "                    min={0} max={100} step={1}\n" +
      "                    value={spotlightFeather}\n" +
      "                    onChange={e => onUpdateSpotlightFeather(parseInt(e.target.value, 10))}\n" +
      "                    style={{\n" +
      "                      flex: 1, height: 4, borderRadius: 2,\n" +
      "                      WebkitAppearance: '\\''none'\\'', appearance: '\\''none'\\'',\n" +
      "                      background: `linear-gradient(to right, transparent, var(--text-primary))`,\n" +
      "                      outline: '\\''none'\\'', cursor: '\\''pointer'\\'',\n" +
      "                    }}\n" +
      "                  />\n" +
      "                  <span style={{ fontSize: 11, color: '\\''var(--text-tertiary)'\\'', minWidth: 30, textAlign: '\\''right'\\'', flexShrink: 0 }}>{spotlightFeather}%</span>\n" +
      "                </div>";
    nav = nav.substring(0, nextLine) + insertStr + nav.substring(nextLine);
    console.log("NavPageSettings feather slider inserted");
  }
}

fs.writeFileSync(navPath, nav, "utf8");
console.log("Done");