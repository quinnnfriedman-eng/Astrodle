/*
  Astrodle
  Uses Jonathan McDowell's maintained Human Spaceflight database:
  https://planet4589.org/space/astro/
*/

const DATA_URLS = {
  astronauts: "https://planet4589.org/space/astro/tsv/astro.tsv",
  rides: "https://planet4589.org/space/astro/tsv/rides.tsv"
};

const COUNTRY_NAMES = {
  US:"USA", RU:"Russia", SU:"USSR", UA:"Ukraine", BY:"Belarus", KZ:"Kazakhstan",
  CA:"Canada", GB:"United Kingdom", UK:"United Kingdom", FR:"France", DE:"Germany",
  IT:"Italy", ES:"Spain", BE:"Belgium", NL:"Netherlands", AT:"Austria",
  CH:"Switzerland", SE:"Sweden", NO:"Norway", DK:"Denmark", FI:"Finland",
  PL:"Poland", CZ:"Czech Republic", SK:"Slovakia", HU:"Hungary", RO:"Romania",
  BG:"Bulgaria", GR:"Greece", PT:"Portugal", IE:"Ireland", IL:"Israel",
  IN:"India", CN:"China", JP:"Japan", KR:"South Korea", VN:"Vietnam",
  MN:"Mongolia", CU:"Cuba", MX:"Mexico", BR:"Brazil", AR:"Argentina",
  CL:"Chile", ZA:"South Africa", AU:"Australia", NZ:"New Zealand",
  AE:"United Arab Emirates", SA:"Saudi Arabia", TR:"Turkey", IR:"Iran",
  AF:"Afghanistan", SY:"Syria", MY:"Malaysia", ID:"Indonesia", PK:"Pakistan",
  EG:"Egypt", CR:"Costa Rica", PA:"Panama", GH:"Ghana", NG:"Nigeria",
  MT:"Malta", IS:"Iceland"
};

const MAX_ATTEMPTS = 6;
const MODE_TEXT = {
  daily: "Everyone gets the same astronaut today.",
  random: "A new astronaut is selected whenever this page refreshes.",
  practice: "Play unlimited rounds and press Next after each game."
};

let astronauts = [];
let answer = null;
let attempts = 0;
let mode = "daily";
let activeSuggestion = -1;
let visibleSuggestions = [];
const guessedNames = new Set();

const input = document.getElementById("guess");
const guessButton = document.getElementById("guess-button");
const suggestions = document.getElementById("suggestions");
const tbody = document.querySelector("#board tbody");
const status = document.getElementById("status");
const modeDescription = document.getElementById("mode-description");
const resultPanel = document.getElementById("result-panel");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");
const nextButton = document.getElementById("next-button");
const newRandomButton = document.getElementById("new-random-button");

input.disabled = true;
guessButton.disabled = true;

function parseTSV(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter(line => line.trim() && !line.trimStart().startsWith("#"));

  if (!lines.length) return [];

  const headers = lines[0].split("\t").map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = line.split("\t");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });
    return row;
  });
}

async function fetchText(url) {
  const sources = [
    url,
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
    "https://corsproxy.io/?" + encodeURIComponent(url)
  ];

  let lastError;
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < 100) throw new Error("Empty database response.");
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load database.");
}

function getValue(row, ...names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  return "";
}

function displayName(rawName) {
  let name = (rawName || "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (name.includes(",")) {
    const parts = name.split(",");
    const surname = parts.shift().trim();
    const givenNames = parts.join(" ").trim();
    name = `${givenNames} ${surname}`.replace(/\s+/g, " ").trim();
  }

  return name;
}

function nationalityName(code) {
  const cleanCode = (code || "").split(/\s+/)[0].trim();
  return COUNTRY_NAMES[cleanCode] || cleanCode || "Unknown";
}

function firstYearFromRide(ride) {
  const launchDate = getValue(ride, "LDate", "LaunchDate", "Date");
  const match = launchDate.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : 0;
}

