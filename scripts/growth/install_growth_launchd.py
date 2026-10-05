#!/usr/bin/env python3
from pathlib import Path
import plistlib
import subprocess

import os

if os.environ.get("SPOONIE_ALLOW_LOCAL_CODEX_GROWTH") != "1":
    raise SystemExit(
        "Spoonie local Codex growth automation is disabled; explicit owner authorization required."
    )

HOME = Path.home()
ROOT = Path("/Users/ojihun/DEV/spoonie")
RUNNER = str(ROOT / "scripts/growth/run_growth_automation.sh")
LOGDIR = HOME / ".spoonie-growth-automation" / "logs"
LA = HOME / "Library" / "LaunchAgents"
LOGDIR.mkdir(parents=True, exist_ok=True)
LA.mkdir(parents=True, exist_ok=True)

jobs = {
    "com.spoonie.growth.discovery": (
        ["/bin/zsh", RUNNER, "discovery"],
        [
            {"Hour": 8, "Minute": 45},
            {"Hour": 14, "Minute": 15},
            {"Hour": 21, "Minute": 45},
        ],
    ),
    "com.spoonie.growth.creator": (
        ["/bin/zsh", RUNNER, "creator"],
        [
            *[
                {"Weekday": weekday, "Hour": hour, "Minute": minute}
                for weekday in range(1, 6)
                for hour, minute in ((10, 30), (16, 0))
            ],
        ],
    ),
    "com.spoonie.growth.media": (
        ["/bin/zsh", RUNNER, "media"],
        [
            {"Weekday": weekday, "Hour": 9, "Minute": 40}
            for weekday in range(1, 6)
        ],
    ),
    "com.spoonie.growth.network": (
        ["/bin/zsh", RUNNER, "network"],
        [
            {"Hour": 11, "Minute": 0},
            {"Hour": 19, "Minute": 0},
        ],
    ),
    "com.spoonie.growth.launch": (
        ["/bin/zsh", RUNNER, "launch"],
        {"Hour": 13, "Minute": 20},
    ),
    "com.spoonie.growth.referral": (
        ["/bin/zsh", RUNNER, "referral"],
        {"Hour": 13, "Minute": 45},
    ),
    "com.spoonie.growth.brand": (
        ["/bin/zsh", RUNNER, "brand"],
        [
            {"Weekday": 2, "Hour": 11, "Minute": 10},
            {"Weekday": 4, "Hour": 11, "Minute": 10},
        ],
    ),
    "com.spoonie.growth.strategy": (
        ["/bin/zsh", RUNNER, "strategy"],
        {"Hour": 14, "Minute": 35},
    ),
    "com.spoonie.growth.community": (
        ["/bin/zsh", RUNNER, "community"],
        [
            {"Hour": 12, "Minute": 30},
            {"Hour": 20, "Minute": 30},
        ],
    ),
    "com.spoonie.growth.review": (
        ["/bin/zsh", RUNNER, "review"],
        {"Hour": 22, "Minute": 30},
    ),
    "com.spoonie.growth.replywatch": (
        ["/bin/zsh", RUNNER, "replywatch"],
        {"Minute": 25},
    ),
}


retired_labels = [
    "com.spoonie.growth.acquisition",
]

uid = subprocess.check_output(["id", "-u"], text=True).strip()

for label in retired_labels:
    path = LA / f"{label}.plist"
    subprocess.run(
        ["launchctl", "bootout", f"gui/{uid}", str(path)],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if path.exists():
        path.unlink()
        print(f"retired {path}")

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
