import { spawn } from "child_process";
import { execFile } from "child_process";
import clipboard from "clipboardy";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import net from "net";
import os from "os";
import { promisify } from "util";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
const apiToken = process.env.RECALL_API_TOKEN;
const backendUrl = process.env.RECALL_BACKEND_URL || "https://recall-en47.onrender.com";
const execFileAsync = promisify(execFile);

if (!apiToken) {
    throw new Error("RECALL_API_TOKEN is not set");
}

async function getCommitDiff(gitContext) {
    const commitHash = typeof gitContext.commitHash === "string"
        ? gitContext.commitHash.trim()
        : "";
    const repositoryPath = gitContext.repositoryPath || gitContext.cwd;

    if (!commitHash) {
        throw new Error("Git context does not include a commitHash");
    }
    if (!/^[a-f0-9]{7,64}$/i.test(commitHash)) {
        throw new Error("Git context includes an invalid commitHash");
    }
    if (typeof repositoryPath !== "string" || !repositoryPath.trim()) {
        throw new Error("Git context does not include repositoryPath");
    }

    const { stdout } = await execFileAsync(
        "git",
        ["show", "--format=", "--no-ext-diff", "--binary", commitHash],
        {
            cwd: repositoryPath,
            encoding: "buffer",
            maxBuffer: 10 * 1024 * 1024,
        },
    );

    if (!stdout.length) {
        throw new Error(`Commit ${commitHash} contains no diff`);
    }

    return stdout;
}

async function getCommitFiles(gitContext) {
    const repositoryPath = gitContext.repositoryPath || gitContext.cwd;
    const commitHash = gitContext.commitHash.trim();
    const { stdout: status } = await execFileAsync(
        "git",
        ["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", commitHash],
        { cwd: repositoryPath, encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    const files = [];
    for (const line of status.trim().split("\n").filter(Boolean)) {
        const [change, ...parts] = line.split("\t");
        const filePath = change.startsWith("R") ? parts[parts.length - 1] : parts[0];
        if (change.startsWith("D") || !filePath) continue;

        const { stdout } = await execFileAsync(
            "git",
            ["show", `${commitHash}:${filePath}`],
            {
                cwd: repositoryPath,
                encoding: "buffer",
                maxBuffer: 10 * 1024 * 1024,
            },
        );
        files.push({ path: filePath, buffer: stdout });
    }
    return files;
}

async function sendGitDiffToRecall(gitContext, diff, files) {
    const ticketKey = typeof gitContext.ticketKey === "string"
        ? gitContext.ticketKey.trim()
        : "";
    const commitHash = typeof gitContext.commitHash === "string"
        ? gitContext.commitHash.trim()
        : "";

    if (!ticketKey) {
        throw new Error("Git context does not include ticketKey");
    }

    const form = new FormData();
    form.append(
        "diff",
        new Blob([diff], { type: "text/plain; charset=utf-8" }),
        `commit-${commitHash}.diff`,
    );
    form.append("commitSha", commitHash);
    form.append(
        "description",
        gitContext.description || gitContext.commitMessage || "",
    );
    form.append("filePaths", JSON.stringify(files.map((file) => file.path)));
    for (const file of files) {
        form.append(
            "files",
            new Blob([file.buffer], { type: "application/octet-stream" }),
            file.path,
        );
    }

    const response = await fetch(
        `${backendUrl}/api/tickets/${encodeURIComponent(ticketKey)}/diffs`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
            body: form,
        },
    );

    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
            `Diff upload failed with ${response.status}: ${responseBody}`,
        );
    }

    console.log(`Git diff uploaded for ${ticketKey}.`);
}

async function handleGitDiffCommand(gitContext) {
    const diff = await getCommitDiff(gitContext);
    const files = await getCommitFiles(gitContext);
    await sendGitDiffToRecall(gitContext, diff, files);
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

                if (gitContext.command === "rld") {
                    await handleGitDiffCommand(gitContext);
                } else {
                    await sendGitCommitToRecall(gitContext);
                }
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
            `${backendUrl}/api/git/commit`,
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
