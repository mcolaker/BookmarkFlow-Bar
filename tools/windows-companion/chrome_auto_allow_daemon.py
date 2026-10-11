import ctypes
import os
import sys
import time
from pathlib import Path

# Ensure thread is attached to the interactive default desktop
user32 = ctypes.windll.user32
h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF) # DESKTOP_ALL_ACCESS
if h_desk:
    user32.SetThreadDesktop(h_desk)

import uiautomation as auto

LOG_DIR = Path(os.path.expanduser("~")) / ".config" / "browser-harness"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "auto_allow.log"

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{ts}] {msg}"
    if sys.stdout is not None:
        try:
            print(formatted, flush=True)
        except Exception:
            pass
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

ALLOW_BUTTON_NAMES = [
    "İzin ver",
    "İzin Ver",
    "Allow",
    "Zulassen",
    "Autoriser",
    "Permitir",
    "Consenti"
]

def check_and_click_allow():
    root = auto.GetRootControl()
    clicked_any = False
    
    for win in root.GetChildren():
        if win.ClassName != "Chrome_WidgetWin_1":
            continue
            
        win_name = win.Name or ""
        
        # 1. Check nested Chrome BrowserRootView / bubble dialogs
        try:
            for child in win.GetChildren():
                for sub in child.GetChildren():
                    sub_name = (sub.Name or "").lower()
                    if any(k in sub_name for k in ["hata ayıklama", "remote debugging", "devtools", "izin"]):
                        for bname in ALLOW_BUTTON_NAMES:
                            btn = sub.ButtonControl(searchDepth=7, Name=bname)
                            if btn.Exists(0, 0):
                                log(f"Tespit (Gömülü Diyalog): '{bname}' butonu yakalandı ('{sub.Name}')")
                                try:
                                    inv = btn.GetInvokePattern()
                                    if inv:
                                        inv.Invoke()
                                        log(f"Başarılı: '{bname}' InvokePattern ile tıklandı!")
                                    else:
                                        btn.Click()
                                        log(f"Başarılı: '{bname}' Click ile tıklandı!")
                                    clicked_any = True
                                    time.sleep(1.0)
                                    break
                                except Exception as e:
                                    log(f"Invoke hatası ({e}), Click deneniyor...")
                                    btn.Click()
                                    log(f"Başarılı: '{bname}' Click ile tıklandı!")
                                    clicked_any = True
                                    time.sleep(1.0)
                                    break
                        if clicked_any:
                            break
                if clicked_any:
                    break
        except Exception:
            pass

        if clicked_any:
            break

        # 2. Check if top-level window is a debug/permission prompt
        is_debug_dialog = any(k in win_name.lower() for k in [
            "remote debugging",
            "hata ayıklama",
            "devtools",
            "allow",
            "izin"
        ])
        
        # 3. Search for Allow button in descendants
        try:
            for btn_name in ALLOW_BUTTON_NAMES:
                btn = win.ButtonControl(searchDepth=6, Name=btn_name)
                if btn.Exists(0, 0):
                    parent = btn.GetParentControl()
                    dialog_text = ""
                    if parent:
                        dialog_text = parent.Name or ""
                        for child in parent.GetChildren():
                            if child.ControlTypeName == "TextControl":
                                dialog_text += " " + (child.Name or "")
                                
                    is_relevant = (
                        is_debug_dialog or
                        any(k in dialog_text.lower() for k in [
                            "remote debugging",
                            "hata ayıklama",
                            "devtools",
                            "incoming",
                            "gelen",
                            "bağlantı",
                            "connection"
                        ]) or
                        (win.BoundingRectangle.width < 600 and win.BoundingRectangle.height < 400)
                    )
                    
                    if is_relevant:
                        log(f"Tespit: '{btn_name}' butonu yakalandı (Pencere: '{win_name}', Metin: '{dialog_text.strip()[:80]}')")
                        try:
                            inv = btn.GetInvokePattern()
                            if inv:
                                inv.Invoke()
                                log(f"Başarılı: '{btn_name}' butonuna InvokePattern ile tıklandı!")
                            else:
                                btn.Click()
                                log(f"Başarılı: '{btn_name}' butonuna Click ile tıklandı!")
                            clicked_any = True
                            time.sleep(1.0)
                            break
                        except Exception as e:
                            log(f"Invoke hatası: {e}")
                            btn.Click()
                            log(f"Yedek: Click ile tıklandı.")
                            clicked_any = True
                            time.sleep(1.0)
                            break
        except Exception:
            pass
            
    return clicked_any

def run_loop():
    log("Chrome 'Allow remote debugging' Otomatik İzin Verici Başlatıldı.")
    last_heartbeat = 0
    
    while True:
        try:
            if h_desk:
                user32.SetThreadDesktop(h_desk)
                
            check_and_click_allow()
            
            now = time.time()
            if now - last_heartbeat > 3600:
                log("Servis çalışıyor ve aktif izlemede (0.25s periyot).")
                last_heartbeat = now
                
            time.sleep(0.25)
        except KeyboardInterrupt:
            log("Servis kullanıcı tarafından durduruldu.")
            break
        except Exception:
            time.sleep(1.0)

if __name__ == "__main__":
    if "--once" in sys.argv:
        clicked = check_and_click_allow()
        if sys.stdout is not None:
            print("Clicked:", clicked)
    else:
        run_loop()
