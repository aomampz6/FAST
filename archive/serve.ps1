$port = 8081
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server listening on port $port..."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response

    $path = $context.Request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    
    $filePath = Join-Path (Get-Location) $path
    
    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = "application/octet-stream"
        switch ($ext) {
            ".html" { $contentType = "text/html; charset=utf-8" }
            ".css"  { $contentType = "text/css; charset=utf-8" }
            ".js"   { $contentType = "application/javascript; charset=utf-8" }
            ".png"  { $contentType = "image/png" }
            ".jpg"  { $contentType = "image/jpeg" }
            ".jpeg" { $contentType = "image/jpeg" }
            ".svg"  { $contentType = "image/svg+xml" }
            ".json" { $contentType = "application/json; charset=utf-8" }
        }
        
        $response.ContentType = $contentType
        $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.ContentLength64 = $msg.Length
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    
    $response.Close()
}
