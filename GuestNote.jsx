import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";
import {
  Search, AlertTriangle, Heart, Wine, Armchair, Tag as TagIcon, Users,
  Calendar, Plus, Pencil, X, Check, ChevronLeft, ShieldCheck, ShieldAlert,
  Clock, LogOut, Sparkles, StickyNote, Leaf, ChevronRight, History,
  UserPlus, Star, MapPin, Loader2, Trash2, Upload, BarChart3, Download, FileSpreadsheet,
  Menu, MoreHorizontal, Home as HomeIcon, Settings as SettingsIcon, Coffee, Cake, Bell, Fish
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  GuestNote - "Know your guests. Before they ask."                      */
/*  Single-file MVP. Data persists via browser localStorage (personal, per- */
/*  browser). No real backend - this is a working front-end prototype     */
/*  built to the v1 MVP scope.                                            */
/* ---------------------------------------------------------------------- */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

const COLORS = {
  // Core palette - light cream & warm gold, matching the reference design
  bg: "#F7F1E4",
  surface: "#FFFFFF",
  surfaceAlt: "#F1EADA",
  border: "#E9DFC8",
  text: "#2C2417",
  muted: "#8A7F6C",
  gold: "#B08D4F",
  goldSoft: "#F0E4C8",
  red: "#B0413E",
  redSoft: "#F7E6E4",
  redBorder: "#E7C2BE",
  green: "#5F7A5C",
  greenSoft: "#E9EFE5",
  amber: "#B0813A",
  amberSoft: "#F3E7CE",
};

const uid = () => Math.random().toString(36).slice(2, 10);

const todayISO = () => new Date().toISOString().slice(0, 10);

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof|professor|sir|dame|lord|lady)\b\.?/gi, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a, b) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const wa = na.split(" "), wb = nb.split(" ");
  const shared = wa.filter((w) => wb.includes(w)).length;
  return shared / Math.max(wa.length, wb.length);
}

function getDietaryType(text) {
  const lower = text.toLowerCase();
  if (lower.includes("vegan")) return "vegan";
  if (lower.includes("vegetarian")) return "vegetarian";
  if (lower.includes("pescatarian") || lower.includes("pescetarian")) return "pescatarian";
  return null;
}

function convertDietaryToIntolerance(dietaryText) {
  const text = dietaryText.toLowerCase().trim();
  const intoleranceMap = {
    "gluten-free": "Gluten",
    "gluten free": "Gluten",
    "dairy-free": "Dairy",
    "dairy free": "Dairy",
    "lactose intolerant": "Lactose",
    "lactose-intolerant": "Lactose",
    "nut allergy": "Tree nuts",
    "tree nut allergy": "Tree nuts",
    "peanut allergy": "Peanuts",
  };
  for (const [key, allergen] of Object.entries(intoleranceMap)) {
    if (text.includes(key)) return { allergen, severity: "Intolerance" };
  }
  return null;
}

