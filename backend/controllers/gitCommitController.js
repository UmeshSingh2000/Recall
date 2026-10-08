import { isNonEmptyString, normalizeGitContext } from "../models/gitCommit.js";
import { broadcast } from "../services/broadcastService.js";
import { sendGitCommitPushNotification } from "../services/pushNotificationService.js";

export function receiveGitCommit(req, res) {
  if (!req.body || !isNonEmptyString(req.body.ticketKey)) {
    return res.status(400).json({
      error: "The request body must include a non-empty ticketKey.",
    });
  }

  const gitCommit = normalizeGitContext(req.body);
  broadcast(gitCommit);
  sendGitCommitPushNotification(gitCommit).catch((error) => {
    console.error(
      "Failed to send Git commit push notification:",
      error.message
    );
  });

  return res.status(202).json({
    message: "Git commit received and sent to connected apps.",
    eventId: gitCommit.eventId,
    receivedAt: gitCommit.receivedAt,
  });
}
