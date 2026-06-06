export interface HouseholdMember {
  id: string;
  name: string;
  relationship: string;
  income: number;
  assets: number;
  included: boolean;
}

export interface JointSponsor {
  id: string;
  name: string;
  married: boolean;
  children: number;
  otherDependents: number;
  previouslySponsored: number;
  income: number;
  assets: number;
  immigrantsCovered: number;
}

export interface AssetBreakdown {
  cash: number;
  savings: number;
  checking: number;
  stocks: number;
  bonds: number;
  mutualFunds: number;
  propertyEquity: number;
}

export interface Immigrant {
  id: string;
  name: string;
  caseGroup: string;
  role: "Principal" | "Derivative";
  assignedSponsor: "Petitioner" | "Joint Sponsor 1" | "Joint Sponsor 2";
}

export interface Sponsor {
  name: string;
  income: number;
  filingStatus: "Single" | "Married Filing Jointly" | "Married Filing Separately" | "Head of Household";
  householdMembers: number;
  previouslySponsored: number;
  assets: AssetBreakdown;
  isActiveDutyMilitary: boolean;
  sponsoringSpouseOrChild: boolean;
}

export interface PovertyGuidelines {
  year: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
  h7: number;
  h8: number;
  additional: number;
}

export interface SponsorResult {
  name: string;
  householdSize: number;
  requiredIncome: number;
  actualIncome: number;
  surplus: number;
  assetsNeeded: number;
  assetsAvailable: number;
  assetMultiplier: number;
  effectiveIncome: number;
  status: "Pass" | "Fail" | "Borderline";
  notes: string[];
}
