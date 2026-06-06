import type { PovertyGuidelines } from "./types";

// USCIS I-864P Poverty Guidelines (effective March 1, 2024 — most recent published guidelines used by USCIS for I-864 cases through 2025/2026).
// 125% of HHS Poverty Guidelines for 48 Contiguous States, D.C., Puerto Rico, Virgin Islands, Guam, etc.
// Source: USCIS Form I-864P (2024)
export const DEFAULT_POVERTY_2024_48: PovertyGuidelines = {
  year: 2024,
  h1: 19_720,
  h2: 26_775,
  h3: 33_830,
  h4: 40_885,
  h5: 47_940,
  h6: 54_995,
  h7: 62_050,
  h8: 69_105,
  additional: 7_055,
};

// 100% guideline used for active-duty military sponsoring spouse/child
export const DEFAULT_POVERTY_2024_48_100: PovertyGuidelines = {
  year: 2024,
  h1: 15_060,
  h2: 20_440,
  h3: 25_820,
  h4: 31_200,
  h5: 36_580,
  h6: 41_960,
  h7: 47_340,
  h8: 52_720,
  additional: 5_380,
};

// Alaska (125%)
export const DEFAULT_POVERTY_2024_AK: PovertyGuidelines = {
  year: 2024,
  h1: 24_650,
  h2: 33_462,
  h3: 42_275,
  h4: 51_087,
  h5: 59_900,
  h6: 68_712,
  h7: 77_525,
  h8: 86_337,
  additional: 8_813,
};

// Hawaii (125%)
export const DEFAULT_POVERTY_2024_HI: PovertyGuidelines = {
  year: 2024,
  h1: 22_687,
  h2: 30_800,
  h3: 38_912,
  h4: 47_025,
  h5: 55_137,
  h6: 63_250,
  h7: 71_362,
  h8: 79_475,
  additional: 8_113,
};

export function getRequiredIncome(
  householdSize: number,
  guidelines: PovertyGuidelines
): number {
  if (householdSize <= 0) return 0;
  const table = [
    guidelines.h1,
    guidelines.h2,
    guidelines.h3,
    guidelines.h4,
    guidelines.h5,
    guidelines.h6,
    guidelines.h7,
    guidelines.h8,
  ];
  if (householdSize <= 8) return table[householdSize - 1];
  const extra = householdSize - 8;
  return guidelines.h8 + extra * guidelines.additional;
}
