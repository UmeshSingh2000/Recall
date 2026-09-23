import { spawn } from "child_process";
import clipboard from "clipboardy";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import net from "net";
import os from "os";


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

const socketPath =
    process.platform === "win32"
        ? "\\\\.\\pipe\\recall.sock"
        : path.join(
            process.env.XDG_RUNTIME_DIR || "/tmp",
            "recall.sock"
        );


function startSocketServer() {
    // Unix domain sockets leave a file on disk; Windows named pipes do not.
    if (process.platform !== "win32" && fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
    }

    const server = net.createServer((socket) => {
        let data = "";

        socket.on("data", (chunk) => {
            data += chunk.toString();
        });

        socket.on("end", async () => {
            try {
                const gitContext = JSON.parse(data);

                console.log("Git context received:", gitContext);

                await sendGitCommitToRecall(gitContext);
            } catch (error) {
                console.error(
                    "Failed to process Git context:",
                    error.message
                );
            }
        });
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(
                "Recall socket already in use (%s). Stop the other running instance and retry.",
                socketPath
            );
            process.exit(1);
        }
        throw err;
    });

    server.listen(socketPath, () => {
        console.log("Recall socket listening:", socketPath);
    });

    return server;
}


async function sendGitCommitToRecall(gitContext) {
    try {
        const response = await fetch(
            "https://recall-en47.onrender.com/api/git/commit",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiToken}`,
                },
                body: JSON.stringify(gitContext)
            }
        );

        if (!response.ok) {
            console.log("Response status:", response);
            throw new Error(
                `Backend responded with ${response.status}`
            );
        }

        console.log("Git commit sent to Recall.");
    } catch (error) {
        console.error(
            "Failed to send Git commit:",
            error
        );
    }
}


const hotkey = startHotkeyListener();
const socketServer = startSocketServer();

hotkey.stdout.on("data", async (data) => {
    const message = data.toString().trim();

    console.log("Hotkey:", message);

    if (message === "HOTKEY") {
        const text = await clipboard.read();
        try {
            const response = await fetch("https://recall-en47.onrender.com/api/clipboard", {
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
    if (process.platform === "win32") {
        hotkey.kill();
    } else {
        hotkey.kill("SIGTERM");
    }
    socketServer.close()
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
