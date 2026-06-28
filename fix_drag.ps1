$file = "E:\我的文档\文档\AI\Codex\qinglian-dh-https-github-com-qinglian\dh-repo\src\components\StartPage.jsx"
$lines = [System.IO.File]::ReadAllLines($file)

# Find the useEffect that contains document.addEventListener("dragover"
$startLine = -1
$endLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'document\.addEventListener\("dragover"' -and $startLine -eq -1) {
        # Find the start of the useEffect containing this line
        for ($j = $i; $j -ge 0; $j--) {
            if ($lines[$j] -match 'useEffect\(\(\) => \{') {
                $startLine = $j
                break
            }
        }
    }
    if ($startLine -ne -1 -and $endLine -eq -1) {
        if ($lines[$i] -match '^\s*\}, \[isEditShortcuts') {
            $endLine = $i
            break
        }
    }
}
Write-Output "useEffect block: lines $($startLine+1) to $($endLine+1)"

# New content for the drag useEffect
$newBlock = @(
'      useEffect(() => {',
'    // 共享的获取拖拽目标位置的函数：通过网格坐标映射鼠标位置',
'    const getDragPos = (e) => {',
'      const pos = getGridPos(e.clientX, e.clientY, true)',
'      if (!pos) return null',
'      return { col: pos.col, row: pos.row }',
'    }',
'',
'    const onDocDragOver = (e) => {',
'      if (!isEditShortcuts || dragItemIndex.current === null) return',
'      e.preventDefault()',
'      e.dataTransfer.dropEffect = "move"',
'',
'      const pos = getDragPos(e)',
'      if (pos) {',
'        setDropTarget(pos)',
'      }',
'    }',
'',
'    const onDocDrop = (e) => {',
'      if (!isEditShortcuts || dragItemIndex.current === null) return',
'      e.preventDefault()',
'',
'      const srcIdx = dragItemIndex.current',
'      if (srcIdx < 0 || srcIdx >= shortcuts.length) { handleDragEnd(); return }',
'',
'      const pos = getDragPos(e)',
'      if (!pos) { handleDragEnd(); return }',
'',
'      const targetCol = pos.col',
'      const targetRow = pos.row',
'      const dragged = shortcuts[srcIdx]',
'',
'      // 未移动则忽略',
'      if ((dragged.col ?? 0) === targetCol && (dragged.row ?? 0) === targetRow) {',
'        handleDragEnd()',
'        return',
'      }',
'',
'      // 检查目标是否被其他按钮占用',
'      const occupied = shortcuts.some((s, i) =>',
'        i !== srcIdx && (s.col ?? 0) === targetCol && (s.row ?? 0) === targetRow',
'      )',
'',
'      if (occupied) {',
'        // 目标被占用：使用 computeShiftedGrid 级联避让',
'        const grid = shortcuts.map((s) => ({ ...s, cols: 1, rows: 1 }))',
'        const newGrid = computeShiftedGrid(grid, srcIdx, targetCol, targetRow, 6)',
'        const newShortcuts = newGrid.map(({ cols, rows, itemType, ...rest }) => rest)',
'        setShortcuts(newShortcuts)',
'        saveShortcuts(pageId, newShortcuts)',
'      } else {',
'        // 目标为空：直接放置',
'        const updated = [...shortcuts]',
'        updated[srcIdx] = { ...updated[srcIdx], col: targetCol, row: targetRow }',
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
'  }, [isEditShortcuts, shortcuts, pageId, getGridPos])'
)

$result = $lines[0..($startLine-1)] + $newBlock + $lines[($endLine+1)..($lines.Count-1)]
[System.IO.File]::WriteAllLines($file, $result)
Write-Output "Drag useEffect replaced"
