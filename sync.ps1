$source = "D:\00 seoulteacher"
$dest = "Z:\DataBox\CheonA\00 seoulteacher"
$excludeDirs = @("node_modules", ".next", ".git", ".vscode")

Write-Host "======================================================="
Write-Host "  SeoulTeacher Bi-Directional Sync (Newest Files)"
Write-Host "======================================================="
Write-Host ""
Write-Host "Step 1: Syncing from Network (Z:) to Local (D:) - Only pulling newer files..."
robocopy $dest $source /E /XO /XD $excludeDirs /R:1 /W:1 /MT:8

Write-Host ""
Write-Host "Step 2: Syncing from Local (D:) to Network (Z:) - Only pushing newer files..."
robocopy $source $dest /E /XO /XD $excludeDirs /R:1 /W:1 /MT:8

Write-Host ""
Write-Host "Sync complete!"
