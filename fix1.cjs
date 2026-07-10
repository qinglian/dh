const fs = require("fs");

// 1. Remove tint from --glass-bg and --glass-bg-heavy (affects buttons) 
// Only keep tint on --glass-bg-section (card containers)
const indexPath = "E:/我的文档/文档/AI/Codex/qinglian-dh-https-github-com-qinglian/dh-repo/src/index.css";
let content = fs.readFileSync(indexPath, "utf8");

// Revert --glass-bg and --glass-bg-heavy to plain rgba
content = content.replace(
  /--glass-bg:\s*linear-gradient\(var\(--glass-bg-tint,\s*transparent\),\s*var\(--glass-bg-tint,\s*transparent\)\),\s*rgba\(255,\s*255,\s*255,\s*0\.82\)/g,
  "--glass-bg: rgba(255, 255, 255, 0.82)"
);
content = content.replace(
  /--glass-bg:\s*linear-gradient\(var\(--glass-bg-tint,\s*transparent\),\s*var\(--glass-bg-tint,\s*transparent\)\),\s*rgba\(255,\s*255,\s*255,\s*0\.12\)/g,
  "--glass-bg: rgba(255, 255, 255, 0.12)"
);
content = content.replace(
  /--glass-bg:\s*linear-gradient\(var\(--glass-bg-tint,\s*transparent\),\s*var\(--glass-bg-tint,\s*transparent\)\),\s*rgba\(255,\s*255,\s*255,\s*0\.75\)/g,
  "--glass-bg: rgba(255, 255, 255, 0.75)"
);
content = content.replace(
  /--glass-bg-heavy:\s*linear-gradient\(var\(--glass-bg-tint,\s*transparent\),\s*var\(--glass-bg-tint,\s*transparent\)\),\s*rgba\(255,\s*255,\s*255,\s*0\.45\)/g,
  "--glass-bg-heavy: rgba(255, 255, 255, 0.45)"
);
content = content.replace(
  /--glass-bg-heavy:\s*linear-gradient\(var\(--glass-bg-tint,\s*transparent\),\s*var\(--glass-bg-tint,\s*transparent\)\),\s*rgba\(255,\s*255,\s*255,\s*0\.06\)/g,
  "--glass-bg-heavy: rgba(255, 255, 255, 0.06)"
);
content = content.replace(
  /--glass-bg-heavy:\s*linear-gradient\(var\(--glass-bg-tint,\s*transparent\),\s*var\(--glass-bg-tint,\s*transparent\)\),\s*rgba\(255,\s*255,\s*255,\s*0\.4\)/g,
  "--glass-bg-heavy: rgba(255, 255, 255, 0.4)"
);

fs.writeFileSync(indexPath, content, "utf8");
console.log("CSS done - removed tint from --glass-bg/--glass-bg-heavy, kept on --glass-bg-section");
