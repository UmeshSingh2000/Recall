import { pushTokens } from "../models/pushToken.js";

export async function sendPushNotifications(text, receivedAt) {
  if (pushTokens.size === 0) return;

  const messages = [...pushTokens].map((token) => ({
    to: token,
    title: "New clipboard text",
    body: text.length > 180 ? `${text.slice(0, 177)}...` : text,
    sound: "clipboard.wav",
    channelId: "clipboard-v2",
    data: { type: "clipboard", text, receivedAt },
  }));


  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  const result = await response.json();


  if (!response.ok) {
    throw new Error(`Expo Push Service responded with ${response.status}: ${JSON.stringify(result)}`);
  }

  result.data?.forEach((ticket, index) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      pushTokens.delete(messages[index].to);
    }
    if (ticket.status === "error") {
      console.error("Expo push ticket error", {
        token: messages[index].to,
        message: ticket.message,
        details: ticket.details,
      });
    }
  });
}

export async function sendGitCommitPushNotification(gitCommit) {
  if (pushTokens.size === 0) return;

  const messages = [...pushTokens].map((token) => ({
    to: token,
    title: `Commit ${gitCommit.ticketKey}`,
    body: gitCommit.commitMessage || "New Git commit",
    sound: "default",
    data: {
      type: "git_commit",
      ...gitCommit,
    },
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Expo Push Service responded with ${response.status}: ${JSON.stringify(result)}`
    );
  }

  result.data?.forEach((ticket, index) => {
    if (
      ticket.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
    ) {
      pushTokens.delete(messages[index].to);
    }

    if (ticket.status === "error") {
      console.error("Git commit push error", {
        token: messages[index].to,
        message: ticket.message,
        details: ticket.details,
      });
    }
  });
}
