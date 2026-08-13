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
  /* Real browser localStorage â€” persists per-device, survives reloads and
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
      // Ensure the three standard accounts always exist, without ever touching
      // ones that are already saved (so an edited password/name is never overwritten).
      const defaults = [
        { name: "Admin", username: "admin", password: "admin123", role: "Admin" },
        { name: "Manager", username: "manager", password: "manager123", role: "Manager" },
        { name: "Staff", username: "staff", password: "staff123", role: "Staff" },
      ];
      ac = ac || [];
      let acChanged = false;
      defaults.forEach((d) => {
        if (!ac.some((a) => a.username === d.username)) {
          ac.push({ id: uid(), ...d });
          acChanged = true;
        }
      });
      if (acChanged) storageSet("gn-accounts", ac);
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
                {PROTECTED_USERNAMES.includes(acc.username) && <span style={{ fontSize: 10.5, color: COLORS.muted, fontWeight: 600 }}>Â· Standard</span>}
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
        </Modal>
      )}
    </div>
  );
}

function AuditRow({ entry }) {
  return (
    <div style={{ fontSize: 12.5, borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 10 }}>
      <div style={{ color: COLORS.text, fontWeight: 600 }}>{entry.action}</div>
      <div style={{ color: COLORS.muted }}>{entry.detail}</div>
      <div style={{ color: COLORS.muted, marginTop: 2 }}>{new Date(entry.timestamp).toLocaleString("en-GB")} - {entry.staff}</div>
    </div>
  );
}

function MutedLine({ text }) {
  return <div style={{ fontSize: 13.5, color: COLORS.muted, fontStyle: "italic" }}>{text}</div>;
}

function SmallAdd({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", color: COLORS.gold, cursor: "pointer", display: "flex",
      alignItems: "center", gap: 3, fontSize: 12.5, fontWeight: 600, fontFamily: "Inter, sans-serif",
    }}>
      <Plus size={14} /> Add
    </button>
  );
}

/* ------------------------------ Add modals ------------------------------ */

function AddAllergyModal({ onClose, onSave }) {
  const [allergen, setAllergen] = useState("");
  const [severity, setSeverity] = useState("Allergy");
  const [notes, setNotes] = useState("");
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add allergy" icon={AlertTriangle} tone="red" onClose={onClose} />
      <Field label="Allergen"><TextInput autoFocus value={allergen} onChange={(e) => setAllergen(e.target.value)} placeholder="e.g. Cheese" /></Field>
      <Field label="Severity"><Select value={severity} onChange={(e) => setSeverity(e.target.value)} options={SEVERITIES} /></Field>
      <Field label="Notes (optional)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the kitchen or floor staff should know" /></Field>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16, lineHeight: 1.5 }}>
        This assists staff but does not replace normal food-allergy verification and kitchen safety procedures.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="outline" style={{ flex: 1 }} onClick={onClose}>Cancel</Button>
        <Button variant="danger" style={{ flex: 1 }} disabled={!allergen.trim()} onClick={() => onSave({ allergen: allergen.trim(), severity, notes: notes.trim() })}>Save allergy</Button>
      </div>
    </Modal>
  );
}

function QuickTextModal({ title, placeholder, onClose, onSave }) {
  const [text, setText] = useState("");
  return (
    <Modal onClose={onClose}>
      <ModalHeader title={title} icon={Plus} onClose={onClose} />
      <Field label="Details"><TextArea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="outline" style={{ flex: 1 }} onClick={onClose}>Cancel</Button>
        <Button variant="primary" style={{ flex: 1 }} disabled={!text.trim()} onClick={() => onSave(text.trim())}>Save</Button>
      </div>
    </Modal>
  );
}

