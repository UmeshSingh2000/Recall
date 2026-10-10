import { Project } from "@/types";
import api from "./axios";

export async function syncProjects(data: Project) {
    return api.post('/api/sync-projects', data);
}

export async function getProjectsIds() {
    return api.get('/api/sync-projects-ids');
}

export async function getProjectById(id: number) {
    return api.get(`/api/project/${id}`);
}