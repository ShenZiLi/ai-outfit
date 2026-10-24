$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$androidSdk = $env:ANDROID_HOME
if (-not $androidSdk) { $androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$imagePath = Join-Path $androidSdk 'system-images\android-36\google_apis\x86_64'
if (-not (Test-Path -LiteralPath $imagePath)) { throw 'Install system-images;android-36;google_apis;x86_64 first.' }
$devicePath = Join-Path $projectRoot '.device\yixu-api36.avd'
$iniPath = Join-Path $env:USERPROFILE '.android\avd\YixuWardrobe_API36.ini'
New-Item -ItemType Directory -Path $devicePath -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $devicePath 'config.ini'))) {
    $config = @"
AvdId=YixuWardrobe_API36
avd.ini.displayname=Yixu Wardrobe API36
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=4
hw.ramSize=2048
hw.lcd.width=1080
hw.lcd.height=2400
hw.lcd.density=420
hw.gpu.enabled=yes
hw.gpu.mode=auto
hw.keyboard=yes
hw.camera.back=virtualscene
hw.camera.front=emulated
hw.sensors.orientation=yes
disk.dataPartition.size=4G
image.sysdir.1=$imagePath\
tag.id=google_apis
tag.display=Google APIs
PlayStore.enabled=false
showDeviceFrame=no
"@
    [IO.File]::WriteAllText((Join-Path $devicePath 'config.ini'), $config, [Text.UTF8Encoding]::new($false))
}
if (-not (Test-Path -LiteralPath $iniPath)) {
    [IO.File]::WriteAllText($iniPath, "avd.ini.encoding=UTF-8`npath=$devicePath`ntarget=android-36`n", [Text.UTF8Encoding]::new($false))
}
$adb = Join-Path $androidSdk 'platform-tools\adb.exe'
$running = & $adb devices
if ($running -match 'emulator-5582\s+device') { Write-Output 'Yixu emulator already running on 5582'; exit 0 }
$process = Start-Process -FilePath (Join-Path $androidSdk 'emulator\emulator.exe') -ArgumentList '-avd YixuWardrobe_API36 -port 5582 -no-audio -no-boot-anim -no-window -no-snapshot -gpu host -feature -Vulkan' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $devicePath 'emulator-output.log') -RedirectStandardError (Join-Path $devicePath 'emulator-errors.log')
Write-Output "Yixu emulator starting. PID: $($process.Id), ADB serial: emulator-5582"
