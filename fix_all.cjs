const fs = require("fs");

// === Check CSS: tint only on --glass-bg-section ===
const cssPath = "E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/index.css";
let css = fs.readFileSync(cssPath, "utf8");
// First check if --glass-bg-section already has tint
if (!css.includes("linear-gradient(var(--glass-bg-tint")) {
  // Apply tint to --glass-bg-section
  const wrap = (r) => `linear-gradient(var(--glass-bg-tint, transparent), var(--glass-bg-tint, transparent)), ${r}`;
  css = css.replace(/--glass-bg-section:\s*rgba\(255,\s*255,\s*255,\s*0\.35\)/g, "--glass-bg-section: " + wrap("rgba(255, 255, 255, 0.35)"));
  css = css.replace(/--glass-bg-section:\s*rgba\(255,\s*255,\s*255,\s*0\.04\)/g, "--glass-bg-section: " + wrap("rgba(255, 255, 255, 0.04)"));
  css = css.replace(/--glass-bg-section:\s*rgba\(255,\s*255,\s*255,\s*0\.3\)/g, "--glass-bg-section: " + wrap("rgba(255, 255, 255, 0.3)"));
  // Make sure --glass-bg and --glass-bg-heavy are plain
  css = css.replace(/--glass-bg:\s*linear-gradient[^;]+;/g, (m) => {
    if (m.includes("0.82")) return "--glass-bg: rgba(255, 255, 255, 0.82);";
    if (m.includes("0.12")) return "--glass-bg: rgba(255, 255, 255, 0.12);";
    if (m.includes("0.75")) return "--glass-bg: rgba(255, 255, 255, 0.75);";
    return m;
  });
  css = css.replace(/--glass-bg-heavy:\s*linear-gradient[^;]+;/g, (m) => {
    if (m.includes("0.45")) return "--glass-bg-heavy: rgba(255, 255, 255, 0.45);";
    if (m.includes("0.06")) return "--glass-bg-heavy: rgba(255, 255, 255, 0.06);";
    if (m.includes("0.4")) return "--glass-bg-heavy: rgba(255, 255, 255, 0.4);";
    return m;
  });
  fs.writeFileSync(cssPath, css, "utf8");
  console.log("CSS: tint on --glass-bg-section only");
}

// === App.jsx ===
let app = fs.readFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/App.jsx", "utf8");

// spotlightFeather state
app = app.replace(
  /const \[spotlightColorMix, setSpotlightColorMix\] = useState\(\(\) => \{[\s\S]*?\}\)\n/,
  (m) => m + "  const [spotlightFeather, setSpotlightFeather] = useState(() => {\n    const saved = localStorage.getItem(getSpotlightKey('spotlight-feather'))\n    return saved ? parseInt(saved, 10) : 60\n  })\n"
);

// save effect
app = app.replace(
  /localStorage\.setItem\(getSpotlightKey\('spotlight-colorMix'\), String\(spotlightColorMix\)\)\s*\n\s*\}, \[spotlightColorMix, theme\]\)/,
  "$&\n\n  useEffect(() => {\n    localStorage.setItem(getSpotlightKey('spotlight-feather'), String(spotlightFeather))\n  }, [spotlightFeather, theme])"
);

// theme reload
app = app.replace(
  /setSpotlightColorMix\(savedMix \? parseInt\(savedMix, 10\) : 50\)/,
  "$&\n    const savedFeather = localStorage.getItem(getSpotlightKey('spotlight-feather'))\n    setSpotlightFeather(savedFeather ? parseInt(savedFeather, 10) : 60)"
);

// MouseSpotlight prop
app = app.replace(
  /<MouseSpotlight enabled=\{mouseSpotlight\} size=\{spotlightSize\} opacity=\{spotlightOpacity\} maskMode=\{spotlightMaskMode\} color1=\{spotlightColor1\} color2=\{spotlightColor2\} colorMix=\{spotlightColorMix\} \/>/,
  "<MouseSpotlight enabled={mouseSpotlight} size={spotlightSize} opacity={spotlightOpacity} maskMode={spotlightMaskMode} color1={spotlightColor1} color2={spotlightColor2} colorMix={spotlightColorMix} feather={spotlightFeather} />"
);

