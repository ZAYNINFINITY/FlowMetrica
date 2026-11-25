<#
.SYNOPSIS
    FlowMetrica Control - a dependency-free WinForms launcher for the local app.
.DESCRIPTION
    Starts/stops ONLY FlowMetrica listeners, checks health, toggles MATLAB live,
    and runs npm scripts. MATLAB credentials stay in this process and are only
    inherited by child servers - they are never written to disk or logged.
#>
[CmdletBinding()]
param([switch]$SelfTest)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$script:repoRoot = Split-Path -Parent $PSScriptRoot
$script:ports = @(3001, 5173)
$script:baseUrl = 'http://localhost:3001'
$script:dashboardUrl = "$script:baseUrl/#/dashboard"
$script:appVersion = 'unknown'
$script:serverRunning = $false
$script:matlabConfigured = $false
$script:matlabAvailable = $false
$script:matlabLiveEnabled = $false
$script:matlabReason = ''
$script:txtOutput = $null
$script:actionControls = @()

# Safe field access: /api/matlab/setup may not expose `execution` yet.
function Get-Field($Object, [string[]]$Path, $Default = $null) {
    $current = $Object
    foreach ($part in $Path) {
        if ($null -eq $current) { return $Default }
        $prop = $current.PSObject.Properties[$part]
        if ($null -eq $prop) { return $Default }
        $current = $prop.Value
    }
    return $current
}
function Short-Text([string]$Text, [int]$Max = 160) {
    if ($Text.Length -le $Max) { return $Text }
    return $Text.Substring(0, $Max) + '...'
}

# Never echo the token, even if an npm script happens to print environment data.
function Protect-Output([string]$Text) {
    $token = [Environment]::GetEnvironmentVariable('MATLAB_REST_TOKEN', 'Process')
    if (-not [string]::IsNullOrEmpty($token)) { return $Text.Replace($token, '[REDACTED]') }
    return $Text
}
function Append-Output([string]$Text) {
    if ($null -eq $script:txtOutput) { Write-Host (Protect-Output $Text); return }
    $script:txtOutput.AppendText((Protect-Output $Text) + [Environment]::NewLine)
    $script:txtOutput.SelectionStart = $script:txtOutput.TextLength
    $script:txtOutput.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}
