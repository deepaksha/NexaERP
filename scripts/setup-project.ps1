param(
    [switch]$SkipNodeInstall,
    [switch]$SkipNpmInstall,
    [switch]$SkipWslInstall,
    [switch]$SkipDockerInstall,
    [switch]$SkipDockerStart
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

function Install-WithWinget {
    param(
        [string]$PackageId,
        [string]$DisplayName
    )

    Write-Step "Installing $DisplayName"
    & winget install $PackageId --accept-source-agreements --accept-package-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        throw "Installation failed for $DisplayName. Please install it manually and rerun the script."
    }
    Write-Ok "$DisplayName installed"
}

function Ensure-NodeJs {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Ok "Node.js is already installed"
        return
    }

    if ($SkipNodeInstall) {
        throw "Node.js is not installed. Re-run without -SkipNodeInstall to install it automatically."
    }

    Install-WithWinget -PackageId "OpenJS.NodeJS.LTS" -DisplayName "Node.js LTS"
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

function Ensure-ProjectDependencies {
    if ($SkipNpmInstall) {
        Write-Warn "Skipping npm install because -SkipNpmInstall was supplied"
        return
    }

    Write-Step "Installing project dependencies"
    & npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed. Please fix the dependency error and rerun the script."
    }
    Write-Ok "Project dependencies installed"
}

function Ensure-WslPrereqs {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        throw "This script must be run as Administrator so it can enable Windows features and install WSL."
    }

    Write-Step "Enabling VirtualMachinePlatform"
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
    Write-Ok "VirtualMachinePlatform check completed"

    Write-Step "Enabling WSL feature"
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
    Write-Ok "WSL feature check completed"

    Write-Step "Enabling Hyper-V"
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All -NoRestart | Out-Null
    Write-Ok "Hyper-V check completed"

    if ($SkipWslInstall) {
        Write-Warn "Skipping WSL installation because -SkipWslInstall was supplied"
        return
    }

    try {
        & wsl.exe --status | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "WSL is already installed"
            return
        }
    }
    catch {
        # ignore and install WSL below
    }

    Write-Step "Installing WSL"
    & wsl.exe --install
    if ($LASTEXITCODE -ne 0) {
        throw "WSL installation failed. Please install WSL manually and rerun the script."
    }
    Write-Ok "WSL install started successfully"
}

function Ensure-DockerDesktop {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Ok "Docker is already installed"
        return $true
    }

    if ($SkipDockerInstall) {
        throw "Docker is not installed. Re-run without -SkipDockerInstall to install it automatically."
    }

    Install-WithWinget -PackageId "Docker.DockerDesktop" -DisplayName "Docker Desktop"

    $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Write-Step "Starting Docker Desktop"
        Start-Process $dockerExe
        Write-Ok "Docker Desktop launch command sent"
    }
    else {
        Write-Warn "Docker Desktop was installed but its executable path was not found. Please open Docker Desktop manually and rerun this script."
    }

    return $false
}

function Ensure-DockerRunning {
    $dockerAvailable = $false
    try {
        & docker info | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerAvailable = $true
        }
    }
    catch {
        $dockerAvailable = $false
    }

    if (-not $dockerAvailable) {
        if ($SkipDockerStart) {
            Write-Warn "Skipping Docker startup because -SkipDockerStart was supplied"
            return
        }

        $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerExe) {
            Write-Step "Starting Docker Desktop service"
            Start-Process $dockerExe
        }

        Write-Step "Waiting for Docker to become available"
        $attempts = 0
        do {
            Start-Sleep -Seconds 5
            try {
                & docker info | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $dockerAvailable = $true
                    break
                }
            }
            catch {}
            $attempts++
        } while ($attempts -lt 12)

        if (-not $dockerAvailable) {
            throw "Docker Desktop is installed but did not start correctly. Open Docker Desktop manually and run the script again."
        }
    }

    Write-Ok "Docker is running"
}

function Start-ProjectServices {
    if ($SkipDockerStart) {
        Write-Warn "Skipping Docker compose startup because -SkipDockerStart was supplied"
        return
    }

    Write-Step "Starting PostgreSQL and Redis with Docker Compose"
    & docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed. Please review the Docker output and rerun the script."
    }
    Write-Ok "Docker services started"
}

function Show-Urls {
    Write-Host "" 
    Write-Host "==================================================" -ForegroundColor Magenta
    Write-Host "Setup complete. Open the application here:" -ForegroundColor Magenta
    Write-Host "Web: http://localhost:3000" -ForegroundColor Green
    Write-Host "API: http://localhost:4000/api" -ForegroundColor Green
    Write-Host "PostgreSQL: localhost:5432" -ForegroundColor Green
    Write-Host "Redis: localhost:6379" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Magenta
}

Write-Step "Checking system prerequisites"
Ensure-NodeJs
Ensure-WslPrereqs
Ensure-DockerDesktop
Ensure-DockerRunning
Ensure-ProjectDependencies
Start-ProjectServices
Show-Urls
