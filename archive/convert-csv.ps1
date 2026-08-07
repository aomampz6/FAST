$ErrorActionPreference = 'Stop'

$content = Get-Content -Path "data.csv" -Encoding Default -Raw
$content = $content -replace "^[^\n]*\r?\n", ""
$csvData = $content | ConvertFrom-Csv

$data = @()
$currentGroup = ""
$currentId = ""
$currentScoms = ""

foreach ($row in $csvData) {
    if ($row.'ID' -ne "") {
        $currentId = $row.'ID'
        $currentGroup = $row.'กลุ่มประเภทเหตุเสีย'
        $currentScoms = $row.'เหตุเสียจาก Scoms'
    }

    if ($row.'อาการ' -ne "" -or $row.'ขั้นตอนการตรวจแก้' -ne "") {
        $data += @{
            ID = $currentId
            Group = $currentGroup
            Scoms = $currentScoms
            Symptom = $row.'อาการ'
            CheckPoint = $row.'จุดที่ต้องเช็คจุดแรก'
            Steps = $row.'ขั้นตอนการตรวจแก้'
            NormalValue = $row.'ค่าปกติ'
            Equipment = $row.'อุปกรณ์ที่ใช้ในการแก้ไข'
        }
    }
}

$json = $data | ConvertTo-Json -Depth 5
$jsContent = "const fastData = $json;"
Set-Content -Path "data.js" -Value $jsContent -Encoding UTF8
Write-Host "Converted data.csv to data.js successfully."