function exportGuestsToExcel(guests) {
  let csv = "Name\tAllergies\tDietary\tPreferences\tDislikes\tDrinks\tNotes\n";
  guests.forEach(g => {
    const name = `${g.title} ${g.name}`.trim();
    const allergies = g.allergies.map(a => `${a.allergen} (${a.severity})`).join("; ");
    const dietary = g.dietary.map(d => d.text || d).join("; ");
    const prefs = g.preferences.map(p => p.text || p).join("; ");
    const dislikes = g.dislikes.map(d => d.text || d).join("; ");
    const drinks = g.drinks.map(d => d.text || d).join("; ");
    const notes = [...(g.serviceNotes || []), ...(g.notes || [])].map(n => n.text || n).join("; ");
    csv += `${name}\t${allergies}\t${dietary}\t${prefs}\t${dislikes}\t${drinks}\t${notes}\n`;
  });
  
  const blob = new Blob([csv], { type: "text/tab-separated-values;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `GuestNote_${new Date().toISOString().split('T')[0]}.xlsx`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportGuestsToPDF(guests) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
        h1 { color: #1E2823; text-align: center; }
        .date { text-align: center; color: #6B6154; margin-bottom: 20px; }
        .guest { page-break-inside: avoid; border: 1px solid #E1D7BE; padding: 12px; margin: 12px 0; border-radius: 8px; }
        .name { font-weight: bold; font-size: 16px; color: #1E2823; margin-bottom: 8px; }
        .section { margin-top: 6px; font-size: 13px; }
        .label { font-weight: bold; color: #6B6154; font-size: 12px; display: inline; }
        .allergy { color: #E74C3C; font-weight: bold; }
        .intolerance { color: #F39C12; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>GuestNote - Guest List</h1>
      <p class="date">Generated: ${new Date().toLocaleString()}</p>
      ${guests.map(g => `
        <div class="guest">
          <div class="name">${g.title} ${g.name}</div>
          ${g.allergies.length > 0 ? `
            <div class="section">
              <span class="label">Allergies & Intolerances:</span>
              ${g.allergies.map(a => `<div class="${a.severity === 'Intolerance' ? 'intolerance' : 'allergy'}">${a.allergen} (${a.severity})</div>`).join('')}
            </div>
          ` : ''}
          ${g.dietary.length > 0 ? `<div class="section"><span class="label">Dietary:</span> ${g.dietary.map(d => d.text || d).join(", ")}</div>` : ''}
          ${g.preferences.length > 0 ? `<div class="section"><span class="label">Preferences:</span> ${g.preferences.map(p => p.text || p).join(", ")}</div>` : ''}
          ${g.dislikes.length > 0 ? `<div class="section"><span class="label">Dislikes:</span> ${g.dislikes.map(d => d.text || d).join(", ")}</div>` : ''}
          ${g.drinks.length > 0 ? `<div class="section"><span class="label">Drinks:</span> ${g.drinks.map(d => d.text || d).join(", ")}</div>` : ''}
          ${g.serviceNotes.length > 0 || g.notes.length > 0 ? `<div class="section"><span class="label">Notes:</span> ${[...(g.serviceNotes || []), ...(g.notes || [])].map(n => n.text || n).join(", ")}</div>` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

const SEVERITIES = ["Intolerance", "Allergy", "Severe"];
const SEVERITY_STYLE = {
  Severe: { bg: "#C41E3A", fg: "#fff", label: "SEVERE ALLERGY", color: "#C41E3A" },
  Allergy: { bg: "#E74C3C", fg: "#fff", label: "ALLERGY", color: "#E74C3C" },
  Intolerance: { bg: "#F39C12", fg: "#fff", label: "INTOLERANCE", color: "#F39C12" },
};

const ROLES = ["Admin", "Manager", "Staff", "View Only"];

/* ------------------------------- Demo data ------------------------------ */

function makeGuest(g) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: g.title || "",
    name: g.name,
    vip: !!g.vip,
    lastVisit: g.lastVisit || null,
    allergies: (g.allergies || []).map((a) => ({ id: uid(), verified: true, dateRecorded: todayISO(), recordedBy: "Andreas", ...a })),
    dietary: (g.dietary || []).map((d) => ({ id: uid(), text: d })),
    preferences: (g.preferences || []).map((p) => ({ id: uid(), text: p })),
    dislikes: (g.dislikes || []).map((p) => ({ id: uid(), text: p })),
    drinks: (g.drinks || []).map((p) => ({ id: uid(), text: p })),
    serviceNotes: (g.serviceNotes || []).map((p) => ({ id: uid(), text: p })),
    tablePreferences: (g.tablePreferences || []).map((p) => ({ id: uid(), text: p })),
    notes: (g.notes || []).map((p) => ({ id: uid(), text: p })),
    tags: g.tags || [],
    updatedAt: now,
    updatedBy: "Andreas",
  };
}

function seedGuests() {
  return [
    // Original demo guests
    makeGuest({ name: "Gavi Henderson", allergies: [{ allergen: "Cheese", severity: "Allergy", notes: "Avoid cheese-containing dishes." }], preferences: ["Tabasco sauce"] }),
    makeGuest({ title: "Dr", name: "Goldsack", allergies: [{ allergen: "Gluten", severity: "Intolerance", notes: "Celiac disease" }], dietary: ["Vegetarian"] }),
    makeGuest({ name: "Charles Taylor", preferences: ["Double espresso"], serviceNotes: ["Mint tea for his wife."] }),
    makeGuest({ name: "Charles Plant", preferences: ["Melba toast"], dietary: ["Vegan"] }),
    makeGuest({ title: "Professor", name: "Michael Thorne", allergies: [{ allergen: "Dairy", severity: "Intolerance", notes: "Dairy-free diet" }], dietary: ["Vegan"] }),
    makeGuest({ name: "Christopher Lawrence", preferences: ["Likes his pies decanted."], dietary: ["Pescatarian"] }),
    makeGuest({ name: "Drew Curtis", allergies: [{ allergen: "Gluten", severity: "Intolerance", notes: "Celiac" }] }),
    makeGuest({ name: "Bob Low", allergies: [{ allergen: "Pork", severity: "Intolerance" }, { allergen: "Shellfish", severity: "Intolerance" }] }),
    makeGuest({ name: "Joe Hyames", allergies: [{ allergen: "Pork", severity: "Intolerance" }, { allergen: "Shellfish", severity: "Intolerance" }] }),
    makeGuest({ name: "Lee Menzies", dislikes: ["Dill"], dietary: ["Vegetarian"] }),
    makeGuest({ name: "Louis Greig", allergies: [{ allergen: "Mustard", severity: "Allergy" }] }),
    makeGuest({ name: "Brian Hutchinson", preferences: ["House champagne"] }),
    makeGuest({ name: "Christopher Seelig", preferences: ["Non-alcoholic drinks"], drinks: ["Guinness 0%"], dietary: ["Vegan"] }),
    makeGuest({ name: "John Coldstream", allergies: [{ allergen: "Alcohol", severity: "Intolerance", notes: "No alcohol" }] }),
    makeGuest({ name: "Michael Booth", preferences: ["Olive oil with focaccia bread"], dietary: ["Pescatarian"] }),

    // New guests from PDF
    makeGuest({ name: "Tim Ashley", dislikes: ["Red meat"], dietary: ["Pescatarian"] }),
    makeGuest({ name: "David Badenoch", allergies: [{ allergen: "Crustaceans", severity: "Allergy" }, { allergen: "Oysters", severity: "Allergy" }] }),
    makeGuest({ title: "His Hon Judge", name: "Philip Bartle", allergies: [{ allergen: "Shellfish", severity: "Intolerance" }, { allergen: "Kippers", severity: "Intolerance" }, { allergen: "Haggis", severity: "Intolerance" }, { allergen: "Tripe", severity: "Intolerance" }, { allergen: "Black pudding", severity: "Intolerance" }] }),
    makeGuest({ name: "Martin Bishop", dietary: ["Vegetarian"] }),
    makeGuest({ name: "Chris Bonsall", dislikes: ["Red meat"], notes: ["Sue: no oysters, crab, mussels, coriander"] }),
    makeGuest({ name: "Hal Cazalet", dietary: ["Vegetarian"], notes: ["Polly Cazalet also vegetarian"] }),
    makeGuest({ title: "Sir", name: "Christopher Clarke", allergies: [{ allergen: "Crustaceans", severity: "Intolerance" }], notes: ["Lady Clarke also cannot eat crustaceans"] }),
    makeGuest({ name: "Michael Dinneen", notes: ["Son John: lactose intolerance"] }),
    makeGuest({ name: "Graham Edwards", dietary: ["Pescatarian"], dislikes: ["Aubergine", "Peppers"] }),
    makeGuest({ name: "John Garbutt", dislikes: ["Red meat"], preferences: ["Sparkling wine or lager & lime"], drinks: ["No still wine"] }),
    makeGuest({ name: "David Garfield Davies", allergies: [{ allergen: "Alcohol", severity: "Intolerance" }] }),
    makeGuest({ name: "Craig Goldsack", allergies: [{ allergen: "Gluten", severity: "Intolerance" }] }),
    makeGuest({ title: "Professor", name: "David Gordon", allergies: [{ allergen: "Anchovies", severity: "Intolerance" }, { allergen: "Sardines", severity: "Intolerance" }], notes: ["L Jones: sensitive to mushrooms & peppers"] }),
    makeGuest({ title: "Lord", name: "Grabiner", allergies: [{ allergen: "Pork", severity: "Intolerance" }, { allergen: "Shellfish", severity: "Intolerance" }] }),
    makeGuest({ name: "Bruce Harris", preferences: ["Lamb, fish or vegetarian dish for main course"] }),
    makeGuest({ name: "Guy Heald", dietary: ["Vegetarian"] }),
    makeGuest({ name: "Anthony Heaton Armstrong", preferences: ["Only drinks whiskey"] }),
    makeGuest({ name: "Rainer Hersch", dietary: ["Vegetarian"] }),
    makeGuest({ name: "David Keene", notes: ["Lady Keene (Gillian): cannot eat cheese in any form"] }),
    makeGuest({ title: "Sir", name: "Martin Lewis", serviceNotes: ["Sit opposite wife"] }),
    makeGuest({ name: "Daniel Lightman", allergies: [{ allergen: "Fish", severity: "Allergy" }, { allergen: "Nuts", severity: "Allergy" }], dislikes: ["Meat"], notes: ["Not peanuts or pine nuts"] }),
    makeGuest({ name: "Matthew Mellor", dietary: ["Vegetarian"], allergies: [{ allergen: "Mushrooms", severity: "Intolerance" }] }),
    makeGuest({ name: "Lee Menzies", dislikes: ["Dill"] }),
    makeGuest({ title: "Lord", name: "Morris", serviceNotes: ["Sit next to wife"] }),
    makeGuest({ name: "Dave Murphy", allergies: [{ allergen: "Gluten", severity: "Intolerance" }] }),
    makeGuest({ name: "Charlie Palmer", dietary: ["Vegetarian"], allergies: [{ allergen: "Alcohol", severity: "Intolerance" }] }),
    makeGuest({ name: "Gareth Rhys Williams", allergies: [{ allergen: "Gluten", severity: "Intolerance" }, { allergen: "Dairy", severity: "Intolerance" }] }),
    makeGuest({ name: "Michael Rich", notes: ["Sara Alston (daughter): doesn't eat pork"] }),
    makeGuest({ name: "Michael Segal", notes: ["Mrs Barbara Segal: allergic to sesame seed"] }),
    makeGuest({ name: "Nick Thompson", serviceNotes: ["Wife ideally seated nearby but not adjacent"] }),
    makeGuest({ name: "Stephen Tomlinson", allergies: [{ allergen: "Molluscs", severity: "Intolerance" }, { allergen: "Truffle oil", severity: "Intolerance" }] }),
    makeGuest({ name: "Jake Walker", allergies: [{ allergen: "Gluten", severity: "Intolerance" }] }),
    makeGuest({ name: "Jonah Walker-Smith", dislikes: ["Poultry", "Game"] }),
    makeGuest({ name: "Rhodri Walters", allergies: [{ allergen: "Goat's cheese", severity: "Intolerance" }] }),
    makeGuest({ name: "Richard Whittam", notes: ["Carol Whittam: allergic to scallops, mussels and garlic"] }),
    makeGuest({ title: "Lord", name: "Winston", dietary: ["Vegetarian"], allergies: [{ allergen: "Cheese", severity: "Intolerance" }, { allergen: "Shellfish", severity: "Intolerance" }], preferences: ["White fish"] }),
    makeGuest({ name: "Harry Wolton", allergies: [{ allergen: "Fish", severity: "Allergy" }] }),
    makeGuest({ name: "Alex Woolner", allergies: [{ allergen: "Nuts", severity: "Allergy" }, { allergen: "Seeds", severity: "Allergy" }] }),
  ];
}

function seedAuditLog(guests) {
  return guests
    .filter((g) => g.allergies.length)
    .map((g) => ({
      id: uid(),
      timestamp: g.updatedAt,
      guestId: g.id,
      guestName: `${g.title} ${g.name}`.trim(),
      action: "Allergy recorded",
      detail: `${g.allergies.map((a) => a.allergen).join(", ")} added.`,
      staff: "Andreas",
    }));
}

function seedEvents(guests) {
  const byName = (n) => guests.find((g) => g.name === n);
  const attendees = [
    ["Gavi Henderson", 1], ["Louis Greig", 2], ["Christopher Seelig", 3],
    ["Bob Low", 4], ["Michael Thorne", 5], ["Brian Hutchinson", 6],
    ["Goldsack", 7], ["Charles Taylor", 8],
  ];
  return [
    {
      id: uid(),
      name: "Dinner Service",
      date: todayISO(),
      guests: attendees
        .map(([n, table]) => {
          const g = byName(n);
          return g ? { guestId: g.id, table } : null;
        })
        .filter(Boolean),
    },
  ];
}

/* ------------------------------ Brand mark ------------------------------ */
/* A waiter's hand presenting a cloche-covered dish, napkin over the forearm. */

/* Shield + crown + "G" - the small badge mark used in the header and login. */
/* Shield + crown + "GN" monogram - the brand mark used on the login screen. */
function ShieldMark({ size = 24, color = "currentColor", crownColor, bg = "none" }) {
  const crown = crownColor || color;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      {bg !== "none" && <rect width="64" height="64" rx="14" fill={bg} />}
      {/* solid filled shield */}
      <path
        d="M32,6 L50,12.5 V29 C50,41 42.5,50 32,55 C21.5,50 14,41 14,29 V12.5 Z"
        fill={color}
      />
      {/* bold crown, cut in contrasting colour */}
      <path
        d="M21,20 L26,25 L32,15 L38,25 L43,20 L41,32 H23 Z"
        fill={crown}
      />
      {/* bold "GN" monogram */}
      <text
        x="32" y="46" textAnchor="middle"
        fontFamily="Arial, sans-serif" fontWeight="800" fontSize="15" letterSpacing="0.5"
        fill={crown}
      >GN</text>
    </svg>
  );
}

/* A waiter's hand presenting a cloche-covered dish, napkin over the forearm. */
function ServiceMark({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* forearm + sleeve, extending down-right */}
      <path
        d="M26,37 C29,41 35,45 41,49 C47,53 53,57 59,60 L62,55.5 C56,51.5 49,46.5 43,42 C37,37.5 32,34 28,32.5 Z"
        fill={color} opacity="0.82"
      />
      {/* cuff line */}
      <path d="M50,50 C53,52.5 56.5,55 60,57" stroke={color} strokeOpacity="0.35" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* napkin draped over the forearm */}
      <path
        d="M43,45 C39,49 35.5,54.5 37,59.5 C38.3,63.5 44,62.5 46.5,58.5 C48.3,55.7 47,50 43,45 Z"
        fill={color} opacity="0.68"
      />
      {/* palm */}
      <ellipse cx="26.5" cy="36.5" rx="9.2" ry="5.2" fill={color} />
      {/* fingers */}
      <ellipse cx="18.3" cy="32.6" rx="2.1" ry="3.6" fill={color} transform="rotate(-14 18.3 32.6)" />
      <ellipse cx="22.6" cy="30.7" rx="2.2" ry="4" fill={color} transform="rotate(-6 22.6 30.7)" />
      <ellipse cx="27.4" cy="30.1" rx="2.3" ry="4.1" fill={color} />
      <ellipse cx="32.1" cy="30.8" rx="2.2" ry="3.9" fill={color} transform="rotate(8 32.1 30.8)" />
      <ellipse cx="35.9" cy="33.6" rx="2.3" ry="3.7" fill={color} transform="rotate(28 35.9 33.6)" />
      {/* plate */}
      <ellipse cx="29.5" cy="29.5" rx="15" ry="3.1" fill={color} />
      {/* cloche dome */}
      <path d="M14.5,29.5 A15,15.5 0 0 1 44.5,29.5 Z" fill={color} />
      {/* dome stem + knob */}
      <rect x="28.4" y="12.5" width="2.2" height="3.5" fill={color} />
      <circle cx="29.5" cy="11" r="2.3" fill={color} />
    </svg>
  );
}

/* Same waiter mark, drawn as thin outline strokes - for the login-screen backdrop. */
function ServiceMarkOutline({ size = 200, color = "currentColor", opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" opacity={opacity}>
      <path d="M26,37 C29,41 35,45 41,49 C47,53 53,57 59,60 L62,55.5 C56,51.5 49,46.5 43,42 C37,37.5 32,34 28,32.5 Z" stroke={color} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <path d="M43,45 C39,49 35.5,54.5 37,59.5 C38.3,63.5 44,62.5 46.5,58.5 C48.3,55.7 47,50 43,45 Z" stroke={color} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <path d="M17.3,38.5 C14,39.8 11.5,37.2 12.5,34.5 M22,36 C18,38 15.8,34.6 17.4,31.7 M27.4,34.1 C24,35.8 21.5,31.5 24,29 M32.5,34.7 C29,35.7 26.7,31 29.7,28.7 M37.2,36.4 C34.3,36.6 32.5,32 36.1,30" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="29.5" cy="29.5" rx="15" ry="3.1" stroke={color} strokeWidth="1.1" fill="none" />
      <path d="M14.5,29.5 A15,15.5 0 0 1 44.5,29.5" stroke={color} strokeWidth="1.1" fill="none" />
      <line x1="29.5" y1="16" x2="29.5" y2="12.5" stroke={color} strokeWidth="1.1" />
      <circle cx="29.5" cy="11" r="2" stroke={color} strokeWidth="1.1" fill="none" />
    </svg>
  );
}

/* ------------------------------ Small bits ------------------------------ */

function Pill({ children, tone = "default", size = "sm" }) {
  const tones = {
    default: { bg: COLORS.surfaceAlt, fg: COLORS.text, border: COLORS.border },
    gold: { bg: COLORS.goldSoft, fg: "#7A5C22", border: "#E5D2A4" },
    red: { bg: COLORS.redSoft, fg: COLORS.red, border: COLORS.redBorder },
    green: { bg: COLORS.greenSoft, fg: COLORS.green, border: "#C7DED1" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
        borderRadius: 999, padding: size === "sm" ? "3px 10px" : "5px 14px",
        fontSize: size === "sm" ? 11.5 : 13, fontWeight: 600, letterSpacing: 0.2,
        display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function AllergyTag({ allergen, severity, verified }) {
  const s = SEVERITY_STYLE[severity] || SEVERITY_STYLE.Intolerance;
  const shadowColor = severity === "Severe" ? "rgba(196,30,58,0.25)" : severity === "Allergy" ? "rgba(231,76,60,0.25)" : "rgba(243,156,18,0.25)";
  return (
    <span
      style={{
        background: s.bg, color: s.fg, borderRadius: 8, padding: "6px 12px 6px 10px",
        fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3, display: "inline-flex",
        alignItems: "center", gap: 6, boxShadow: `0 1px 2px ${shadowColor}`,
        position: "relative",
      }}
    >
      <AlertTriangle size={13} strokeWidth={2.5} />
      {allergen.toUpperCase()}
      {!verified && (
        <span style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.85, borderLeft: `1px solid rgba(255,255,255,0.5)`, paddingLeft: 6 }}>
          UNVERIFIED
        </span>
      )}
    </span>
  );
}

function DietaryTag({ text, type }) {
  const styles = {
    vegan: { bg: "#C8E6C9", color: "#2E7D32", Icon: Leaf },
    vegetarian: { bg: "#81C784", color: "#fff", Icon: Leaf },
    pescatarian: { bg: "#81D4FA", color: "#01579B", Icon: Fish },
  };
  
  const style = styles[type] || styles.vegan;
  const Icon = style.Icon;
  
  return (
    <span
      style={{
        background: style.bg, color: style.color, borderRadius: 8, padding: "6px 12px 6px 10px",
        fontSize: 12.5, fontWeight: 600, letterSpacing: 0.2, display: "inline-flex",
        alignItems: "center", gap: 6, border: `1px solid ${style.bg}`,
        position: "relative",
      }}
    >
      <Icon size={12} /> {text.toUpperCase()}
    </span>
  );
}

function PreferenceTag({ text, icon: Icon = Heart }) {
  return (
    <span
      style={{
        background: "#F5F5F5", color: "#424242", borderRadius: 8, padding: "6px 12px 6px 10px",
        fontSize: 12.5, fontWeight: 600, letterSpacing: 0.2, display: "inline-flex",
        alignItems: "center", gap: 6, border: `1px solid #E0E0E0`,
        position: "relative",
      }}
    >
      {Icon && <Icon size={13} strokeWidth={2} />}
      {text}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", icon: Icon, style, disabled, type = "button" }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const base = {
    fontFamily: "Inter, sans-serif", fontWeight: 600, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    borderRadius: 10, transition: "all .15s ease", opacity: disabled ? 0.5 : 1,
    WebkitTapHighlightColor: "transparent",
    minHeight: isMobile ? 44 : "auto",
    minWidth: isMobile ? 44 : "auto",
  };
  const sizes = { 
    sm: { padding: isMobile ? "10px 14px" : "8px 14px", fontSize: 13 }, 
    md: { padding: isMobile ? "12px 18px" : "11px 18px", fontSize: 14.5 }, 
    lg: { padding: isMobile ? "16px 22px" : "14px 22px", fontSize: 15.5 } 
  };
  const variants = {
    primary: { background: COLORS.text, color: "#fff" },
    gold: { background: COLORS.gold, color: "#fff" },
    outline: { background: "transparent", color: COLORS.text, border: `1.5px solid ${COLORS.border}` },
    ghost: { background: "transparent", color: COLORS.muted },
    danger: { background: COLORS.redSoft, color: COLORS.red, border: `1.5px solid ${COLORS.redBorder}` },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.25} />}
      {children}
    </button>
  );
}

function Section({ icon: Icon, title, tone, children, action }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
        paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Icon && <Icon size={15} strokeWidth={2.3} color={tone === "red" ? COLORS.red : COLORS.gold} />}
          <h3 style={{
            fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase",
            color: tone === "red" ? COLORS.red : COLORS.muted, fontWeight: 500, margin: 0,
          }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`,
        fontSize: 14.5, fontFamily: "Inter, sans-serif", background: "#fff", color: COLORS.text,
        outline: "none", boxSizing: "border-box", ...(props.style || {}),
      }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`,
        fontSize: 14.5, fontFamily: "Inter, sans-serif", background: "#fff", color: COLORS.text,
        outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 80, ...(props.style || {}),
      }}
    />
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`,
        fontSize: 14.5, fontFamily: "Inter, sans-serif", background: "#fff", color: COLORS.text,
        outline: "none", boxSizing: "border-box", ...(style || {}),
      }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Modal({ children, onClose, width = 480 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(30,40,35,0.45)", zIndex: 100,
        display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.bg, width: "100%", maxWidth: width, maxHeight: "88vh", overflowY: "auto",
          borderRadius: "20px 20px 0 0", padding: "20px 22px 28px", boxShadow: "0 -8px 30px rgba(0,0,0,0.2)",
          animation: "slideUp .22s ease-out",
        }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(24px);opacity:.4}to{transform:translateY(0);opacity:1}}
        @media (min-width:640px){.gn-modal-center{align-items:center !important;}}`}</style>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------- Quick Add parsing --------------------------------- */

const TITLE_WORDS = ["Professor", "Prof", "Dr", "Mr", "Mrs", "Ms", "Miss", "Sir", "Dame", "Lord", "Lady"];

function parseQuickAdd(text) {
  const result = { title: "", name: "", allergies: [], preferences: [], serviceNotes: [], dietary: [], drinks: [], leftover: [] };

  // Name + title: look for a capitalized run, optionally preceded by a title word
  const titleRe = new RegExp(`\\b(${TITLE_WORDS.join("|")})\\.?\\s+([A-Z][a-zA-Z''-]+(?:\\s+[A-Z][a-zA-Z''-]+)+)`);
  const nameOnlyRe = /\b([A-Z][a-zA-Z''-]+(?:\s+[A-Z][a-zA-Z''-]+)+)/;
  let m = text.match(titleRe);
  if (m) {
    result.title = m[1] === "Prof" ? "Professor" : m[1];
    result.name = m[2];
  } else {
    m = text.match(nameOnlyRe);
    if (m) result.name = m[1];
  }

  // Split into clauses for scanning
  const clauses = text.split(/(?<=[.!?])\s+|,\s*(?=and\b)|\band\b/i).map((c) => c.trim()).filter(Boolean);

  const allergyRe = /(?:allerg(?:y|ic)\s*(?:to|is)?\s*)([a-zA-Z][a-zA-Z\s]*?)(?:\.|,|$| but| and)/i;
  const allergyRe2 = /([a-zA-Z][a-zA-Z\s]*?)\s+allerg(?:y|ic)/i;
  const prefRe = /(?:likes|loves|prefers|enjoys)\s+(?:having\s+)?([a-zA-Z0-9][a-zA-Z0-9\s]*?)(?:\.|,|$| ready| when| before)/i;
  const dietaryRe = /\b(vegan|vegetarian|pescatarian|halal|kosher|gluten[- ]free|dairy[- ]free|lactose intolerant)\b/i;
  const serviceRe = /(?:have|place|ensure|make sure|keep|set)\s+([a-zA-Z0-9][a-zA-Z0-9\s]*?)\s+(?:ready\s+)?(?:on the table|before|when|for him|for her|for them)([a-zA-Z0-9\s]*)/i;
  const drinkRe = /(?:drinks?|wine|water|coffee|espresso|champagne)\b/i;

  let matchedSomething = false;

  for (const clause of clauses) {
    let mm;
    if ((mm = clause.match(serviceRe))) {
      result.serviceNotes.push(clause.trim().replace(/^(he|she|they)\s+/i, ""));
      matchedSomething = true;
      continue;
    }
    if ((mm = clause.match(allergyRe)) || (mm = clause.match(allergyRe2))) {
      const allergen = mm[1].trim().replace(/\b(a|an|the)\b/gi, "").trim();
      if (allergen) {
        result.allergies.push(allergen.replace(/\s+/g, " "));
        matchedSomething = true;
        continue;
      }
    }
    if ((mm = clause.match(dietaryRe))) {
      result.dietary.push(mm[1]);
      matchedSomething = true;
      continue;
    }
    if ((mm = clause.match(prefRe))) {
      const pref = mm[1].trim();
      if (pref) {
        if (drinkRe.test(pref)) result.drinks.push(pref);
        else result.preferences.push(pref);
        matchedSomething = true;
        continue;
      }
    }
  }

  if (!matchedSomething && result.name) {
    // Nothing structured found beyond the name - keep the rest as a general note
    const rest = text.replace(result.name, "").trim();
    if (rest.length > 3) result.leftover.push(rest);
  }

  return result;
}

/* =========================================================================
   MAIN APP
   ========================================================================= */

export default function GuestNoteApp() {
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState([]);
  const [events, setEvents] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [staff, setStaff] = useState(null); // { id, name, role }
  const [screen, setScreen] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("home"); // home | guests | notes | settings
  const [activeGuestId, setActiveGuestId] = useState(null);
  const [activeEventId, setActiveEventId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All Guests");
  const [toast, setToast] = useState(null);

  const goTab = (tab) => {
    setActiveTab(tab);
    if (tab === "home") { setScreen("dashboard"); setFilter("All Guests"); }
    else if (tab === "guests") { setScreen("dashboard"); }
    else if (tab === "notes") { setScreen("notesTab"); setActiveGuestId(null); }
    else if (tab === "settings") { setScreen("settingsTab"); }
  };

  /* ---------- mobile initialization ---------- */
  useEffect(() => {
    // Prevent zoom on double-tap
    document.addEventListener("dblclick", (e) => {
      if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    }, false);
    
    // Set viewport height for mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    
    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  /* ---------------- persistence ---------------- */
  /* Real browser localStorage — persists per-device, survives reloads and
     reinstalls of the PWA on that same device (does not sync across devices;
     there is no backend server here). */

  const storageGet = (key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const storageSet = (key, value) => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* best effort */ }
  };

  useEffect(() => {
    try {
      let g = storageGet("gn-guests");
      let e = storageGet("gn-events");
      let a = storageGet("gn-audit");
      let ac = storageGet("gn-accounts");

      if (!g || !g.length) {
        const seeded = seedGuests();
        g = seeded;
        e = seedEvents(seeded);
        a = seedAuditLog(seeded);
        storageSet("gn-guests", g);
        storageSet("gn-events", e);
        storageSet("gn-audit", a);
      }
      if (!ac || !ac.length) {
        ac = [
          { id: uid(), name: "Admin", username: "admin", password: "admin123", role: "Admin" },
          { id: uid(), name: "Manager", username: "manager", password: "manager123", role: "Manager" },
          { id: uid(), name: "Staff", username: "staff", password: "staff123", role: "Staff" },
        ];
        storageSet("gn-accounts", ac);
      }
      setGuests(g || []);
      setEvents(e || []);
      setAuditLog(a || []);
      setAccounts(ac || []);
    } catch (err) {
      // storage unavailable (e.g. private browsing) - fall back to in-memory demo data
      const seeded = seedGuests();
      setGuests(seeded);
      setEvents(seedEvents(seeded));
      setAuditLog(seedAuditLog(seeded));
      setAccounts([
        { id: uid(), name: "Admin", username: "admin", password: "admin123", role: "Admin" },
        { id: uid(), name: "Manager", username: "manager", password: "manager123", role: "Manager" },
        { id: uid(), name: "Staff", username: "staff", password: "staff123", role: "Staff" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback((key, value) => { storageSet(key, value); }, []);

  const saveGuests = useCallback((next) => { setGuests(next); persist("gn-guests", next); }, [persist]);
  const saveEvents = useCallback((next) => { setEvents(next); persist("gn-events", next); }, [persist]);
  const saveAudit = useCallback((next) => { setAuditLog(next); persist("gn-audit", next); }, [persist]);
  const saveAccounts = useCallback((next) => { setAccounts(next); persist("gn-accounts", next); }, [persist]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const logAudit = useCallback((guest, action, detail) => {
    const entry = {
      id: uid(), timestamp: new Date().toISOString(), guestId: guest.id,
      guestName: `${guest.title} ${guest.name}`.trim(), action, detail, staff: staff?.name || "Staff",
    };
    saveAudit([entry, ...auditLog]);
  }, [auditLog, saveAudit, staff]);

  const canEdit = staff && staff.role !== "View Only";

  /* ---------------- guest CRUD ---------------- */

  const upsertGuest = (guest, { silent } = {}) => {
    const now = new Date().toISOString();
    const next = { ...guest, updatedAt: now, updatedBy: staff?.name || "Staff" };
    const exists = guests.some((g) => g.id === guest.id);
    const nextList = exists ? guests.map((g) => (g.id === guest.id ? next : g)) : [next, ...guests];
    saveGuests(nextList);
    if (!silent) showToast(exists ? "Guest updated" : "Guest added");
    return next;
  };

  const findPossibleDuplicate = (name, excludeId) =>
    guests.find((g) => g.id !== excludeId && nameSimilarity(`${g.title} ${g.name}`, name) >= 0.6);

  const deleteGuest = (guest) => {
    saveGuests(guests.filter((g) => g.id !== guest.id));
    saveEvents(events.map((e) => ({ ...e, guests: e.guests.filter((x) => x.guestId !== guest.id) })));
    const entry = {
      id: uid(), timestamp: new Date().toISOString(), guestId: guest.id,
      guestName: `${guest.title} ${guest.name}`.trim(), action: "Guest record deleted",
      detail: "Record removed by staff.", staff: staff?.name || "Staff",
    };
    saveAudit([entry, ...auditLog]);
    showToast("Guest deleted");
    setActiveGuestId(null);
    setScreen("dashboard");
  };

  /* ---------------- derived / search ---------------- */

  const guestHaystack = (g) => [
    g.title, g.name, ...g.allergies.map((a) => a.allergen), ...g.dietary.map((d) => d.text),
    ...g.preferences.map((p) => p.text), ...g.dislikes.map((p) => p.text), ...g.drinks.map((p) => p.text),
    ...g.serviceNotes.map((p) => p.text), ...g.notes.map((p) => p.text), ...g.tags,
  ].join(" ").toLowerCase();

  const todaysEvent = events.find((e) => e.date === todayISO());

  const filteredGuests = useMemo(() => {
    let list = [...guests];
    const q = query.trim().toLowerCase();
    if (q) {
      const wantsAllergy = /allerg/i.test(q);
      list = list.filter((g) => guestHaystack(g).includes(q));
      if (wantsAllergy) {
        list.sort((a, b) => (b.allergies.length ? 1 : 0) - (a.allergies.length ? 1 : 0));
      }
    }
    if (filter === "Tonight") {
      const ids = todaysEvent ? new Set(todaysEvent.guests.map((x) => x.guestId)) : new Set();
      list = list.filter((g) => ids.has(g.id));
    } else if (filter === "Recent") {
      list = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 12);
    } else if (filter === "Allergies") {
      list = list.filter((g) => g.allergies.length > 0);
    } else if (filter === "VIP") {
      list = list.filter((g) => g.vip);
    }
    if (filter !== "Recent") {
      list.sort((a, b) => `${a.title}${a.name}`.localeCompare(`${b.title}${b.name}`));
    }
    return list;
  }, [guests, query, filter, todaysEvent]);

  const activeGuest = guests.find((g) => g.id === activeGuestId);
  const activeEvent = events.find((e) => e.id === activeEventId);

  const openGuest = (id) => { setActiveGuestId(id); setScreen("profile"); };

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: COLORS.muted }}>
          <Loader2 className="gn-spin" size={26} />
          <style>{`.gn-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>Loading GuestNote...</span>
        </div>
      </Shell>
    );
  }

  if (!staff) {
    return <Shell><LoginScreen accounts={accounts} onLogin={(s) => setStaff(s)} /></Shell>;
  }

  return (
    <Shell>
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 200,
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 999,
          fontSize: 13.5, fontWeight: 600, fontFamily: "Inter, sans-serif", boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={15} /> {toast}
        </div>
      )}

      {(screen === "dashboard" || screen === "notesTab" || screen === "settingsTab") && (
        <Header
          mode="root"
          title={screen === "dashboard" ? (activeTab === "guests" ? "Guests" : "Guest") : screen === "notesTab" ? "Notes" : "Settings"}
          onMenu={() => goTab("settings")}
          onAdd={screen === "dashboard" ? () => { setActiveGuestId(null); setScreen("addEdit"); } : undefined}
        />
      )}
      {screen === "profile" && (
        <Header mode="detail" title="Guest Profile" onBack={() => setScreen("dashboard")} />
      )}
      {screen === "notesDetail" && (
        <Header mode="detail" title="Preferences & Notes" onBack={() => setScreen("notesTab")} />
      )}

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {screen === "dashboard" && (
          <Dashboard
            guests={filteredGuests}
            allGuests={guests}
            allCount={guests.length}
            query={query} setQuery={setQuery}
            filter={filter} setFilter={setFilter}
            todaysEvent={todaysEvent}
            onOpenGuest={openGuest}
            onAddGuest={() => { setActiveGuestId(null); setScreen("addEdit"); }}
            onQuickAdd={() => setScreen("quickAdd")}
            onTonight={() => setScreen("events")}
            canEdit={canEdit}
            canDelete={canEdit}
            onEditGuest={(id) => { setActiveGuestId(id); setScreen("addEdit"); }}
            onDeleteGuest={(g) => deleteGuest(g)}
            staff={staff}
            showHero={activeTab === "home"}
          />
        )}

        {screen === "notesTab" && (
          <NotesTabScreen
            guests={guests}
            onOpenGuest={(id) => { setActiveGuestId(id); setScreen("notesDetail"); }}
          />
        )}

        {screen === "notesDetail" && activeGuest && (
          <NotesDetailScreen guest={activeGuest} />
        )}

        {screen === "settingsTab" && (
          <SettingsScreen
            staff={staff}
            guests={guests}
            onLogout={() => setStaff(null)}
            onExportExcel={() => exportGuestsToExcel(guests)}
            onCSVImport={() => setScreen("csvImport")}
            onAuditLog={() => setScreen("auditLog")}
            onAllergyHeatmap={() => setScreen("allergyHeatmap")}
            onEvents={() => setScreen("events")}
            onAccounts={() => setScreen("accounts")}
          />
        )}

        {screen === "accounts" && (
          <AccountsScreen
            accounts={accounts}
            currentStaffId={staff.id}
            onBack={() => setScreen("settingsTab")}
            onAdd={(acc) => { saveAccounts([...accounts, acc]); showToast("Account created"); }}
            onUpdate={(acc) => { saveAccounts(accounts.map((a) => (a.id === acc.id ? acc : a))); showToast("Account updated"); }}
            onDelete={(id) => { saveAccounts(accounts.filter((a) => a.id !== id)); showToast("Account removed"); }}
          />
        )}

        {screen === "profile" && activeGuest && (
          <GuestProfile
            guest={activeGuest}
            canEdit={canEdit}
            canDelete={canEdit}
            onBack={() => setScreen("dashboard")}
            onEdit={() => setScreen("addEdit")}
            onSave={(g, action, detail) => { upsertGuest(g); logAudit(g, action, detail); }}
            onDelete={() => deleteGuest(activeGuest)}
            auditLog={auditLog.filter((a) => a.guestId === activeGuest.id)}
          />
        )}

        {screen === "addEdit" && (
          <AddEditGuest
            guest={activeGuest || null}
            canDelete={canEdit}
            onCancel={() => setScreen(activeGuest ? "profile" : "dashboard")}
            onDuplicateCheck={(name, excludeId) => findPossibleDuplicate(name, excludeId)}
            onOpenExisting={(id) => openGuest(id)}
            onSave={(g) => {
              const saved = upsertGuest(g);
              logAudit(saved, activeGuest ? "Profile updated" : "Guest added", activeGuest ? "Details edited." : "New guest record created.");
              setActiveGuestId(saved.id);
              setScreen("profile");
            }}
            onDelete={() => deleteGuest(activeGuest)}
          />
        )}

        {screen === "quickAdd" && (
          <QuickAdd
            onCancel={() => setScreen("dashboard")}
            onDuplicateCheck={(name) => findPossibleDuplicate(name, null)}
            onOpenExisting={(id) => { setScreen("dashboard"); openGuest(id); }}
            onSave={(g, isNew) => {
              const saved = upsertGuest(g);
              logAudit(saved, isNew ? "Guest added via Quick Add" : "Updated via Quick Add", "Captured from natural-language entry.");
              openGuest(saved.id);
            }}
            guests={guests}
          />
        )}

        {screen === "events" && (
          <EventsScreen
            events={events}
            guests={guests}
            onBack={() => setScreen("dashboard")}
            onOpenEvent={(id) => { setActiveEventId(id); setScreen("eventDetail"); }}
            onCreateEvent={(ev) => { saveEvents([ev, ...events]); setActiveEventId(ev.id); setScreen("eventDetail"); }}
          />
        )}

        {screen === "eventDetail" && activeEvent && (
          <EventDetail
            event={activeEvent}
            guests={guests}
            onBack={() => setScreen("events")}
            onUpdate={(ev) => saveEvents(events.map((e) => (e.id === ev.id ? ev : e)))}
            onOpenGuest={openGuest}
            onBriefing={() => setScreen("briefing")}
          />
        )}

        {screen === "briefing" && activeEvent && (
          <ServiceBriefing
            event={activeEvent}
            guests={guests}
            onBack={() => setScreen("eventDetail")}
          />
        )}

        {screen === "auditLog" && (
          <AuditLogScreen auditLog={auditLog} onBack={() => setScreen("settingsTab")} />
        )}

        {screen === "allergyHeatmap" && (
          <AllergyHeatmapScreen guests={guests} onBack={() => setScreen("settingsTab")} />
        )}

        {screen === "csvImport" && (
          <CSVImportScreen guests={guests} onImport={(newGuests) => { saveGuests([...guests, ...newGuests]); showToast(`Imported ${newGuests.length} guests`); setScreen("settingsTab"); }} onBack={() => setScreen("settingsTab")} />
        )}
      </div>

      {screen === "dashboard" && canEdit && (
        <FloatingActions
          onAdd={() => { setActiveGuestId(null); setScreen("addEdit"); }}
          onQuickAdd={() => setScreen("quickAdd")}
        />
      )}

      {["dashboard", "notesTab", "settingsTab", "profile", "notesDetail"].includes(screen) && (
        <BottomNav activeTab={activeTab} onChange={goTab} />
      )}
    </Shell>
  );
}

/* --------------------------------- Shell --------------------------------- */

function Shell({ children }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const shellShadow = isMobile ? "none" : "0 0 40px rgba(0,0,0,0.06)";
  const shellStyle = {
    fontFamily: "Inter, sans-serif", background: COLORS.bg, color: COLORS.text,
    width: "100%", height: "100dvh", maxWidth: "100%", margin: "0 auto", display: "flex",
    flexDirection: "column", position: "fixed", overflow: "hidden",
    boxShadow: shellShadow,
    top: 0, left: 0, right: 0, bottom: 0,
  };

  return (
    <div style={shellStyle}>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: ${COLORS.muted}; opacity: 0.8; }
        button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 2px solid ${COLORS.gold}; outline-offset: 1px;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 10px; }
        input[type="text"], input[type="email"], textarea, select {
          min-height: 44px;
        }
        button {
          min-height: 44px;
          -webkit-user-select: none;
          user-select: none;
        }
        @media (max-width: 640px) {
          body { font-size: 14px; }
          h1, h2, h3 { line-height: 1.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

/* ------------------------------- Login screen ------------------------------- */

function LoginScreen({ accounts, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const u = username.trim().toLowerCase();
    if (!u || !password) return;
    const match = accounts.find((a) => a.username.toLowerCase() === u);
    if (!match || match.password !== password) {
      setError("Incorrect username or password.");
      return;
    }
    setError("");
    onLogin({ id: match.id, name: match.name, role: match.role });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && username.trim() && password) {
      handleLogin();
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px", position: "relative", overflow: "hidden" }}>
      {/* large line-art illustration, faint, bottom-anchored */}
      <div style={{ position: "absolute", left: "50%", bottom: -30, transform: "translateX(-50%)", pointerEvents: "none" }}>
        <ServiceMarkOutline size={320} color={COLORS.gold} opacity={0.16} />
      </div>

      <div style={{ textAlign: "center", marginBottom: 36, position: "relative" }}>
        <div style={{
          width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
        }}>
          <ShieldMark size={52} color={COLORS.gold} crownColor={COLORS.text} />
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 44, margin: "0 0 10px", color: COLORS.text }}>Guest</h1>
        <div style={{ width: 34, height: 2, background: COLORS.gold, margin: "0 auto 14px" }} />
        <p style={{
          color: COLORS.muted, fontSize: 11.5, margin: 0, fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: 1.6, textTransform: "uppercase", lineHeight: 1.9,
        }}>
          Understand every guest.<br />Deliver exceptional experiences.
        </p>
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 22, position: "relative" }}>
        <label style={{ fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1, color: COLORS.muted, textTransform: "uppercase" }}>Username</label>
        <div style={{ marginTop: 7, marginBottom: 14 }}>
          <TextInput 
            placeholder="e.g. admin" 
            value={username} 
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            onKeyPress={handleKeyPress}
            autoFocus 
          />
        </div>
        <label style={{ fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1, color: COLORS.muted, textTransform: "uppercase" }}>Password</label>
        <div style={{ marginTop: 7, marginBottom: 8 }}>
          <TextInput 
            type="password"
            placeholder="********" 
            value={password} 
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyPress={handleKeyPress}
          />
        </div>
        {error && (
          <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>{error}</div>
        )}
        <div style={{ height: 8 }} />
        <Button
          variant="primary" size="lg" style={{ width: "100%" }}
          disabled={!username.trim() || !password}
          onClick={handleLogin}
        >
          Sign in
        </Button>
      </div>
      <p style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginTop: 18, lineHeight: 1.5, position: "relative" }}>
        First time here? Sign in with <strong>admin</strong> / <strong>admin123</strong>,<br />
        then create staff accounts from Settings.
      </p>
    </div>
  );
}

/* --------------------------------- Header & bottom nav --------------------------------- */

function Header({ mode = "root", title, onBack, onMenu, onAdd, onMore }) {
  return (
    <div style={{
      padding: "16px 20px 14px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
    }}>
      {mode === "root" ? (
        <button onClick={onMenu} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.text, padding: 4, display: "flex" }}>
          <Menu size={22} />
        </button>
      ) : (
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.text, padding: 4, display: "flex" }}>
          <ChevronLeft size={22} />
        </button>
      )}
      <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: mode === "root" ? 21 : 17, color: COLORS.text }}>{title}</span>
      {mode === "root" ? (
        onAdd ? (
          <button onClick={onAdd} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.text, padding: 4, display: "flex" }}>
            <Plus size={22} />
          </button>
        ) : <div style={{ width: 30 }} />
      ) : (
        onMore ? (
          <button onClick={onMore} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, padding: 4, display: "flex" }}>
            <MoreHorizontal size={20} />
          </button>
        ) : <div style={{ width: 30 }} />
      )}
    </div>
  );
}

function BottomNav({ activeTab, onChange }) {
  const tabs = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "guests", label: "Guests", icon: Users },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div style={{
      display: "flex", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface,
      padding: "8px 4px", paddingBottom: "max(8px, env(safe-area-inset-bottom))", flexShrink: 0,
    }}>
      {tabs.map((t) => {
        const active = activeTab === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key} onClick={() => onChange(t.key)}
            style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: active ? COLORS.text : COLORS.muted, padding: "4px 0",
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, fontFamily: "Inter, sans-serif" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Dashboard --------------------------------- */

function StatCard({ icon: Icon, label, value }) {
  return (
    <div style={{
      background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 14,
      padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <Icon size={16} color={COLORS.gold} />
      <div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: COLORS.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function ArrivalRow({ guest, table, onClick }) {
  const initials = guest.name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, background: COLORS.surface,
        border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "10px 14px", cursor: "pointer",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "50%", background: COLORS.surfaceAlt, color: COLORS.text,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5,
        flexShrink: 0, fontFamily: "Inter, sans-serif",
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {guest.title} {guest.name}
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>{table ? `Table ${table}` : "Tonight"}</div>
      </div>
      {guest.vip ? <Star size={16} color={COLORS.gold} fill={COLORS.gold} /> : <Star size={16} color={COLORS.border} />}
    </div>
  );
}

function Dashboard({ guests, allGuests, allCount, query, setQuery, filter, setFilter, todaysEvent, onOpenGuest, onAddGuest, onQuickAdd, onTonight, canEdit, canDelete, onEditGuest, onDeleteGuest, staff, showHero }) {
  const filters = ["Tonight", "Recent", "All Guests", "Allergies", "VIP"];
  const [actionGuest, setActionGuest] = useState(null);
  const [confirmDeleteGuest, setConfirmDeleteGuest] = useState(null);
  const roster = allGuests || guests;

  return (
    <div style={{ padding: "18px 20px 100px" }}>
      {showHero && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, color: COLORS.text }}>
              Welcome back, {(staff?.name || "").split(" ")[0] || "there"}
            </div>
            <div style={{ color: COLORS.muted, fontSize: 13.5, marginTop: 3 }}>Here's what's happening today.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            <StatCard icon={Users} label="All Guests" value={roster.length} />
            <StatCard icon={Calendar} label="Arriving Today" value={todaysEvent ? todaysEvent.guests.length : 0} />
            <StatCard icon={Star} label="VIP Guests" value={roster.filter((g) => g.vip).length} />
            <StatCard icon={AlertTriangle} label="Allergies" value={roster.filter((g) => g.allergies.length > 0).length} />
          </div>

          {todaysEvent && todaysEvent.guests.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: COLORS.text }}>Today's Arrivals</span>
                <button onClick={onTonight} style={{ background: "none", border: "none", color: COLORS.gold, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>View all</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todaysEvent.guests.slice(0, 3).map((x) => {
                  const g = roster.find((gg) => gg.id === x.guestId);
                  if (!g) return null;
                  return <ArrivalRow key={g.id} guest={g} table={x.table} onClick={() => onOpenGuest(g.id)} />;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={17} color={COLORS.muted} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)" }} />
        <TextInput
          placeholder="Search guests, allergies, preferences..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 42, fontSize: 15.5, padding: "13px 14px 13px 42px", borderRadius: 14 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0, padding: "7px 15px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${filter === f ? COLORS.text : COLORS.border}`,
              background: filter === f ? COLORS.text : "transparent",
              color: filter === f ? "#fff" : COLORS.muted, cursor: "pointer", fontFamily: "Inter, sans-serif",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {f === "Tonight" && <Calendar size={12.5} />}
            {f === "Allergies" && <AlertTriangle size={12.5} />}
            {f === "VIP" && <Star size={12.5} />}
            {f}
          </button>
        ))}
      </div>

      {filter === "Tonight" && !todaysEvent && (
        <div onClick={onTonight} style={{
          background: COLORS.surfaceAlt, border: `1px dashed ${COLORS.border}`, borderRadius: 14,
          padding: 16, textAlign: "center", marginBottom: 16, cursor: "pointer",
        }}>
          <Calendar size={18} color={COLORS.muted} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13.5, color: COLORS.muted }}>No event set for tonight - tap to create one.</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: 1, color: COLORS.muted, textTransform: "uppercase" }}>
          {guests.length} {guests.length === 1 ? "guest" : "guests"}
        </span>
        {query ? (
          <span style={{ fontSize: 12, color: COLORS.muted }}>of {allCount} total</span>
        ) : (canEdit && guests.length > 0) && (
          <span style={{ fontSize: 11.5, color: COLORS.muted }}>Hold a card for options</span>
        )}
      </div>

      {guests.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {guests.map((g) => (
            <GuestCard
              key={g.id}
              guest={g}
              onClick={() => onOpenGuest(g.id)}
              onLongPress={canEdit ? () => setActionGuest(g) : undefined}
            />
          ))}
        </div>
      )}

      {actionGuest && (
        <Modal onClose={() => setActionGuest(null)}>
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ width: 36, height: 4, background: COLORS.border, borderRadius: 4, margin: "0 auto 16px" }} />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 500, marginBottom: 2 }}>
            {actionGuest.title} {actionGuest.name}
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 18 }}>What would you like to do?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button variant="outline" style={{ justifyContent: "flex-start" }} icon={ChevronRight} onClick={() => { onOpenGuest(actionGuest.id); setActionGuest(null); }}>
              View profile
            </Button>
            <Button variant="outline" style={{ justifyContent: "flex-start" }} icon={Pencil} onClick={() => { onEditGuest(actionGuest.id); setActionGuest(null); }}>
              Edit guest
            </Button>
            {canDelete && (
              <Button variant="danger" style={{ justifyContent: "flex-start" }} icon={Trash2} onClick={() => { setConfirmDeleteGuest(actionGuest); setActionGuest(null); }}>
                Delete guest
              </Button>
            )}
            <Button variant="ghost" onClick={() => setActionGuest(null)}>Cancel</Button>
          </div>
        </Modal>
      )}

      {confirmDeleteGuest && (
        <Modal onClose={() => setConfirmDeleteGuest(null)}>
          <ModalHeader title="Delete guest record" icon={AlertTriangle} tone="red" onClose={() => setConfirmDeleteGuest(null)} />
          <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 6 }}>
            This will permanently remove <strong>{confirmDeleteGuest.title} {confirmDeleteGuest.name}</strong>, including
            all allergy, preference, and service records, and drop them from any events.
          </p>
          <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 18 }}>
            This action cannot be undone. It will be recorded in the audit log.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteGuest(null)}>Cancel</Button>
            <Button variant="danger" style={{ flex: 1 }} icon={Trash2} onClick={() => { onDeleteGuest(confirmDeleteGuest); setConfirmDeleteGuest(null); }}>
              Delete permanently
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmptyState({ query }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: COLORS.muted }}>
      <Users size={30} style={{ marginBottom: 10, opacity: 0.5 }} />
      <div style={{ fontSize: 14.5, fontWeight: 500, color: COLORS.text, marginBottom: 4 }}>
        {query ? "No guests match that search" : "No guests yet"}
      </div>
      <div style={{ fontSize: 13 }}>
        {query ? "Try a name, allergy, or preference." : "Add your first guest to get started."}
      </div>
    </div>
  );
}

