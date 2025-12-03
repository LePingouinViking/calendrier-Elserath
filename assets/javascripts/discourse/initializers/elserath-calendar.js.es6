import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.8", (api) => {

  // ==============================
  // CONFIG CALENDRIER D’ELSERATH
  // ==============================

  // ⚠️ À ADAPTER si besoin pour coller exactement à ton HTML
  const MONTHS = [
    "Ashar",     // fin d'année / hiver profond
    "Elyonar",   // début du printemps
    "Narethis",
    "Thalren",
    "Aelion",    // été
    "Lysséa",
    "Lyndra",    // automne
    "Vaelis",
    "Orannis",
    "Eldraen",   // hiver
    "Cendras",
    "Eldvar",
    "Sous-Chant" // 13e chant "bis", ajustable
  ];

  const DAYS_PER_MONTH = 28;

  // Nombre de jours hors-chant par cycle (tu peux le changer)
  const DAYS_HORS_CHANT = 3;

  const DAYS_PER_YEAR = MONTHS.length * DAYS_PER_MONTH + DAYS_HORS_CHANT;

  // Ère de départ
  const START_ERA = 1099;

  // Point d’ancrage IRL -> Elserath
  // Ici : 1er janvier 2025 = 1 Ashar, Ère 1099
  const EPOCH_REAL = Date.UTC(2025, 0, 1); // AAAA,MM-1,JJ

  // ==============================
  // JOURS (Elyon / Oris / Silencieux)
  // ==============================

  const DAY_TYPES = ["Jour d’Elyon", "Jour d’Oris", "Jour Silencieux"];

  function getDayType(dayOfYear) {
    // On fait tourner Elyon / Oris / Silencieux sur tout le cycle
    const idx = ((dayOfYear % 3) + 3) % 3;
    return DAY_TYPES[idx];
  }

  // ==============================
  // LUNES : VAELUNE & ORISHAR
  // ==============================

  // Période en jours elserathiens
  const VAELUNE_PERIOD = 32; // lente, régulière
  const ORISHAR_PERIOD = 9;  // rapide, “chaotique” mais périodique

  const MOON_PHASES = [
    "Nouvelle",
    "Croissante (fin croissant)",
    "Premier quartier",
    "Croissante (gibbeuse)",
    "Pleine",
    "Décroissante (gibbeuse)",
    "Dernier quartier",
    "Décroissante (fin croissant)"
  ];

  function phaseFromIndex(index, period) {
    const step = period / MOON_PHASES.length;
    const phaseIdx = Math.floor(index / step) % MOON_PHASES.length;
    return MOON_PHASES[phaseIdx];
  }

  function getMoons(totalDays) {
    // totalDays = nombre total de jours elserathiens écoulés depuis l’ancrage
    const vaeluneIndex = ((totalDays % VAELUNE_PERIOD) + VAELUNE_PERIOD) % VAELUNE_PERIOD;
    const orisharIndex = ((totalDays % ORISHAR_PERIOD) + ORISHAR_PERIOD) % ORISHAR_PERIOD;

    return {
      vaelune: {
        phase: phaseFromIndex(vaeluneIndex, VAELUNE_PERIOD),
        index: vaeluneIndex
      },
      orishar: {
        phase: phaseFromIndex(orisharIndex, ORISHAR_PERIOD),
        index: orisharIndex
      }
    };
  }

  // ==============================
  // FÊTES (version codée)
  // ==============================

  // Fêtes à date fixe (chaque cycle)
  const FIXED_FESTIVALS = [
    // Nains
    { id: "souffle_feu_sourd",   name: "Le Souffle du Feu Sourd",   month: "Eldraen", day: 1 },
    { id: "jour_marteau_leve",   name: "Le Jour du Marteau Levé",   month: "Elyonar", day: 1 },

    // Wyveriens
    { id: "danse_premiers_souffles", name: "La Danse des Premiers Souffles", month: "Elyonar", day: 5 },
    { id: "veillee_feuilles",        name: "La Veillée des Feuilles Murmurantes", month: "Aelion", day: 15 },
    { id: "nuit_cinq_vents",         name: "La Nuit des Cinq Vents", month: "Thalren", day: 21 },
    { id: "aube_racines",            name: "L’Aube des Racines", month: "Lyndra", day: 10 },

    // Skayans
    { id: "reveil_tonnerre",   name: "Le Réveil du Tonnerre", month: "Eldvar", day: 5 },
    { id: "festin_nuees",      name: "Le Festin des Nuées",  month: "Aelion", day: 7 },
    { id: "lamentation_ciel",  name: "La Lamentation du Ciel Brisé", month: "Eldvar", day: 14 },
    { id: "envol_forges",      name: "L’Envol des Forges", month: "Aelion", day: 28 },

    // Hommes
    { id: "veille_premier_souffle", name: "La Veille du Premier Souffle", month: "Ashar", day: 28 },
    { id: "jour_cendres_pures",     name: "Le Jour des Cendres Pures", month: "Ashar", day: 3 },
    { id: "banquet_verres",         name: "Le Banquet des Verres", month: "Eldvar", day: 14 },
    { id: "nuit_heritiers",         name: "La Nuit des Héritiers", month: "Orannis", day: 27 },
    { id: "serment_verre_brise",    name: "Le Serment du Verre Brisé", month: "Eldraen", day: 14 },

    // Lireathi
    { id: "danse_courants",      name: "La Danse des Courants", month: "Narethis", day: 1 },
    { id: "chant_mille_memoires", name: "Le Chant des Mille Mémoires", month: "Eldvar", day: 14 },
    { id: "veillee_noms_perdus", name: "La Veillée des Noms Perdus", month: "Vaelis", day: 7 },
    { id: "fete_miroir_calme",   name: "La Fête du Miroir Calme", month: "Cendras", day: 7 },

    // Aelran
    { id: "lune_murmures",       name: "La Lune des Murmures", month: "Elyonar", day: 7 },
    { id: "lamentation_eldvar",  name: "La Lamentation d’Eld’var", month: "Eldvar", day: 14 },
    { id: "passage_ombres",      name: "Le Passage des Ombres", month: "Orannis", day: 1 },
    { id: "veillee_dernier_echo", name: "La Veillée du Dernier Écho", month: "Eldraen", day: 21 },

    // Orcs
    { id: "serment_feu_fraternel", name: "Le Serment du Feu Fraternel", month: "Ashar", day: 14 },

    // Communes
    { id: "veille_premier_souffle_commune", name: "La Veille du Premier Souffle (Commune)", month: "Ashar", day: 28 },
    { id: "silence_etoiles",                name: "Le Silence des Étoiles", month: "Ashar", day: 14 }
  ];

  // Fêtes à périodicité (tous les X cycles)
  const PERIODIC_FESTIVALS = [
    {
      id: "jour_trois_soleils",
      name: "Le Jour des Trois Soleils",
      month: "Cendras",
      days: [10, 11, 12],
      everyCycles: 5
    },
    {
      id: "veillee_roc_silence",
      name: "La Veillée du Roc-Silence",
      month: "Lyndra",
      days: [14],
      everyCycles: 10
    }
  ];

  // Sang de la Terre : une date pseudo-aléatoire après l’hiver
  function getSangDeLaTerreDayForYear(yearIndex /* 0 = premier cycle depuis l’ancrage */) {
    // Fenêtre Elyonar/Narethis/Thalren = 3 mois
    const startMonthIndex = MONTHS.indexOf("Elyonar");
    const windowDays = 3 * DAYS_PER_MONTH;

    // Petit pseudo-aléatoire déterministe
    const seed = (yearIndex * 1103515245 + 12345) & 0x7fffffff;
    const offset = seed % windowDays;

    const dayOfYear = DAYS_HORS_CHANT + startMonthIndex * DAYS_PER_MONTH + offset;

    return dayOfYear; // index jour dans l’année
  }

  // ==============================
  // CALCUL CONTEXTE ELERATH
  // ==============================

  function getElserathContext() {
    const now = new Date();
    const todayUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    let diffDays = Math.floor((todayUTC - EPOCH_REAL) / 86400000);
    if (diffDays < 0) diffDays = 0;

    const yearOffset = Math.floor(diffDays / DAYS_PER_YEAR);
    const year = START_ERA + yearOffset;
    let dayOfYear = diffDays % DAYS_PER_YEAR;

    const totalDaysSinceEpochElserath = diffDays; // pour les lunes

    // Jours hors-chant
    let monthName = null;
    let dayInMonth = null;
    let isHorsChant = false;

    if (dayOfYear < DAYS_HORS_CHANT) {
      isHorsChant = true;
    } else {
      let remaining = dayOfYear - DAYS_HORS_CHANT;
      const monthIndex = Math.floor(remaining / DAYS_PER_MONTH);
      dayInMonth = (remaining % DAYS_PER_MONTH) + 1;
      monthName = MONTHS[monthIndex] || "Chant inconnu";
    }

    const dayType = getDayType(dayOfYear);
    const moons = getMoons(totalDaysSinceEpochElserath);

    // Fêtes du jour
    const festivalsToday = [];

    // 1) Fêtes à date fixe
    if (!isHorsChant && monthName && dayInMonth) {
      FIXED_FESTIVALS.forEach((f) => {
        if (f.month === monthName && f.day === dayInMonth) {
          festivalsToday.push(f.name);
        }
      });
    }

    // 2) Fêtes périodiques (Jour des Trois Soleils, Veillée du Roc-Silence, etc.)
    if (!isHorsChant && monthName && dayInMonth) {
      PERIODIC_FESTIVALS.forEach((f) => {
        const cycleIndex = year - START_ERA; // 0,1,2...
        if (cycleIndex >= 0 && cycleIndex % f.everyCycles === 0) {
          if (f.month === monthName && f.days.includes(dayInMonth)) {
            festivalsToday.push(f.name);
          }
        }
      });
    }

    // 3) Sang de la Terre (pseudo-aléatoire mais déterministe)
    const cycleIndex = year - START_ERA;
    if (cycleIndex >= 0) {
      const sangDay = getSangDeLaTerreDayForYear(cycleIndex);
      if (dayOfYear === sangDay) {
        festivalsToday.push("Le Sang de la Terre");
      }
    }

    // Les fêtes sans date fixe (Nom Gravé, Marée d’Argent, Fil des Astres)
    // restent volontairement non intégrées ici.

    return {
      year,
      dayOfYear,
      isHorsChant,
      monthName,
      dayInMonth,
      dayType,
      moons,
      festivalsToday
    };
  }

  // ==============================
  // AFFICHAGE DANS LE HEADER
  // ==============================

  api.decorateWidget("header-icons:before", (helper) => {
    const ctx = getElserathContext();

    let mainText;
    if (ctx.isHorsChant) {
      mainText = `${ctx.dayType} — Jour hors-chant, Ère ${ctx.year}`;
    } else {
      mainText = `${ctx.dayType} — ${ctx.dayInMonth} ${ctx.monthName}, Ère ${ctx.year}`;
    }

    const moonText = `Vaelune : ${ctx.moons.vaelune.phase} • Orishar : ${ctx.moons.orishar.phase}`;

    let festivalsText = null;
    if (ctx.festivalsToday.length > 0) {
      festivalsText = `Fête${ctx.festivalsToday.length > 1 ? "s" : ""} : ${ctx.festivalsToday.join(
        " ; "
      )}`;
    }

    const children = [
      helper.h("div.elserath-date-main", mainText),
      helper.h("div.elserath-date-moons", moonText)
    ];

    if (festivalsText) {
      children.push(helper.h("div.elserath-date-festivals", festivalsText));
    }

    return helper.h("div.elserath-date", { className: "elserath-date-widget" }, children);
  });

});
