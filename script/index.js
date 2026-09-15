import { spawn } from "child_process";
import clipboard from "clipboardy";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
const apiToken = process.env.RECALL_API_TOKEN;

if (!apiToken) {
    throw new Error("RECALL_API_TOKEN is not set");
}


function startHotkeyListener() {
    if (process.platform === "win32") {
        const scriptPath = path.join(__dirname, "hotkey.ps1");

        return spawn(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                scriptPath
            ],
            {
                windowsHide: true
            }
        );
    }

    if (process.platform === "linux") {
        const scriptPath = path.join(__dirname, "hotkey.py");

        return spawn("python3", [scriptPath], {
            stdio: ["ignore", "pipe", "pipe"]
        });
    }

    throw new Error(`Unsupported platform for hotkeys: ${process.platform}`);
}

const hotkey = startHotkeyListener();

hotkey.stdout.on("data", async (data) => {
    const message = data.toString().trim();

    console.log("Hotkey:", message);

    if (message === "HOTKEY") {
        const text = await clipboard.read();
        try {
            const response = await fetch("http://localhost:3000/api/clipboard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiToken}`,
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error(`Backend responded with ${response.status}`);
            }

            console.log("Clipboard text sent to backend.");
        } catch (error) {
            console.error("Failed to send clipboard text:", error.message);
        }
    }
});

hotkey.stderr.on("data", (data) => {
    console.error("Hotkey error:", data.toString());
});

hotkey.on("close", (code) => {
    console.log("Hotkey process exited:", code);
});

function shutdown() {
    hotkey.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
