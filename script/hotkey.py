#!/usr/bin/env python3
"""Global Ctrl+Alt+Space listener for Linux (X11 and Wayland).

Uses evdev when /dev/input is accessible. Falls back to a GNOME custom
keybinding on Wayland when evdev is unavailable.
"""

from __future__ import annotations

import ast
import os
import select
import signal
import subprocess
import sys
from pathlib import Path

GNOME_KEY_PATH = (
    "/org/gnome/settings-daemon/plugins/media-keys/"
    "custom-keybindings/recall-clipboard/"
)


def emit_ready() -> None:
    print("READY", flush=True)


def emit_hotkey() -> None:
    print("HOTKEY", flush=True)


def emit_error(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def can_use_evdev() -> bool:
    try:
        from evdev import InputDevice, ecodes, list_devices

        for device_path in list_devices():
            device = InputDevice(device_path)
            capabilities = device.capabilities()
            if ecodes.EV_KEY not in capabilities:
                continue
            if ecodes.KEY_SPACE in capabilities[ecodes.EV_KEY]:
                return True
    except ImportError:
        emit_error(
            "Python package 'evdev' is not installed. "
            "Install it with: pip install evdev"
        )
    except Exception:
        pass

    return False


def listen_with_evdev() -> None:
    from evdev import InputDevice, ecodes, list_devices

    modifier_keys = {
        ecodes.KEY_LEFTCTRL: "ctrl",
        ecodes.KEY_RIGHTCTRL: "ctrl",
        ecodes.KEY_LEFTALT: "alt",
        ecodes.KEY_RIGHTALT: "alt",
    }

    devices: list[InputDevice] = []
    for device_path in list_devices():
        try:
            device = InputDevice(device_path)
            capabilities = device.capabilities()
            if ecodes.EV_KEY not in capabilities:
                continue
            if ecodes.KEY_SPACE not in capabilities[ecodes.EV_KEY]:
                continue
            devices.append(device)
        except (OSError, PermissionError):
            continue

    if not devices:
        raise RuntimeError(
            "Failed to register Ctrl+Alt+Space: no accessible keyboard devices. "
            "Add your user to the 'input' group, then log out and back in:\n"
            "  sudo usermod -aG input $USER"
        )

    active_modifiers: set[str] = set()
    emit_ready()

    while True:
        readable, _, _ = select.select(devices, [], [])
        for device in readable:
            for event in device.read():
                if event.type != ecodes.EV_KEY:
                    continue

                if event.code in modifier_keys:
                    modifier = modifier_keys[event.code]
                    if event.value == 1:
                        active_modifiers.add(modifier)
                    elif event.value == 0:
                        active_modifiers.discard(modifier)
                    continue

                if (
                    event.code == ecodes.KEY_SPACE
                    and event.value == 1
                    and {"ctrl", "alt"}.issubset(active_modifiers)
                ):
                    emit_hotkey()


def get_gnome_custom_keybindings() -> list[str]:
    output = subprocess.check_output(
        [
            "gsettings",
            "get",
            "org.gnome.settings-daemon.plugins.media-keys",
            "custom-keybindings",
        ],
        text=True,
    ).strip()

    if output in ("@as []", "[]"):
        return []

    if output.startswith("@as "):
        output = output[4:]

    return ast.literal_eval(output)


def set_gnome_custom_keybindings(paths: list[str]) -> None:
    formatted = "[" + ", ".join(f"'{path}'" for path in paths) + "]"
    subprocess.run(
        [
            "gsettings",
            "set",
            "org.gnome.settings-daemon.plugins.media-keys",
            "custom-keybindings",
            formatted,
        ],
        check=True,
    )


def register_gnome_hotkey(trigger_script: Path) -> list[str]:
    previous_bindings = get_gnome_custom_keybindings()
    updated_bindings = previous_bindings.copy()

    if GNOME_KEY_PATH not in updated_bindings:
        updated_bindings.append(GNOME_KEY_PATH)

    set_gnome_custom_keybindings(updated_bindings)

    schema_prefix = (
        "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:"
    )
    subprocess.run(
        [
            "gsettings",
            "set",
            f"{schema_prefix}{GNOME_KEY_PATH}",
            "name",
            "Recall Clipboard",
        ],
        check=True,
    )
    subprocess.run(
        [
            "gsettings",
            "set",
            f"{schema_prefix}{GNOME_KEY_PATH}",
            "command",
            str(trigger_script),
        ],
        check=True,
    )
    subprocess.run(
        [
            "gsettings",
            "set",
            f"{schema_prefix}{GNOME_KEY_PATH}",
            "binding",
            "<Control><Alt>space",
        ],
        check=True,
    )

    return previous_bindings


def unregister_gnome_hotkey(previous_bindings: list[str]) -> None:
    set_gnome_custom_keybindings(previous_bindings)


def listen_with_gnome() -> None:
    runtime_dir = Path(
        os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}")
    )
    runtime_dir.mkdir(parents=True, exist_ok=True)

    fifo_path = runtime_dir / "recall-hotkey.fifo"
    trigger_script = runtime_dir / "recall-hotkey-trigger.sh"

    if fifo_path.exists():
        fifo_path.unlink()

    os.mkfifo(fifo_path, mode=0o600)

    trigger_script.write_text(
        "#!/bin/sh\n"
        f'printf "trigger\\n" > "{fifo_path}"\n',
        encoding="utf-8",
    )
    trigger_script.chmod(0o755)

    previous_bindings = register_gnome_hotkey(trigger_script)

    def cleanup(_signum=None, _frame=None) -> None:
        try:
            unregister_gnome_hotkey(previous_bindings)
        except subprocess.CalledProcessError:
            pass

        if trigger_script.exists():
            trigger_script.unlink(missing_ok=True)
        if fifo_path.exists():
            fifo_path.unlink(missing_ok=True)

        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    emit_ready()

    try:
        while True:
            with fifo_path.open("r", encoding="utf-8") as fifo:
                line = fifo.readline().strip()
                if line == "trigger":
                    emit_hotkey()
    finally:
        cleanup()


def main() -> int:
    if can_use_evdev():
        try:
            listen_with_evdev()
            return 0
        except RuntimeError as error:
            emit_error(str(error))
            return 1

    if os.environ.get("XDG_SESSION_TYPE") == "wayland" and os.environ.get(
        "XDG_CURRENT_DESKTOP", ""
    ).lower().find("gnome") >= 0:
        try:
            listen_with_gnome()
            return 0
        except (OSError, subprocess.CalledProcessError) as error:
            emit_error(f"Failed to register Ctrl+Alt+Space via GNOME: {error}")
            return 1

    emit_error(
        "Failed to register Ctrl+Alt+Space. Either install evdev and join the "
        "'input' group (sudo usermod -aG input $USER), or run under GNOME "
        "Wayland for the desktop keybinding fallback."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
