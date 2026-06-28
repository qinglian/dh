import fs from 'fs';
const NL = '\r\n';
let lines = fs.readFileSync('src/components/StartPage.jsx', 'utf8').split(NL);

// Step 1: Find range of helper functions to remove
let helpersStart = -1, helpersEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('计算拖拽目标索引')) helpersStart = i;
  if (helpersStart >= 0 && lines[i].startsWith('      useEffect(() => {')) { helpersEnd = i - 2; break; }
}
console.log('Removing lines', helpersStart + 1, 'to', helpersEnd + 1);

// Step 2: Remove onDragOver/onDrop from JSX items
for (let i = 0; i < lines.length; i++) {
  if (lines[i] && lines[i].includes('onDragOver={!isWidget ? handleItemDragOver : undefined}')) {
    lines[i] = '';
  }
  if (lines[i] && lines[i].includes('onDrop={!isWidget ? handleItemDrop : undefined}')) {
    lines[i] = '';
  }
}

// Build newLines without helper functions
let newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= helpersStart && i <= helpersEnd) continue;
  newLines.push(lines[i]);
}

// Step 3: Find useEffect range in newLines
let effStart = -1;
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i] && newLines[i].startsWith('      useEffect(() => {')) { effStart = i; break; }
}

let effEnd = effStart;
for (let i = effStart; i < newLines.length; i++) {
  if (newLines[i] && newLines[i].includes('}, [isEditShortcuts')) { effEnd = i; break; }
}
console.log('useEffect range in newLines:', effStart + 1, 'to', effEnd + 1);

// Step 4: Build new useEffect
const newEffect = [
  '      useEffect(() => {',
  '    const calcDragTargetIdx = (e, itemEl) => {',
  '      const srcIdx = dragItemIndex.current',
  '      if (srcIdx === null || srcIdx >= shortcuts.length) return null',
  '      const rect = itemEl.getBoundingClientRect()',
  '      const after = e.clientX > rect.left + rect.width / 2',
  '      var targetIndex = parseInt(itemEl.getAttribute("data-index"))',
  '      if (isNaN(targetIndex)) return null',
  '      let tidx = targetIndex',
  '      if (after) tidx++',
  '      tidx = Math.max(0, Math.min(tidx, shortcuts.length))',
  '      if (srcIdx < tidx) tidx--',
  '      return tidx >= 0 && tidx !== srcIdx ? tidx : null',
  '    }',
  '',
  '    const onDocDragOver = (e) => {',
  '      if (!isEditShortcuts || dragItemIndex.current === null) return',
  '      e.preventDefault()',
  '      e.dataTransfer.dropEffect = "move"',
  '',
  '      var el = document.elementFromPoint(e.clientX, e.clientY)',
  '      var itemEl = el?.closest("[data-shortcut]")',
  '      if (!itemEl) { setPreviewShortcuts(null); return }',
  '',
  '      var srcIdx = dragItemIndex.current',
  '      var tidx = calcDragTargetIdx(e, itemEl)',
  '      if (tidx === null) { setPreviewShortcuts(null); return }',
  '',
  '      var preview = [...shortcuts]',
  '      var [moved] = preview.splice(srcIdx, 1)',
  '      preview.splice(tidx, 0, moved)',
  '      setPreviewShortcuts(preview)',
  '    }',
  '',
  '    const onDocDrop = (e) => {',
  '      if (!isEditShortcuts) return',
  '      e.preventDefault()',
  '',
  '      var dragData = e.dataTransfer.getData("text/plain")',
  '      if (!dragData || !dragData.startsWith("item:")) { handleDragEnd(); return }',
  '      var srcIdx = parseInt(dragData.split(":")[1])',
  '      if (isNaN(srcIdx) || srcIdx < 0 || srcIdx >= shortcuts.length) { handleDragEnd(); return }',
  '',
  '      var el = document.elementFromPoint(e.clientX, e.clientY)',
  '      var itemEl = el?.closest("[data-shortcut]")',
  '',
  '      let tidx',
  '      if (itemEl) {',
  '        tidx = calcDragTargetIdx(e, itemEl)',
  '        if (tidx === null) { handleDragEnd(); return }',
  '      } else {',
  '        tidx = shortcuts.length',
  '        if (srcIdx < tidx) tidx--',
  '        if (tidx === srcIdx) { handleDragEnd(); return }',
  '      }',
  '',
  '      if (tidx >= 0 && tidx !== srcIdx) {',
  '        var updated = [...shortcuts]',
  '        var [moved2] = updated.splice(srcIdx, 1)',
  '        updated.splice(tidx, 0, moved2)',
  '        setShortcuts(updated)',
  '        saveShortcuts(pageId, updated)',
  '      }',
  '      handleDragEnd()',
  '    }',
  '',
  '    const onDocDragEnd = () => { handleDragEnd() }',
  '',
  '    document.addEventListener("dragover", onDocDragOver)',
  '    document.addEventListener("drop", onDocDrop)',
  '    document.addEventListener("dragend", onDocDragEnd)',
  '',
  '    return () => {',
  '      document.removeEventListener("dragover", onDocDragOver)',
  '      document.removeEventListener("drop", onDocDrop)',
  '      document.removeEventListener("dragend", onDocDragEnd)',
  '    }',
  '  }, [isEditShortcuts, shortcuts.length, shortcuts, pageId])',
];

// Replace
let finalLines = [
  ...newLines.slice(0, effStart),
  ...newEffect,
  ...newLines.slice(effEnd + 1)
];

console.log('Final lines:', finalLines.length);
console.log('Has elementFromPoint:', finalLines.some(l => l && l.includes('elementFromPoint')));

fs.writeFileSync('src/components/StartPage.jsx', finalLines.join(NL), 'utf8');
console.log('Done');
