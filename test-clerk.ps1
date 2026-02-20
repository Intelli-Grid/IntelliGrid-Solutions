# Verify Clerk now accepts www.intelligrid.online after Home URL change
$uri = "https://clerk.intelligrid.online/v1/environment?_clerk_js_version=4.73.14"

foreach ($origin in @("https://www.intelligrid.online", "https://intelligrid.online")) {
    $headers = @{ "Origin" = $origin; "Accept" = "application/json" }
    try {
        $r = Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing
        Write-Host "ORIGIN '$origin' -> STATUS: $($r.StatusCode) ✅ WORKING"
    }
    catch {
        $code = [int]$_.Exception.Response.StatusCode
        Write-Host "ORIGIN '$origin' -> STATUS: $code ❌ STILL BLOCKED"
    }
}

# Also check the home_url in the environment response
$r2 = Invoke-WebRequest -Uri "https://clerk.intelligrid.online/v1/environment" -UseBasicParsing
$json = $r2.Content | ConvertFrom-Json
Write-Host "---"
Write-Host "Clerk home_url is now: $($json.display_config.home_url)"
