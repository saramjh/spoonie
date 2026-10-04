#!/usr/bin/env python3
from pathlib import Path
import plistlib
import subprocess

HOME = Path.home()
ROOT = Path("/Users/ojihun/DEV/spoonie")
RUNNER = str(ROOT / "scripts/growth/run_growth_automation.sh")
LOGDIR = HOME / ".spoonie-growth-automation" / "logs"
LA = HOME / "Library" / "LaunchAgents"
LOGDIR.mkdir(parents=True, exist_ok=True)
LA.mkdir(parents=True, exist_ok=True)

jobs = {
    "com.spoonie.growth.acquisition": (
        ["/bin/zsh", RUNNER, "acquisition"],
        {"Hour": 10, "Minute": 0},
    ),
    "com.spoonie.growth.review": (
        ["/bin/zsh", RUNNER, "review"],
        {"Hour": 19, "Minute": 0},
    ),
    "com.spoonie.growth.replywatch": (
        ["/bin/zsh", RUNNER, "replywatch"],
        {"Minute": 25},
    ),
}

uid = subprocess.check_output(["id", "-u"], text=True).strip()

for label, (args, calendar) in jobs.items():
    path = LA / f"{label}.plist"
    payload = {
        "Label": label,
        "ProgramArguments": args,
        "WorkingDirectory": str(ROOT),
        "StartCalendarInterval": calendar,
        "RunAtLoad": False,
        "StandardOutPath": str(LOGDIR / f"{label}.stdout.log"),
        "StandardErrorPath": str(LOGDIR / f"{label}.stderr.log"),
        "ProcessType": "Background",
    }
    with path.open("wb") as f:
        plistlib.dump(payload, f, sort_keys=False)

    subprocess.run(
        ["launchctl", "bootout", f"gui/{uid}", str(path)],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(["launchctl", "bootstrap", f"gui/{uid}", str(path)], check=True)
    subprocess.run(["launchctl", "enable", f"gui/{uid}/{label}"], check=True)
    print(path)
