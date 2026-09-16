param(
    [switch]$SkipWslInstall
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Run this script as Administrator." -ForegroundColor Red
    Write-Host "Right click PowerShell and choose 'Run as administrator', then run the script again." -ForegroundColor Red
    exit 1
}

Write-Step "Enabling VirtualMachinePlatform"
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
Write-Ok "VirtualMachinePlatform enabled (or already enabled)"

Write-Step "Enabling WSL feature"
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
Write-Ok "WSL feature enabled (or already enabled)"

Write-Step "Enabling Hyper-V"
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All -NoRestart | Out-Null
Write-Ok "Hyper-V enabled (or already enabled)"

Write-Step "Setting hypervisor launch mode"
bcdedit /set hypervisorlaunchtype auto | Out-Null
Write-Ok "hypervisorlaunchtype set to auto"

if (-not $SkipWslInstall) {
    Write-Step "Installing WSL if missing"
    $wslInstalled = $true
    try {
        $wslStatus = (& wsl.exe --status 2>&1 | Out-String)
        if ($LASTEXITCODE -ne 0 -or ($wslStatus -match "not installed")) {
            $wslInstalled = $false
        }
    }
    catch {
        $wslInstalled = $false
    }

    if (-not $wslInstalled) {
        & wsl.exe --install
        Write-Ok "WSL install initiated"
    }
    else {
        Write-Ok "WSL already installed"
    }
}
else {
    Write-Warn "Skipped WSL installation because -SkipWslInstall was provided"
}

Write-Host ""
Write-Host "Setup complete. Reboot your PC before starting Docker Desktop." -ForegroundColor Green
Write-Host "After reboot, open Docker Desktop and verify with: docker version" -ForegroundColor Green
