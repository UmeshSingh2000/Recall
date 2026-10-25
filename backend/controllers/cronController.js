import prisma from "../config/prisma.js";
import { generateWithGroq } from "../services/groqService.js";
import { sendPendingTicketsPushNotification } from "../services/pushNotificationService.js";
import {
    getAuthUserId,
    ticketsOwnedByUserWhere,
} from "../services/workspaceAuth.js";

const PENDING_TICKET_LIMIT = 25;

export async function generatePendingTicketsSummary(req, res) {
    const userId = "9a21213e-0033-47e0-9cdb-ed2217e4f73f"
    if (!userId) return;

    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                ...ticketsOwnedByUserWhere(userId),
                status: 'in_progress',
            },
            orderBy: { updated_at: "desc" },
            take: PENDING_TICKET_LIMIT,
            select: {
                id: true,
                ticket_key: true,
                title: true,
                status: true,
                priority: true,
                due_date: true,
                next_action: true,
                description: true,
                summary: true,
                project: { select: { name: true } },
                work_logs: {
                    orderBy: { created_at: "desc" },
                    take: 1,
                    select: {
                        description: true,
                        what_remains: true,
                        next_action: true,
                    },
                },
            },
        });

        if (tickets.length === 0) {
            return res.status(200).json({
                summary: "You have no pending tickets.",
                tickets: [],
            });
        }

        const ticketsWithSummaries = await Promise.all(
            tickets.map(async (ticket) => {
                const latestLog = ticket.work_logs[0];

                const context = [
                    `Ticket: ${ticket.ticket_key} - ${ticket.title}`,
                    `Project: ${ticket.project.name}`,
                    `Description: ${ticket.description || ""}`,
                    `Existing summary: ${ticket.summary || ""}`,
                    `Status: ${ticket.status}`,
                    `Priority: ${ticket.priority}`,
                    `Next action: ${ticket.next_action || ""}`,
                    `Latest update: ${latestLog?.description || ""}`,
                    `What remains: ${latestLog?.what_remains || ""}`,
                    `Latest next action: ${latestLog?.next_action || ""}`,
                ].join("\n");

                let shortSummary = ticket.summary || "";

                try {
                    const generated = await generateWithGroq([
                        {
                            role: "system",
                            content:
                                "Summarize this individual engineering ticket in 1-3 concise sentences. " +
                                "Explain its current progress and what should happen next. " +
                                "Use only the provided information. Do not invent details.",
                        },
                        {
                            role: "user",
                            content: context,
                        },
                    ]);

                    if (generated?.trim()) {
                        shortSummary = generated.trim();
                    }
                } catch (error) {
                    console.error(
                        `Failed to summarize ${ticket.ticket_key}:`,
                        error.message
                    );
                }

                return {
                    ...ticket,
                    short_summary:
                        shortSummary || "No summary available for this ticket.",
                };
            })
        );

        try {
            await sendPendingTicketsPushNotification(ticketsWithSummaries, userId);
        } catch (error) {
            // A cron invocation still returns the generated summary when Expo is unavailable.
            console.error("Failed to send pending ticket push notification:", error.message);
        }

        return res.status(200).json({
            tickets: ticketsWithSummaries,
        });


    } catch (error) {
        console.error("Failed to generate pending ticket summary:", error.message);
        return res.status(502).json({ error: "Failed to generate a pending ticket summary." });
    }
}
