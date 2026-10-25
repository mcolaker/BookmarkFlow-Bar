# BookmarkFlow Bar — Fast Windows UIA Automation Engine
# High-speed UI Automation & Auto-Confirm Engine for Windows Controls & Chromium Dialogs

param(
    [Parameter(Mandatory=$false)][string]$Action = "list",
    [Parameter(Mandatory=$false)][string]$Title = "",
    [Parameter(Mandatory=$false)][string]$Target = "",
    [Parameter(Mandatory=$false)][int]$Index = -1,
    [Parameter(Mandatory=$false)][int]$TimeoutMs = 5000
)

$src = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Windows.Automation;
using System.Threading;

public class FastUia {
    public delegate bool EnumDesktopWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenWindowStation(string name, bool inherit, uint access);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetProcessWindowStation(IntPtr hWinSta);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string name, uint flags, bool inherit, uint access);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumDesktopWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    private const uint MOUSEEVENTF_LEFTUP = 0x0004;

    public static void AttachDesktop() {
        IntPtr hwinsta = OpenWindowStation("winsta0", false, 0x037F);
        if (hwinsta != IntPtr.Zero) SetProcessWindowStation(hwinsta);
        IntPtr hdesk = OpenDesktop("default", 0, false, 0x01FF);
        if (hdesk != IntPtr.Zero) SetThreadDesktop(hdesk);
    }

    public static List<KeyValuePair<IntPtr, string>> GetWindows() {
        AttachDesktop();
        IntPtr hdesk = OpenDesktop("default", 0, false, 0x01FF);
        List<KeyValuePair<IntPtr, string>> res = new List<KeyValuePair<IntPtr, string>>();
        EnumDesktopWindows(hdesk, (hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string t = sb.ToString().Trim();
                if (!string.IsNullOrEmpty(t)) {
                    res.Add(new KeyValuePair<IntPtr, string>(hWnd, t));
                }
            }
            return true;
        }, IntPtr.Zero);
        return res;
    }

    public static IntPtr FindWindow(string titleQuery) {
        var wins = GetWindows();
        foreach (var w in wins) {
            if (w.Value.IndexOf(titleQuery, StringComparison.OrdinalIgnoreCase) >= 0) {
                return w.Key;
            }
        }
        return IntPtr.Zero;
    }

    public class ElementInfo {
        public int Index;
        public string Name;
        public string AutomationId;
        public string ControlType;
        public int X, Y, Width, Height;
        public AutomationElement Element;
    }

    public static List<ElementInfo> DumpTree(IntPtr hWnd) {
        List<ElementInfo> list = new List<ElementInfo>();
        Thread t = new Thread(() => {
            AttachDesktop();
            AutomationElement root = AutomationElement.FromHandle(hWnd);
            if (root == null) return;

            AutomationElementCollection elements = root.FindAll(TreeScope.Descendants, Condition.TrueCondition);
            int idx = 1;
            foreach (AutomationElement el in elements) {
                try {
                    string name = el.Current.Name ?? "";
                    string autoId = el.Current.AutomationId ?? "";
                    string cType = el.Current.ControlType.ProgrammaticName.Replace("ControlType.", "");
                    System.Windows.Rect rect = el.Current.BoundingRectangle;

                    if (!string.IsNullOrEmpty(name) || !string.IsNullOrEmpty(autoId)) {
                        list.Add(new ElementInfo {
                            Index = idx++,
                            Name = name,
                            AutomationId = autoId,
                            ControlType = cType,
                            X = (int)rect.X,
                            Y = (int)rect.Y,
                            Width = (int)rect.Width,
                            Height = (int)rect.Height,
                            Element = el
                        });
                    }
                } catch { }
            }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
        return list;
    }

    public static bool ClickElement(IntPtr hWnd, string targetName, int targetIndex) {
        bool success = false;
        Thread t = new Thread(() => {
            AttachDesktop();
            var elements = DumpTree(hWnd);
            ElementInfo target = null;
            if (targetIndex > 0 && targetIndex <= elements.Count) {
                target = elements[targetIndex - 1];
            } else if (!string.IsNullOrEmpty(targetName)) {
                target = elements.Find(e => e.Name.IndexOf(targetName, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                            e.AutomationId.IndexOf(targetName, StringComparison.OrdinalIgnoreCase) >= 0);
            }

            if (target != null) {
                Console.WriteLine("Clicking [" + target.Index + "] '" + target.Name + "' (" + target.ControlType + ") at [" + target.X + "," + target.Y + "]");
                
                // 1. Try UIA InvokePattern first
                try {
                    object pattern;
                    if (target.Element.TryGetCurrentPattern(InvokePattern.Pattern, out pattern)) {
                        ((InvokePattern)pattern).Invoke();
                        Console.WriteLine("Invoked via UIA InvokePattern!");
                        success = true;
                        return;
                    }
                } catch { }

                // 2. Try TogglePattern if checkbox/radio
                try {
                    object pattern;
                    if (target.Element.TryGetCurrentPattern(TogglePattern.Pattern, out pattern)) {
                        ((TogglePattern)pattern).Toggle();
                        Console.WriteLine("Toggled via UIA TogglePattern!");
                        success = true;
                        return;
                    }
                } catch { }

                // 3. Fallback: Hardware Mouse Click at center
                if (target.Width > 0 && target.Height > 0) {
                    int cx = target.X + target.Width / 2;
                    int cy = target.Y + target.Height / 2;
                    SetCursorPos(cx, cy);
                    Thread.Sleep(30);
                    mouse_event(MOUSEEVENTF_LEFTDOWN, (uint)cx, (uint)cy, 0, UIntPtr.Zero);
                    Thread.Sleep(50);
                    mouse_event(MOUSEEVENTF_LEFTUP, (uint)cx, (uint)cy, 0, UIntPtr.Zero);
                    Console.WriteLine("Clicked via hardware mouse event at (" + cx + "," + cy + ")");
                    success = true;
                }
            } else {
                Console.WriteLine("Target element not found: " + targetName);
            }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
        return success;
    }

    public static bool AutoConfirmChromeRemoteDebugging(int timeoutMs) {
        int elapsed = 0;
        const int step = 100;

        while (elapsed < timeoutMs) {
            var wins = GetWindows();
            foreach (var w in wins) {
                string title = w.Value ?? "";
                bool isChromeOrDebugWin = title.IndexOf("Chrome", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                          title.IndexOf("Uzaktan", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                          title.IndexOf("Remote", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                          title.IndexOf("Debugging", StringComparison.OrdinalIgnoreCase) >= 0;
                if (isChromeOrDebugWin) {
                    var elements = DumpTree(w.Key);
                    bool hasDebugPrompt = title.IndexOf("Uzaktan", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                          title.IndexOf("Remote", StringComparison.OrdinalIgnoreCase) >= 0;
                    if (!hasDebugPrompt) {
                        foreach (var checkEl in elements) {
                            string n = checkEl.Name ?? "";
                            if (n.IndexOf("Uzaktan hata ayıklama", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                n.IndexOf("remote debugging", StringComparison.OrdinalIgnoreCase) >= 0) {
                                hasDebugPrompt = true;
                                break;
                            }
                        }
                    }
                    if (!hasDebugPrompt) continue;

                    foreach (var el in elements) {
                        if (el.ControlType.Equals("Button", StringComparison.OrdinalIgnoreCase)) {
                            string name = (el.Name ?? "").Trim();
                            if (name.Equals("İzin ver", StringComparison.OrdinalIgnoreCase) ||
                                name.Equals("Allow", StringComparison.OrdinalIgnoreCase)) {
                                
                                if (ClickElement(w.Key, "", el.Index)) {
                                    Console.WriteLine("FastUia Auto-Confirmed Chrome dialog with button [" + el.Index + "] " + el.Name);
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            Thread.Sleep(step);
            elapsed += step;
        }
        return false;
    }
}
"@

Add-Type -TypeDefinition $src -ReferencedAssemblies "UIAutomationClient", "UIAutomationTypes", "WindowsBase"

switch ($Action.ToLower()) {
    "list" {
        $wins = [FastUia]::GetWindows()
        Write-Output "=== Active Windows ($($wins.Count)) ==="
        foreach ($w in $wins) {
            Write-Output "0x$($w.Key.ToString('X8')) | $($w.Value)"
        }
    }
    "dump" {
        if (-not $Title) { Write-Error "Please provide -Title"; exit 1 }
        $hwnd = [FastUia]::FindWindow($Title)
        if ($hwnd -eq [IntPtr]::Zero) { Write-Error "Window not found: $Title"; exit 1 }
        Write-Output "Dumping elements for: 0x$($hwnd.ToString('X8'))"
        $elems = [FastUia]::DumpTree($hwnd)
        foreach ($e in $elems) {
            Write-Output "[$($e.Index)] $($e.ControlType.PadRight(12)) '$($e.Name)' (Id: $($e.AutomationId)) Rect: [$($e.X),$($e.Y),$($e.Width),$($e.Height)]"
        }
    }
    "click" {
        if (-not $Title) { Write-Error "Please provide -Title"; exit 1 }
        $hwnd = [FastUia]::FindWindow($Title)
        if ($hwnd -eq [IntPtr]::Zero) { Write-Error "Window not found: $Title"; exit 1 }
        [FastUia]::ClickElement($hwnd, $Target, $Index)
    }
    "auto-confirm" {
        $res = [FastUia]::AutoConfirmChromeRemoteDebugging($TimeoutMs)
        if ($res) {
            Write-Output "AUTO_CONFIRM_SUCCESS"
            exit 0
        } else {
            Write-Output "AUTO_CONFIRM_NONE_OR_TIMEOUT"
            exit 0
        }
    }
}
