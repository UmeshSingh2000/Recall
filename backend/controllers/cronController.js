import prisma from "../config/prisma.js";
import { generateWithGroq } from "../services/groqService.js";
import { sendPendingTicketsPushNotification } from "../services/pushNotificationService.js";
import { ticketsOwnedByUserWhere } from "../services/workspaceAuth.js";

const PENDING_TICKET_LIMIT = 25;

const pendingTicketSelect = {
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
};

async function summarizeTickets(tickets) {
    return Promise.all(
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
                    error.message,
                );
            }

            return {
                ...ticket,
                short_summary:
                    shortSummary || "No summary available for this ticket.",
            };
        }),
    );
}

async function processUserPendingTickets(userId) {
    const tickets = await prisma.ticket.findMany({
        where: {
            ...ticketsOwnedByUserWhere(userId),
            status: "in_progress",
        },
        orderBy: { updated_at: "desc" },
        take: PENDING_TICKET_LIMIT,
        select: pendingTicketSelect,
    });

    if (tickets.length === 0) {
        return { userId, ticketCount: 0, tickets: [], notified: false };
    }

    const ticketsWithSummaries = await summarizeTickets(tickets);

    let notified = false;

    try {
        await sendPendingTicketsPushNotification(ticketsWithSummaries, userId);
        notified = true;
    } catch (error) {
        console.error(
            `Failed to send pending ticket push for user ${userId}:`,
            error.message,
        );
    }

    return {
        userId,
        ticketCount: ticketsWithSummaries.length,
        tickets: ticketsWithSummaries,
        notified,
    };
}

export async function generatePendingTicketsSummary(req, res) {
    try {
        const pendingByUser = await prisma.ticket.findMany({
            where: { status: "in_progress" },
            select: { project: { select: { user_id: true } } },
        });

        const userIds = [
            ...new Set(pendingByUser.map((row) => row.project.user_id)),
        ];

        if (userIds.length === 0) {
            return res.status(200).json({
                usersProcessed: 0,
                results: [],
            });
        }

        const results = [];

        for (const userId of userIds) {
            results.push(await processUserPendingTickets(userId));
        }

        return res.status(200).json({
            usersProcessed: results.length,
            results,
        });
    } catch (error) {
        console.error("Failed to generate pending ticket summary:", error.message);
        return res.status(502).json({
            error: "Failed to generate pending ticket summaries.",
        });
    }
}
