import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Project, Ticket, WorkLog } from "../types";
import {
  createProject,
  createTicket,
  deleteProject,
  deleteTicket,
  getProject,
  getTicket,
  listProjects,
  listTickets,
  searchWorkspace,
  updateTicket,
  type TicketDetail,
} from "../lib/workspace";

export type ProjectDetail = {
  project: Project;
  tickets: Ticket[];
};

export type SearchResult = Ticket & { logs: WorkLog[] };

type WorkspaceState = {
  projects: Project[] | null;
  tickets: Ticket[] | null;
  searchResults: Record<string, SearchResult[]>;
  projectDetails: Record<number, ProjectDetail>;
  ticketDetails: Record<number, TicketDetail>;
  searchLoading: Record<string, boolean>;
  projectsLoading: boolean;
  ticketsLoading: boolean;
  projectLoading: Record<number, boolean>;
  ticketLoading: Record<number, boolean>;
};

const initialState: WorkspaceState = {
  projects: null,
  tickets: null,
  searchResults: {},
  projectDetails: {},
  ticketDetails: {},
  searchLoading: {},
  projectsLoading: false,
  ticketsLoading: false,
  projectLoading: {},
  ticketLoading: {},
};

type ThunkState = { workspace: WorkspaceState };

type RefreshArgs = { force?: boolean } | undefined;

export const fetchProjects = createAsyncThunk<Project[], RefreshArgs>(
  "workspace/fetchProjects",
  async (args, thunkApi) => {
    const cached = (thunkApi.getState() as ThunkState).workspace.projects;
    if (cached && !args?.force) return cached;
    return listProjects();
  },
);

export const fetchTickets = createAsyncThunk<Ticket[], RefreshArgs>(
  "workspace/fetchTickets",
  async (args, thunkApi) => {
    const cached = (thunkApi.getState() as ThunkState).workspace.tickets;
    if (cached && !args?.force) return cached;
    const result = await listTickets(1, 100);
    return result.tickets;
  },
);

export const fetchSearchResults = createAsyncThunk<
  { query: string; results: SearchResult[] },
  { query: string; force?: boolean }
>(
  "workspace/fetchSearchResults",
  async ({ query, force }, thunkApi) => {
    const cached = (thunkApi.getState() as ThunkState).workspace.searchResults[query];
    if (cached && !force) return { query, results: cached };
    return { query, results: await searchWorkspace(query) };
  },
);

export const fetchProject = createAsyncThunk<ProjectDetail, { id: number; force?: boolean }>(
  "workspace/fetchProject",
  async ({ id, force }, thunkApi) => {
    const cached = (thunkApi.getState() as ThunkState).workspace.projectDetails[id];
    if (cached && !force) return cached;
    return getProject(id);
  },
);

export const fetchTicket = createAsyncThunk<TicketDetail, { id: number; force?: boolean }>(
  "workspace/fetchTicket",
  async ({ id, force }, thunkApi) => {
    const cached = (thunkApi.getState() as ThunkState).workspace.ticketDetails[id];
    if (cached && !force) return cached;
    return getTicket(id);
  },
);

export const createProjectAndCache = createAsyncThunk<ProjectDetail, Parameters<typeof createProject>[0]>(
  "workspace/createProject",
  async (input) => {
    const id = await createProject(input);
    const result = await getProject(id);
    return result;
  },
);

export const createTicketAndCache = createAsyncThunk<TicketDetail, Parameters<typeof createTicket>[0]>(
  "workspace/createTicket",
  async (input) => {
    const id = await createTicket(input);
    const result = await getTicket(id);
    return result;
  },
);

export const updateTicketAndCache = createAsyncThunk<
  Ticket,
  { id: number; input: Parameters<typeof updateTicket>[1] }
>("workspace/updateTicket", async ({ id, input }) => updateTicket(id, input));

export const removeProjectAndCache = createAsyncThunk<number, number>(
  "workspace/deleteProject",
  async (id) => {
    await deleteProject(id);
    return id;
  },
);

export const removeTicketAndCache = createAsyncThunk<number, number>(
  "workspace/deleteTicket",
  async (id) => {
    await deleteTicket(id);
    return id;
  },
);

