$file = "E:\我的文档\文档\AI\Codex\qinglian-dh-https-github-com-qinglian\dh-repo\src\components\StartPage.jsx"
$lines = [System.IO.File]::ReadAllLines($file)

# Change 1: gridItems line 523 - remove col/row computation from sItems
# Old: const sItems = displayShortcuts.map((s, i) => ({ ...s, itemType: 'shortcut', col: i % 6, row: Math.floor(i / 6) }))
# New: const sItems = displayShortcuts.map((s) => ({ ...s, itemType: 'shortcut' }))
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'sItems = displayShortcuts\.map.*col: i % 6.*row: Math\.floor') {
        $lines[$i] = $lines[$i] -replace "\(s, i\) =>", "(s) =>"
        $lines[$i] = $lines[$i] -replace ", col: i % 6, row: Math\.floor\(i \/ 6\)", ""
        Write-Output "Fixed gridItems sItems at line $($i+1)"
    }
    # Change 2: gridItems line 524 - remove col/row from wItems (optional but clean)
    if ($lines[$i] -match 'wItems = widgets\.map.*col: \(displayShortcuts\.length \+ i\) % 6.*row: Math\.floor') {
        $lines[$i] = $lines[$i] -replace "\(w, i\) =>", "(w) =>"
        $lines[$i] = $lines[$i] -replace ", col: \(displayShortcuts\.length \+ i\) % 6, row: Math\.floor\(\(displayShortcuts\.length \+ i\) \/ 6\)", ""
        Write-Output "Fixed gridItems wItems at line $($i+1)"
    }
}

[System.IO.File]::WriteAllLines($file, $lines)
Write-Output "GridItems changes done"
