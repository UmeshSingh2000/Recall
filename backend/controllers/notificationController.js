import prisma from "../config/prisma.js";
import { getAuthUserId } from "../services/workspaceAuth.js";

function serializeNotification(notification) {
    return {
        id: notification.id,
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        is_read: notification.is_read,
        read_at: notification.read_at?.toISOString() ?? null,
        push_status: notification.push_status,
        sent_at: notification.sent_at?.toISOString() ?? null,
        created_at: notification.created_at.toISOString(),
    };
}

export async function listNotifications(req, res) {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                user_id: userId,
                is_read: false
            },
            orderBy: { created_at: "desc" },
            take: 50,
        });

        return res.status(200).json({
            notifications: notifications.map(serializeNotification),
        });
    } catch (error) {
        console.error("Failed to list notifications:", error.message);
        return res.status(502).json({
            error: "Failed to load notifications.",
        });
    }
}

export async function markNotificationRead(req, res) {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid notification id." });
    }

    try {
        const result = await prisma.notification.updateMany({
            where: { id, user_id: userId },
            data: {
                is_read: true,
                read_at: new Date(),
            },
        });

        if (result.count === 0) {
            return res.status(404).json({ error: "Notification not found." });
        }

        const notification = await prisma.notification.findFirst({
            where: { id, user_id: userId },
        });

        return res.status(200).json({
            notification: notification
                ? serializeNotification(notification)
                : null,
        });
    } catch (error) {
        console.error("Failed to mark notification read:", error.message);
        return res.status(502).json({
            error: "Failed to update notification.",
        });
    }
}
