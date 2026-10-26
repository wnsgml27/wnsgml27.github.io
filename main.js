// ---------------------------------------------------------------
// 1. Pages. On the real site these are separate files; here we
//    show one <section> at a time based on the #hash in the URL.
// ---------------------------------------------------------------
const views = ["home", "about", "projects", "bookmarks", "kitchen"];
let unlocked = false; // has the secret sequence been entered? (resets on reload)

function showView(name) {
  if (!views.includes(name)) name = "home";
  if (name === "kitchen" && !unlocked) name = "home";

  for (const v of views) {
    document.getElementById("view-" + v).hidden = v !== name;
  }
  // mark the current link in the header
  document.querySelectorAll("nav.top a[data-view]").forEach(a => {
    if (a.dataset.view === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  const view = document.getElementById("view-" + name);
  view.classList.remove("enter");
  void view.offsetWidth;          // restart the animation
  view.classList.add("enter");
  window.scrollTo({ top: 0, behavior: "instant" });
  setupReveals(view);
}

window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

// ---------------------------------------------------------------
// 2. Scroll reveals. Items on screen rise in right away, with a
//    small stagger. Items further down wait until you scroll to them.
// ---------------------------------------------------------------
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.remove("pre");
      observer.unobserve(entry.target);
    }
  }
}, { rootMargin: "0px 0px -8% 0px" });

// once the rise animation ends, drop it so hover effects work again
document.addEventListener("animationend", e => {
  if (e.animationName === "rise") e.target.classList.remove("pop");
});

function setupReveals(root) {
  let i = 0;
  root.querySelectorAll(".reveal").forEach(el => {
    if (el.offsetParent === null) return;  // skip hidden items (other tab)
    el.classList.remove("pre", "pop");
    const onScreen = el.getBoundingClientRect().top < window.innerHeight * 0.92;
    if (onScreen) {
      el.style.animationDelay = (i++ * 60) + "ms";
      el.classList.add("pop");
    } else {
      el.classList.add("pre");
      observer.observe(el);
    }
  });
}

// ---------------------------------------------------------------
// 3. Project tabs: click them, or press M / C.
// ---------------------------------------------------------------
function selectTab(which) {
  for (const t of ["math", "cs"]) {
    document.getElementById("tab-" + t).setAttribute("aria-selected", t === which);
    document.getElementById("panel-" + t).hidden = t !== which;
  }
  setupReveals(document.getElementById("panel-" + which));
}
document.getElementById("tab-math").addEventListener("click", () => selectTab("math"));
document.getElementById("tab-cs").addEventListener("click", () => selectTab("cs"));

// ---------------------------------------------------------------
// 4. Keyboard shortcuts + the Pump It Up secret.
//    Each keyboard key is one arrow on the pad.
//    The secret is written as arrows, like a step chart.
// ---------------------------------------------------------------
const PAD = { V: "↙", T: "↖", G: "●", Y: "↗", B: "↘" };
const SECRET = ["↙", "↖", "●", "↗", "↘", "↗", "●", "↖", "↙"];
let recent = [];

// fill the popup step chart, one <span> per arrow
const chart = document.getElementById("chart");
const stepsEl = document.getElementById("chart-steps");
stepsEl.innerHTML = SECRET.map(a => `<span>${a}</span>`).join("");
let chartOpen = false;
let closeTimer;

function openChart() {
  chartOpen = true;
  recent = [];
  chart.classList.add("open");
}
function closeChart(delay = 0) {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    chartOpen = false;
    recent = [];
    chart.classList.remove("open");
    stepsEl.querySelectorAll("span").forEach(s => s.classList.remove("on"));
  }, delay);
}

// how many steps of the chart have been hit in a row so far
function progress() {
  for (let n = Math.min(recent.length, SECRET.length); n > 0; n--) {
    if (recent.slice(-n).join("") === SECRET.slice(0, n).join("")) return n;
  }
  return 0;
}

