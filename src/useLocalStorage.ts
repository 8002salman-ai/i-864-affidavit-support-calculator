import { useEffect } from "react";

const STORAGE_KEY = "i864_calculator_data";

export interface AppData {
  version: number;
  savedAt: string;
  region: "48" | "AK" | "HI";
  sponsor: unknown;
  householdMembers: unknown[];
  jointSponsors: unknown[];
  jointSponsor1Assets: unknown;
  jointSponsor2Assets: unknown;
  immigrants: unknown[];
  guidelines48: unknown;
  guidelinesAK: unknown;
  guidelinesHI: unknown;
  guidelines100: unknown;
  tab: string;
}

export function saveToLocalStorage(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

export function loadFromLocalStorage(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function downloadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      alert("No saved data found.");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `I-864-Database-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    alert("Export failed.");
  }
}

export function importDatabase(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        if (!data.version) {
          reject(new Error("Invalid file format."));
          return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve(data);
      } catch {
        reject(new Error("Invalid JSON file."));
      }
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsText(file);
  });
}

// Hook: auto-save debounced
export function useAutoSave(getData: () => AppData, deps: unknown[]) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveToLocalStorage(getData());
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