function Set-Busy([bool]$Busy) {
    foreach ($control in $script:actionControls) { $control.Enabled = -not $Busy }
    [System.Windows.Forms.Application]::DoEvents()
}
function Invoke-Action([string]$Name, [scriptblock]$Work) {
    Set-Busy $true
    Append-Output "--- $Name ---"
    try { & $Work }
    catch {
        $message = $_.Exception.Message
        Append-Output "ERROR: $message"
        [System.Windows.Forms.MessageBox]::Show($message, "FlowMetrica: $Name failed",
            [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    }
    finally { Set-Busy $false }
}
function Confirm-Action([string]$Message, [string]$Caption) {
    $answer = [System.Windows.Forms.MessageBox]::Show($Message, $Caption,
        [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
    return ($answer -eq [System.Windows.Forms.DialogResult]::Yes)
}

# Protect this launcher's own process tree: a PID inherited from the .bat must
# never be mistaken for a stale server even if it happens to own a port.
function Get-ProtectedPids {
    $protected = @{}
    $current = $PID
    for ($depth = 0; $depth -lt 8 -and $current -gt 0; $depth++) {
        $protected[[int]$current] = $true
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $current" -ErrorAction SilentlyContinue
        if ($null -eq $proc -or $proc.ParentProcessId -le 0) { break }
        $current = [int]$proc.ParentProcessId
    }
    return $protected
}

# A port match alone is NOT enough: many tools use 3001/5173. We require a
# FlowMetrica command line (our server/index.js, or our own vite install), and
# exclude our ancestors, so unrelated development servers are left untouched.
function Get-FlowMetricaListeners($Protected) {
    $found = @()
    try {
        $connections = @(Get-NetTCPConnection -LocalPort $script:ports -State Listen -ErrorAction Stop)
    } catch {
        Append-Output "Port query unavailable: $($_.Exception.Message)"
        return $found
    }
    $rootKey = $script:repoRoot.Replace('/', '\').TrimEnd('\').ToLowerInvariant()
    foreach ($connection in $connections) {
        $procId = [int]$connection.OwningProcess
        if ($procId -le 0 -or $Protected.ContainsKey($procId)) { continue }
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        if ($null -eq $proc -or [string]::IsNullOrWhiteSpace($proc.CommandLine)) { continue }
        $command = $proc.CommandLine.Replace('/', '\').ToLowerInvariant()
        # npm start shows only "node server/index.js", so the port (3001) is the
        # second half of its fingerprint. Vite is matched only inside OUR repo.
        $isOurs = ($connection.LocalPort -eq 3001 -and $command -match 'server[\\/]index\.js')
        if (-not $isOurs -and $connection.LocalPort -eq 5173 -and
            $command -match 'vite' -and $command.Contains($rootKey)) { $isOurs = $true }
        if ($isOurs) { $found += [pscustomobject]@{ Id = $procId; Command = $proc.CommandLine } }
    }
    return $found
}
function Clear-FlowMetricaProcesses {
    $listeners = @(Get-FlowMetricaListeners (Get-ProtectedPids))
    if ($listeners.Count -eq 0) { Append-Output 'No FlowMetrica listeners found.'; return }
    foreach ($listener in $listeners) {
        Append-Output ("Stopping PID {0}: {1}" -f $listener.Id, (Short-Text $listener.Command))
        try { Stop-Process -Id $listener.Id -Force -ErrorAction Stop }
        catch { Append-Output "Could not stop PID $($listener.Id): $($_.Exception.Message)" }
    }
    Start-Sleep -Milliseconds 700 # Let the sockets close before rebinding them.
}
function Test-Health {
    try {
        $null = Invoke-RestMethod -Uri "$script:baseUrl/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        return $true
    } catch { return $false }
}
function Refresh-Status {
    $health = $null
    $setup = $null
    try { $health = Invoke-RestMethod -Uri "$script:baseUrl/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop } catch { }
    try { $setup = Invoke-RestMethod -Uri "$script:baseUrl/api/matlab/setup" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop } catch { }
    $script:serverRunning = ($null -ne $health)
    if ($script:serverRunning) { $script:appVersion = [string](Get-Field $health @('appVersion') 'unknown') }
    $bridge = Get-Field $setup @('bridge')
    if ($null -eq $bridge) { $bridge = Get-Field $health @('services', 'matlabLive') }
    $script:matlabConfigured = [bool](Get-Field $bridge @('configured') $false)
    $script:matlabAvailable = [bool](Get-Field $bridge @('available') $false)
    $script:matlabReason = [string](Get-Field $bridge @('reason') '')
    $execution = Get-Field $setup @('execution')
    if ($null -ne $execution -and $null -ne $execution.PSObject.Properties['matlabLiveEnabled']) {
        $script:matlabLiveEnabled = [bool]$execution.matlabLiveEnabled
    } else {
        # Until the new endpoint lands, server-reported availability is our best state hint.
        $script:matlabLiveEnabled = $script:matlabAvailable
    }
    $state = if ($script:serverRunning) { 'RUNNING' } else { 'STOPPED' }
    $configured = if ($script:matlabConfigured) { 'configured' } else { 'not configured' }
    $available = if ($script:matlabAvailable) { 'available' } else { 'not available' }
    $live = if ($script:matlabLiveEnabled) { 'ON' } else { 'OFF' }
    $version = if ($script:serverRunning) { $script:appVersion } else { 'n/a' }
    $reason = if ($script:matlabReason) { " | reason: $($script:matlabReason)" } else { '' }
    $script:lblStatus.Text = "Server: $state ($script:baseUrl) | version: $version`n" +
        "MATLAB bridge: $configured, $available (desktop MATLAB REST Function Service only - MATLAB Online cannot be used live)$reason`n" +
        "MATLAB live: $live"
    Append-Output "Status refreshed: server=$state, matlab=$configured/$available, live=$live"
}
function Start-Server {
    Clear-FlowMetricaProcesses
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $child = Start-Process -FilePath $npm -ArgumentList 'start' -WorkingDirectory $script:repoRoot -PassThru -WindowStyle Minimized
    Append-Output ("Started npm start from {0} (launcher PID {1})" -f $script:repoRoot, $child.Id)
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    do {
        if (Test-Health) { break }
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.Application]::DoEvents() # Keep the GUI from freezing while waiting.
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not (Test-Health)) {
        Append-Output 'Health check did not succeed within 30s - check the minimized npm window for errors.'
        Refresh-Status
        return
    }
    Refresh-Status
    Start-Process -FilePath $script:dashboardUrl
    Append-Output "Opened $script:dashboardUrl"
}
function Run-NpmScript([string]$Arguments, [string]$Label) {
    $previous = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue' # npm writes progress to stderr; that is not a crash.
        $output = (& npm $Arguments.Split(' ') 2>&1 | Out-String)
        $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previous }
    Append-Output $output.TrimEnd()
    Append-Output ("$Label exit code: $exitCode")
    if ($exitCode -ne 0) {
        [System.Windows.Forms.MessageBox]::Show("$Label failed (exit $exitCode). See the output box for details.",
            'FlowMetrica', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    }
}
function Set-MatlabEnvironment([bool]$Apply) {
    $names = @('MATLAB_REST_URL', 'MATLAB_REST_TOKEN', 'MATLAB_REST_CA')
    if ($Apply) {
        # 'Process' scope is deliberate: no User/Machine registry write, no file.
        [Environment]::SetEnvironmentVariable('MATLAB_REST_URL', $script:txtUrl.Text.Trim(), 'Process')
        [Environment]::SetEnvironmentVariable('MATLAB_REST_TOKEN', $script:txtToken.Text, 'Process')
        [Environment]::SetEnvironmentVariable('MATLAB_REST_CA', $script:txtCa.Text.Trim(), 'Process')
        Append-Output 'MATLAB settings applied to this process only; child server will inherit them.'
    } else {
        foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
        $script:txtUrl.Text = ''
        $script:txtToken.Text = ''
        $script:txtCa.Text = ''
        Append-Output 'MATLAB settings cleared from this process.'
    }
}
function Set-MatlabLive([bool]$Enable) {
    $body = @{ enabled = $Enable } | ConvertTo-Json -Compress
    $response = $null
    try {
        $response = Invoke-RestMethod -Method Post -Uri "$script:baseUrl/api/matlab/enable" `
            -ContentType 'application/json' -Body $body -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    } catch {
        $code = $null
        if ($null -ne $_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        if ($code -eq 404) {
            Append-Output 'MATLAB enable endpoint is not available on this server build yet (HTTP 404).'
            [System.Windows.Forms.MessageBox]::Show('This server build does not expose /api/matlab/enable yet.' +
                "`nWait for the control API update, then refresh status.", 'MATLAB live',
                [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
            Refresh-Status
            return
        }
        throw
    }
    Append-Output ("MATLAB enable response: {0}" -f (ConvertTo-Json $response -Compress -Depth 4))
    $reason = [string](Get-Field $response @('reason') '')
    if (-not $reason) { $reason = [string](Get-Field $response @('error', 'reason') '') }
    if (-not $reason) { $reason = [string](Get-Field $response @('message') '') }
    if (-not $reason) { $reason = [string](Get-Field $response @('error', 'message') '') }
    $status = [string](Get-Field $response @('status') '')
    $enabledNow = Get-Field $response @('enabled')
    $availableNow = Get-Field $response @('available')
    if ($Enable -and (($status -eq 'error') -or ($enabledNow -eq $false) -or ($availableNow -eq $false))) {
        if (-not $reason) { $reason = $script:matlabReason }
        Append-Output "MATLAB live could not be enabled: $reason"
        [System.Windows.Forms.MessageBox]::Show("MATLAB live could not be enabled.`n$reason", 'MATLAB live',
            [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
    }
    Refresh-Status
}
function Invoke-SelfTest {
    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($PSCommandPath, [ref]$tokens, [ref]$errors)
    $repoOk = Test-Path -LiteralPath $script:repoRoot -PathType Container
    $packageOk = Test-Path -LiteralPath (Join-Path $script:repoRoot 'package.json') -PathType Leaf
    try { $listeners = @(Get-NetTCPConnection -LocalPort $script:ports -State Listen -ErrorAction Stop); $portsOk = $true }
    catch { $listeners = @(); $portsOk = $false }
    try { $npm = (Get-Command npm.cmd -ErrorAction Stop).Source } catch { $npm = '' }
    $lines = @(
        "FlowMetrica Control self-test ($script:repoRoot)",
        "Syntax:            $(if ($errors.Count -eq 0) { 'PASS' } else { 'FAIL: ' + ($errors[0].Message) })",
        "Repo path:         $(if ($repoOk) { 'PASS' } else { 'FAIL' })",
        "package.json:      $(if ($packageOk) { 'PASS' } else { 'FAIL' })",
        "Ports queryable:   $(if ($portsOk) { "PASS ($($listeners.Count) listening)" } else { 'FAIL' })",
        "npm.cmd:           $(if ($npm) { "PASS ($npm)" } else { 'FAIL' })",
        "PowerShell:        PASS ($($PSVersionTable.PSVersion))"
    )
    $lines | ForEach-Object { Write-Host $_ }
    $ok = $errors.Count -eq 0 -and $repoOk -and $packageOk -and $portsOk -and $npm
    if (-not $ok) { exit 1 }
    exit 0
}

if ($SelfTest) { Invoke-SelfTest }

# npm test/build use the process CWD, so anchor it to the repo before any action.
Set-Location -LiteralPath $script:repoRoot
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = 'FlowMetrica Control'
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.ClientSize = New-Object System.Drawing.Size(780, 670)
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(18, 14)
$lblStatus.Size = New-Object System.Drawing.Size(744, 100)
$lblStatus.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$form.Controls.Add($lblStatus)
$script:lblStatus = $lblStatus
function New-Button([string]$Text, [int]$X, [int]$Y, [int]$Width, $Parent = $form) {
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text; $button.Location = New-Object System.Drawing.Point($X, $Y)
    $button.Size = New-Object System.Drawing.Size($Width, 32); $Parent.Controls.Add($button)
    $script:actionControls += $button
    return $button
}
$btnStart = New-Button 'Start' 18 124 130
$btnStop = New-Button 'Stop' 156 124 130
$btnRestart = New-Button 'Restart' 294 124 130
$btnBrowser = New-Button 'Open in browser' 432 124 150
$btnRefresh = New-Button 'Refresh status' 590 124 150
$btnTests = New-Button 'Run tests' 18 164 130
$btnBuild = New-Button 'Build' 156 164 130
$btnExit = New-Button 'Exit' 294 164 130

$matlabBox = New-Object System.Windows.Forms.GroupBox
$matlabBox.Text = 'MATLAB bridge (desktop MATLAB REST Function Service only - MATLAB Online cannot be used live)'
$matlabBox.Location = New-Object System.Drawing.Point(18, 206)
$matlabBox.Size = New-Object System.Drawing.Size(744, 196)
$form.Controls.Add($matlabBox)
foreach ($field in @(@('REST URL', 30), @('Token', 60), @('CA cert path', 90))) {
    $caption = New-Object System.Windows.Forms.Label
    $caption.Text = $field[0]; $caption.Location = New-Object System.Drawing.Point(12, ($field[1] + 3))
    $caption.Size = New-Object System.Drawing.Size(96, 20); $matlabBox.Controls.Add($caption)
    $text = New-Object System.Windows.Forms.TextBox
    $text.Location = New-Object System.Drawing.Point(112, $field[1]); $text.Size = New-Object System.Drawing.Size(618, 22)
    if ($field[0] -eq 'Token') { $text.PasswordChar = [char]'*' } # Token must never be visible on screen.
    $matlabBox.Controls.Add($text)
    switch ($field[0]) { 'REST URL' { $script:txtUrl = $text } 'Token' { $script:txtToken = $text } 'CA cert path' { $script:txtCa = $text } }
}
$btnApply = New-Button 'Apply & Restart' 112 132 170 $matlabBox
$btnClear = New-Button 'Clear & Restart' 290 132 160 $matlabBox
$btnLive = New-Button 'MATLAB live ON/OFF' 458 132 200 $matlabBox

$lblOutput = New-Object System.Windows.Forms.Label
$lblOutput.Text = 'Output (errors are never hidden)'; $lblOutput.Location = New-Object System.Drawing.Point(18, 412)
$lblOutput.Size = New-Object System.Drawing.Size(744, 20); $form.Controls.Add($lblOutput)
$txtOutput = New-Object System.Windows.Forms.TextBox
$txtOutput.Multiline = $true; $txtOutput.ReadOnly = $true; $txtOutput.ScrollBars = [System.Windows.Forms.ScrollBars]::Both
$txtOutput.Location = New-Object System.Drawing.Point(18, 434); $txtOutput.Size = New-Object System.Drawing.Size(744, 216)
$txtOutput.Font = New-Object System.Drawing.Font('Consolas', 9); $form.Controls.Add($txtOutput); $script:txtOutput = $txtOutput

$btnStart.add_Click({ Invoke-Action 'Start' { Start-Server } })
$btnStop.add_Click({ if (Confirm-Action 'Stop FlowMetrica processes on ports 3001/5173?' 'Stop FlowMetrica') { Invoke-Action 'Stop' { Clear-FlowMetricaProcesses; Refresh-Status } } })
$btnRestart.add_Click({ if (Confirm-Action 'Restart FlowMetrica? Matching local processes will be stopped.' 'Restart FlowMetrica') { Invoke-Action 'Restart' { Start-Server } } })
$btnBrowser.add_Click({ Invoke-Action 'Open in browser' { Start-Process -FilePath $script:dashboardUrl; Append-Output "Opened $script:dashboardUrl" } })
$btnRefresh.add_Click({ Invoke-Action 'Refresh status' { Refresh-Status } })
$btnTests.add_Click({ Invoke-Action 'Run tests' { Run-NpmScript 'test' 'npm test' } })
$btnBuild.add_Click({ Invoke-Action 'Build' { Run-NpmScript 'run build' 'npm run build' } })
$btnExit.add_Click({ $form.Close() })
$btnApply.add_Click({ Invoke-Action 'Apply MATLAB settings & restart' { Set-MatlabEnvironment $true; Start-Server } })
$btnClear.add_Click({ if (Confirm-Action 'Clear MATLAB settings and restart the server?' 'Clear MATLAB settings') { Invoke-Action 'Clear MATLAB settings & restart' { Set-MatlabEnvironment $false; Start-Server } } })
$btnLive.add_Click({ Invoke-Action 'MATLAB live toggle' { Set-MatlabLive (-not $script:matlabLiveEnabled) } })

Refresh-Status
[System.Windows.Forms.Application]::Run($form)
