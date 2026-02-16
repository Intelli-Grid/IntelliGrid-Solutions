$maxRuns = 50
$count = 0

Write-Host "🔄 Starting Continuous Polish Loop (Max $maxRuns runs)..." -ForegroundColor Cyan

do {
    $count++
    Write-Host "`n---------- Run #$count ----------" -ForegroundColor Yellow
    
    # Run the polish script
    try {
        node scripts/updateToolsEnhanced.js --polish-only
    }
    catch {
        Write-Host "❌ Script failed on run #$count" -ForegroundColor Red
        break
    }

    # Optional: Check output to see if we should stop early? 
    # For now, just rely on maxRuns or manual stop (Ctrl+C).
    
    Start-Sleep -Seconds 2
} while ($count -lt $maxRuns)

Write-Host "`n✅ Polish Loop Complete!" -ForegroundColor Green
