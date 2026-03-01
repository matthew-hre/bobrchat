type ThreadWithDate = {
  id: string;
  title: string;
  lastMessageAt: Date | null;
  [key: string]: unknown;
};

type ThreadWithTags = ThreadWithDate & {
  tags?: Array<{ id: string; name: string; color: string }>;
};

export type TagGroup = {
  tag: { id: string; name: string; color: string };
  threads: ThreadWithTags[];
};

export function groupThreadsByTag(threads: ThreadWithTags[]): TagGroup[] {
  const groupMap = new Map<string, TagGroup>();

  for (const thread of threads) {
    if (!thread.tags || thread.tags.length === 0)
      continue;

    for (const tag of thread.tags) {
      let group = groupMap.get(tag.id);
      if (!group) {
        group = { tag, threads: [] };
        groupMap.set(tag.id, group);
      }
      group.threads.push(thread);
    }
  }

  const groups = Array.from(groupMap.values());

  for (const group of groups) {
    group.threads.sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() ?? 0;
      const bTime = b.lastMessageAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  groups.sort((a, b) => {
    const aRecent = a.threads[0]?.lastMessageAt?.getTime() ?? 0;
    const bRecent = b.threads[0]?.lastMessageAt?.getTime() ?? 0;
    return bRecent - aRecent;
  });

  return groups;
}

export type GroupedThreads = {
  today: ThreadWithDate[];
  last7Days: ThreadWithDate[];
  last30Days: ThreadWithDate[];
  older: ThreadWithDate[];
};

export function groupThreadsByDate(threads: ThreadWithDate[]): GroupedThreads {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const grouped: GroupedThreads = {
    today: [],
    last7Days: [],
    last30Days: [],
    older: [],
  };

  threads.forEach((thread) => {
    if (!thread.lastMessageAt) {
      grouped.older.push(thread);
      return;
    }

    const threadDate = new Date(
      thread.lastMessageAt.getFullYear(),
      thread.lastMessageAt.getMonth(),
      thread.lastMessageAt.getDate(),
    );

    if (threadDate.getTime() === today.getTime()) {
      grouped.today.push(thread);
    }
    else if (threadDate > sevenDaysAgo) {
      grouped.last7Days.push(thread);
    }
    else if (threadDate > thirtyDaysAgo) {
      grouped.last30Days.push(thread);
    }
    else {
      grouped.older.push(thread);
    }
  });

  return grouped;
}