// NavPageSettings props
app = app.replace(
  /onUpdateSpotlightColorMix=\{\(mix\) => \{[\s\S]*?\}\}\n/,
  "$&        spotlightFeather={spotlightFeather}\n        onUpdateSpotlightFeather={(v) => {\n          setSpotlightFeather(v)\n          localStorage.setItem(getSpotlightKey('spotlight-feather'), String(v))\n        }}\n"
);

fs.writeFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/App.jsx", app, "utf8");
console.log("App.jsx done");

// === MouseSpotlight.jsx ===
let spot = fs.readFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/MouseSpotlight.jsx", "utf8");

spot = spot.replace(
  /(colorMix = 50,)/,
  "$1\n  feather = 60,"
);

spot = spot.replace(
  /(xR\.current = colorMix)/,
  "$1\n  const fR = useRef(feather); fR.current = feather"
);

spot = spot.replace(
  /grad\.addColorStop\(0,\s*color\)\s*\n\s*grad\.addColorStop\(0\.4,\s*color\)\s*\n\s*grad\.addColorStop\(1,\s*color \+ '00'\)/,
  "const solidStop = Math.max(0, Math.min(1, 1 - fR.current / 100))\n      grad.addColorStop(0,            color)\n      grad.addColorStop(solidStop,  color)\n      grad.addColorStop(1,            color + '00')"
);

fs.writeFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/MouseSpotlight.jsx", spot, "utf8");
console.log("MouseSpotlight done");

// === Header.jsx ===
let header = fs.readFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/Header.jsx", "utf8");

header = header.replace(
  /(spotlightColorMix, onUpdateSpotlightColorMix,)/,
  "$1\n  spotlightFeather, onUpdateSpotlightFeather,"
);

header = header.replace(
  /(onUpdateSpotlightColorMix=\{onUpdateSpotlightColorMix\}\n)/,
  "$1          spotlightFeather={spotlightFeather}\n          onUpdateSpotlightFeather={onUpdateSpotlightFeather}\n"
);

fs.writeFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/Header.jsx", header, "utf8");
console.log("Header done");

// === NavPageSettings.jsx ===
let nav = fs.readFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/NavPageSettings.jsx", "utf8");

nav = nav.replace(
  /(onUpdateSpotlightColorMix,)/,
  "$1\n  spotlightFeather,\n  onUpdateSpotlightFeather,"
);

// Insert feather slider after colorMix row
var endMarker = 'spotlightColorMix + "%"}';
var idx = nav.indexOf(endMarker);
if (idx !== -1) {
  var afterDiv = nav.indexOf("</div>", nav.indexOf("</span>", idx));
  if (afterDiv !== -1) {
    var nl = nav.indexOf("\n", afterDiv);
    var insert = '\n\n                {/* 羽化值 */}\n                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>\n                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 44, flexShrink: 0 }}>羽化值</span>\n                  <input\n                    type="range"\n                    min={0} max={100} step={1}\n                    value={spotlightFeather}\n                    onChange={e => onUpdateSpotlightFeather(parseInt(e.target.value, 10))}\n                    style={{\n                      flex: 1, height: 4, borderRadius: 2,\n                      WebkitAppearance: "none", appearance: "none",\n                      background: `linear-gradient(to right, transparent, var(--text-primary))`,\n                      outline: "none", cursor: "pointer",\n                    }}\n                  />\n                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 30, textAlign: "right", flexShrink: 0 }}>{spotlightFeather}%</span>\n                </div>';
    nav = nav.substring(0, nl) + insert + nav.substring(nl);
    console.log("NavPageSettings slider inserted at position " + nl);
  }
}

fs.writeFileSync("E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/components/NavPageSettings.jsx", nav, "utf8");
console.log("NavPageSettings done");