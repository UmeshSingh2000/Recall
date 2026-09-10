Add-Type @"
using System;
using System.Runtime.InteropServices;

public class HotKey {
    [DllImport("user32.dll")]
    public static extern bool RegisterHotKey(
        IntPtr hWnd,
        int id,
        uint fsModifiers,
        uint vk
    );

    [DllImport("user32.dll")]
    public static extern bool UnregisterHotKey(
        IntPtr hWnd,
        int id
    );

    [DllImport("user32.dll")]
    public static extern int GetMessage(
        out MSG lpMsg,
        IntPtr hWnd,
        uint wMsgFilterMin,
        uint wMsgFilterMax
    );

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MSG {
        public IntPtr hwnd;
        public uint message;
        public UIntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
    }
}
"@

# Ctrl + Shift + C
$MOD_CONTROL = 0x0002
$MOD_SHIFT   = 0x0004
$MOD_NOREPEAT = 0x4000

# C = 0x43
$VK_C = 0x43

$id = 1

$result = [HotKey]::RegisterHotKey(
    [IntPtr]::Zero,
    $id,
    $MOD_CONTROL -bor $MOD_SHIFT -bor $MOD_NOREPEAT,
    $VK_C
)

if (-not $result) {
    Write-Error "Failed to register Ctrl+Shift+C"
    exit 1
}

Write-Output "READY"
[Console]::Out.Flush()

$msg = New-Object HotKey+MSG

while ([HotKey]::GetMessage(
    [ref]$msg,
    [IntPtr]::Zero,
    0,
    0
) -gt 0) {

    # WM_HOTKEY = 0x0312
    if ($msg.message -eq 0x0312) {
        Write-Output "HOTKEY"
        [Console]::Out.Flush()
    }
}

[HotKey]::UnregisterHotKey(
    [IntPtr]::Zero,
    $id
)