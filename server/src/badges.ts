// Creator recognition: badges derived from a creator's stats. Creators are
// rewarded with status, not money (see VISION.md). Pure logic — no database.

export interface CreatorStats {
  publishedWorlds: number;
  totalPlays: number;
  totalLikes: number;
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export function badgesFor(stats: CreatorStats): Badge[] {
  return [
    {
      id: "first_world",
      label: "First World",
      description: "Published your first world",
      earned: stats.publishedWorlds >= 1,
    },
    {
      id: "prolific",
      label: "Prolific",
      description: "Published 5 worlds",
      earned: stats.publishedWorlds >= 5,
    },
    {
      id: "crowd_pleaser",
      label: "Crowd-Pleaser",
      description: "50 total plays across your worlds",
      earned: stats.totalPlays >= 50,
    },
    {
      id: "beloved",
      label: "Beloved",
      description: "25 total likes across your worlds",
      earned: stats.totalLikes >= 25,
    },
  ];
}
