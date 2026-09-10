export type TicketStatus = 'in_progress' | 'paused' | 'blocked' | 'review' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkLogType = 'code' | 'bug_fix' | 'investigation' | 'testing' | 'refactoring' | 'documentation' | 'decision' | 'other';

export type Project = {
  id: number;
  name: string;
  description: string;
  repository_url: string;
  active_count?: number;
  completed_count?: number;
};

export type Ticket = {
  id: number;
  project_id: number;
  project_name: string;
  ticket_key: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  next_action: string;
  my_context: string;
  why_implementing: string;
  how_it_works: string;
  important_decisions: string;
  updated_at: string;
  completed_at?: string | null;
  last_log?: string | null;
};

export type WorkLog = {
  id: number;
  ticket_id: number;
  type: WorkLogType;
  description: string;
  what_remains: string;
  next_action: string;
  commit_hash: string;
  created_at: string;
};

export type ProgressItem = {
  id: number;
  ticket_id: number;
  content: string;
  completed: number;
  position: number;
};

export type WorkSession = {
  id: number;
  ticket_id: number;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  pause_reason: string;
  summary: string;
  next_action: string;
};