const LONG_PRESS_MS = 500;

function GuestCard({ guest, onClick, onLongPress }) {
  const pressTimer = React.useRef(null);
  const firedLongPress = React.useRef(false);

  const clearTimer = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  const startPress = () => {
    if (!onLongPress) return;
    firedLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      firedLongPress.current = true;
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch { /* ignore */ } }
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const endPress = () => clearTimer();

  const handleClick = (e) => {
    if (firedLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      firedLongPress.current = false;
      return;
    }
    onClick();
  };

  // Get the most critical allergy/intolerance for border color
  const mostCritical = [...guest.allergies].sort((a, b) => {
    const order = { Severe: 0, Allergy: 1, Intolerance: 2 };
    return (order[a.severity] || 3) - (order[b.severity] || 3);
  })[0];
  
  const borderColor = mostCritical ? SEVERITY_STYLE[mostCritical.severity]?.color : "transparent";

  return (
    <div
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onContextMenu={(e) => { if (onLongPress) e.preventDefault(); }}
      style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "14px 16px",
        cursor: "pointer", boxShadow: "0 1px 3px rgba(30,40,35,0.05)", transition: "box-shadow .15s ease",
        borderLeft: `4px solid ${borderColor}`,
        userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 16.5, fontWeight: 500 }}>
              {guest.title} {guest.name}
            </span>
            {guest.vip && <Star size={13} color={COLORS.gold} fill={COLORS.gold} />}
          </div>
          
          {/* Show ALL allergies and intolerances */}
          {guest.allergies.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
              {guest.allergies.map((a) => (
                <AllergyTag key={a.id} allergen={a.allergen} severity={a.severity} verified={a.verified} />
              ))}
            </div>
          )}

          {/* Show dietary restrictions */}
          {guest.dietary.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
              {guest.dietary.map((d) => {
                const type = getDietaryType(d.text || d);
                return type ? <DietaryTag key={d.id} text={d.text || d} type={type} /> : null;
              })}
            </div>
          )}

          {/* Show key preferences, dislikes, and drinks */}
          {(guest.preferences.length > 0 || guest.dislikes.length > 0 || guest.drinks.length > 0) && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
              {guest.preferences.slice(0, 2).map((p) => (
                <PreferenceTag key={p.id} text={p.text} icon={Heart} />
              ))}
              {guest.dislikes.slice(0, 1).map((d) => (
                <PreferenceTag key={d.id} text={`Dislikes: ${d.text}`} />
              ))}
              {guest.drinks.slice(0, 1).map((d) => (
                <PreferenceTag key={d.id} text={d.text} icon={Wine} />
              ))}
            </div>
          )}
        </div>
        <ChevronRight size={17} color={COLORS.muted} style={{ flexShrink: 0, marginTop: 3 }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: COLORS.muted, fontFamily: "Inter, sans-serif" }}>
        Last visit: {formatDate(guest.lastVisit)}
      </div>
    </div>
  );
}

