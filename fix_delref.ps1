$file = "E:\我的文档\文档\AI\Codex\qinglian-dh-https-github-com-qinglian\dh-repo\src\components\StartPage.jsx"
$lines = [System.IO.File]::ReadAllLines($file)
$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'const dragWorkingArray = useRef\(null\)') {
        Write-Output "Removed dragWorkingArray declaration at line $($i+1)"
        continue
    }
    $newLines += $lines[$i]
}
[System.IO.File]::WriteAllLines($file, $newLines)
Write-Output "Done"
