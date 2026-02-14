export interface FixtureUpdatedEvent {
  type: "fixture.updated";
  providerFixtureId: number;
  status: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  updatedAt: string;
}