/* ------------------------------ Floating actions ------------------------------ */

function FloatingActions({ onAdd, onQuickAdd }) {
  return (
    <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", gap: 10, zIndex: 20 }}>
      <Button variant="outline" style={{ flex: 1, background: COLORS.surface }} icon={UserPlus} onClick={onAdd}>Add Guest</Button>
      <Button variant="gold" style={{ flex: 1.2 }} icon={Sparkles} onClick={onQuickAdd}>Quick Add</Button>
    </div>
  );
}

/* --------------------------------- Guest profile --------------------------------- */

function NotesTabScreen({ guests, onOpenGuest }) {
  const withNotes = guests.filter((g) => g.notes.length || g.preferences.length || g.serviceNotes.length || g.drinks.length);
  return (
    <div style={{ padding: "18px 20px 100px" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: 1, color: COLORS.muted, textTransform: "uppercase" }}>
          {withNotes.length} {withNotes.length === 1 ? "guest" : "guests"} with notes on file
        </span>
      </div>
      {withNotes.length === 0 ? (
        <MutedLine text="No preferences or notes recorded yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {withNotes.map((g) => {
            const preview = g.notes[0]?.text || g.preferences[0]?.text || g.serviceNotes[0]?.text || g.drinks[0]?.text || "";
            const initials = g.name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div
                key={g.id} onClick={() => onOpenGuest(g.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: COLORS.surfaceAlt, color: COLORS.text,
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5,
                  flexShrink: 0, fontFamily: "Inter, sans-serif",
                }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{g.title} {g.name}</div>
                  <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preview}</div>
                </div>
                <ChevronRight size={16} color={COLORS.border} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotesDetailScreen({ guest }) {
  return (
    <div style={{ padding: "18px 20px 60px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 16, color: COLORS.text }}>
        {guest.title} {guest.name}
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 12, color: COLORS.text }}>Preferences</div>
        {(guest.preferences.length === 0 && guest.drinks.length === 0 && guest.tablePreferences.length === 0) ? (
          <MutedLine text="No preferences recorded." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {guest.preferences.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Heart size={16} color={COLORS.gold} />
                <span style={{ fontSize: 13.5, color: COLORS.text }}>{p.text}</span>
              </div>
            ))}
            {guest.drinks.map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Wine size={16} color={COLORS.gold} />
                <span style={{ fontSize: 13.5, color: COLORS.text }}>{d.text}</span>
              </div>
            ))}
            {guest.tablePreferences.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MapPin size={16} color={COLORS.gold} />
                <span style={{ fontSize: 13.5, color: COLORS.text }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 12, color: COLORS.text }}>Notes</div>
        {guest.notes.length === 0 ? (
          <MutedLine text="No notes on file." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {guest.notes.map((n) => (
              <div key={n.id} style={{ background: COLORS.surfaceAlt, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {guest.serviceNotes.length > 0 && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 12, color: COLORS.text }}>Service Reminders</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {guest.serviceNotes.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Bell size={16} color={COLORS.gold} />
                <span style={{ fontSize: 13.5, color: COLORS.text }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsScreen({ staff, guests, onLogout, onExportExcel, onCSVImport, onAuditLog, onAllergyHeatmap, onEvents, onAccounts }) {
  const items = [
    ...(staff.role === "Admin" ? [{ icon: Users, label: "Manage Staff Accounts", onClick: onAccounts }] : []),
    { icon: Calendar, label: "Manage Events", onClick: onEvents },
    { icon: AlertTriangle, label: "Allergy Heatmap", onClick: onAllergyHeatmap },
    { icon: FileSpreadsheet, label: "Export as Excel", onClick: onExportExcel },
    { icon: Upload, label: "Import Guests (CSV)", onClick: onCSVImport },
    { icon: History, label: "Audit History", onClick: onAuditLog },
  ];
  const initials = (staff.name || "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ padding: "18px 20px 100px" }}>
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, marginBottom: 18,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: "50%", background: COLORS.goldSoft, color: COLORS.gold,
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17,
          fontFamily: "Inter, sans-serif", flexShrink: 0,
        }}>{initials}</div>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: COLORS.text }}>{staff.name}</div>
          <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 1 }}>{staff.role}</div>
        </div>
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label} onClick={it.onClick}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                background: "none", border: "none", borderBottom: i < items.length - 1 ? `1px solid ${COLORS.border}` : "none",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <Icon size={17} color={COLORS.gold} />
              <span style={{ fontSize: 14, color: COLORS.text, flex: 1, fontFamily: "Inter, sans-serif" }}>{it.label}</span>
              <ChevronRight size={15} color={COLORS.border} />
            </button>
          );
        })}
      </div>

      <Button variant="outline" style={{ width: "100%" }} icon={LogOut} onClick={onLogout}>Sign out</Button>
    </div>
  );
}

const PROTECTED_USERNAMES = ["admin", "manager", "staff"];
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "Admin");

