$file = "E:\我的文档\文档\AI\Codex\qinglian-dh-https-github-com-qinglian\dh-repo\src\components\StartPage.jsx"
$lines = [System.IO.File]::ReadAllLines($file)

for ($i = 0; $i -lt $lines.Count; $i++) {
    # Remove dragWorkingArray.current = null from handleDragEnd
    if ($lines[$i] -match 'dragWorkingArray\.current = null') {
        $lines[$i] = ""
        Write-Output "Removed dragWorkingArray cleanup at line $($i+1)"
    }
    # Remove !dragWorkingArray.current check from handleDragStart area
    if ($lines[$i] -match 'dragWorkingArray\.current = \[\.\.\.shortcuts\]') {
        $lines[$i] = ""
        Write-Output "Removed dragWorkingArray init at line $($i+1)"
    }
}

# Remove empty lines that might have been created
$lines = $lines | Where-Object { $_.Trim() -ne "" -or $_ -eq "" }

[System.IO.File]::WriteAllLines($file, $lines)
Write-Output "Cleanup done"