function QuickUpdateModal({ guest, onClose, onSave }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);

  const interpret = () => {
    const all = [
      ...guest.drinks.map((d) => ({ ...d, field: "drinks" })),
      ...guest.preferences.map((d) => ({ ...d, field: "preferences" })),
      ...guest.serviceNotes.map((d) => ({ ...d, field: "serviceNotes" })),
    ];
    const words = text.toLowerCase().split(/\s+/);
    let bestMatch = null, bestScore = 0;
    for (const item of all) {
      const itemWords = item.text.toLowerCase().split(/\s+/);
      const score = itemWords.filter((w) => words.includes(w)).length;
      if (score > bestScore) { bestScore = score; bestMatch = item; }
    }
    if (bestMatch && bestScore > 0) {
      setPreview({ mode: "replace", target: bestMatch, newText: text.trim() });
    } else {
      setPreview({ mode: "add", newText: text.trim() });
    }
  };

  const confirm = () => {
    if (!preview) return;
    let next = { ...guest };
    let detail;
    if (preview.mode === "replace") {
      const field = preview.target.field;
      next[field] = guest[field].map((x) => (x.id === preview.target.id ? { ...x, text: preview.newText } : x));
      detail = `${preview.target.text} -> ${preview.newText}`;
    } else {
      next.notes = [...guest.notes, { id: uid(), text: preview.newText }];
      detail = preview.newText;
    }
    onSave(next, detail);
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Quick update" icon={Sparkles} onClose={onClose} />
      {!preview ? (
        <>
          <Field label="What's changed?">
            <TextArea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Gavin now prefers sparkling water instead of still." />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={onClose}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1 }} disabled={!text.trim()} onClick={interpret}>Interpret</Button>
          </div>
        </>
      ) : (
        <>
          {preview.mode === "replace" ? (
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Current</FieldLabel>
              <div style={{ background: COLORS.surfaceAlt, borderRadius: 10, padding: "10px 13px", marginBottom: 10, fontSize: 14 }}>{preview.target.text}</div>
              <FieldLabel>Change to</FieldLabel>
              <div style={{ background: COLORS.goldSoft, borderRadius: 10, padding: "10px 13px", fontSize: 14, fontWeight: 600 }}>{preview.newText}</div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Will be added as a note</FieldLabel>
              <div style={{ background: COLORS.goldSoft, borderRadius: 10, padding: "10px 13px", fontSize: 14 }}>{preview.newText}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setPreview(null)}>Edit</Button>
            <Button variant="primary" style={{ flex: 1 }} icon={Check} onClick={confirm}>Confirm & Save</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ModalHeader({ title, icon: Icon, tone, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {Icon && <Icon size={17} color={tone === "red" ? COLORS.red : COLORS.gold} />}
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 19, margin: 0 }}>{title}</h2>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, padding: 4 }}>
        <X size={19} />
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
function FieldLabel({ children }) {
  return <label style={{ display: "block", fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 0.8, color: COLORS.muted, textTransform: "uppercase", marginBottom: 6 }}>{children}</label>;
}

/* --------------------------------- Add / Edit Guest --------------------------------- */

function ListEditor({ label, items, setItems, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => { if (draft.trim()) { setItems([...items, { id: uid(), text: draft.trim() }]); setDraft(""); } };
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 8, marginBottom: items.length ? 8 : 0 }}>
        <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button variant="outline" size="sm" icon={Plus} onClick={add}>Add</Button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it) => (
          <Pill key={it.id}>
            {it.text}
            <X size={11} style={{ cursor: "pointer" }} onClick={() => setItems(items.filter((x) => x.id !== it.id))} />
          </Pill>
        ))}
      </div>
    </Field>
  );
}

