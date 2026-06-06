import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type {
  HouseholdMember,
  Immigrant,
  JointSponsor,
  PovertyGuidelines,
  Sponsor,
  SponsorResult,
} from "./types";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function exportPDF(
  petitioner: SponsorResult,
  joints: SponsorResult[],
  strategy: { checklist: string[]; risk: number; recommendations: string[]; structure: string },
  sponsor: Sponsor,
  immigrants: Immigrant[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(67, 56, 202);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("I-864 Affidavit of Support — Qualification Report", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()} · USCIS I-864P 2024 Guidelines`, 14, 19);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Petitioner: ${sponsor.name || "—"}`, 14, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Filing Status: ${sponsor.filingStatus} · Immigrants: ${immigrants.length}`, 14, 41);

  // Results table
  const allResults = [petitioner, ...joints];
  autoTable(doc, {
    startY: 48,
    head: [["Sponsor", "HH Size", "Required", "Actual", "Surplus", "Assets Needed", "Assets Avail.", "Status"]],
    body: allResults.map((r, i) => [
      `${r.name} (${i === 0 ? "Pet." : `JS${i}`})`,
      r.householdSize,
      fmt(r.requiredIncome),
      fmt(r.actualIncome),
      (r.surplus >= 0 ? "+" : "") + fmt(r.surplus),
      fmt(r.assetsNeeded),
      fmt(r.assetsAvailable),
      r.status,
    ]),
    headStyles: { fillColor: [67, 56, 202], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === "body") {
        const v = data.cell.raw as string;
        if (v === "Pass") data.cell.styles.fillColor = [209, 250, 229];
        if (v === "Fail") data.cell.styles.fillColor = [254, 226, 226];
        if (v === "Borderline") data.cell.styles.fillColor = [254, 243, 199];
      }
    },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Calculation details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Calculation Details", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  allResults.forEach((r, i) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text(`${i === 0 ? "Petitioner" : `Joint Sponsor ${i}`}: ${r.name}`, 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    r.notes.forEach((n) => {
      const lines = doc.splitTextToSize(`• ${n}`, pageWidth - 28);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 18, y);
        y += 4;
      });
    });
    y += 3;
  });

  // Strategy
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Strategy — Public Charge Risk: ${strategy.risk}/100`, 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(`Recommended Structure: ${strategy.structure}`, 14, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Recommendations:", 14, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  strategy.recommendations.forEach((r) => {
    const lines = doc.splitTextToSize(`• ${r}`, pageWidth - 28);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 18, y);
      y += 4;
    });
  });

  y += 3;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Documentation Checklist:", 14, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  strategy.checklist.forEach((c) => {
    const lines = doc.splitTextToSize(`☐ ${c}`, pageWidth - 28);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 18, y);
      y += 4;
    });
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Educational use only — not legal advice. Verify current guidelines at uscis.gov/i-864p", 14, 285);

  doc.save(`I-864-Report-${sponsor.name || "petitioner"}-${Date.now()}.pdf`);
}

export function exportExcel(
  petitioner: SponsorResult,
  joints: SponsorResult[],
  sponsor: Sponsor,
  household: HouseholdMember[],
  jointSponsors: JointSponsor[],
  immigrants: Immigrant[],
  guidelines: PovertyGuidelines
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Results
  const resultsData = [
    ["I-864 Qualification Results"],
    [],
    ["Sponsor", "Household Size", "Required Income", "Actual Income", "Surplus/Shortfall", "Assets Needed", "Assets Available", "Asset Multiplier", "Status"],
    ...[petitioner, ...joints].map((r, i) => [
      `${r.name} (${i === 0 ? "Petitioner" : `JS${i}`})`,
      r.householdSize,
      r.requiredIncome,
      r.actualIncome,
      r.surplus,
      r.assetsNeeded,
      r.assetsAvailable,
      r.assetMultiplier + "x",
      r.status,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resultsData), "Results");

  // Sheet 2: Petitioner
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Petitioner Details"],
      [],
      ["Name", sponsor.name],
      ["Annual Income", sponsor.income],
      ["Filing Status", sponsor.filingStatus],
      ["Household Members", sponsor.householdMembers],
      ["Previously Sponsored", sponsor.previouslySponsored],
      ["Active Military", sponsor.isActiveDutyMilitary ? "Yes" : "No"],
      ["Sponsoring Spouse/Child", sponsor.sponsoringSpouseOrChild ? "Yes" : "No"],
      [],
      ["Asset Breakdown"],
      ["Cash", sponsor.assets.cash],
      ["Savings", sponsor.assets.savings],
      ["Checking", sponsor.assets.checking],
      ["Stocks", sponsor.assets.stocks],
      ["Bonds", sponsor.assets.bonds],
      ["Mutual Funds", sponsor.assets.mutualFunds],
      ["Property Equity", sponsor.assets.propertyEquity],
    ]),
    "Petitioner"
  );

  // Sheet 3: Household
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["I-864A Household Contributors"],
      [],
      ["Name", "Relationship", "Annual Income", "Assets", "Included"],
      ...household.map((m) => [m.name, m.relationship, m.income, m.assets, m.included ? "Yes" : "No"]),
    ]),
    "Household"
  );

  // Sheet 4: Joint Sponsors
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Joint Sponsors"],
      [],
      ["Name", "Married", "Children", "Other Dependents", "Prev Sponsored", "Income", "Assets", "Immigrants Covered"],
      ...jointSponsors.map((j) => [j.name, j.married ? "Yes" : "No", j.children, j.otherDependents, j.previouslySponsored, j.income, j.assets, j.immigrantsCovered]),
    ]),
    "Joint Sponsors"
  );

  // Sheet 5: Immigrants
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Intending Immigrants"],
      [],
      ["Name", "Case Group", "Role", "Assigned Sponsor"],
      ...immigrants.map((i) => [i.name, i.caseGroup, i.role, i.assignedSponsor]),
    ]),
    "Immigrants"
  );

  // Sheet 6: Guidelines
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [`USCIS I-864P ${guidelines.year} — 125% Federal Poverty Guidelines`],
      [],
      ["Household Size", "Threshold (USD)"],
      ["1", guidelines.h1],
      ["2", guidelines.h2],
      ["3", guidelines.h3],
      ["4", guidelines.h4],
      ["5", guidelines.h5],
      ["6", guidelines.h6],
      ["7", guidelines.h7],
      ["8", guidelines.h8],
      ["Each additional person", guidelines.additional],
    ]),
    "Guidelines"
  );

  XLSX.writeFile(wb, `I-864-Report-${sponsor.name || "petitioner"}-${Date.now()}.xlsx`);
}
