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
    if (
      monthName === "Vaelis" ||
      monthName === "Lyndra" ||
      monthName === "Naëlis" ||
      monthName === "Orannis"
    ) {
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
      const hors =
        doy === DAYS_IN_CYCLE
          ? "Jour du Souffle"
          : doy === DAYS_IN_CYCLE + 1 && leap
          ? "Jour des Étoiles"
          : "Jour hors-chant";

      return {
        isHorsChant: true,
        horsChantName: hors,
        era: era,
        moons: getMoonPhases(doy, 0, true),
        festivals: [],
        monthIndex: null,
        monthName: null,
        dayInMonth: null,
        weekdayName: null,
        seasonName: "Hors-chant"
      };
    }

    const monthIndex = Math.floor(doy / DAYS_IN_MONTH);
    const dayInMonth = (doy % DAYS_IN_MONTH) + 1;
    const weekdayName = WEEKDAYS[doy % 7];
    const monthName = MONTHS[monthIndex];

    return {
      isHorsChant: false,
      monthIndex: monthIndex,
      monthName: monthName,
      dayInMonth: dayInMonth,
      weekdayName: weekdayName,
      era: era,
      seasonName: getSeason(monthName),
      moons: getMoonPhases(doy, dayInMonth, false),
      festivals: getFestivals(era, monthName, dayInMonth)
    };
  }

  function buildMonthGrid(era, monthIndex) {
    const monthName = MONTHS[monthIndex];
    const firstDayAbs = monthIndex * DAYS_IN_MONTH;
    const firstWeekdayIndex = firstDayAbs % 7;

    const days = [];
    for (let d = 1; d <= DAYS_IN_MONTH; d++) {
      const abs = firstDayAbs + (d - 1);
      const weekdayIndex = (firstWeekdayIndex + (d - 1)) % 7;
      days.push({
        day: d,
        weekdayIndex: weekdayIndex,
        festivals: getFestivals(era, monthName, d),
        absIndex: abs
      });
    }

    const weeks = [];
    let index = 0;
    for (let w = 0; w < 4; w++) {
      const row = [];
      for (let c = 0; c < 7; c++) {
        row.push(days[index]);
        index++;
      }
      weeks.push(row);
    }
    return weeks;
  }

  function removeExistingModal() {
    const old = document.querySelector(".elserath-calendar-modal");
    if (old) {
      old.remove();
    }
  }

  function openCalendarModal(dateData) {
    removeExistingModal();

    const era = dateData.era;
    const monthIndex = dateData.monthIndex != null ? dateData.monthIndex : 0;
    const monthName = MONTHS[monthIndex];
    const seasonName = getSeason(monthName);
    const grid = buildMonthGrid(era, monthIndex);

    const modal = document.createElement("div");
    modal.className = "elserath-calendar-modal";

    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.remove();
      }
    });

    const box = document.createElement("div");
    box.className = "elserath-calendar-content";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "elserath-calendar-close";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", function () {
      modal.remove();
    });
    box.appendChild(closeBtn);

    const title = document.createElement("h2");
    title.className = "elserath-calendar-title";
    title.textContent = "Calendrier d’Elserath — Cycle ESR " + era;
    box.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "elserath-calendar-subtitle";
    subtitle.textContent = "Mois : " + monthName + " — " + seasonName;
    box.appendChild(subtitle);

    const table = document.createElement("table");
    table.className = "elserath-calendar-table";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const th = document.createElement("th");
      const label = WEEKDAYS[i]
        .replace("Jour d’", "")
        .replace("Jour de ", "")
        .replace("Jour d'", "");
      th.textContent = label;
      trHead.appendChild(th);
    }
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let w = 0; w < grid.length; w++) {
      const week = grid[w];
      const tr = document.createElement("tr");
      for (let c = 0; c < week.length; c++) {
        const cell = week[c];
        const td = document.createElement("td");
        td.textContent = String(cell.day);

        if (
          !dateData.isHorsChant &&
          monthIndex === dateData.monthIndex &&
          cell.day === dateData.dayInMonth
        ) {
          td.classList.add("is-today");
        }

        if (cell.festivals && cell.festivals.length > 0) {
          td.classList.add("has-festival");
          td.title = cell.festivals.join(" • ");
        }

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    box.appendChild(table);

    const moons = document.createElement("div");
    moons.className = "elserath-calendar-moons";
    moons.textContent =
      dateData.moons.vaelune + " • " + dateData.moons.orishar;
    box.appendChild(moons);

    modal.appendChild(box);
    document.body.appendChild(modal);
  }

  function injectCalendarIndicator() {
    const headerTitle = document.querySelector(".d-header .title");
    if (!headerTitle) {
      return;
    }

    if (headerTitle.querySelector(".elserath-calendar")) {
      return;
    }

    const data = computeElserathDate(new Date());

    const container = document.createElement("div");
    container.className = "elserath-calendar";
    container.setAttribute("role", "button");
    container.setAttribute("tabindex", "0");

    const main = document.createElement("div");
    main.className = "elserath-calendar-main";

    const sub = document.createElement("div");
    sub.className = "elserath-calendar-sub";

    if (data.isHorsChant) {
      main.textContent = data.horsChantName + " • ESR " + data.era;
      sub.textContent = "";
    } else {
      main.textContent =
        data.dayInMonth + " " + data.monthName + " • ESR " + data.era;
      sub.textContent = data.weekdayName + " • " + data.seasonName;
    }

    container.appendChild(main);
    container.appendChild(sub);

    function openModalFromIndicator() {
      const freshData = computeElserathDate(new Date());
      openCalendarModal(freshData);
    }

    container.addEventListener("click", function () {
      openModalFromIndicator();
    });

    container.addEventListener("keypress", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModalFromIndicator();
      }
    });

    headerTitle.appendChild(container);
  }

  api.onPageChange(() => {
    injectCalendarIndicator();
  });

  injectCalendarIndicator();
});