function AddEditGuest({ guest, onCancel, onSave, onDuplicateCheck, onOpenExisting }) {
  const isEdit = !!guest;
  const [title, setTitle] = useState(guest?.title || "Mr");
  const [name, setName] = useState(guest?.name || "");
  const [vip, setVip] = useState(guest?.vip || false);
  const [allergies, setAllergies] = useState(guest?.allergies || []);
  const [dietary, setDietary] = useState(guest?.dietary || []);
  const [preferences, setPreferences] = useState(guest?.preferences || []);
  const [dislikes, setDislikes] = useState(guest?.dislikes || []);
  const [drinks, setDrinks] = useState(guest?.drinks || []);
  const [serviceNotes, setServiceNotes] = useState(guest?.serviceNotes || []);
  const [tablePreferences, setTablePreferences] = useState(guest?.tablePreferences || []);
  const [notes, setNotes] = useState(guest?.notes || []);
  const [tagsText, setTagsText] = useState((guest?.tags || []).join(", "));
  const [dupWarning, setDupWarning] = useState(null);
  const [newAllergen, setNewAllergen] = useState("");
  const [newSeverity, setNewSeverity] = useState("Allergy");

  const buildGuest = () => ({
    id: guest?.id || uid(),
    title, name: name.trim(), vip,
    lastVisit: guest?.lastVisit || null,
    allergies, dietary, preferences, dislikes, drinks, serviceNotes, tablePreferences, notes,
    tags: tagsText.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
    updatedAt: guest?.updatedAt || new Date().toISOString(),
    updatedBy: guest?.updatedBy || "Staff",
  });

  const attemptSave = () => {
    if (!name.trim()) return;
    if (!isEdit) {
      const dup = onDuplicateCheck(`${title} ${name}`, null);
      if (dup) { setDupWarning(dup); return; }
    }
    onSave(buildGuest());
  };

  const addAllergyInline = () => {
    if (!newAllergen.trim()) return;
    setAllergies([...allergies, { id: uid(), allergen: newAllergen.trim(), severity: newSeverity, notes: "", verified: false, dateRecorded: todayISO(), recordedBy: "Staff" }]);
    setNewAllergen("");
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Cancel
      </button>
      <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, marginBottom: 18 }}>{isEdit ? "Edit guest" : "Add guest"}</h2>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 110 }}>
          <Field label="Title"><Select value={title} onChange={(e) => setTitle(e.target.value)} options={["Mr", "Mrs", "Ms", "Miss", "Dr", "Professor", "Sir", "Dame", "Lord", "Lady", ""]} /></Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Full name"><TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gavin Henderson" /></Field>
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18, cursor: "pointer" }}>
        <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} style={{ width: 17, height: 17 }} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>VIP guest</span>
      </label>

      <Field label="Allergies">
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <TextInput value={newAllergen} onChange={(e) => setNewAllergen(e.target.value)} placeholder="Allergen, e.g. Cheese" />
          <Select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)} options={SEVERITIES} style={{ width: 130 }} />
          <Button variant="danger" size="sm" icon={Plus} onClick={addAllergyInline}>Add</Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allergies.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.redSoft, border: `1px solid ${COLORS.redBorder}`, borderRadius: 10, padding: "8px 12px" }}>
              <AllergyTag allergen={a.allergen} severity={a.severity} verified={a.verified} />
              <X size={15} style={{ cursor: "pointer", color: COLORS.red }} onClick={() => setAllergies(allergies.filter((x) => x.id !== a.id))} />
            </div>
          ))}
        </div>
      </Field>

      <ListEditor label="Dietary requirements" items={dietary} setItems={setDietary} placeholder="e.g. Vegetarian" />
      <ListEditor label="Preferences" items={preferences} setItems={setPreferences} placeholder="e.g. Tabasco sauce" />
      <ListEditor label="Dislikes" items={dislikes} setItems={setDislikes} placeholder="e.g. Mushrooms" />
      <ListEditor label="Drinks" items={drinks} setItems={setDrinks} placeholder="e.g. Prefers red wine" />
      <ListEditor label="Service preferences" items={serviceNotes} setItems={setServiceNotes} placeholder="e.g. Inform kitchen on arrival" />
      <ListEditor label="Table & room preferences" items={tablePreferences} setItems={setTablePreferences} placeholder="e.g. Window table, away from kitchen pass" />
      <ListEditor label="Notes" items={notes} setItems={setNotes} placeholder="General note" />

      <Field label="Tags (comma separated)">
        <TextInput value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="cheese-allergy, tabasco, vip" />
      </Field>

      {dupWarning && (
        <div style={{ background: COLORS.amberSoft, border: `1px solid #E5CB92`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#7A5A18", marginBottom: 4 }}>POSSIBLE EXISTING GUEST</div>
          <div style={{ fontSize: 14, marginBottom: 10 }}>{dupWarning.title} {dupWarning.name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="outline" onClick={() => onOpenExisting(dupWarning.id)}>Open Existing Guest</Button>
            <Button size="sm" variant="primary" onClick={() => { setDupWarning(null); onSave(buildGuest()); }}>Create New Guest Anyway</Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Button variant="outline" style={{ flex: 1 }} onClick={onCancel}>Cancel</Button>
        <Button variant="primary" style={{ flex: 1 }} disabled={!name.trim()} onClick={attemptSave}>Save guest</Button>
      </div>
    </div>
  );
}

/* --------------------------------- Quick Add --------------------------------- */

function QuickAdd({ onCancel, onSave, onDuplicateCheck, onOpenExisting, guests }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [dup, setDup] = useState(null);

  const interpret = () => {
    const r = parseQuickAdd(text);
    setParsed(r);
    if (r.name) {
      const d = onDuplicateCheck(`${r.title} ${r.name}`.trim());
      setDup(d || null);
    }
  };

  const confirmSave = (mergeInto) => {
    if (!parsed) return;
    if (mergeInto) {
      const g = mergeInto;
      const next = {
        ...g,
        allergies: [...g.allergies, ...parsed.allergies
          .filter((a) => !g.allergies.some((ex) => ex.allergen.toLowerCase() === a.toLowerCase()))
          .map((a) => ({ id: uid(), allergen: a, severity: "Allergy", notes: "", verified: false, dateRecorded: todayISO(), recordedBy: "Staff" }))],
        preferences: [...g.preferences, ...parsed.preferences.map((p) => ({ id: uid(), text: p }))],
        drinks: [...g.drinks, ...parsed.drinks.map((p) => ({ id: uid(), text: p }))],
        dietary: [...g.dietary, ...parsed.dietary.map((p) => ({ id: uid(), text: p }))],
        serviceNotes: [...g.serviceNotes, ...parsed.serviceNotes.map((p) => ({ id: uid(), text: p }))],
        notes: [...g.notes, ...parsed.leftover.map((p) => ({ id: uid(), text: p }))],
      };
      onSave(next, false);
      return;
    }
    const newGuest = {
      id: uid(),
      title: parsed.title || "",
      name: parsed.name || "Unnamed guest",
      vip: false,
      lastVisit: todayISO(),
      allergies: parsed.allergies.map((a) => ({ id: uid(), allergen: a, severity: "Allergy", notes: "", verified: false, dateRecorded: todayISO(), recordedBy: "Staff" })),
      dietary: parsed.dietary.map((p) => ({ id: uid(), text: p })),
      preferences: parsed.preferences.map((p) => ({ id: uid(), text: p })),
      dislikes: [],
      drinks: parsed.drinks.map((p) => ({ id: uid(), text: p })),
      serviceNotes: parsed.serviceNotes.map((p) => ({ id: uid(), text: p })),
      notes: parsed.leftover.map((p) => ({ id: uid(), text: p })),
      tags: parsed.allergies.map((a) => `${a.toLowerCase().replace(/\s+/g, "-")}-allergy`),
      updatedAt: new Date().toISOString(), updatedBy: "Staff",
    };
    onSave(newGuest, true);
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Cancel
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Sparkles size={18} color={COLORS.gold} />
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, margin: 0 }}>Quick Add</h2>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 16, lineHeight: 1.5 }}>
        Describe the guest in plain language. Review what GuestNote understood before anything is saved.
      </p>

      {!parsed ? (
        <>
          <TextArea
            autoFocus rows={5} value={text} onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Professor Gavin Henderson has a cheese allergy and likes having Tabasco sauce ready on the table when he arrives."'
            style={{ minHeight: 120, marginBottom: 16 }}
          />
          <Button variant="gold" style={{ width: "100%" }} icon={Sparkles} disabled={!text.trim()} onClick={interpret}>
            Interpret
          </Button>
        </>
      ) : (
        <>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>
              I understood
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, marginBottom: 12 }}>
              Guest: {parsed.title} {parsed.name || <span style={{ color: COLORS.red }}>Not detected - please edit</span>}
            </div>
            {parsed.allergies.map((a, i) => (
              <ParsedLine key={i} icon={AlertTriangle} tone="red" label="Allergy" text={a} />
            ))}
            {parsed.dietary.map((a, i) => <ParsedLine key={i} icon={Leaf} tone="green" label="Dietary" text={a} />)}
            {parsed.preferences.map((a, i) => <ParsedLine key={i} icon={Heart} tone="gold" label="Preference" text={a} />)}
            {parsed.drinks.map((a, i) => <ParsedLine key={i} icon={Wine} tone="gold" label="Drink" text={a} />)}
            {parsed.serviceNotes.map((a, i) => <ParsedLine key={i} icon={Armchair} tone="gold" label="Service instruction" text={a} />)}
            {parsed.leftover.map((a, i) => <ParsedLine key={i} icon={StickyNote} label="Note" text={a} />)}
            {!parsed.allergies.length && !parsed.preferences.length && !parsed.drinks.length && !parsed.serviceNotes.length && !parsed.dietary.length && !parsed.leftover.length && (
              <MutedLine text="No structured details detected beyond the name - you can add details after saving." />
            )}
          </div>

          {dup && (
            <div style={{ background: COLORS.amberSoft, border: `1px solid #E5CB92`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#7A5A18", marginBottom: 4 }}>POSSIBLE EXISTING GUEST</div>
              <div style={{ fontSize: 14, marginBottom: 10 }}>{dup.title} {dup.name}</div>
              {parsed.allergies.length > 0 && dup.allergies.length > 0 && (
                <div style={{ fontSize: 12.5, color: "#7A5A18", marginBottom: 10 }}>
                  This guest already has allergy information on file. It will not be overwritten - new allergies are added alongside it.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button size="sm" variant="outline" onClick={() => onOpenExisting(dup.id)}>Open Existing Guest</Button>
                <Button size="sm" variant="primary" onClick={() => confirmSave(dup)}>Merge Into Existing</Button>
                <Button size="sm" variant="ghost" onClick={() => setDup(null)}>Create New Instead</Button>
              </div>
            </div>
          )}

          {!dup && (
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setParsed(null)}>Edit</Button>
              <Button variant="gold" style={{ flex: 1 }} icon={Check} disabled={!parsed.name} onClick={() => confirmSave(null)}>Confirm & Save</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ParsedLine({ icon: Icon, tone, label, text }) {
  const color = tone === "red" ? COLORS.red : tone === "green" ? COLORS.green : tone === "gold" ? "#7A5C22" : COLORS.muted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", fontSize: 14.5 }}>
      <Icon size={14} color={color} />
      <span style={{ color: COLORS.muted, fontSize: 12.5 }}>{label}:</span>
      <span style={{ fontWeight: 600, color }}>{text}</span>
    </div>
  );
}

/* --------------------------------- Events --------------------------------- */

function EventsScreen({ events, guests, onBack, onOpenEvent, onCreateEvent }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Dinner Service");
  const [date, setDate] = useState(todayISO());

  const create = () => {
    onCreateEvent({ id: uid(), name: name.trim() || "Event", date, guests: [] });
    setCreating(false);
    setName("Dinner Service");
    setDate(todayISO());
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, margin: 0 }}>Events</h2>
        <Button size="sm" variant="gold" icon={Plus} onClick={() => setCreating(true)}>New event</Button>
      </div>

      {creating && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <Field label="Event name"><TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={create}>Create</Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {events.length === 0 && <MutedLine text="No events yet." />}
        {events
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((ev) => {
            const attendees = ev.guests.map((x) => guests.find((g) => g.id === x.guestId)).filter(Boolean);
            const allergyCount = attendees.filter((g) => g.allergies.length).length;
            return (
              <div key={ev.id} onClick={() => onOpenEvent(ev.id)} style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "14px 16px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 500 }}>{ev.name}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 3 }}>
                      {formatDate(ev.date)} - {attendees.length} guests
                      {allergyCount > 0 && <span style={{ color: COLORS.red }}> - {allergyCount} with allergies</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} color={COLORS.muted} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function EventDetail({ event, guests, onBack, onUpdate, onOpenGuest, onBriefing }) {
  const [adding, setAdding] = useState(event.guests.length === 0);
  const [search, setSearch] = useState("");

  const attendees = event.guests.map((x) => ({ ...x, guest: guests.find((g) => g.id === x.guestId) })).filter((x) => x.guest);
  const allergyCount = attendees.filter((x) => x.guest.allergies.length).length;
  const dietaryCount = attendees.filter((x) => x.guest.dietary.length).length;
  const prefCount = attendees.reduce((s, x) => s + x.guest.preferences.length, 0);

  const available = guests.filter((g) => !event.guests.some((x) => x.guestId === g.id) && `${g.title} ${g.name}`.toLowerCase().includes(search.toLowerCase()));

  const addGuestToEvent = (g) => {
    onUpdate({ ...event, guests: [...event.guests, { guestId: g.id, table: event.guests.length + 1 }] });
  };
  const removeGuest = (guestId) => onUpdate({ ...event, guests: event.guests.filter((x) => x.guestId !== guestId) });
  const setTable = (guestId, table) => onUpdate({ ...event, guests: event.guests.map((x) => (x.guestId === guestId ? { ...x, table } : x)) });

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Events
      </button>
      <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px" }}>{event.name}</h2>
      <div style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 16 }}>{formatDate(event.date)} - {attendees.length} guests</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <Pill tone="red"><AlertTriangle size={11} /> {allergyCount} with allergies</Pill>
        <Pill tone="green"><Leaf size={11} /> {dietaryCount} dietary requirements</Pill>
        <Pill tone="gold"><Heart size={11} /> {prefCount} known preferences</Pill>
      </div>

      <Button variant="gold" style={{ width: "100%", marginBottom: 18 }} icon={ShieldAlert} onClick={onBriefing}>
        Open Service Briefing
      </Button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5, letterSpacing: 1.2, textTransform: "uppercase", color: COLORS.muted, margin: 0 }}>Guest list</h3>
      </div>

      <Button
        variant={adding ? "outline" : "gold"} style={{ width: "100%", marginBottom: 14 }}
        icon={UserPlus} onClick={() => setAdding((a) => !a)}
      >
        {adding ? "Close" : "Add Guests"}
      </Button>

      {adding && (
        <div style={{ marginBottom: 12 }}>
          <TextInput placeholder="Search guests to add..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 8 }} autoFocus />
          <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
            {available.slice(0, 20).map((g) => (
              <div key={g.id} onClick={() => addGuestToEvent(g)} style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{g.title} {g.name}</span>
                <Plus size={14} color={COLORS.gold} />
              </div>
            ))}
            {available.length === 0 && <div style={{ padding: 12, fontSize: 13, color: COLORS.muted }}>No matches</div>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {attendees.sort((a, b) => (a.table || 0) - (b.table || 0)).map((x) => (
          <div key={x.guestId} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number" min={1} value={x.table || ""} onChange={(e) => setTable(x.guestId, Number(e.target.value))}
              style={{ width: 44, padding: "6px 4px", textAlign: "center", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
            />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onOpenGuest(x.guestId)}>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{x.guest.title} {x.guest.name}</div>
              {x.guest.allergies.length > 0 && (
                <div style={{ marginTop: 3 }}><AllergyTag allergen={x.guest.allergies[0].allergen} severity={x.guest.allergies[0].severity} verified={x.guest.allergies[0].verified} /></div>
              )}
            </div>
            <X size={16} color={COLORS.muted} style={{ cursor: "pointer" }} onClick={() => removeGuest(x.guestId)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Service Briefing --------------------------------- */

function ServiceBriefing({ event, guests, onBack }) {
  const attendees = event.guests
    .map((x) => ({ ...x, guest: guests.find((g) => g.id === x.guestId) }))
    .filter((x) => x.guest)
    .sort((a, b) => {
      const aAllergy = a.guest.allergies.length ? 0 : 1;
      const bAllergy = b.guest.allergies.length ? 0 : 1;
      if (aAllergy !== bAllergy) return aAllergy - bAllergy;
      return (a.table || 0) - (b.table || 0);
    });

  const exportPDF = () => {
    const html = `
      <html>
        <head>
          <title>${event.name} - ${formatDate(event.date)}</title>
          <style>
            body { font-family: Georgia, serif; margin: 20px; line-height: 1.6; color: #2a2620; }
            h1 { font-size: 28px; margin: 0 0 4px; }
            .meta { color: #8b8172; font-size: 14px; margin-bottom: 20px; border-bottom: 1px solid #e7dfcf; padding-bottom: 12px; }
            .guest { margin-bottom: 20px; padding: 14px; border: 1px solid #e7dfcf; border-radius: 8px; page-break-inside: avoid; }
            .guest.allergy { background: #fbeae6; border-color: #e9baaf; }
            .table { font-size: 11px; color: #8b8172; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
            .name { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
            .allergy { color: #9c3a2e; font-weight: bold; margin-bottom: 6px; }
            .dietary { color: #4c7a5e; margin-bottom: 3px; }
            .note { margin-bottom: 3px; }
            .footer { margin-top: 30px; font-size: 12px; color: #8b8172; border-top: 1px solid #e7dfcf; padding-top: 14px; }
          </style>
        </head>
        <body>
          <h1>${event.name}</h1>
          <div class="meta">${formatDate(event.date)} - ${attendees.length} guests - Safety First</div>
          ${attendees.map((x) => {
            const g = x.guest;
            const hasAllergy = g.allergies.length > 0;
            return `
              <div class="guest ${hasAllergy ? 'allergy' : ''}">
                <div class="table">Table ${x.table || '-'}</div>
                <div class="name">${g.title} ${g.name}${g.vip ? ' (VIP)' : ''}</div>
                ${g.allergies.map((a) => `<div class="allergy">ALLERGY: ${a.allergen.toUpperCase()} (${a.severity})</div>`).join('')}
                ${g.dietary.map((d) => `<div class="dietary">DIETARY: ${d.text}</div>`).join('')}
                ${g.serviceNotes.map((s) => `<div class="note">NOTE: ${s.text}</div>`).join('')}
                ${g.preferences.map((p) => `<div class="note">PREFERENCE: ${p.text}</div>`).join('')}
                ${g.drinks.map((d) => `<div class="note">DRINK: ${d.text}</div>`).join('')}
              </div>
            `;
          }).join('')}
          <div class="footer">
            This briefing assists service staff. It does not replace standard kitchen allergen verification and safety procedures.
            Always confirm severe allergies directly with the guest and kitchen.
          </div>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    if (w) { setTimeout(() => w.print(), 500); } else { alert('Could not open print dialog'); }
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0", fontSize: 13.5 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <Button size="sm" variant="outline" icon={Download} onClick={exportPDF}>Export PDF</Button>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1.4, color: COLORS.gold, textTransform: "uppercase" }}>Service Briefing</div>
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 24, margin: "4px 0" }}>{event.name}</h2>
        <div style={{ color: COLORS.muted, fontSize: 13.5 }}>{formatDate(event.date)} - {attendees.length} guests - safety first</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {attendees.map((x) => {
          const g = x.guest;
          const hasAllergy = g.allergies.length > 0;
          return (
            <div key={x.guestId} style={{
              background: hasAllergy ? COLORS.redSoft : COLORS.surface,
              border: `1.5px solid ${hasAllergy ? COLORS.redBorder : COLORS.border}`,
              borderRadius: 16, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1, color: COLORS.muted, textTransform: "uppercase", marginBottom: 4 }}>
                Table {x.table || "-"}
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 17.5, fontWeight: 500, marginBottom: 6 }}>{g.title} {g.name}{g.vip && <Star size={12} color={COLORS.gold} fill={COLORS.gold} style={{ marginLeft: 6, marginBottom: 1 }} />}</div>
              {g.allergies.map((a) => (
                <div key={a.id} style={{ marginBottom: 5 }}><AllergyTag allergen={a.allergen} severity={a.severity} verified={a.verified} /></div>
              ))}
              {g.dietary.map((d) => (
                <div key={d.id} style={{ fontSize: 13.5, color: COLORS.green, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}><Leaf size={13} /> {d.text}</div>
              ))}
              {g.serviceNotes.map((s) => (
                <div key={s.id} style={{ fontSize: 13.5, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}><ChevronRight size={13} color={COLORS.muted} /> {s.text}</div>
              ))}
              {g.tablePreferences.map((s) => (
                <div key={s.id} style={{ fontSize: 13.5, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}><Armchair size={13} color={COLORS.muted} /> {s.text}</div>
              ))}
              {g.preferences.map((p) => (
                <div key={p.id} style={{ fontSize: 13.5, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}><Heart size={13} color={COLORS.red} /> {p.text}</div>
              ))}
              {g.drinks.map((d) => (
                <div key={d.id} style={{ fontSize: 13.5, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}><Wine size={13} color={COLORS.muted} /> {d.text}</div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: COLORS.muted, lineHeight: 1.6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
        This briefing assists service staff. It does not replace standard kitchen allergen verification and safety procedures - always confirm severe allergies directly with the guest and kitchen.
      </div>
    </div>
  );
}

/* --------------------------------- Audit log screen --------------------------------- */

function AuditLogScreen({ auditLog, onBack }) {
  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Back
      </button>
      <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, marginBottom: 4 }}>Audit history</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 18 }}>A record of changes across all guests, most recent first.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {auditLog.length === 0 && <MutedLine text="No activity yet." />}
        {auditLog
          .slice()
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map((entry) => (
            <div key={entry.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{entry.guestName}</span>
                <span style={{ fontSize: 11.5, color: COLORS.muted }}>{timeAgo(entry.timestamp)}</span>
              </div>
              <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 600, marginTop: 2 }}>{entry.action}</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{entry.detail}</div>
              <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 6 }}>{new Date(entry.timestamp).toLocaleString("en-GB")} - {entry.staff}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

/* --------------------------------- Allergy Heatmap --------------------------------- */

function AllergyHeatmapScreen({ guests, onBack }) {
  const allergyCount = {};
  guests.forEach((g) => {
    g.allergies.forEach((a) => {
      const allergen = a.allergen.toLowerCase();
      allergyCount[allergen] = (allergyCount[allergen] || 0) + 1;
    });
  });

  const sorted = Object.entries(allergyCount)
    .map(([allergen, count]) => ({ allergen: allergen.charAt(0).toUpperCase() + allergen.slice(1), count }))
    .sort((a, b) => b.count - a.count);

  const maxCount = sorted.length > 0 ? sorted[0].count : 0;

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <AlertTriangle size={18} color={COLORS.red} />
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, margin: 0 }}>Allergy Heatmap</h2>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 18 }}>Most common allergies across your guest base.</p>

      {sorted.length === 0 ? (
        <MutedLine text="No allergies recorded." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sorted.map((item) => {
            const percentage = (item.count / maxCount) * 100;
            return (
              <div key={item.allergen}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.allergen}</span>
                  <span style={{ fontSize: 13, color: COLORS.muted }}>{item.count} guest{item.count !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ background: COLORS.border, borderRadius: 8, height: 16, overflow: "hidden" }}>
                  <div style={{ background: COLORS.red, height: "100%", width: `${percentage}%`, transition: "width .3s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 30, fontSize: 12, color: COLORS.muted, lineHeight: 1.6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
        This heatmap shows the most common recorded allergies. Use this data to brief your kitchen team on seasonal patterns or to identify common allergens to be especially cautious about.
      </div>
    </div>
  );
}

/* --------------------------------- CSV Import --------------------------------- */

function CSVImportScreen({ guests, onImport, onBack }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const parseCSV = () => {
    setError(null);
    if (!csvText.trim()) { setError("Please paste or upload CSV data."); return; }
    
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) { setError("CSV must have at least a header row and one data row."); return; }

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = headers.indexOf("name") >= 0 ? headers.indexOf("name") : 0;
    const titleIdx = headers.indexOf("title");
    const allergyIdx = headers.indexOf("allergy");
    const dietaryIdx = headers.indexOf("dietary");
    const preferencesIdx = headers.indexOf("preference") || headers.indexOf("preferences");

    const newGuests = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",").map((c) => c.trim()).filter((c) => c);
      if (cells.length === 0) continue;
      
      const name = cells[nameIdx] || "Unnamed";
      if (guests.some((g) => g.name.toLowerCase() === name.toLowerCase())) continue;

      // Process dietary items and convert intolerances
      const dietaryItems = dietaryIdx >= 0 && cells[dietaryIdx] ? cells[dietaryIdx].split(";").map((d) => d.trim()).filter(Boolean) : [];
      const intolerances = [];
      const pureDietary = [];
      
      for (const item of dietaryItems) {
        const intolerance = convertDietaryToIntolerance(item);
        if (intolerance) {
          intolerances.push(intolerance);
        } else {
          pureDietary.push(item);
        }
      }

      newGuests.push(makeGuest({
        name,
        title: titleIdx >= 0 ? cells[titleIdx] : "",
        allergies: [
          ...(allergyIdx >= 0 && cells[allergyIdx] ? [{ allergen: cells[allergyIdx], severity: "Allergy", notes: "" }] : []),
          ...intolerances
        ],
        dietary: pureDietary,
        preferences: preferencesIdx >= 0 && cells[preferencesIdx] ? cells[preferencesIdx].split(";").map((p) => p.trim()).filter(Boolean) : [],
      }));
    }

    if (newGuests.length === 0) { setError("No new valid guests found (may have duplicates with existing records)."); return; }
    setPreview(newGuests);
  };

  return (
    <div style={{ padding: "14px 20px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px", fontSize: 13.5 }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Upload size={18} color={COLORS.gold} />
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 22, margin: 0 }}>Import guests from CSV</h2>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 18 }}>Paste CSV with columns: name, title, allergy, dietary, preference. Use semicolons to separate multiple values.</p>

      {!preview ? (
        <>
          <Field label="CSV data">
            <TextArea rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="name,title,allergy,dietary&#10;John Doe,Mr,Cheese,Vegetarian" />
          </Field>
          {error && <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> {error}</div>}
          <Button variant="gold" style={{ width: "100%" }} onClick={parseCSV}>Parse CSV</Button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 8 }}>Ready to import {preview.length} guests:</div>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 10 }}>
              {preview.map((g) => (
                <div key={g.id} style={{ fontSize: 12.5, padding: "6px 8px", background: COLORS.surfaceAlt, borderRadius: 8 }}>
                  <strong>{g.title} {g.name}</strong>
                  {g.allergies.length > 0 && <div style={{ color: COLORS.red, display: "flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} /> {g.allergies.map((a) => a.allergen).join(", ")}</div>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => { setPreview(null); setCsvText(""); }}>Edit</Button>
            <Button variant="gold" style={{ flex: 1 }} onClick={() => { onImport(preview); }} icon={Download}>
              Import {preview.length}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ Mount ------------------------------ */
/* This file runs standalone (outside the Claude artifact preview), so it
   needs to explicitly render itself into the page's #root element. */
ReactDOM.createRoot(document.getElementById("root")).render(<GuestNoteApp />);
