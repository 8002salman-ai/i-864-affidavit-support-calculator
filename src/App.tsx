import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type {
  AssetBreakdown, HouseholdMember, Immigrant,
  JointSponsor, PovertyGuidelines, Sponsor, SponsorResult,
} from "./types";
import {
  DEFAULT_POVERTY_2024_48, DEFAULT_POVERTY_2024_48_100,
  DEFAULT_POVERTY_2024_AK, DEFAULT_POVERTY_2024_HI, getRequiredIncome,
} from "./povertyData";
import { exportPDF, exportExcel } from "./exports";
import {
  loadFromLocalStorage, saveToLocalStorage, clearLocalStorage,
  downloadDatabase, importDatabase, type AppData,
} from "./useLocalStorage";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const emptyAssets = (): AssetBreakdown => ({ cash:0, savings:0, checking:0, stocks:0, bonds:0, mutualFunds:0, propertyEquity:0 });
const sumAssets = (a: AssetBreakdown) => a.cash+a.savings+a.checking+a.stocks+a.bonds+a.mutualFunds+a.propertyEquity;
const fmt = (n: number) => n.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const pct = (a: number, b: number) => b === 0 ? 0 : Math.min(100, Math.round((a / b) * 100));

// ─────────────────────────────────────────────────────────────────────────────
// THEMES
// ─────────────────────────────────────────────────────────────────────────────
type ThemeId = "indigo" | "dark" | "emerald" | "rose" | "navy";
const THEMES: Record<ThemeId, {
  name: string; emoji: string;
  header: string; headerBorder: string; activeTab: string; tabHover: string;
  bg: string; card: string; cardBorder: string; text: string; subtext: string;
  label: string; input: string; inputFocus: string; select: string;
  btnPrimary: string; btnSecondary: string; stepBadge: string;
  tableHead: string; tableRow: string; sectionIcon: string;
  liveBar: string; liveBarText: string;
}> = {
  indigo: {
    name:"Classic Indigo", emoji:"🟣",
    header:"bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-600",
    headerBorder:"border-indigo-800",
    activeTab:"bg-slate-50 text-indigo-700 font-bold shadow",
    tabHover:"text-indigo-100 hover:bg-white/10",
    bg:"bg-slate-50", card:"bg-white", cardBorder:"border border-slate-200 shadow-sm",
    text:"text-slate-900", subtext:"text-slate-500",
    label:"text-slate-600", input:"bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    inputFocus:"focus:ring-indigo-500 focus:border-indigo-500",
    select:"bg-white border-slate-300 text-slate-900",
    btnPrimary:"bg-indigo-600 hover:bg-indigo-700 text-white",
    btnSecondary:"bg-slate-100 hover:bg-slate-200 text-slate-700",
    stepBadge:"bg-indigo-100 text-indigo-700",
    tableHead:"bg-slate-100 text-slate-700", tableRow:"hover:bg-slate-50 border-slate-100",
    sectionIcon:"bg-indigo-100 text-indigo-700",
    liveBar:"bg-indigo-900/95 backdrop-blur", liveBarText:"text-indigo-100",
  },
  dark: {
    name:"Dark Mode", emoji:"🌑",
    header:"bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900",
    headerBorder:"border-gray-700",
    activeTab:"bg-gray-700 text-white font-bold shadow",
    tabHover:"text-gray-300 hover:bg-gray-700/50",
    bg:"bg-gray-950", card:"bg-gray-900", cardBorder:"border border-gray-700/80 shadow-md shadow-black/40",
    text:"text-gray-100", subtext:"text-gray-400",
    label:"text-gray-400", input:"bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500",
    inputFocus:"focus:ring-indigo-500 focus:border-indigo-500",
    select:"bg-gray-800 border-gray-600 text-gray-100",
    btnPrimary:"bg-indigo-600 hover:bg-indigo-500 text-white",
    btnSecondary:"bg-gray-700 hover:bg-gray-600 text-gray-200",
    stepBadge:"bg-gray-700 text-indigo-300",
    tableHead:"bg-gray-800 text-gray-300", tableRow:"hover:bg-gray-800 border-gray-700",
    sectionIcon:"bg-gray-700 text-indigo-400",
    liveBar:"bg-gray-900/98 backdrop-blur border-t border-gray-700", liveBarText:"text-gray-300",
  },
  emerald: {
    name:"Emerald Pro", emoji:"🟢",
    header:"bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700",
    headerBorder:"border-emerald-900",
    activeTab:"bg-slate-50 text-emerald-700 font-bold shadow",
    tabHover:"text-emerald-100 hover:bg-white/10",
    bg:"bg-slate-50", card:"bg-white", cardBorder:"border border-slate-200 shadow-sm",
    text:"text-slate-900", subtext:"text-slate-500",
    label:"text-slate-600", input:"bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    inputFocus:"focus:ring-emerald-500 focus:border-emerald-500",
    select:"bg-white border-slate-300 text-slate-900",
    btnPrimary:"bg-emerald-600 hover:bg-emerald-700 text-white",
    btnSecondary:"bg-slate-100 hover:bg-slate-200 text-slate-700",
    stepBadge:"bg-emerald-100 text-emerald-700",
    tableHead:"bg-slate-100 text-slate-700", tableRow:"hover:bg-slate-50 border-slate-100",
    sectionIcon:"bg-emerald-100 text-emerald-700",
    liveBar:"bg-emerald-900/95 backdrop-blur", liveBarText:"text-emerald-100",
  },
  rose: {
    name:"Rose Executive", emoji:"🌹",
    header:"bg-gradient-to-r from-rose-700 via-pink-700 to-fuchsia-700",
    headerBorder:"border-rose-900",
    activeTab:"bg-slate-50 text-rose-700 font-bold shadow",
    tabHover:"text-rose-100 hover:bg-white/10",
    bg:"bg-slate-50", card:"bg-white", cardBorder:"border border-slate-200 shadow-sm",
    text:"text-slate-900", subtext:"text-slate-500",
    label:"text-slate-600", input:"bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    inputFocus:"focus:ring-rose-500 focus:border-rose-500",
    select:"bg-white border-slate-300 text-slate-900",
    btnPrimary:"bg-rose-600 hover:bg-rose-700 text-white",
    btnSecondary:"bg-slate-100 hover:bg-slate-200 text-slate-700",
    stepBadge:"bg-rose-100 text-rose-700",
    tableHead:"bg-slate-100 text-slate-700", tableRow:"hover:bg-slate-50 border-slate-100",
    sectionIcon:"bg-rose-100 text-rose-700",
    liveBar:"bg-rose-900/95 backdrop-blur", liveBarText:"text-rose-100",
  },
  navy: {
    name:"Navy Law", emoji:"⚓",
    header:"bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900",
    headerBorder:"border-blue-950",
    activeTab:"bg-blue-50 text-blue-900 font-bold shadow",
    tabHover:"text-blue-200 hover:bg-white/10",
    bg:"bg-blue-50", card:"bg-white", cardBorder:"border border-blue-100 shadow-sm",
    text:"text-blue-950", subtext:"text-blue-500",
    label:"text-blue-700", input:"bg-white border-blue-200 text-blue-950 placeholder-blue-300",
    inputFocus:"focus:ring-blue-600 focus:border-blue-600",
    select:"bg-white border-blue-200 text-blue-950",
    btnPrimary:"bg-blue-800 hover:bg-blue-900 text-white",
    btnSecondary:"bg-blue-100 hover:bg-blue-200 text-blue-800",
    stepBadge:"bg-blue-100 text-blue-800",
    tableHead:"bg-blue-50 text-blue-800", tableRow:"hover:bg-blue-50 border-blue-100",
    sectionIcon:"bg-blue-100 text-blue-800",
    liveBar:"bg-blue-950/97 backdrop-blur", liveBarText:"text-blue-200",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
type Toast = { id: string; msg: string; type: "success"|"error"|"info"|"warn" };
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER INPUT — string-based (no glitch)
// ─────────────────────────────────────────────────────────────────────────────
function NumberInput({ value, onChange, placeholder, prefix, min, theme }: {
  value: number; onChange: (n: number) => void;
  placeholder?: string; prefix?: string; min?: number;
  theme: typeof THEMES[ThemeId];
}) {
  const [text, setText] = useState(value ? String(value) : "");
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) { setText(value ? String(value) : ""); prev.current = value; }
  }, [value]);
  const onChange_ = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-" || /^-?\d*\.?\d*$/.test(raw)) {
      setText(raw);
      const n = parseFloat(raw);
      if (!isNaN(n)) { const c = min !== undefined ? Math.max(min, n) : n; prev.current = c; onChange(c); }
      else if (raw === "" || raw === "-") { prev.current = 0; onChange(0); }
    }
  };
  const onBlur = () => {
    const n = parseFloat(text);
    if (isNaN(n) || text === "" || text === "-") { setText(""); prev.current = 0; onChange(0); }
    else { const c = min !== undefined ? Math.max(min, n) : n; setText(String(c)); prev.current = c; onChange(c); }
  };
  return (
    <div className="relative">
      {prefix && <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none ${theme.subtext}`}>{prefix}</span>}
      <input type="text" inputMode="decimal" value={text} onChange={onChange_} onBlur={onBlur}
        placeholder={placeholder || "0"}
        className={`w-full ${prefix?"pl-7":"pl-3"} pr-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 transition ${theme.input} ${theme.inputFocus}`}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
const defaultSponsor: Sponsor = {
  name:"", income:0, filingStatus:"Single", householdMembers:1,
  previouslySponsored:0, assets:emptyAssets(), isActiveDutyMilitary:false, sponsoringSpouseOrChild:false,
};
const DEMO_DATA = {
  sponsor: { name:"Jane Smith", income:68000, filingStatus:"Married Filing Jointly" as const, householdMembers:3, previouslySponsored:0, assets:{ cash:5000,savings:18000,checking:4000,stocks:12000,bonds:0,mutualFunds:8000,propertyEquity:0 }, isActiveDutyMilitary:false, sponsoringSpouseOrChild:false },
  householdMembers: [{ id:"demo1", name:"Robert Smith", relationship:"Spouse", income:22000, assets:5000, included:true }],
  immigrants: [{ id:"di1", name:"Maria Garcia", caseGroup:"IR-1", role:"Principal" as const, assignedSponsor:"Petitioner" as const }],
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const saved = useRef(loadFromLocalStorage());

  // Theme
  const [themeId, setThemeId] = useState<ThemeId>(
    (localStorage.getItem("i864_theme") as ThemeId) || "indigo"
  );
  const T = THEMES[themeId];

  // Guidelines
  const [region, setRegion] = useState<"48"|"AK"|"HI">((saved.current?.region as "48"|"AK"|"HI")||"48");
  const [guidelines48,  setGuidelines48]  = useState<PovertyGuidelines>((saved.current?.guidelines48  as PovertyGuidelines)||DEFAULT_POVERTY_2024_48);
  const [guidelinesAK,  setGuidelinesAK]  = useState<PovertyGuidelines>((saved.current?.guidelinesAK  as PovertyGuidelines)||DEFAULT_POVERTY_2024_AK);
  const [guidelinesHI,  setGuidelinesHI]  = useState<PovertyGuidelines>((saved.current?.guidelinesHI  as PovertyGuidelines)||DEFAULT_POVERTY_2024_HI);
  const [guidelines100, setGuidelines100] = useState<PovertyGuidelines>((saved.current?.guidelines100 as PovertyGuidelines)||DEFAULT_POVERTY_2024_48_100);
  const activeG = region==="AK"?guidelinesAK:region==="HI"?guidelinesHI:guidelines48;
  const setActiveG = (g: PovertyGuidelines) => { if(region==="AK")setGuidelinesAK(g); else if(region==="HI")setGuidelinesHI(g); else setGuidelines48(g); };

  // Data
  const [sponsor,          setSponsor]          = useState<Sponsor>         ((saved.current?.sponsor          as Sponsor)||defaultSponsor);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>((saved.current?.householdMembers as HouseholdMember[])||[]);
  const [jointSponsors,    setJointSponsors]    = useState<JointSponsor[]>   ((saved.current?.jointSponsors    as JointSponsor[])||[]);
  const [js1Assets,        setJs1Assets]        = useState<AssetBreakdown>   ((saved.current?.jointSponsor1Assets as AssetBreakdown)||emptyAssets());
  const [js2Assets,        setJs2Assets]        = useState<AssetBreakdown>   ((saved.current?.jointSponsor2Assets as AssetBreakdown)||emptyAssets());
  const [immigrants,       setImmigrants]       = useState<Immigrant[]>      ((saved.current?.immigrants        as Immigrant[])||[]);
  const [tab, setTab] = useState<"sponsor"|"household"|"joint"|"immigrants"|"guidelines"|"results"|"strategy">(
    (saved.current?.tab as "sponsor")||"sponsor"
  );

  // Save state
  const [saveStatus,    setSaveStatus]    = useState<"idle"|"saving"|"saved"|"unsaved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState(saved.current?.savedAt ? new Date(saved.current.savedAt).toLocaleTimeString() : "");
  const [saveCount,     setSaveCount]     = useState(0);
  const hasUnsaved = useRef(false);

  // UI state
  const [showDbPanel,    setShowDbPanel]    = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showShortcuts,  setShowShortcuts]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, add: toast } = useToast();

  // ── Theme persist
  useEffect(() => { localStorage.setItem("i864_theme", themeId); }, [themeId]);

  // ── Build snapshot
  const buildData = useCallback((): AppData => ({
    version:1, savedAt:new Date().toISOString(),
    region, sponsor, householdMembers, jointSponsors,
    jointSponsor1Assets:js1Assets, jointSponsor2Assets:js2Assets,
    immigrants, guidelines48, guidelinesAK, guidelinesHI, guidelines100, tab,
  }), [region,sponsor,householdMembers,jointSponsors,js1Assets,js2Assets,immigrants,guidelines48,guidelinesAK,guidelinesHI,guidelines100,tab]);

  // ── Do save
  const doSave = useCallback(() => {
    setSaveStatus("saving");
    saveToLocalStorage(buildData());
    setLastSavedTime(new Date().toLocaleTimeString());
    setSaveCount(c => c+1);
    hasUnsaved.current = false;
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  }, [buildData]);

  // ── Mark unsaved on data changes
  useEffect(() => { hasUnsaved.current = true; setSaveStatus("unsaved"); },
    [region,sponsor,householdMembers,jointSponsors,js1Assets,js2Assets,immigrants,guidelines48,guidelinesAK,guidelinesHI,guidelines100]);

  // ── Auto-save every 10 seconds
  useEffect(() => {
    const iv = setInterval(() => { if(hasUnsaved.current) doSave(); }, 10_000);
    return () => clearInterval(iv);
  }, [doSave]);

  // ── Save on close
  useEffect(() => {
    const fn = () => { if(hasUnsaved.current) saveToLocalStorage(buildData()); };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [buildData]);

  // ── Save tab immediately
  useEffect(() => { saveToLocalStorage(buildData()); }, [tab]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const tabs = ["sponsor","household","joint","immigrants","guidelines","results","strategy"] as const;
    const kh = (e: KeyboardEvent) => {
      if((e.ctrlKey||e.metaKey) && e.key==="s"){ e.preventDefault(); doSave(); toast("💾 Saved manually!","success"); }
      if((e.ctrlKey||e.metaKey) && e.key==="?"){ e.preventDefault(); setShowShortcuts(s=>!s); }
      if(e.altKey && e.key>="1" && e.key<="7"){ const i=parseInt(e.key)-1; if(tabs[i]) setTab(tabs[i]); }
    };
    window.addEventListener("keydown",kh);
    return () => window.removeEventListener("keydown",kh);
  }, [doSave, toast]);

  // ── Import / clear / demo
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if(!f) return;
    try {
      const d = await importDatabase(f);
      setRegion((d.region as "48")||"48"); setSponsor((d.sponsor as Sponsor)||defaultSponsor);
      setHouseholdMembers((d.householdMembers as HouseholdMember[])||[]);
      setJointSponsors((d.jointSponsors as JointSponsor[])||[]);
      setJs1Assets((d.jointSponsor1Assets as AssetBreakdown)||emptyAssets());
      setJs2Assets((d.jointSponsor2Assets as AssetBreakdown)||emptyAssets());
      setImmigrants((d.immigrants as Immigrant[])||[]);
      setGuidelines48((d.guidelines48 as PovertyGuidelines)||DEFAULT_POVERTY_2024_48);
      setGuidelinesAK((d.guidelinesAK as PovertyGuidelines)||DEFAULT_POVERTY_2024_AK);
      setGuidelinesHI((d.guidelinesHI as PovertyGuidelines)||DEFAULT_POVERTY_2024_HI);
      setGuidelines100((d.guidelines100 as PovertyGuidelines)||DEFAULT_POVERTY_2024_48_100);
      setTab((d.tab as "sponsor")||"sponsor");
      toast("✅ Database imported!","success");
    } catch(err){ toast("❌ Import failed: "+(err as Error).message,"error"); }
    e.target.value="";
  };

  const handleClearAll = () => {
    if(!confirm("⚠️ Clear ALL data? This cannot be undone.")) return;
    clearLocalStorage(); setSponsor(defaultSponsor); setHouseholdMembers([]); setJointSponsors([]);
    setJs1Assets(emptyAssets()); setJs2Assets(emptyAssets()); setImmigrants([]); setRegion("48");
    setGuidelines48(DEFAULT_POVERTY_2024_48); setGuidelinesAK(DEFAULT_POVERTY_2024_AK);
    setGuidelinesHI(DEFAULT_POVERTY_2024_HI); setGuidelines100(DEFAULT_POVERTY_2024_48_100);
    setTab("sponsor"); toast("🗑 All data cleared","warn");
  };

  const loadDemo = () => {
    setSponsor(DEMO_DATA.sponsor); setHouseholdMembers(DEMO_DATA.householdMembers);
    setImmigrants(DEMO_DATA.immigrants); setJointSponsors([]); setJs1Assets(emptyAssets()); setJs2Assets(emptyAssets());
    toast("🎯 Demo data loaded!","info");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────
  const contributing   = householdMembers.filter(m=>m.included);
  const immByPet       = immigrants.filter(i=>i.assignedSponsor==="Petitioner").length;
  const immByJS1       = immigrants.filter(i=>i.assignedSponsor==="Joint Sponsor 1").length;
  const immByJS2       = immigrants.filter(i=>i.assignedSponsor==="Joint Sponsor 2").length;
  const petHHSize      = sponsor.householdMembers + sponsor.previouslySponsored + immByPet;
  const petMultiplier  = sponsor.sponsoringSpouseOrChild ? 3 : 5;
  const contribIncome  = contributing.reduce((s,m)=>s+(Number(m.income)||0),0);
  const contribAssets  = contributing.reduce((s,m)=>s+(Number(m.assets)||0),0);
  const petIncome      = (Number(sponsor.income)||0) + contribIncome;
  const petAssets      = sumAssets(sponsor.assets) + contribAssets;
  const petRequired    = sponsor.isActiveDutyMilitary && sponsor.sponsoringSpouseOrChild
                           ? getRequiredIncome(petHHSize, guidelines100)
                           : getRequiredIncome(petHHSize, activeG);
  const petShortfall   = Math.max(0, petRequired - petIncome);
  const petAssetsNeed  = petShortfall * petMultiplier;
  const petStatus: "Pass"|"Fail"|"Borderline" =
    petIncome >= petRequired
      ? (petIncome >= petRequired*1.1 ? "Pass" : "Borderline")
      : petAssets >= petAssetsNeed
        ? (petAssets >= petAssetsNeed*1.1 ? "Pass" : "Borderline")
        : "Fail";

  const petResult: SponsorResult = {
    name: sponsor.name||"Petitioner", householdSize: petHHSize,
    requiredIncome: petRequired, actualIncome: petIncome,
    surplus: petIncome - petRequired, assetsNeeded: petAssetsNeed,
    assetsAvailable: petAssets, assetMultiplier: petMultiplier,
    effectiveIncome: petIncome + petAssets/petMultiplier, status: petStatus,
    notes:[
      `Household: sponsor(1) + dependents(${sponsor.householdMembers-1}) + prev sponsored(${sponsor.previouslySponsored}) + immigrants(${immByPet}) = ${petHHSize}`,
      `Required at ${sponsor.isActiveDutyMilitary&&sponsor.sponsoringSpouseOrChild?"100%":"125%"} FPG (${region==="48"?"48 States/DC":region}) = ${fmt(petRequired)}`,
      `Income: sponsor ${fmt(sponsor.income)} + I-864A ${fmt(contribIncome)} = ${fmt(petIncome)}`,
      petShortfall>0
        ? `Shortfall ${fmt(petShortfall)} × ${petMultiplier} = ${fmt(petAssetsNeed)} assets required`
        : `Income qualifies — assets supplementary`,
    ],
  };

  function calcJS(js: JointSponsor, jsA: AssetBreakdown, imm: number): SponsorResult {
    const hhSize = 1+(js.married?1:0)+(Number(js.children)||0)+(Number(js.otherDependents)||0)+(Number(js.previouslySponsored)||0)+imm;
    const req = getRequiredIncome(hhSize, activeG);
    const inc = Number(js.income)||0;
    const av  = sumAssets(jsA);
    const sf  = Math.max(0, req-inc);
    const an  = sf*5;
    const st: "Pass"|"Fail"|"Borderline" = inc>=req?(inc>=req*1.1?"Pass":"Borderline"):av>=an?(av>=an*1.1?"Pass":"Borderline"):"Fail";
    return {
      name:js.name||"Joint Sponsor", householdSize:hhSize, requiredIncome:req, actualIncome:inc,
      surplus:inc-req, assetsNeeded:an, assetsAvailable:av, assetMultiplier:5,
      effectiveIncome:inc+av/5, status:st,
      notes:[
        `HH: self(1)${js.married?" + spouse(1)":""} + children(${js.children}) + other(${js.otherDependents}) + prev(${js.previouslySponsored}) + immigrants(${imm}) = ${hhSize}`,
        `Required at 125% FPG = ${fmt(req)}`,
        sf>0 ? `Shortfall ${fmt(sf)} × 5 = ${fmt(an)} assets needed` : `Income qualifies`,
      ],
    };
  }

  const jsResults = jointSponsors.map((js,i) =>
    calcJS(js, i===0?js1Assets:js2Assets, (i===0?immByJS1:immByJS2)||Number(js.immigrantsCovered)||0)
  );
  const allResults = [petResult, ...jsResults];

  // ── Completion progress
  const progress = useMemo(() => {
    let p = 0;
    if(sponsor.name)       p+=15;
    if(sponsor.income>0)   p+=20;
    if(immigrants.length)  p+=25;
    if(petStatus==="Pass") p+=30;
    else if(jsResults.some(r=>r.status==="Pass")) p+=20;
    return Math.min(100, p);
  }, [sponsor, immigrants, petStatus, jsResults]);

  // ── Strategy
  const strategy = useMemo(() => {
    const checklist = [
      "Form I-864 signed by petitioner",
      "Most recent Federal tax return (1040 + W-2/1099)",
      "Proof of current employment (letter + 6 pay stubs)",
      "Proof of U.S. domicile (lease/utility/bank statements)",
      "Proof of citizenship/LPR status (passport/green card)",
    ];
    if(contributing.length>0) checklist.push("Form I-864A + tax returns for each contributing household member");
    if(jointSponsors.length>0) checklist.push("Separate I-864 + supporting docs for each joint sponsor");
    if(petAssets>0||sumAssets(js1Assets)>0||sumAssets(js2Assets)>0)
      checklist.push("Asset docs: 12-mo bank statements, brokerage statements, property appraisal");
    if(sponsor.isActiveDutyMilitary) checklist.push("Military orders / DD-214 or current LES");

    let risk=0;
    if(petStatus==="Fail") risk+=45; else if(petStatus==="Borderline") risk+=20;
    if(petIncome<petRequired) risk+=15;
    if(petAssets<petAssetsNeed&&petShortfall>0) risk+=15;
    if(jointSponsors.length===0&&petStatus!=="Pass") risk+=15;
    if(immigrants.length===0) risk+=5;
    if(jsResults.some(r=>r.status==="Fail")) risk+=10;
    risk=Math.min(100,risk);

    const recs:string[]=[];
    if(petStatus==="Pass"){
      recs.push(`✓ ${sponsor.name||"Petitioner"} qualifies independently for all ${immigrants.length} immigrant(s).`);
    } else {
      if(jointSponsors.length===0) recs.push("⚠ Petitioner does not meet 125% FPG. Add a joint sponsor (separate I-864) or contributing household members (I-864A).");
      else {
        const passing = jsResults.map((r,i)=>({r,i})).filter(x=>x.r.status==="Pass");
        if(passing.length>0) recs.push(`✓ Joint Sponsor ${passing[0].i+1} (${passing[0].r.name}) qualifies. Assign all immigrants to this sponsor.`);
        else recs.push("⚠ No sponsor meets threshold. Consider: (1) split immigrants between 2 joint sponsors, (2) add I-864A contributors, (3) include more assets.");
      }
    }
    if(jointSponsors.length===2&&immigrants.length>1) recs.push("Note: Each immigrant can only be sponsored by ONE joint sponsor. Divide immigrants between the two.");

    let structure="Single I-864 by Petitioner";
    if(contributing.length>0) structure+=" + I-864A(s)";
    if(jointSponsors.length===1) structure+=" + 1 Joint Sponsor I-864";
    if(jointSponsors.length===2) structure+=" + 2 Joint Sponsor I-864s";

    return { checklist, risk, recommendations: recs, structure };
  }, [petResult,jsResults,contributing,sponsor,petAssets,petAssetsNeed,petShortfall,petStatus,petIncome,petRequired,immigrants,jointSponsors,js1Assets,js2Assets]);

  // ─────────────────────────────────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: "Pass"|"Fail"|"Borderline" }) => {
    const cls = status==="Pass"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : status==="Borderline"
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-rose-100 text-rose-800 border-rose-300";
    const dot = status==="Pass"?"bg-emerald-500":status==="Borderline"?"bg-amber-500":"bg-rose-500";
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cls}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`}/>
        {status==="Pass"?"✓ PASS":status==="Fail"?"✗ FAIL":"⚡ BORDERLINE"}
      </span>
    );
  };

  const Lbl = ({ children }: { children: React.ReactNode }) => (
    <label className={`block text-[11px] font-bold mb-1 uppercase tracking-widest ${T.label}`}>{children}</label>
  );

  const Card = ({ children, className="" }: { children: React.ReactNode; className?: string }) => (
    <div className={`${T.card} rounded-2xl ${T.cardBorder} ${className}`}>{children}</div>
  );

  const SectionHeader = ({ n, title, sub }: { n:number; title:string; sub:string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${T.stepBadge}`}>{n}</div>
      <div><h2 className={`text-lg font-bold ${T.text}`}>{title}</h2><p className={`text-xs ${T.subtext}`}>{sub}</p></div>
    </div>
  );

  const TextInput = ({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) => (
    <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 transition ${T.input} ${T.inputFocus}`}/>
  );

  const SelectInput = ({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{v:string;l:string;disabled?:boolean}[] }) => (
    <select value={value} onChange={e=>onChange(e.target.value)}
      className={`w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 transition ${T.select} ${T.inputFocus}`}>
      {options.map(o=><option key={o.v} value={o.v} disabled={o.disabled}>{o.l}</option>)}
    </select>
  );

  const Checkbox = ({ checked, onChange, label }: { checked:boolean; onChange:(v:boolean)=>void; label:string }) => (
    <label className={`flex items-center gap-2.5 text-sm cursor-pointer ${T.text}`}>
      <div onClick={()=>onChange(!checked)}
        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition cursor-pointer
          ${checked ? "bg-indigo-600 border-indigo-600" : `border-slate-400 ${T.card}`}`}>
        {checked && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
      </div>
      {label}
    </label>
  );

  const assetKeys: (keyof AssetBreakdown)[] = ["cash","savings","checking","stocks","bonds","mutualFunds","propertyEquity"];
  const assetLabel = (k: keyof AssetBreakdown) =>
    k==="mutualFunds"?"Mutual Funds":k==="propertyEquity"?"Property Equity":k.charAt(0).toUpperCase()+k.slice(1);

  const IncomeGauge = ({ income, required, label }: { income:number; required:number; label:string }) => {
    const p = pct(income, required);
    const color = p>=110?"bg-emerald-500":p>=100?"bg-blue-500":p>=80?"bg-amber-500":"bg-rose-500";
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className={T.subtext}>{label}</span>
          <span className={`font-bold ${p>=100?"text-emerald-600":"text-rose-600"}`}>{p}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{width:`${Math.min(100,p)}%`}}/>
        </div>
        <div className="flex justify-between text-[10px] mt-0.5">
          <span className={T.subtext}>{fmt(income)}</span>
          <span className={T.subtext}>Need {fmt(required)}</span>
        </div>
      </div>
    );
  };

  const TABS = [
    {id:"sponsor",      icon:"👤", label:"Petitioner"},
    {id:"household",    icon:"🏠", label:"Household"},
    {id:"joint",        icon:"🤝", label:"Joint Sponsors"},
    {id:"immigrants",   icon:"✈️",  label:"Immigrants"},
    {id:"guidelines",   icon:"📋", label:"FPG Table"},
    {id:"results",      icon:"📊", label:"Results"},
    {id:"strategy",     icon:"🧠", label:"Strategy"},
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${T.bg} ${T.text}`}>
      {/* ── TOAST ── */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold pointer-events-auto
            flex items-center gap-2 backdrop-blur animate-slide-in
            ${t.type==="success"?"bg-emerald-600 text-white":t.type==="error"?"bg-rose-600 text-white":t.type==="warn"?"bg-amber-500 text-white":"bg-blue-600 text-white"}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── SHORTCUTS MODAL ── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={()=>setShowShortcuts(false)}>
          <div className={`${T.card} rounded-2xl p-6 max-w-md w-full shadow-2xl ${T.cardBorder}`} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${T.text}`}>⌨️ Keyboard Shortcuts</h3>
              <button onClick={()=>setShowShortcuts(false)} className={`${T.subtext} hover:text-red-500 text-xl`}>✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[["Ctrl/⌘ + S","Save Now"],["Ctrl/⌘ + ?","Toggle Shortcuts"],["Alt + 1–7","Switch Tabs"]].map(([k,d])=>(
                <div key={k} className={`flex justify-between py-2 border-b ${T.cardBorder}`}>
                  <code className={`${T.stepBadge} px-2 py-0.5 rounded text-xs font-mono`}>{k}</code>
                  <span className={T.subtext}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className={`${T.header} text-white sticky top-0 z-30 shadow-2xl print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: Logo + title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/15 backdrop-blur p-2.5 rounded-xl border border-white/20 shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight truncate">I-864 AOS Calculator</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-white/70">USCIS 2024 · 125% FPG</span>
                {saveStatus==="unsaved"  && <span className="inline-flex items-center gap-1 bg-amber-500/30  px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-200"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"/>Unsaved</span>}
                {saveStatus==="saving"   && <span className="inline-flex items-center gap-1 bg-blue-500/30    px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-200"><span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"/>Saving…</span>}
                {saveStatus==="saved"    && <span className="inline-flex items-center gap-1 bg-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-200"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/>✓ Saved</span>}
                {lastSavedTime && <span className="text-[10px] text-white/50 hidden sm:inline">{lastSavedTime}</span>}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-1.5 flex-wrap items-center ml-auto">
            {/* Save */}
            <button onClick={()=>{doSave();toast("💾 Saved!","success");}}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1
                ${saveStatus==="unsaved"?"bg-amber-400 text-amber-900 border-amber-500 animate-pulse":"bg-emerald-500/80 text-white border-emerald-400"}`}>
              💾 {saveStatus==="unsaved"?"Save Now":"Saved ✓"}
            </button>
            {/* Theme */}
            <button onClick={()=>{setShowThemePanel(s=>!s);setShowDbPanel(false);}}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition">
              🎨 {T.emoji}
            </button>
            {/* DB */}
            <button onClick={()=>{setShowDbPanel(s=>!s);setShowThemePanel(false);}}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition">
              🗄 DB
            </button>
            {/* Demo */}
            <button onClick={loadDemo}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition hidden sm:flex">
              🎯 Demo
            </button>
            {/* Shortcuts */}
            <button onClick={()=>setShowShortcuts(true)}
              className="px-2 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition">
              ⌨️
            </button>
            {/* Export */}
            <button onClick={()=>exportPDF(petResult,jsResults,strategy,sponsor,immigrants)}
              className="px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-white/90 transition shadow hidden sm:flex">📄 PDF</button>
            <button onClick={()=>exportExcel(petResult,jsResults,sponsor,householdMembers,jointSponsors,immigrants,activeG)}
              className="px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-white/90 transition shadow hidden sm:flex">📊 XLS</button>
            <button onClick={()=>window.print()}
              className="px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-white/90 transition shadow hidden sm:flex">🖨</button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/10">
          <div className="h-full bg-emerald-400 transition-all duration-1000" style={{width:`${progress}%`}}/>
        </div>

        {/* ── THEME PANEL ── */}
        {showThemePanel && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 border-t border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest mr-1">Theme:</span>
              {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id,t])=>(
                <button key={id} onClick={()=>{setThemeId(id);setShowThemePanel(false);}}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1
                    ${themeId===id?"bg-white text-gray-800 border-white shadow":"bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── DB PANEL ── */}
        {showDbPanel && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 border-t border-white/10">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-white/70 mb-2">🗄 LOCAL DATABASE — Auto-saves every 10s | Ctrl+S to force save</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-white/50 text-[10px] uppercase">Mode</div>
                    <div className="font-bold">⏱ Auto 10s</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-white/50 text-[10px] uppercase">Last Saved</div>
                    <div className="font-bold">{lastSavedTime||"—"}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-white/50 text-[10px] uppercase">Session Saves</div>
                    <div className="font-bold">{saveCount}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-start">
                <button onClick={()=>{doSave();toast("💾 Saved!","success");setShowDbPanel(false);}}
                  className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-400 transition">💾 Save Now</button>
                <button onClick={()=>{downloadDatabase();toast("⬇ Download started","info");}}
                  className="px-3 py-2 bg-sky-500 text-white rounded-lg text-xs font-bold hover:bg-sky-400 transition">⬇ Download .json</button>
                <button onClick={()=>fileInputRef.current?.click()}
                  className="px-3 py-2 bg-violet-500 text-white rounded-lg text-xs font-bold hover:bg-violet-400 transition">⬆ Import .json</button>
                <button onClick={loadDemo}
                  className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-400 transition">🎯 Load Demo</button>
                <button onClick={handleClearAll}
                  className="px-3 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-400 transition">🗑 Clear All</button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden"/>
          </div>
        )}

        {/* ── TABS ── */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto pb-0 pt-1">
          {TABS.map((t,i)=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-3 sm:px-4 py-2 rounded-t-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5
                ${tab===t.id ? T.activeTab : T.tabHover}`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{i+1}. {t.label}</span>
              <span className="sm:hidden">{i+1}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 print:px-0">

        {/* ════ TAB 1: PETITIONER ════ */}
        {tab==="sponsor" && (
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <SectionHeader n={1} title="Petitioner / Sponsor" sub="The U.S. citizen or LPR filing Form I-864"/>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><Lbl>Full Name</Lbl><TextInput value={sponsor.name} onChange={v=>setSponsor({...sponsor,name:v})} placeholder="Jane Smith"/></div>
                <div>
                  <Lbl>Annual Income</Lbl>
                  <NumberInput prefix="$" value={sponsor.income} onChange={n=>setSponsor({...sponsor,income:n})} theme={T}/>
                </div>
                <div>
                  <Lbl>Filing Status</Lbl>
                  <SelectInput value={sponsor.filingStatus} onChange={v=>setSponsor({...sponsor,filingStatus:v as Sponsor["filingStatus"]})}
                    options={["Single","Married Filing Jointly","Married Filing Separately","Head of Household"].map(o=>({v:o,l:o}))}/>
                </div>
                <div>
                  <Lbl>Household Size (including self)</Lbl>
                  <NumberInput min={1} value={sponsor.householdMembers} onChange={n=>setSponsor({...sponsor,householdMembers:Math.max(1,n)})} theme={T}/>
                  <p className={`text-[10px] mt-1 ${T.subtext}`}>Self + spouse + children + other tax dependents</p>
                </div>
                <div>
                  <Lbl>Previously Sponsored Immigrants</Lbl>
                  <NumberInput value={sponsor.previouslySponsored} onChange={n=>setSponsor({...sponsor,previouslySponsored:n})} theme={T}/>
                  <p className={`text-[10px] mt-1 ${T.subtext}`}>Still under active affidavit obligation</p>
                </div>
                <div className="flex flex-col gap-3 justify-center">
                  <Checkbox checked={sponsor.isActiveDutyMilitary} onChange={v=>setSponsor({...sponsor,isActiveDutyMilitary:v})} label="Active Duty U.S. Military"/>
                  <Checkbox checked={sponsor.sponsoringSpouseOrChild} onChange={v=>setSponsor({...sponsor,sponsoringSpouseOrChild:v})} label="Sponsoring spouse/minor child (3× assets)"/>
                </div>
              </div>

              {/* Income gauge */}
              {(sponsor.income>0||petIncome>0) && (
                <div className="mt-5">
                  <IncomeGauge income={petIncome} required={petRequired} label="Income Progress (incl. I-864A contributors)"/>
                </div>
              )}
            </Card>

            {/* Assets */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold flex items-center gap-2 ${T.text}`}>
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black">$</span>
                  Petitioner Assets
                </h3>
                <span className={`text-xl font-black text-emerald-600`}>{fmt(sumAssets(sponsor.assets))}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {assetKeys.map(k=>(
                  <div key={k}>
                    <Lbl>{assetLabel(k)}</Lbl>
                    <NumberInput prefix="$" value={sponsor.assets[k]} onChange={n=>setSponsor({...sponsor,assets:{...sponsor.assets,[k]:n}})} theme={T}/>
                  </div>
                ))}
              </div>
              {petShortfall>0 && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm">
                  <span className="font-bold text-rose-700">Assets Required: </span>
                  <span className="text-rose-700">{fmt(petAssetsNeed)} ({fmt(petShortfall)} shortfall × {petMultiplier})</span>
                  <span className={`ml-2 font-bold ${petAssets>=petAssetsNeed?"text-emerald-600":"text-rose-600"}`}>
                    {petAssets>=petAssetsNeed?"✓ Met":"✗ Deficit: "+fmt(petAssetsNeed-petAssets)}
                  </span>
                </div>
              )}
            </Card>

            {/* Region */}
            <Card className="p-5">
              <Lbl>Poverty Guidelines Region</Lbl>
              <div className="flex gap-2 flex-wrap mt-2">
                {(["48","AK","HI"] as const).map(r=>(
                  <button key={r} onClick={()=>setRegion(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition border ${region===r?T.btnPrimary+" border-transparent":T.btnSecondary+" border-transparent"}`}>
                    {r==="48"?"🇺🇸 48 States / D.C.":r==="AK"?"🏔 Alaska":"🌺 Hawaii"}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ════ TAB 2: HOUSEHOLD ════ */}
        {tab==="household" && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <SectionHeader n={2} title="Household Members (I-864A)" sub="Adults contributing income/assets — each must sign Form I-864A"/>
              <button onClick={()=>setHouseholdMembers([...householdMembers,{id:uid(),name:"",relationship:"",income:0,assets:0,included:true}])}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${T.btnPrimary}`}>+ Add Member</button>
            </div>

            {householdMembers.length===0 && (
              <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${T.subtext}`}>
                <div className="text-4xl mb-2">🏠</div>
                <p className="text-sm font-semibold">No household members yet</p>
                <p className="text-xs mt-1">Click <strong>+ Add Member</strong> to include income from a relative living with you</p>
              </div>
            )}

            <div className="space-y-3">
              {householdMembers.map((m,idx)=>(
                <div key={m.id} className={`rounded-xl p-4 border-2 ${m.included?"border-emerald-200 bg-emerald-50/30":"border-slate-200"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-bold text-sm ${T.text}`}>Member #{idx+1}
                      {m.name && <span className={`ml-2 font-normal ${T.subtext}`}>— {m.name}</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <button onClick={()=>setHouseholdMembers(householdMembers.map(x=>x.id===m.id?{...x,included:!x.included}:x))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${m.included?"bg-emerald-100 text-emerald-700 hover:bg-emerald-200":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        {m.included?"✓ Included":"○ Excluded"}
                      </button>
                      <button onClick={()=>setHouseholdMembers(householdMembers.filter(x=>x.id!==m.id))}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold">Remove</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><Lbl>Name</Lbl><TextInput value={m.name} onChange={v=>setHouseholdMembers(householdMembers.map(x=>x.id===m.id?{...x,name:v}:x))}/></div>
                    <div><Lbl>Relationship</Lbl><TextInput value={m.relationship} onChange={v=>setHouseholdMembers(householdMembers.map(x=>x.id===m.id?{...x,relationship:v}:x))} placeholder="Spouse, Child…"/></div>
                    <div><Lbl>Annual Income</Lbl><NumberInput prefix="$" value={m.income} onChange={n=>setHouseholdMembers(householdMembers.map(x=>x.id===m.id?{...x,income:n}:x))} theme={T}/></div>
                    <div><Lbl>Total Assets</Lbl><NumberInput prefix="$" value={m.assets} onChange={n=>setHouseholdMembers(householdMembers.map(x=>x.id===m.id?{...x,assets:n}:x))} theme={T}/></div>
                  </div>
                </div>
              ))}
            </div>

            {contributing.length>0 && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 grid grid-cols-2 gap-3 text-sm">
                <div><span className={T.subtext}>Contributing Income:</span> <span className="font-black text-indigo-700">{fmt(contribIncome)}</span></div>
                <div><span className={T.subtext}>Contributing Assets:</span> <span className="font-black text-indigo-700">{fmt(contribAssets)}</span></div>
              </div>
            )}
          </Card>
        )}

        {/* ════ TAB 3: JOINT SPONSORS ════ */}
        {tab==="joint" && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <SectionHeader n={3} title="Joint Sponsors (max 2)" sub="Each files a separate I-864 and must independently meet 125% FPG"/>
              {jointSponsors.length<2 && (
                <button onClick={()=>setJointSponsors([...jointSponsors,{id:uid(),name:"",married:false,children:0,otherDependents:0,previouslySponsored:0,income:0,assets:0,immigrantsCovered:0}])}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${T.btnPrimary}`}>+ Add Joint Sponsor</button>
              )}
            </div>

            {jointSponsors.length===0 && (
              <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${T.subtext}`}>
                <div className="text-4xl mb-2">🤝</div>
                <p className="text-sm font-semibold">No joint sponsors</p>
                <p className="text-xs mt-1">Add one if the petitioner cannot independently meet the income threshold</p>
              </div>
            )}

            <div className="space-y-5">
              {jointSponsors.map((js,idx)=>{
                const jsa = idx===0?js1Assets:js2Assets;
                const setJsa = idx===0?setJs1Assets:setJs2Assets;
                const jr = jsResults[idx];
                return (
                  <div key={js.id} className="border-2 border-indigo-200 rounded-2xl p-4 bg-indigo-50/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm">{idx+1}</span>
                        <span className={`font-bold ${T.text}`}>{js.name||`Joint Sponsor ${idx+1}`}</span>
                        {jr && <StatusBadge status={jr.status}/>}
                      </div>
                      <button onClick={()=>setJointSponsors(jointSponsors.filter(x=>x.id!==js.id))} className="text-rose-500 hover:text-rose-700 text-xs font-bold">Remove</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div><Lbl>Full Name</Lbl><TextInput value={js.name} onChange={v=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,name:v}:x))}/></div>
                      <div>
                        <Lbl>Married?</Lbl>
                        <SelectInput value={js.married?"yes":"no"} onChange={v=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,married:v==="yes"}:x))}
                          options={[{v:"no",l:"No"},{v:"yes",l:"Yes"}]}/>
                      </div>
                      <div><Lbl>Children</Lbl><NumberInput value={js.children} onChange={n=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,children:n}:x))} theme={T}/></div>
                      <div><Lbl>Other Dependents</Lbl><NumberInput value={js.otherDependents} onChange={n=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,otherDependents:n}:x))} theme={T}/></div>
                      <div><Lbl>Prev Sponsored</Lbl><NumberInput value={js.previouslySponsored} onChange={n=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,previouslySponsored:n}:x))} theme={T}/></div>
                      <div><Lbl>Annual Income</Lbl><NumberInput prefix="$" value={js.income} onChange={n=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,income:n}:x))} theme={T}/></div>
                      <div>
                        <Lbl>Immigrants Covered</Lbl>
                        <NumberInput value={js.immigrantsCovered} onChange={n=>setJointSponsors(jointSponsors.map(x=>x.id===js.id?{...x,immigrantsCovered:n}:x))} theme={T}/>
                        <p className={`text-[10px] mt-1 ${T.subtext}`}>Or assign via Tab 4</p>
                      </div>
                    </div>

                    {jr && <IncomeGauge income={jr.actualIncome} required={jr.requiredIncome} label={`JS${idx+1} Income Progress`}/>}

                    <div className="mt-4">
                      <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${T.label}`}>Asset Breakdown</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {assetKeys.map(k=>(
                          <div key={k}><Lbl>{assetLabel(k)}</Lbl><NumberInput prefix="$" value={jsa[k]} onChange={n=>setJsa({...jsa,[k]:n})} theme={T}/></div>
                        ))}
                      </div>
                      <div className={`mt-3 p-2.5 rounded-xl text-sm flex justify-between items-center ${T.stepBadge}`}>
                        <span className="font-semibold">Total Assets</span>
                        <span className="font-black">{fmt(sumAssets(jsa))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ════ TAB 4: IMMIGRANTS ════ */}
        {tab==="immigrants" && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <SectionHeader n={4} title="Intending Immigrants" sub="Assign each immigrant to one sponsor (petitioner or joint sponsor)"/>
              <button onClick={()=>setImmigrants([...immigrants,{id:uid(),name:"",caseGroup:"IR-1",role:"Principal",assignedSponsor:"Petitioner"}])}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${T.btnPrimary}`}>+ Add Immigrant</button>
            </div>

            {immigrants.length===0 && (
              <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${T.subtext}`}>
                <div className="text-4xl mb-2">✈️</div>
                <p className="text-sm font-semibold">No immigrants added yet</p>
              </div>
            )}

            {/* Summary pills */}
            {immigrants.length>0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Petitioner: {immByPet}</span>
                {jointSponsors[0] && <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">JS1: {immByJS1}</span>}
                {jointSponsors[1] && <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">JS2: {immByJS2}</span>}
              </div>
            )}

            <div className="space-y-3">
              {immigrants.map((im,idx)=>(
                <div key={im.id} className={`rounded-xl p-4 border ${T.cardBorder}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-bold text-sm ${T.text}`}>#{idx+1} {im.name||"—"}</span>
                    <button onClick={()=>setImmigrants(immigrants.filter(x=>x.id!==im.id))} className="text-rose-500 hover:text-rose-700 text-xs font-bold">Remove</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><Lbl>Full Name</Lbl><TextInput value={im.name} onChange={v=>setImmigrants(immigrants.map(x=>x.id===im.id?{...x,name:v}:x))}/></div>
                    <div><Lbl>Case Category</Lbl><TextInput value={im.caseGroup} onChange={v=>setImmigrants(immigrants.map(x=>x.id===im.id?{...x,caseGroup:v}:x))} placeholder="IR-1, F2A…"/></div>
                    <div>
                      <Lbl>Role</Lbl>
                      <SelectInput value={im.role} onChange={v=>setImmigrants(immigrants.map(x=>x.id===im.id?{...x,role:v as "Principal"|"Derivative"}:x))}
                        options={[{v:"Principal",l:"Principal"},{v:"Derivative",l:"Derivative"}]}/>
                    </div>
                    <div>
                      <Lbl>Assigned Sponsor</Lbl>
                      <SelectInput value={im.assignedSponsor} onChange={v=>setImmigrants(immigrants.map(x=>x.id===im.id?{...x,assignedSponsor:v as Immigrant["assignedSponsor"]}:x))}
                        options={[
                          {v:"Petitioner",l:"Petitioner"},
                          {v:"Joint Sponsor 1",l:"Joint Sponsor 1",disabled:jointSponsors.length<1},
                          {v:"Joint Sponsor 2",l:"Joint Sponsor 2",disabled:jointSponsors.length<2},
                        ]}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ════ TAB 5: GUIDELINES ════ */}
        {tab==="guidelines" && (
          <Card className="p-5 sm:p-6">
            <SectionHeader n={5} title="USCIS I-864P Poverty Guidelines" sub="125% of HHS Federal Poverty Guidelines — editable, update annually"/>

            <div className="flex gap-2 mb-5 flex-wrap">
              {(["48","AK","HI"] as const).map(r=>(
                <button key={r} onClick={()=>setRegion(r)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${region===r?T.btnPrimary:T.btnSecondary}`}>
                  {r==="48"?"🇺🇸 48 States/DC":r==="AK"?"🏔 Alaska":"🌺 Hawaii"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              <div><Lbl>Guidelines Year</Lbl><NumberInput value={activeG.year} onChange={n=>setActiveG({...activeG,year:n})} theme={T}/></div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className={`${T.tableHead} text-xs uppercase`}>
                  <th className="text-left p-3">Household Size</th>
                  <th className="text-right p-3">125% FPG Threshold</th>
                  <th className="text-right p-3 hidden sm:table-cell">Monthly</th>
                </tr></thead>
                <tbody>
                  {(["h1","h2","h3","h4","h5","h6","h7","h8"] as (keyof PovertyGuidelines)[]).map((k,i)=>(
                    <tr key={k} className={`border-t ${T.tableRow}`}>
                      <td className={`p-3 font-semibold ${T.text}`}>Household of {i+1}</td>
                      <td className="p-2 text-right"><NumberInput prefix="$" value={activeG[k] as number} onChange={n=>setActiveG({...activeG,[k]:n})} theme={T}/></td>
                      <td className={`p-3 text-right text-xs ${T.subtext} hidden sm:table-cell`}>{fmt(Math.round((activeG[k] as number)/12))}/mo</td>
                    </tr>
                  ))}
                  <tr className={`border-t bg-amber-50 ${T.tableRow}`}>
                    <td className={`p-3 font-semibold ${T.text}`}>Each Additional Person</td>
                    <td className="p-2 text-right"><NumberInput prefix="$" value={activeG.additional} onChange={n=>setActiveG({...activeG,additional:n})} theme={T}/></td>
                    <td className={`p-3 text-right text-xs ${T.subtext} hidden sm:table-cell`}>{fmt(Math.round(activeG.additional/12))}/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="font-bold text-blue-800 text-sm mb-3">⚔️ Military 100% Guideline (Active Duty Citizen sponsoring spouse/child)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(["h1","h2","h3","h4","h5","h6","h7","h8"] as (keyof PovertyGuidelines)[]).map((k,i)=>(
                  <div key={k}><Lbl>HH {i+1}</Lbl><NumberInput prefix="$" value={guidelines100[k] as number} onChange={n=>setGuidelines100({...guidelines100,[k]:n})} theme={T}/></div>
                ))}
                <div><Lbl>Additional</Lbl><NumberInput prefix="$" value={guidelines100.additional} onChange={n=>setGuidelines100({...guidelines100,additional:n})} theme={T}/></div>
              </div>
            </div>
          </Card>
        )}

        {/* ════ TAB 6: RESULTS ════ */}
        {tab==="results" && (
          <div className="space-y-5">
            {/* Summary table */}
            <Card className="p-5 sm:p-6">
              <SectionHeader n={6} title="Results Dashboard" sub="Full qualification status for all sponsors"/>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead><tr className={`${T.tableHead} text-xs uppercase`}>
                    <th className="text-left p-3">Sponsor</th>
                    <th className="text-center p-2">HH</th>
                    <th className="text-right p-2">Required</th>
                    <th className="text-right p-2">Actual</th>
                    <th className="text-right p-2">Surplus</th>
                    <th className="text-right p-2 hidden md:table-cell">Assets Needed</th>
                    <th className="text-right p-2 hidden md:table-cell">Assets Have</th>
                    <th className="text-center p-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {allResults.map((r,i)=>(
                      <tr key={i} className={`border-t ${T.tableRow}`}>
                        <td className={`p-3 font-bold ${T.text}`}>{r.name} <span className={`text-xs font-normal ${T.subtext}`}>({i===0?"Petitioner":`JS${i}`})</span></td>
                        <td className={`p-2 text-center font-mono ${T.text}`}>{r.householdSize}</td>
                        <td className={`p-2 text-right font-mono ${T.text}`}>{fmt(r.requiredIncome)}</td>
                        <td className={`p-2 text-right font-mono ${T.text}`}>{fmt(r.actualIncome)}</td>
                        <td className={`p-2 text-right font-mono font-bold ${r.surplus>=0?"text-emerald-600":"text-rose-600"}`}>{r.surplus>=0?"+":""}{fmt(r.surplus)}</td>
                        <td className={`p-2 text-right font-mono hidden md:table-cell ${T.text}`}>{fmt(r.assetsNeeded)}</td>
                        <td className={`p-2 text-right font-mono hidden md:table-cell ${T.text}`}>{fmt(r.assetsAvailable)}</td>
                        <td className="p-3 text-center"><StatusBadge status={r.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Detail cards */}
            {allResults.map((r,i)=>(
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`font-black text-base ${T.text}`}>{i===0?"Petitioner":`Joint Sponsor ${i}`}: {r.name}</h3>
                    <p className={`text-xs ${T.subtext}`}>Household size: {r.householdSize} · Asset multiplier: {r.assetMultiplier}×</p>
                  </div>
                  <StatusBadge status={r.status}/>
                </div>

                {/* Gauge */}
                <div className="mb-4">
                  <IncomeGauge income={r.actualIncome} required={r.requiredIncome} label="Income vs Required"/>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    {label:"Required (125% FPG)", value:fmt(r.requiredIncome), color:"bg-slate-50"},
                    {label:"Qualifying Income",   value:fmt(r.actualIncome),   color:"bg-slate-50"},
                    {label:"Surplus / Shortfall", value:(r.surplus>=0?"+":"")+fmt(r.surplus), color:r.surplus>=0?"bg-emerald-50":"bg-rose-50"},
                    {label:`Effective (÷${r.assetMultiplier})`, value:fmt(r.effectiveIncome), color:"bg-indigo-50"},
                  ].map(x=>(
                    <div key={x.label} className={`${x.color} p-3 rounded-xl`}>
                      <div className={`text-[10px] uppercase font-semibold tracking-wide ${T.subtext}`}>{x.label}</div>
                      <div className={`font-black text-base mt-1 ${T.text}`}>{x.value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-800 mb-2">📐 Calculation Breakdown</p>
                  <ul className="space-y-1.5 text-xs text-amber-900">
                    {r.notes.map((n,ni)=>(
                      <li key={ni} className="flex gap-2"><span className="text-amber-500 shrink-0">•</span><span>{n}</span></li>
                    ))}
                    <li className="flex gap-2 pt-2 border-t border-amber-200 mt-1">
                      <span className="text-amber-600 shrink-0 font-bold">Σ</span>
                      <span><strong>Formula:</strong> Required Assets = ({fmt(r.requiredIncome)} − {fmt(r.actualIncome)}) × {r.assetMultiplier} = <strong>{fmt(r.assetsNeeded)}</strong></span>
                    </li>
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ════ TAB 7: STRATEGY ════ */}
        {tab==="strategy" && (
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <SectionHeader n={7} title="Immigration Strategy Analyzer" sub="AI-style recommendations for optimal I-864 filing structure"/>

              {/* Risk + Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`rounded-2xl p-5 text-white shadow-xl ${
                  strategy.risk<25?"bg-gradient-to-br from-emerald-500 to-emerald-600":
                  strategy.risk<60?"bg-gradient-to-br from-amber-500 to-orange-500":
                  "bg-gradient-to-br from-rose-500 to-rose-700"}`}>
                  <div className="text-[10px] uppercase tracking-widest opacity-80">Public Charge Risk</div>
                  <div className="text-5xl font-black mt-1">{strategy.risk}<span className="text-2xl opacity-60">/100</span></div>
                  <div className="text-xs mt-2 opacity-90 font-semibold">
                    {strategy.risk<25?"🟢 Low — Strong case":strategy.risk<60?"🟡 Moderate — Strengthen docs":"🔴 High — Restructure needed"}
                  </div>
                  {/* mini gauge */}
                  <div className="mt-3 h-1.5 bg-white/30 rounded-full"><div className="h-full bg-white rounded-full" style={{width:`${strategy.risk}%`}}/></div>
                </div>

                <div className="sm:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="text-[10px] uppercase tracking-widest opacity-80">Recommended I-864 Structure</div>
                  <div className="text-lg font-black mt-2 leading-snug">{strategy.structure}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white/15 rounded-lg text-xs font-semibold">{immigrants.length} immigrant{immigrants.length!==1?"s":""}</span>
                    <span className="px-2 py-1 bg-white/15 rounded-lg text-xs font-semibold">{contributing.length} I-864A contributor{contributing.length!==1?"s":""}</span>
                    <span className="px-2 py-1 bg-white/15 rounded-lg text-xs font-semibold">{jointSponsors.length} joint sponsor{jointSponsors.length!==1?"s":""}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${T.subtext}`}>📌 Best Sponsor Assignment</h3>
              <ul className="space-y-2 mb-6">
                {strategy.recommendations.map((rec: string,i: number)=>(
                  <li key={i} className={`border-l-4 p-3 rounded-r-xl text-sm ${rec.startsWith("✓")?"border-emerald-500 bg-emerald-50 text-emerald-800":rec.startsWith("⚠")?"border-rose-500 bg-rose-50 text-rose-800":"border-blue-500 bg-blue-50 text-blue-800"}`}>
                    {rec}
                  </li>
                ))}
              </ul>

              {/* Checklist */}
              <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${T.subtext}`}>📋 Documentation Checklist</h3>
              <div className="space-y-2">
                {strategy.checklist.map((item,i)=>(
                  <label key={i} className={`flex items-start gap-3 text-sm cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition ${T.text}`}>
                    <input type="checkbox" className="w-4 h-4 mt-0.5 accent-indigo-600 shrink-0"/>
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* USCIS Rules */}
            <Card className="p-5 border-blue-100 bg-blue-50">
              <h3 className="font-black text-sm text-blue-900 mb-3">📚 USCIS Rules Applied (8 USC § 1183a)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ["125% FPG Rule","Required for most sponsors — petitioner and joint sponsors"],
                  ["100% Exception","Active-duty U.S. citizen sponsoring spouse or minor child"],
                  ["5× Asset Rule","Required assets = 5× income shortfall (general sponsors)"],
                  ["3× Asset Rule","For U.S. citizen sponsoring spouse or minor child"],
                  ["I-864A","Required for each household member whose income is counted"],
                  ["Joint Sponsor","Must independently qualify — cannot combine with petitioner income"],
                  ["Liquid Assets","Cash, savings, stocks, bonds — convertible within 12 months"],
                  ["Property Equity","Net of mortgages/liens — requires appraisal"],
                ].map(([t,d])=>(
                  <div key={t} className="flex gap-2 text-xs p-2 bg-white rounded-lg border border-blue-100">
                    <span className="font-black text-blue-700 whitespace-nowrap">{t}:</span>
                    <span className="text-blue-600">{d}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* ── LIVE RESULTS BAR (always visible) ── */}
      <div className={`fixed bottom-0 left-0 right-0 z-20 ${T.liveBar} ${T.liveBarText} shadow-2xl print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left: petitioner quick result */}
          <div className="flex items-center gap-3 min-w-0">
            <StatusBadge status={petResult.status}/>
            <div className="hidden sm:block">
              <div className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Petitioner Income</div>
              <div className="text-sm font-black">{fmt(petIncome)} / {fmt(petRequired)}</div>
            </div>
          </div>

          {/* Center: progress */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="text-[10px] font-bold opacity-60 whitespace-nowrap">Case Completion</div>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{width:`${progress}%`}}/>
            </div>
            <div className="text-[11px] font-black">{progress}%</div>
          </div>

          {/* Right: save status + export */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] hidden sm:block opacity-60">{lastSavedTime?"Saved: "+lastSavedTime:""}</div>
            <button onClick={()=>{doSave();toast("💾 Saved!","success");}}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${saveStatus==="unsaved"?"bg-amber-400 text-amber-900 animate-pulse":"bg-emerald-500/80 text-white"}`}>
              {saveStatus==="unsaved"?"💾 Save":"✓ Saved"}
            </button>
            <button onClick={()=>setTab("results")}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 transition">
              📊 Results
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className={`${T.card} border-t ${T.cardBorder} py-4 mt-0 print:hidden hidden`}>
        <div className={`max-w-7xl mx-auto px-4 text-center text-xs ${T.subtext}`}>
          Educational use only — not legal advice · uscis.gov/i-864p
        </div>
      </div>
    </div>
  );
}