function agencyFromRide(ride, firstYear, nationality) {
  const sponsor = getValue(ride, "Sponsor").toUpperCase();
  const employer = getValue(ride, "Employer").toUpperCase();
  const program = getValue(ride, "Progra", "Program").toUpperCase();
  const combined = `${sponsor} ${employer} ${program}`;

  if (/NASA|JSCAO/.test(combined)) return "NASA";
  if (/ESA/.test(combined)) return "ESA";
  if (/JAXA|NASDA|ISAS/.test(combined)) return "JAXA";
  if (/CSA/.test(combined)) return "CSA";
  if (/CNSA|CMSA|HYD/.test(combined)) return "CNSA";
  if (/ISRO/.test(combined)) return "ISRO";
  if (/ROSKOSMOS|ROSCOSMOS|TSPK/.test(combined))
    return firstYear < 1992 ? "Soviet Space Program" : "Roscosmos";
  if (/SPACEX|SPACE.?X|SPX/.test(combined)) return "SpaceX";
  if (/BLUE ORIGIN|BLOR/.test(combined)) return "Blue Origin";
  if (/VIRGIN GALACTIC|VGX/.test(combined)) return "Virgin Galactic";
  if (/AXIOM|AXI/.test(combined)) return "Axiom Space";
  if (/CNES/.test(combined)) return "CNES";
  if (/DLR/.test(combined)) return "DLR";
  if (/ASI/.test(combined)) return "ASI";
  if (/USAF|X15/.test(combined)) return "USAF / NASA";

  if (nationality === "China") return "CNSA";
  if (nationality === "Russia" || nationality === "USSR")
    return firstYear < 1992 ? "Soviet Space Program" : "Roscosmos";

  return sponsor || employer || program || "Independent / Commercial";
}

function dailyIndex(length) {
  const now = new Date();
  const dayNumber = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000
  );
  return ((dayNumber * 2654435761) >>> 0) % length;
}

function randomIndex(length, excludedName = "") {
  if (length <= 1) return 0;

  let index;
  do {
    index = Math.floor(Math.random() * length);
  } while (astronauts[index]?.name === excludedName);

  return index;
}

function selectAnswer() {
  if (!astronauts.length) return;

  const previousName = answer?.name || "";

  if (mode === "daily") {
    answer = astronauts[dailyIndex(astronauts.length)];
  } else {
    answer = astronauts[randomIndex(astronauts.length, previousName)];
  }
}

function resetRound() {
  attempts = 0;
  guessedNames.clear();
  tbody.replaceChildren();
  resultPanel.classList.add("hidden");
  nextButton.classList.add("hidden");
  newRandomButton.classList.add("hidden");
  input.value = "";
  closeSuggestions();
  input.disabled = false;
  guessButton.disabled = false;
  selectAnswer();
  updateStatus();
  input.focus();
}

function updateStatus() {
  status.textContent =
    `${astronauts.length} astronauts loaded — ${MAX_ATTEMPTS - attempts} guesses left.`;
}

async function loadDatabase() {
  try {
    const [astronautText, ridesText] = await Promise.all([
      fetchText(DATA_URLS.astronauts),
      fetchText(DATA_URLS.rides)
    ]);

    const astronautRows = parseTSV(astronautText);
    const rideRows = parseTSV(ridesText);

    const firstRideById = new Map();

    for (const ride of rideRows) {
      const id = getValue(ride, "ID");
      if (!id.startsWith("AS-")) continue;

      const year = firstYearFromRide(ride);
      const stored = firstRideById.get(id);

      if (!stored || (year && year < firstYearFromRide(stored))) {
        firstRideById.set(id, ride);
      }
    }

    astronauts = astronautRows
      .filter(row => getValue(row, "No").startsWith("AS-"))
      .map(row => {
        const id = getValue(row, "No");
        const firstRide = firstRideById.get(id) || {};
        const firstFlight = firstYearFromRide(firstRide);
        const nationality = nationalityName(getValue(row, "Citizen"));
        const genderCode = getValue(row, "G").toUpperCase();

        return {
          id,
          name: displayName(getValue(row, "Name")),
          nationality,
          gender:
            genderCode === "F" ? "Female" :
            genderCode === "M" ? "Male" : "Other",
          firstFlight,
          missions: Number(getValue(row, "NFL")) || 1,
          agency: agencyFromRide(firstRide, firstFlight, nationality)
        };
      })
      .filter(astronaut => astronaut.name && astronaut.firstFlight)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!astronauts.length) {
      throw new Error("No astronaut records were found.");
    }

    resetRound();
  } catch (error) {
    console.error(error);
    status.textContent =
      "The astronaut database could not load. Refresh the page and try again.";
  }
}

function matchingAstronauts(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const startsWith = [];
  const contains = [];

  for (const astronaut of astronauts) {
    if (guessedNames.has(astronaut.name)) continue;

    const name = astronaut.name.toLowerCase();
    if (name.startsWith(normalized)) {
      startsWith.push(astronaut);
    } else if (name.includes(normalized)) {
      contains.push(astronaut);
    }

    if (startsWith.length + contains.length >= 12) break;
  }

  return [...startsWith, ...contains].slice(0, 10);
}

