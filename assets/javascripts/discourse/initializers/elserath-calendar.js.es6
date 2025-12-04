import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.0", (api) => {
  // ================================
  // 0. CONSTANTES DE BASE
  // ================================

  // Point d’ancrage IRL → Elserath
  // Ici : 1er janvier 2025 = 1 Elyonar 1099 ESR
  const BASE_GREGORIAN_YEAR = 2025;
  const BASE_ELSERATH_ERA = 1099;

  const DAYS_IN_MONTH = 28;
  const MONTHS_IN_CYCLE = 13;
  const DAYS_IN_CYCLE = DAYS_IN_MONTH * MONTHS_IN_CYCLE; // 364

  // Noms des jours de la semaine
  const WEEKDAYS = [
    "Jour d’Elyon",   // 1
    "Jour de Nareth", // 2
    "Jour de Kaelgor",// 3
    "Jour de Thal",   // 4
    "Jour d’Oris",    // 5
    "Jour de Vael",   // 6
    "Jour d’Elyndra"  // 7
  ];

  // Noms des mois (chants) dans l’ordre
  const MONTHS = [
    "Elyonar", // 1
    "Narethis",
    "Thalren",
    "Kaelrun",
    "Eldvar",
    "Aelion",
    "Vaelis",
    "Lyndra",
    "Naëlis",
    "Orannis",
    "Cendras",
    "Eldraen",
    "Ashar"    // 13
  ];

  // ================================
  // 1. OUTILS GÉNÉRAUX
  // ================================

  function isLeapYear(year) {
    // année bissextile grégorienne
    return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  }

  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000); // 0..364/365
  }

  function getEraFromDate(date) {
    const gregYear = date.getFullYear();
    const diff = gregYear - BASE_GREGORIAN_YEAR;
    return BASE_ELSERATH_ERA + diff;
  }

  // ================================
  // 2. CONVERSION VERS DATE D’ELSERATH
  // ================================

  /**
   * Retourne un objet :
   * {
   *   era,                // 1099, 1100, etc.
   *   monthIndex,         // 0..12
   *   monthName,          // "Elyonar", etc.
   *   dayInMonth,         // 1..28
   *   weekdayName,        // "Jour d’Elyon", etc.
   *   isHorsChant,        // true/false
   *   horsChantName,      // "Jour du Souffle", "Jour des Étoiles"
   *   seasonName,         // "Souffle d’Éveil", etc.
   *   festivals,          // tableau de fêtes pour ce jour
   *   moons: { vaelune, orishar } // phases textuelles
   * }
   */
  function computeElserathDate(now = new Date()) {
    const era = getEraFromDate(now);
    const gregYear = now.getFullYear();
    const doy = dayOfYear(now); // 0-based
    const leap = isLeapYear(gregYear);

    let isHorsChant = false;
    let horsChantName = null;

    let monthIndex = null;
    let dayInMonth = null;
    let weekdayName = null;

    // --- Répartition : 364 jours de chant + 1 (ou 2) jours hors-chant ---
    if (doy < DAYS_IN_CYCLE) {
      // Dans les 13 chants
      monthIndex = Math.floor(doy / DAYS_IN_MONTH); // 0..12
      dayInMonth = (doy % DAYS_IN_MONTH) + 1;       // 1..28

      const absoluteDayIndex = doy; // 0..363
      const weekdayIndex = absoluteDayIndex % 7;
      weekdayName = WEEKDAYS[weekdayIndex];
    } else {
      // Jours hors-chant, après 28 Ashar
      isHorsChant = true;
      if (doy === DAYS_IN_CYCLE) {
        horsChantName = "Jour du Souffle";
      } else if (doy === DAYS_IN_CYCLE + 1 && leap) {
        // Jour des Étoiles seulement les années bissextiles
        horsChantName = "Jour des Étoiles";
      } else {
        horsChantName = "Jour hors-chant";
      }
    }

    const monthName = monthIndex != null ? MONTHS[monthIndex] : null;

    const seasonName = !isHorsChant
      ? getSeason(monthName, dayInMonth)
      : "Hors-chant";

    const festivals = !isHorsChant
      ? getFestivals(era, monthName, dayInMonth)
      : getHorsChantFestivals(era, horsChantName);

    const moons = getMoonPhases(era, monthIndex, dayInMonth, isHorsChant, doy);

    return {
      era,
      monthIndex,
      monthName,
      dayInMonth,
      weekdayName,
      isHorsChant,
      horsChantName,
      seasonName,
      festivals,
      moons
    };
  }

  // ================================
  // 3. SAISONS
  // ================================

  function getSeason(monthName, dayInMonth) {
    switch (monthName) {
      case "Elyonar":
      case "Narethis":
      case "Thalren":
        return "Souffle d’Éveil"; // printemps

      case "Kaelrun":
      case "Eldvar":
      case "Aelion":
        return "Chant du Feu"; // été

      case "Vaelis":
      case "Lyndra":
      case "Naëlis":
      case "Orannis":
        return "Marée des Ombres"; // automne

      case "Cendras":
      case "Eldraen":
      case "Ashar":
        return "Veille du Silence"; // hiver

      default:
        return "Saison inconnue";
    }
  }

  // ================================
  // 4. FÊTES ET CÉLÉBRATIONS
  // ================================

  const FIXED_FESTIVALS = [
    // Tous peuples
    { name: "Veille du Premier Souffle", month: "Ashar", day: 28 },

    // Hommes
    { name: "Jour des Cendres Pures", month: "Ashar", day: 3 },
    { name: "Banquet des Verres", month: "Eldvar", day: 14 },
    { name: "Nuit des Héritiers", month: "Orannis", day: 27 },
    { name: "Serment du Verre Brisé", month: "Eldraen", day: 14 },

    // Nains
    { name: "Jour du Marteau Levé", month: "Elyonar", day: 1 },
    { name: "Souffle du Feu Sourd", month: "Eldraen", day: 1 },
    { name: "Chant du Marteau Silencieux", month: "Eldraen", day: 21 },

    // Wyveriens
    { name: "Danse des Premiers Souffles", month: "Elyonar", day: 5 },
    { name: "Veillée des Feuilles Murmurantes", month: "Aelion", day: 15 },
    { name: "Nuit des Cinq Vents", month: "Thalren", day: 21 },
    { name: "Aube des Racines", month: "Lyndra", day: 10 },

    // Skayans
    { name: "Réveil du Tonnerre", month: "Eldvar", day: 5 },
    { name: "Festin des Nuées", month: "Aelion", day: 7 },
    { name: "Lamentation du Ciel Brisé", month: "Eldvar", day: 14 },
    { name: "Envol des Forges", month: "Aelion", day: 28 },

    // Lireathi
    { name: "Danse des Courants", month: "Narethis", day: 1 },
    { name: "Chant des Mille Mémoires", month: "Eldvar", day: 14 },
    { name: "Veillée des Noms Perdus", month: "Vaelis", day: 7 },
    { name: "Fête du Miroir Calme", month: "Cendras", day: 7 },

    // Aelran
    { name: "Lune des Murmures", month: "Elyonar", day: 7 },
    { name: "Passage des Ombres", month: "Orannis", day: 1 },
    { name: "Veillée du Dernier Écho", month: "Eldraen", day: 21 },

    // Orcs
    { name: "Serment du Feu Fraternel", month: "Ashar", day: 14 }
  ];

  function getFestivals(era, monthName, dayInMonth) {
    const list = [];

    // Fêtes à date fixe
    FIXED_FESTIVALS.forEach((f) => {
      if (f.month === monthName && f.day === dayInMonth) {
        list.push(f.name);
      }
    });

    // Fêtes périodiques (Jour des Trois Soleils, Veillée du Roc-Silence)
    if (monthName === "Cendras" && dayInMonth >= 10 && dayInMonth <= 12) {
      if (era % 5 === 0) {
        list.push("Jour des Trois Soleils");
      }
    }

    if (monthName === "Lyndra" && dayInMonth === 14) {
      if (era % 10 === 0) {
        list.push("Veillée du Roc-Silence");
      }
    }

    // Fêtes “de repère” autour du Silence des Étoiles, etc.
    if (monthName === "Ashar" && dayInMonth === 14) {
      list.push("Silence des Étoiles (repère)");
    }

    return list;
  }

  function getHorsChantFestivals(era, horsChantName) {
    const list = [];
    if (horsChantName === "Jour du Souffle") {
      list.push("Jour du Souffle — recommencement du monde");
    }
    if (horsChantName === "Jour des Étoiles") {
      list.push("Jour des Étoiles — ajouté tous les quatre cycles");
    }
    return list;
  }

  // ================================
  // 5. PHASES DES LUNES
  // ================================

  /**
   * Vaelune : cycle régulier de 28 jours.
   * - Jour 1 : Nouvelle Vaelune
   * - Jour 7 : Premier quartier
   * - Jour 14 : Pleine Vaelune
   * - Jour 21 : Dernier quartier
   *
   * Orishar : cycle rapide “chaotique” → on l’approche par une période de 9 jours,
   * basée sur le jour absolu dans le cycle.
   */
  function getMoonPhases(
    era,
    monthIndex,
    dayInMonth,
    isHorsChant,
    absoluteDayIndex
  ) {
    if (isHorsChant || monthIndex == null || dayInMonth == null) {
      return {
        vaelune: "Vaelune hors-chant",
        orishar: "Orishar hors-chant"
      };
    }

    // --- Vaelune : 28 jours par chant ---
    const d = dayInMonth; // 1..28
    let vaelune;

    if (d === 14) {
      vaelune = "Vaelune : pleine lune";
    } else if (d === 1 || d === 28) {
      vaelune = "Vaelune : nouvelle lune";
    } else if (d === 7) {
      vaelune = "Vaelune : premier quartier";
    } else if (d === 21) {
      vaelune = "Vaelune : dernier quartier";
    } else if (d < 14) {
      vaelune = "Vaelune montante";
    } else {
      vaelune = "Vaelune décroissante";
    }

    // --- Orishar : cycle rapide, 9 jours ---
    const orisharIndex = absoluteDayIndex % 9;
    let orishar;

    if (orisharIndex === 0) {
      orishar = "Orishar : nouvelle";
    } else if (orisharIndex === 4) {
      orishar = "Orishar : quasi pleine";
    } else if (orisharIndex === 8) {
      orishar = "Orishar : pleine";
    } else if (orisharIndex < 4) {
      orishar = "Orishar montante";
    } else {
      orishar = "Orishar capricieuse";
    }

    return { vaelune, orishar };
  }

  // ================================
  // 6. FORMATAGE TEXTE POUR LE HEADER
  // ================================

  // Ancienne version détaillée, utilisée maintenant pour le tooltip complet
  function formatHeaderFullLine(dateData) {
    const {
      era,
      monthName,
      dayInMonth,
      weekdayName,
      isHorsChant,
      horsChantName,
      seasonName,
      festivals,
      moons
    } = dateData;

    if (isHorsChant) {
      let line = `${horsChantName} — Cycle ESR ${era}`;
      if (festivals.length) {
        line += ` · ${festivals.join(" · ")}`;
      }
      return line;
    }

    let line = `${weekdayName} · ${dayInMonth} ${monthName} · Cycle ESR ${era}`;

    // Ajouter la saison
    if (seasonName) {
      line += ` · ${seasonName}`;
    }

    // Ajouter une fête s’il y en a (on met seulement la première pour le header)
    if (festivals.length) {
      line += ` · ${festivals[0]}`;
    }

    // Ajouter un petit résumé des lunes
    if (moons && moons.vaelune && moons.orishar) {
      line += ` · ${moons.vaelune} · ${moons.orishar}`;
    }

    return line;
  }

  // Nouvelle version compacte : main + sub + title
  function formatHeaderLabel(dateData) {
    const {
      era,
      monthName,
      dayInMonth,
      weekdayName,
      isHorsChant,
      horsChantName,
      seasonName,
      festivals,
      moons
    } = dateData;

    const title = formatHeaderFullLine(dateData);

    // Hors-chant : on reste simple
    if (isHorsChant) {
      const main = `${horsChantName} · ESR ${era}`;
      const sub = festivals.length ? festivals.join(" · ") : "";
      return { main, sub, title };
    }

    // Ligne principale compacte
    const main = `${dayInMonth} ${monthName} ${era} · ${weekdayName}`;

    // Sous-ligne : saison + 1ère fête + résumé des lunes
    const subParts = [];

    if (seasonName) {
      subParts.push(seasonName);
    }

    if (festivals.length) {
      subParts.push(festivals[0]);
    }

    if (moons) {
      if (moons.vaelune) {
        // on enlève le préfixe "Vaelune : "
        const v = moons.vaelune.replace("Vaelune : ", "Vaelune ");
        subParts.push(v);
      }
      if (moons.orishar) {
        const o = moons.orishar.replace("Orishar : ", "Orishar ");
        subParts.push(o);
      }
    }

    const sub = subParts.join(" · ");

    return { main, sub, title };
  }

  // ================================
  // 7. INJECTION DANS LE HEADER
  // ================================

  function injectCalendar() {
    const headerIcons = document.querySelector(
      ".d-header .panel ul.icons"
    );

    if (!headerIcons) {
      return;
    }

    if (headerIcons.querySelector(".elserath-calendar-icon")) {
      return; // déjà présent
    }

    const li = document.createElement("li");
    li.className = "elserath-calendar-icon";

    const wrapper = document.createElement("span");
    wrapper.className = "elserath-calendar-label";

    const dateData = computeElserathDate(new Date());
    const { main, sub, title } = formatHeaderLabel(dateData);

    // Tooltip avec la version longue
    wrapper.setAttribute("title", title);

    const mainSpan = document.createElement("span");
    mainSpan.className = "elserath-calendar-main";
    mainSpan.textContent = main;
    wrapper.appendChild(mainSpan);

    if (sub) {
      const subSpan = document.createElement("span");
      subSpan.className = "elserath-calendar-sub";
      subSpan.textContent = ` — ${sub}`;
      wrapper.appendChild(subSpan);
    }

    li.appendChild(wrapper);
    headerIcons.appendChild(li);
  }

  api.onPageChange(() => {
    injectCalendar();
  });

  // Premier chargement
  injectCalendar();
});
```0