function AccountsScreen({ accounts, currentStaffId, onBack, onAdd, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null); // account id, or 'new'
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const startNew = () => {
    setEditing("new");
    setName(""); setUsername(""); setPassword(""); setRole("Staff"); setError("");
  };
  const startEdit = (acc) => {
    setEditing(acc.id);
    setName(acc.name); setUsername(acc.username); setPassword(""); setRole(acc.role); setError("");
  };
  const cancel = () => { setEditing(null); setError(""); };

  const save = () => {
    const trimmedName = name.trim();
    const trimmedUser = username.trim().toLowerCase();
    if (!trimmedName || !trimmedUser) { setError("Name and username are required."); return; }
    const dupe = accounts.find((a) => a.username.toLowerCase() === trimmedUser && a.id !== editing);
    if (dupe) { setError("That username is already taken."); return; }

    if (editing === "new") {
      if (!password) { setError("Set a password for the new account."); return; }
      onAdd({ id: uid(), name: trimmedName, username: trimmedUser, password, role });
    } else {
      const existing = accounts.find((a) => a.id === editing);
      // Role is never editable for the Admin account itself, and never assignable to Admin for anyone else -
      // this keeps exactly one Admin (you) at all times.
      const nextRole = existing.role === "Admin" ? "Admin" : role;
      onUpdate({ ...existing, name: trimmedName, username: trimmedUser, role: nextRole, password: password ? password : existing.password });
    }
    setEditing(null);
  };

  const requestDelete = (acc) => {
    if (acc.id === currentStaffId) { setError("You can't delete the account you're signed in with."); return; }
    if (PROTECTED_USERNAMES.includes(acc.username)) { setError("This is a standard account and can't be removed - you can still change its name or password."); return; }
    const admins = accounts.filter((a) => a.role === "Admin");
    if (acc.role === "Admin" && admins.length <= 1) { setError("At least one Admin account must remain."); return; }
    setError("");
    setConfirmDeleteId(acc.id);
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Settings
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, margin: 0 }}>Staff Accounts</h2>
        {!editing && <Button size="sm" variant="gold" icon={Plus} onClick={startNew}>Add</Button>}
      </div>
      <p style={{ color: COLORS.muted, fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>
        Passwords are stored on this device only, for basic access control - not encrypted, and not suitable for sensitive credentials.
        Only the Admin account can manage accounts, and no one can create another Admin from here.
      </p>

      {editing && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <Field label="Full name"><TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jamie Rivera" /></Field>
          <Field label="Username"><TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jamie" /></Field>
          <Field label={editing === "new" ? "Password" : "New password (leave blank to keep current)"}>
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
          </Field>
          {(editing === "new" || accounts.find((a) => a.id === editing)?.role !== "Admin") ? (
            <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value)} options={ASSIGNABLE_ROLES} /></Field>
          ) : (
            <Field label="Role"><div style={{ padding: "11px 14px", color: COLORS.muted, fontSize: 14 }}>Admin (fixed - can't be changed)</div></Field>
          )}
          {error && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={cancel}>Cancel</Button>
            <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={save}>Save</Button>
          </div>
        </div>
      )}

      {!editing && error && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {accounts.map((acc) => (
          <div key={acc.id} style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: COLORS.surfaceAlt, color: COLORS.text,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0,
              fontFamily: "Inter, sans-serif",
            }}>
              {acc.name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
                {acc.name}
                {acc.id === currentStaffId && <span style={{ fontSize: 10.5, color: COLORS.gold, fontWeight: 700 }}>(You)</span>}
                {PROTECTED_USERNAMES.includes(acc.username) && <span style={{ fontSize: 10.5, color: COLORS.muted, fontWeight: 600 }}>· Standard</span>}
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>@{acc.username} - {acc.role}</div>
            </div>
            <button onClick={() => startEdit(acc)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}>
              <Pencil size={15} color={COLORS.muted} />
            </button>
            <button onClick={() => requestDelete(acc)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}>
              <Trash2 size={15} color={COLORS.red} />
            </button>
          </div>
        ))}
      </div>

      {confirmDeleteId && (
        <Modal onClose={() => setConfirmDeleteId(null)}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Remove this account?</div>
          <p style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 18 }}>They won't be able to sign in anymore. This can't be undone.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="danger" style={{ flex: 1 }} onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}>Remove</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GuestProfile({ guest, canEdit, canDelete, onBack, onEdit, onSave, onDelete, auditLog }) {
  const [adding, setAdding] = useState(null); // 'allergy' | 'preference' | 'note' | 'quickUpdate'
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addAllergy = (a) => {
    const next = { ...guest, allergies: [...guest.allergies, { id: uid(), verified: false, dateRecorded: todayISO(), recordedBy: "Staff", ...a }] };
    onSave(next, "Allergy added", `${a.allergen} (${a.severity}) added.`);
    setAdding(null);
  };
  const addPreference = (text) => {
    const next = { ...guest, preferences: [...guest.preferences, { id: uid(), text }] };
    onSave(next, "Preference added", text);
    setAdding(null);
  };
  const addNote = (text) => {
    const next = { ...guest, notes: [...guest.notes, { id: uid(), text }] };
    onSave(next, "Note added", text);
    setAdding(null);
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "22px 20px",
        marginBottom: 18, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: guest.allergies.length ? COLORS.red : COLORS.gold }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: COLORS.surfaceAlt, color: COLORS.text,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18,
              fontFamily: "Inter, sans-serif", flexShrink: 0, position: "relative",
            }}>
              {guest.name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              {guest.vip && (
                <div style={{
                  position: "absolute", top: -3, right: -3, background: COLORS.gold, borderRadius: "50%",
                  width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${COLORS.surface}`,
                }}>
                  <Star size={10} color="#fff" fill="#fff" />
                </div>
              )}
            </div>
            <div>
              <h1 style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 21, margin: "0 0 3px", color: COLORS.text }}>
                {guest.title} {guest.name}
              </h1>
              <span style={{ fontSize: 12.5, color: COLORS.muted }}>{guest.vip ? "VIP Guest" : "Guest"}</span>
            </div>
          </div>
          {canEdit && (
            <button onClick={onEdit} style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 9, cursor: "pointer", display: "flex", flexShrink: 0 }}>
              <Pencil size={15} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, gap: 6 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <Clock size={14} color={COLORS.gold} style={{ marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "IBM Plex Mono, monospace" }}>Last Visit</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{formatDate(guest.lastVisit)}</div>
          </div>
          <div style={{ width: 1, background: COLORS.border }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <AlertTriangle size={14} color={COLORS.gold} style={{ marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "IBM Plex Mono, monospace" }}>Allergies</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{guest.allergies.length}</div>
          </div>
          <div style={{ width: 1, background: COLORS.border }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <StickyNote size={14} color={COLORS.gold} style={{ marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "IBM Plex Mono, monospace" }}>Notes</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{guest.notes.length}</div>
          </div>
        </div>
      </div>

      <Section icon={AlertTriangle} title="Allergies" tone="red"
        action={canEdit && <SmallAdd onClick={() => setAdding("allergy")} />}>
        {guest.allergies.length === 0 ? (
          <MutedLine text="No known allergies recorded." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {guest.allergies.map((a) => {
              const sev = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.Intolerance;
              return (
                <div key={a.id} style={{ background: COLORS.redSoft, border: `1px solid ${COLORS.redBorder}`, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: sev.bg, color: sev.fg,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <AlertTriangle size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <AllergyTag allergen={a.allergen} severity={a.severity} verified={a.verified} />
                    {a.notes && <div style={{ marginTop: 8, fontSize: 13.5, color: "#7A2E23" }}>{a.notes}</div>}
                    <div style={{ marginTop: 6, fontSize: 11, color: "#9A5045", display: "flex", gap: 10 }}>
                      <span>{a.verified ? "Verified" : "Unverified"}</span>
                      <span>Recorded {formatDate(a.dateRecorded)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section icon={Leaf} title="Dietary Requirements"
        action={canEdit && <SmallAdd onClick={() => setAdding("dietary")} />}>
        {guest.dietary.length === 0 ? <MutedLine text="None" /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {guest.dietary.map((d) => {
              const type = getDietaryType(d.text || d);
              return type ? (
                <DietaryTag key={d.id} text={d.text || d} type={type} />
              ) : (
                <Pill key={d.id} tone="green"><Leaf size={11} /> {d.text || d}</Pill>
              );
            })}
          </div>
        )}
      </Section>

      <Section icon={Heart} title="Preferences"
        action={canEdit && <SmallAdd onClick={() => setAdding("preference")} />}>
        {guest.preferences.length === 0 ? <MutedLine text="None recorded." /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {guest.preferences.map((p) => <PreferenceTag key={p.id} text={p.text} icon={Heart} />)}
          </div>
        )}
        {guest.dislikes.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}>
            {guest.dislikes.map((p) => <PreferenceTag key={p.id} text={`Dislikes: ${p.text}`} />)}
          </div>
        )}
      </Section>

      <Section icon={Wine} title="Drinks">
        {guest.drinks.length === 0 ? <MutedLine text="None recorded." /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {guest.drinks.map((d) => <PreferenceTag key={d.id} text={d.text} icon={Wine} />)}
          </div>
        )}
      </Section>

      <Section icon={Armchair} title="Service Preferences">
        {guest.serviceNotes.length === 0 ? <MutedLine text="None recorded." /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {guest.serviceNotes.map((s) => <PreferenceTag key={s.id} text={s.text} icon={Armchair} />)}
          </div>
        )}
      </Section>

      <Section icon={MapPin} title="Table & Room Preferences">
        {guest.tablePreferences.length === 0 ? <MutedLine text="None recorded." /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {guest.tablePreferences.map((s) => <PreferenceTag key={s.id} text={s.text} icon={MapPin} />)}
          </div>
        )}
      </Section>

      <Section icon={StickyNote} title="Notes"
        action={canEdit && <SmallAdd onClick={() => setAdding("note")} />}>
        {guest.notes.length === 0 ? <MutedLine text="No notes." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {guest.notes.map((n) => <div key={n.id} style={{ fontSize: 14 }}>{n.text}</div>)}
          </div>
        )}
      </Section>

      {guest.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {guest.tags.map((t) => (
            <span key={t} style={{ fontSize: 11.5, color: COLORS.muted, fontFamily: "IBM Plex Mono, monospace" }}>#{t}</span>
          ))}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 6 }}>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
          Last updated {formatDate(guest.updatedAt?.slice(0, 10))} - Updated by {guest.updatedBy}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEdit && <Button size="sm" variant="outline" icon={Sparkles} onClick={() => setAdding("quickUpdate")}>Quick Update</Button>}
          <Button size="sm" variant="ghost" icon={History} onClick={() => setShowHistory((s) => !s)}>
            History ({auditLog.length})
          </Button>
          {canDelete && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)} style={{ marginLeft: "auto" }}>
              Delete guest
            </Button>
          )}
        </div>
        {showHistory && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {auditLog.length === 0 && <MutedLine text="No history yet." />}
            {auditLog.map((a) => <AuditRow key={a.id} entry={a} />)}
          </div>
        )}
      </div>

      {adding === "allergy" && (
        <AddAllergyModal onClose={() => setAdding(null)} onSave={addAllergy} />
      )}
      {adding === "preference" && (
        <QuickTextModal title="Add preference" placeholder="e.g. Prefers window tables" onClose={() => setAdding(null)} onSave={addPreference} />
      )}
      {adding === "note" && (
        <QuickTextModal title="Add note" placeholder="e.g. Celebrating anniversary this visit" onClose={() => setAdding(null)} onSave={addNote} />
      )}
      {adding === "dietary" && (
        <QuickTextModal title="Add dietary requirement" placeholder="e.g. Vegetarian" onClose={() => setAdding(null)} onSave={(text) => {
          const next = { ...guest, dietary: [...guest.dietary, { id: uid(), text }] };
          onSave(next, "Dietary requirement added", text);
          setAdding(null);
        }} />
      )}
      {adding === "quickUpdate" && (
        <QuickUpdateModal guest={guest} onClose={() => setAdding(null)} onSave={(next, detail) => { onSave(next, "Quick update applied", detail); setAdding(null); }} />
      )}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)}>
          <ModalHeader title="Delete guest record" icon={AlertTriangle} tone="red" onClose={() => setConfirmDelete(false)} />
          <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 6 }}>
            This will permanently remove <strong>{guest.title} {guest.name}</strong>, including all allergy, preference,
            and service records, and drop them from any events.
          </p>
          <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 18 }}>
            This action cannot be undone. It will be recorded in the audit log.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" style={{ flex: 1 }} icon={Trash2} onClick={onDelete}>Delete permanently</Button>
          </div>
  
