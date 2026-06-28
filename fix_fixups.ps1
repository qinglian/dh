$file = "E:\我的文档\文档\AI\Codex\qinglian-dh-https-github-com-qinglian\dh-repo\src\components\StartPage.jsx"
$lines = [System.IO.File]::ReadAllLines($file)

# Fix 1: Clean up computeShiftedGrid call in onDocDrop
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'const grid = shortcuts\.map.*cols: 1.*rows: 1') {
        $lines[$i] = '        const grid = shortcuts.map((s) => ({ ...s }))'
        Write-Output "Fixed computeShiftedGrid input at line $($i+1)"
    }
    if ($lines[$i] -match "newGrid\.map.*cols.*rows.*itemType") {
        $lines[$i] = '        const newShortcuts = newGrid'
        Write-Output "Fixed newShortcuts mapping at line $($i+1)"
    }
}

# Fix 2: Add migration for old shortcuts without col/row in the page load useEffect
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'setShortcuts\(getSavedShortcuts\(pageId\)\)') {
        $indent = $lines[$i] -replace '^(\s*).*', '$1'
        $lines[$i] = $indent + 'const savedShortcuts = getSavedShortcuts(pageId)'
        $lines = $lines[0..$i] + @(
            $indent + '// 为没有 col/row 的旧快捷方式补充网格坐标'
            $indent + 'const migrated = savedShortcuts.map((s, idx) => {'
            $indent + '  if (s.col === undefined || s.row === undefined) {'
            $indent + '    return { ...s, col: i % 6, row: Math.floor(i / 6) }'
            $indent + '  }'
            $indent + '  return s'
            $indent + '})'
            $indent + 'setShortcuts(migrated)'
        ) + $lines[($i+1)..($lines.Count-1)]
        break
    }
}

[System.IO.File]::WriteAllLines($file, $lines)
Write-Output "All fixups done"
