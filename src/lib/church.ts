/** Facts taken from the GLT Foundation Bible School Manual. */

/** Ministries and units a student can serve in for the internship (manual p.52). */
export const MINISTRIES = [
  "Teaching ministry", "Music ministry", "Prayer ministry", "Evangelism ministry", "Media ministry",
  "Family care ministry", "Membership care ministry", "Follow-up ministry", "Teenage ministry",
  "Children ministry", "Protocol ministry", "Pastor's Protocol ministry",
] as const;
export const UNITS = ["Treasury", "Traffic", "Transport", "Sanctuary keepers"] as const;

/** "Requirements of a steward in service" (manual p.52): what a supervisor looks for. */
export const STEWARD_REQUIREMENTS: { name: string; ref: string }[] = [
  { name: "Faithfulness", ref: "1 Corinthians 4:2" },
  { name: "Diligence", ref: "Proverbs 22:29" },
  { name: "Fervency", ref: "Romans 12:11" },
  { name: "Accountability", ref: "Hebrews 13:17" },
  { name: "Commitment", ref: "1 Corinthians 15:58" },
  { name: "Punctuality", ref: "Genesis 22:1-3" },
  { name: "Consistent tithing", ref: "Malachi 3:10-12" },
];