function replaceById<T extends { id: number }>(items: T[] | null, item: T) {
  if (!items) return items;
  return items.map((current) => (current.id === item.id ? item : current));
}

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    invalidateProjects(state) {
      state.projects = null;
    },
    invalidateTickets(state) {
      state.tickets = null;
    },
    invalidateTicket(state, action: PayloadAction<number>) {
      delete state.ticketDetails[action.payload];
      state.tickets = null;
      state.searchResults = {};
      for (const [projectId, projectDetail] of Object.entries(state.projectDetails)) {
        if (projectDetail.tickets.some((ticket) => ticket.id === action.payload)) {
          delete state.projectDetails[Number(projectId)];
        }
      }
    },
    clearWorkspace(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.projectsLoading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action: PayloadAction<Project[]>) => {
        state.projectsLoading = false;
        state.projects = action.payload;
        for (const project of action.payload) {
          const detail = state.projectDetails[project.id];
          if (detail) detail.project = project;
        }
      })
      .addCase(fetchProjects.rejected, (state) => {
        state.projectsLoading = false;
      })
      .addCase(fetchTickets.pending, (state) => {
        state.ticketsLoading = true;
      })
      .addCase(fetchTickets.fulfilled, (state, action: PayloadAction<Ticket[]>) => {
        state.ticketsLoading = false;
        state.tickets = action.payload;
      })
      .addCase(fetchTickets.rejected, (state) => {
        state.ticketsLoading = false;
      })
      .addCase(fetchSearchResults.pending, (state, action) => {
        state.searchLoading[action.meta.arg.query] = true;
      })
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.searchLoading[action.payload.query] = false;
        state.searchResults[action.payload.query] = action.payload.results;
      })
      .addCase(fetchSearchResults.rejected, (state, action) => {
        state.searchLoading[action.meta.arg.query] = false;
      })
      .addCase(fetchProject.pending, (state, action) => {
        state.projectLoading[action.meta.arg.id] = true;
      })
      .addCase(fetchProject.fulfilled, (state, action: PayloadAction<ProjectDetail>) => {
        state.projectLoading[action.payload.project.id] = false;
        state.projectDetails[action.payload.project.id] = action.payload;
        state.projects = replaceById(state.projects, action.payload.project);
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.projectLoading[action.meta.arg.id] = false;
      })
      .addCase(fetchTicket.pending, (state, action) => {
        state.ticketLoading[action.meta.arg.id] = true;
      })
      .addCase(fetchTicket.fulfilled, (state, action: PayloadAction<TicketDetail>) => {
        state.ticketLoading[action.payload.ticket.id] = false;
        state.ticketDetails[action.payload.ticket.id] = action.payload;
        state.tickets = replaceById(state.tickets, action.payload.ticket);
      })
      .addCase(fetchTicket.rejected, (state, action) => {
        state.ticketLoading[action.meta.arg.id] = false;
      })
      .addCase(createProjectAndCache.fulfilled, (state, action: PayloadAction<ProjectDetail>) => {
        state.projects = state.projects
          ? [...state.projects, action.payload.project]
          : [action.payload.project];
        state.projectDetails[action.payload.project.id] = action.payload;
      })
      .addCase(createTicketAndCache.fulfilled, (state, action: PayloadAction<TicketDetail>) => {
        state.tickets = state.tickets
          ? [...state.tickets, action.payload.ticket]
          : [action.payload.ticket];
        state.ticketDetails[action.payload.ticket.id] = action.payload;
        state.searchResults = {};
      })
      .addCase(updateTicketAndCache.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.tickets = replaceById(state.tickets, action.payload);
        const detail = state.ticketDetails[action.payload.id];
        if (detail) detail.ticket = action.payload;
        for (const projectDetail of Object.values(state.projectDetails)) {
          projectDetail.tickets = replaceById(projectDetail.tickets, action.payload) ?? [];
        }
        for (const query of Object.keys(state.searchResults)) {
          state.searchResults[query] = replaceById(state.searchResults[query], {
            ...action.payload,
            logs: state.searchResults[query].find((ticket) => ticket.id === action.payload.id)?.logs ?? [],
          }) ?? [];
        }
      })
      .addCase(removeProjectAndCache.fulfilled, (state, action: PayloadAction<number>) => {
        state.projects = state.projects?.filter((project) => project.id !== action.payload) ?? null;
        delete state.projectDetails[action.payload];
        state.tickets = state.tickets?.filter((ticket) => ticket.project_id !== action.payload) ?? null;
        state.searchResults = {};
      })
      .addCase(removeTicketAndCache.fulfilled, (state, action: PayloadAction<number>) => {
        state.tickets = state.tickets?.filter((ticket) => ticket.id !== action.payload) ?? null;
        delete state.ticketDetails[action.payload];
        for (const projectDetail of Object.values(state.projectDetails)) {
          projectDetail.tickets = projectDetail.tickets.filter((ticket) => ticket.id !== action.payload);
        }
        state.searchResults = {};
      });
  },
});

export const {
  clearWorkspace,
  invalidateProjects,
  invalidateTickets,
  invalidateTicket,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;