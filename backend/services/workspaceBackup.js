import prisma from "../config/prisma.js";

export async function deleteUserWorkspace(tx, userId) {
  const projects = await tx.project.findMany({
    where: { user_id: userId },
    select: { id: true },
  });
  const projectIds = projects.map((row) => row.id);
  if (!projectIds.length) {
    return;
  }

  const tickets = await tx.ticket.findMany({
    where: { project_id: { in: projectIds } },
    select: { id: true },
  });
  const ticketIds = tickets.map((row) => row.id);
  if (!ticketIds.length) {
    await tx.project.deleteMany({ where: { id: { in: projectIds } } });
    return;
  }

  await tx.progressItem.deleteMany({ where: { ticket_id: { in: ticketIds } } });
  await tx.workLog.deleteMany({ where: { ticket_id: { in: ticketIds } } });
  await tx.ticketFile.deleteMany({ where: { ticket_id: { in: ticketIds } } });
  await tx.ticketNote.deleteMany({ where: { ticket_id: { in: ticketIds } } });
  await tx.workSession.deleteMany({ where: { ticket_id: { in: ticketIds } } });
  await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await tx.project.deleteMany({ where: { id: { in: projectIds } } });
}

export async function loadUserWorkspaceIds(userId) {
  const projects = await prisma.project.findMany({
    where: { user_id: userId },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const projectIds = projects.map((row) => row.id);

  if (!projectIds.length) {
    return { projects, projectIds, ticketIds: [] };
  }

  const tickets = await prisma.ticket.findMany({
    where: { project_id: { in: projectIds } },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return {
    projects,
    projectIds,
    ticketIds: tickets.map((row) => row.id),
  };
}
