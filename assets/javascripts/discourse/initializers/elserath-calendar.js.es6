import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.0", (api) => {

  const BASE_GREGORIAN_YEAR = 2025;
  const BASE_ELSERATH_ERA = 1099;

  const DAYS_IN_MONTH = 28;
  const MONTHS_IN_CYCLE = 13;
  const DAYS_IN_CYCLE = DAYS_IN_MONTH * MONTHS_IN_CYCLE;

  const WEEKDAYS = [
    "Jour d’Elyon",
    "Jour de Nareth",
    "Jour de Kaelgor",
    "Jour de Thal",
    "Jour d’Oris",
    "Jour de Vael",
    "Jour d’Elyndra"
  ];

  const MONTHS = [
    "Elyonar",
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
    "Ashar"
  ];

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    return Math.floor((date - start) / 86400000);
  }

  function getEraFromDate(date) {
    return BASE_ELSERATH_ERA + (date.getFullYear() - BASE_GREGORIAN_YEAR);
  }

  function getSeason(monthName) {
    if (monthName === "Elyonar" || monthName === "Narethis" || monthName === "Thalren") {
      return "Souffle d’Éveil";
    }
    if (monthName === "Kaelrun" || monthName === "Eldvar" || monthName === "Aelion") {
      return "Chant du Feu";
    }
    if (monthName === "Vaelis" || monthName === "Lyndra" || monthName === "Naëlis" || monthName === "Orannis") {
      return "Marée des Ombres";
    }
    if (monthName === "Cendras" || monthName === "Eldraen" || monthName === "Ashar") {
      return "Veille du Silence";
    }
    return "Hors-chant";
  }

  const FIXED_FESTIVALS = [
    { name: "Veille du Premier Souffle", month: "Ashar", day: 28 },
    { name: "Jour des Cendres Pures", month: "Ashar", day: 3 },
    { name: "Chant des Mille Mémoires", month: "Eldvar", day: 14 },
    { name: "Réveil du Tonnerre", month: "Eldvar", day: 5 }
  ];

  function getFestivals(era, monthName, day) {
    const f = [];
    for (let i = 0; i < FIXED_FESTIVALS.length; i++) {
      const ff = FIXED_FESTIVALS[i];
      if (ff.month === monthName && ff.day === day) {
        f.push(ff.name);
      }
    }

    if (monthName === "Cendras" && day >= 10 && day <= 12 && era % 5 === 0) {
      f.push("Jour des Trois Soleils");
    }
    if (monthName === "Lyndra" && day === 14 && era % 10 === 0) {
      f.push("Veillée du Roc-Silence");
    }

    return f;
  }

  function getMoonPhases(absoluteDayIndex, dayInMonth, isHorsChant) {
    if (isHorsChant) {
      return { vaelune: "Vaelune hors-chant", orishar: "Orishar hors-chant" };
    }

    let vaelune;
    if (dayInMonth === 14) vaelune = "Vaelune : pleine lune";
    else if (dayInMonth === 1 || dayInMonth === 28) vaelune = "Vaelune : nouvelle lune";
    else if (dayInMonth === 7) vaelune = "Vaelune : premier quartier";
    else if (dayInMonth === 21) vaelune = "Vaelune : dernier quartier";
    else if (dayInMonth < 14) vaelune = "Vaelune montante";
    else vaelune = "Vaelune décroissante";

    const oi = absoluteDayIndex % 9;
    let orishar;
    if (oi === 0) orishar = "Orishar : nouvelle";
    else if (oi === 4) orishar = "Orishar : quasi pleine";
    else if (oi === 8) orishar = "Orishar : pleine";
    else if (oi < 4) orishar = "Orishar montante";
    else orishar = "Orishar capricieuse";

    return { vaelune, orishar };
  }

  function computeElserathDate(now) {
    const era = getEraFromDate(now);
    const doy = dayOfYear(now);
    const leap = isLeapYear(now.getFullYear());

    if (doy >= DAYS_IN_CYCLE) {
      const hors = doy === DAYS_IN_CYCLE ? "Jour du Souffle" : (doy === DAYS_IN_CYCLE + 1 && leap ? "Jour des Étoiles" : "Jour hors-chant");
      return {
        isHorsChant: true,
        horsChantName: hors,
        era: era,
        moons: getMoonPhases(doy, 0, true),
        festivals: []
      };
    }

    const monthIndex = Math.floor(doy / DAYS_IN_MONTH);
    const dayInMonth = (doy % DAYS_IN_MONTH) + 1;
    const weekdayName = WEEKDAYS[doy % 7];

    return {
      isHorsChant: false,
      monthIndex: monthIndex,
      monthName: MONTHS[monthIndex],
      dayInMonth: dayInMonth,
      weekdayName: weekdayName,
      era: era,
      seasonName: getSeason(MONTHS[monthIndex]),
      moons: getMoonPhases(doy, dayInMonth, false),
      festivals: getFestivals(era, MONTHS[monthIndex], dayInMonth)
    };
  }

  function injectCalendar() {
    const headerIcons = document.querySelector(".d-header .panel ul.icons");
    if (!headerIcons) return;
    if (headerIcons.querySelector(".elserath-calendar-icon")) return;

    const li = document.createElement("li");
    li.className = "elserath-calendar-icon";

    const wrapper = document.createElement("div");
    wrapper.className = "elserath-calendar-label";

    const main = document.createElement("div");
    main.className = "elserath-calendar-main";

    const sub = document.createElement("div");
    sub.className = "elserath-calendar-sub";

    const d = computeElserathDate(new Date());

    if (d.isHorsChant) {
      main.textContent = d.horsChantName + " • Cycle ESR " + d.era;
      sub.textContent = "";
    } else {
      main.textContent =
        d.weekdayName + " • " + d.dayInMonth + " " + d.monthName + " • ESR " + d.era;

      let s = d.seasonName;
      if (d.festivals.length > 0) s += " • " + d.festivals[0];
      s += " • " + d.moons.vaelune + " • " + d.moons.orishar;

      sub.textContent = s;
    }

    wrapper.appendChild(main);
    wrapper.appendChild(sub);
    li.appendChild(wrapper);
    headerIcons.appendChild(li);
  }

  api.onPageChange(() => injectCalendar());
  injectCalendar();
});
