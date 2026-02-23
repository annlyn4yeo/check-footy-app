export type FixtureTeamView = {
  providerId: number;
  name: string;
  shortName: string | null;
  crestUrl: string | null;
};

export type FixtureLeagueView = {
  providerId: number;
  name: string;
  country: string | null;
};

export type FixtureListItem = {
  providerFixtureId: number;
  status: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  isLive: boolean;
  kickoffUtc: string;
  league: FixtureLeagueView;
  homeTeam: FixtureTeamView;
  awayTeam: FixtureTeamView;
};

export type FixtureTimelineEvent = {
  providerEventId: string;
  minute: number;
  extraMinute: number | null;
  type: string;
  team: "HOME" | "AWAY" | null;
  playerName: string | null;
  assistName: string | null;
  createdAt: string;
};

export type FixtureSnapshot = FixtureListItem & {
  updatedAt: string;
  matchEvents: FixtureTimelineEvent[];
};
