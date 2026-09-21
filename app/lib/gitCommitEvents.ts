type GitCommitListener = (ticketId: number) => void;

const listeners = new Set<GitCommitListener>();

export function subscribeToGitCommitLogs(listener: GitCommitListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyGitCommitLogged(ticketId: number) {
  listeners.forEach((listener) => listener(ticketId));
}
