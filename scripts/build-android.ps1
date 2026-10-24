$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Web asset build failed' }
    $androidSdk = $env:ANDROID_HOME
    if (-not $androidSdk) { $androidSdk = $env:ANDROID_SDK_ROOT }
    if (-not $androidSdk) { $androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    if (-not (Test-Path -LiteralPath $androidSdk)) { throw 'Android SDK not found. Set ANDROID_HOME.' }
    $sdkProperty = $androidSdk.Replace('\', '/').Replace(':', '\:')
    [IO.File]::WriteAllText((Join-Path $projectRoot 'android\local.properties'), "sdk.dir=$sdkProperty`n", [Text.UTF8Encoding]::new($false))
    $webAssets = Join-Path $projectRoot 'android\app\src\main\assets\www'
    if (Test-Path -LiteralPath $webAssets) {
        $resolvedAssets = (Resolve-Path -LiteralPath $webAssets).Path
        $allowedAssets = [IO.Path]::GetFullPath((Join-Path $projectRoot 'android\app\src\main\assets\www'))
        if ($resolvedAssets -ne $allowedAssets -or -not $resolvedAssets.StartsWith($projectRoot + '\')) { throw 'Asset path validation failed' }
        Remove-Item -LiteralPath $resolvedAssets -Recurse -Force
    }
    New-Item -ItemType Directory -Path $webAssets -Force | Out-Null
    Copy-Item -Path (Join-Path $projectRoot 'dist\*') -Destination $webAssets -Recurse
    Push-Location (Join-Path $projectRoot 'android')
    try {
        if (Test-Path '.\gradlew.bat') { & .\gradlew.bat --console=plain assembleDebug lintDebug } else { & gradle.bat --console=plain assembleDebug lintDebug }
        if ($LASTEXITCODE -ne 0) { throw 'Android build or lint failed' }
    } finally { Pop-Location }
    $output = Join-Path $projectRoot 'artifacts'
    New-Item -ItemType Directory -Path $output -Force | Out-Null
    $apk = Join-Path $output 'yixu-wardrobe-1.0.0.apk'
    Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk') -Destination $apk -Force
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($apk))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
    [IO.File]::WriteAllText((Join-Path $output 'yixu-wardrobe-1.0.0.sha256'), "$hash  yixu-wardrobe-1.0.0.apk`n", [Text.UTF8Encoding]::new($false))
    Write-Output "SHA256: $hash"
    Write-Output "APK: $apk"
} finally { Pop-Location }
