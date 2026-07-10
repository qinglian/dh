const fs = require("fs");
const navPath = "E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/NavPageSettings.jsx";
let nav = fs.readFileSync(navPath, "utf8");

// Add to destructuring
nav = nav.replace(
  /(onUpdateSpotlightColorMix,)/,
  "$1\n  spotlightFeather,\n  onUpdateSpotlightFeather,"
);

// Find the spotlight section and add feather slider after colorMix
// Look for the closing of the colorMix row
const colorMixEnd = 'spotlightColorMix + "%"}</span>';
const idx = nav.indexOf(colorMixEnd);
if (idx !== -1) {
  const afterMix = nav.indexOf("</div>", idx + colorMixEnd.length);
  if (afterMix !== -1) {
    const insertPoint = nav.indexOf("\n", afterMix) + 1;
    const featherSlider = `
                {/* 羽化值 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 44, flexShrink: 0 }}>羽化值</span>
                  <input
                    type="range"
                    min={0} max={100} step={1}
                    value={spotlightFeather}
                    onChange={e => onUpdateSpotlightFeather(parseInt(e.target.value, 10))}
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      WebkitAppearance: 'none', appearance: 'none',
                      background: `linear-gradient(to right, transparent, var(--text-primary))`,
                      outline: 'none', cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 30, textAlign: 'right', flexShrink: 0 }}>{spotlightFeather}%</span>
                </div>`;
    nav = nav.substring(0, insertPoint) + featherSlider + nav.substring(insertPoint);
    console.log("NavPageSettings feather slider inserted");
  }
}

fs.writeFileSync(navPath, nav, "utf8");
console.log("Done");
