import { spawn } from "child_process";
import clipboard from "clipboardy";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.join(__dirname, "hotkey.ps1");

const hotkey = spawn(
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

hotkey.stdout.on("data", async (data) => {
    const message = data.toString().trim();

    console.log("PowerShell:", message);

    if (message === "HOTKEY") {
        const text = await clipboard.read();
        try {
            const response = await fetch("https://recall-en47.onrender.com/api/clipboard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
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