function padStep(key) {
  recent.push(PAD[key]);
  recent = recent.slice(-SECRET.length);
  const btn = document.querySelector(`.pad [data-pad="${key}"]`);
  btn.classList.add("hit");
  setTimeout(() => btn.classList.remove("hit"), 180);

  // the chart only appears once someone presses the first step (V)
  if (!chartOpen) {
    if (PAD[key] !== SECRET[0]) { recent = []; return; }
    openChart();
    recent = [PAD[key]];
  }

  const done = progress();
  stepsEl.querySelectorAll("span").forEach((s, i) => s.classList.toggle("on", i < done));

  if (done === SECRET.length) {
    unlockFullMode();
    closeChart(700);
  } else if (done === 0) {
    // wrong step: shake and go away
    chart.classList.remove("miss");
    void chart.offsetWidth;
    chart.classList.add("miss");
    closeChart(450);
  } else {
    closeChart(4000);  // close if nobody presses anything for 4 seconds
  }
}

function unlockFullMode() {
  recent = [];
  const toast = document.getElementById("toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
  if (unlocked) return;
  unlocked = true;
  const link = document.querySelector(".nav-kitchen");
  link.hidden = false;
  link.classList.add("arrive");
}

document.addEventListener("keydown", e => {
  // don't steal keys while typing (for example in the password box)
  if (e.target.matches("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toUpperCase();
  if (k in PAD) padStep(k);

  const current = location.hash.slice(1) || "home";
  if (k === "H") location.hash = "home";
  if (k === "A") location.hash = "about";
  if (k === "P") location.hash = "projects";
  if (k === "L") location.hash = "bookmarks";
  if (k === "K" && unlocked) location.hash = "kitchen";
  if (current === "projects" && k === "M") selectTab("math");
  if (current === "projects" && k === "C") selectTab("cs");
});

document.querySelectorAll(".pad button").forEach(btn => {
  btn.addEventListener("click", () => padStep(btn.dataset.pad));
});

// ---------------------------------------------------------------
// 5. Kitchen. A mock of StatiCrypt: the right password shows the grid.
//    (Real StatiCrypt decrypts the page in the browser instead.)
// ---------------------------------------------------------------
const dishes = [
  { name: "Kimchi fried rice", note: "Example note: day-old rice, a fried egg on top.", colors: ["#d9482b", "#f2a541"] },
  { name: "Doenjang jjigae", note: "Example note: tofu, zucchini, a spoon of gochugaru.", colors: ["#8a5a2b", "#d8b26e"] },
  { name: "Tomato egg stir-fry", note: "Example note: soft eggs, a little sugar.", colors: ["#e4572e", "#ffc857"] },
  { name: "Banana bread", note: "Example note: brown butter, very ripe bananas.", colors: ["#7b4b2a", "#e0a96d"] },
  { name: "Mapo tofu", note: "Example note: more Sichuan pepper than you think.", colors: ["#a4161a", "#e5383b"] },
  { name: "Matcha latte", note: "Example note: whisk, don't stir.", colors: ["#4f772d", "#a7c957"] },
];

function buildKitchenGrid() {
  const grid = document.getElementById("kitchen-grid");
  grid.innerHTML = "";
  for (const d of dishes) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "dish reveal";
    tile.style.background = `linear-gradient(145deg, ${d.colors[0]}, ${d.colors[1]})`;
    tile.innerHTML = `<span>${d.name}</span>`;
    tile.addEventListener("click", () => {
      document.getElementById("dish-name").textContent = d.name;
      document.getElementById("dish-note").textContent = d.note;
      document.getElementById("dish-dialog").showModal();
    });
    grid.appendChild(tile);
  }
  grid.hidden = false;
  setupReveals(grid);
}

document.getElementById("lock-form").addEventListener("submit", e => {
  e.preventDefault();
  const lock = document.getElementById("lock");
  const pass = document.getElementById("lock-pass");
  if (pass.value === "demo") {
    lock.hidden = true;
    buildKitchenGrid();
  } else {
    document.getElementById("lock-error").textContent = "Wrong password. Try again.";
    lock.classList.remove("shake");
    void lock.offsetWidth;
    lock.classList.add("shake");
    pass.select();
  }
});

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------
// nothing is saved, so every reload starts in basic mode
showView(location.hash.slice(1));