function renderSuggestions() {
  visibleSuggestions = matchingAstronauts(input.value);
  activeSuggestion = -1;
  suggestions.replaceChildren();

  if (!visibleSuggestions.length) {
    closeSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleSuggestions.forEach((astronaut, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.role = "option";
    button.innerHTML = `
      <span class="suggestion-name">${astronaut.name}</span>
      <span class="suggestion-details">
        ${astronaut.nationality} · First flight ${astronaut.firstFlight}
      </span>
    `;

    button.addEventListener("mousedown", event => {
      event.preventDefault();
      chooseSuggestion(index);
    });

    fragment.appendChild(button);
  });

  suggestions.appendChild(fragment);
  suggestions.classList.add("open");
  input.setAttribute("aria-expanded", "true");
}

function chooseSuggestion(index) {
  const astronaut = visibleSuggestions[index];
  if (!astronaut) return;

  input.value = astronaut.name;
  closeSuggestions();
  input.focus();
}

function closeSuggestions() {
  suggestions.classList.remove("open");
  suggestions.replaceChildren();
  input.setAttribute("aria-expanded", "false");
  activeSuggestion = -1;
  visibleSuggestions = [];
}

function moveSuggestion(direction) {
  if (!visibleSuggestions.length) return;

  activeSuggestion =
    (activeSuggestion + direction + visibleSuggestions.length) %
    visibleSuggestions.length;

  const buttons = suggestions.querySelectorAll(".suggestion");
  buttons.forEach((button, index) => {
    button.classList.toggle("active", index === activeSuggestion);
  });

  buttons[activeSuggestion]?.scrollIntoView({ block: "nearest" });
}

function comparisonCell(value, matches) {
  return `<td class="${matches ? "green" : "red"}">${value}</td>`;
}

function numberCell(value, target) {
  if (value === target) return `<td class="green">${value}</td>`;

  const arrow = value < target ? "↑" : "↓";
  return `<td class="red">${value} <span class="arrow">${arrow}</span></td>`;
}

function showResult(won) {
  input.disabled = true;
  guessButton.disabled = true;
  closeSuggestions();

  resultPanel.classList.remove("hidden");
  resultTitle.textContent = won ? "🎉 Correct!" : "Game over";
  resultText.textContent = `The astronaut was ${answer.name}.`;

  if (mode === "practice") {
    nextButton.classList.remove("hidden");
  } else if (mode === "random") {
    newRandomButton.classList.remove("hidden");
  }
}

function submitGuess() {
  if (!answer) return;

  const typedName = input.value.trim().toLowerCase();
  const guess = astronauts.find(
    astronaut => astronaut.name.toLowerCase() === typedName
  );

  if (!guess) {
    alert("Choose an astronaut from the suggestions.");
    return;
  }

  if (guessedNames.has(guess.name)) {
    alert("You already guessed that astronaut.");
    return;
  }

  guessedNames.add(guess.name);
  attempts += 1;

  const row = document.createElement("tr");
  row.innerHTML =
    `<td>${guess.name}</td>` +
    comparisonCell(guess.nationality, guess.nationality === answer.nationality) +
    comparisonCell(guess.gender, guess.gender === answer.gender) +
    numberCell(guess.firstFlight, answer.firstFlight) +
    numberCell(guess.missions, answer.missions) +
    comparisonCell(guess.agency, guess.agency === answer.agency);

  tbody.appendChild(row);
  input.value = "";
  closeSuggestions();

  if (guess.name === answer.name) {
    showResult(true);
  } else if (attempts >= MAX_ATTEMPTS) {
    showResult(false);
  } else {
    updateStatus();
    input.focus();
  }
}

document.querySelectorAll(".mode-button").forEach(button => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;

    document.querySelectorAll(".mode-button").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    modeDescription.textContent = MODE_TEXT[mode];

    if (astronauts.length) resetRound();
  });
});

input.addEventListener("input", renderSuggestions);

input.addEventListener("keydown", event => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSuggestion(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSuggestion(-1);
  } else if (event.key === "Enter") {
    event.preventDefault();

    if (activeSuggestion >= 0) {
      chooseSuggestion(activeSuggestion);
    } else {
      submitGuess();
    }
  } else if (event.key === "Escape") {
    closeSuggestions();
  }
});

input.addEventListener("blur", () => {
  setTimeout(closeSuggestions, 120);
});

guessButton.addEventListener("click", submitGuess);
nextButton.addEventListener("click", resetRound);
newRandomButton.addEventListener("click", resetRound);

loadDatabase();
