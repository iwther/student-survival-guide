/* ============ Student Survival Guide ============ */

(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("ssg-theme");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");

  $("#themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("ssg-theme", next);
  });

  /* ---------- nav ---------- */
  const nav = $("#nav");
  const navLinks = $("#navLinks");
  const progressBar = $("#scrollProgressBar");

  $("#navBurger").addEventListener("click", () => navLinks.classList.toggle("open"));
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") navLinks.classList.remove("open");
  });

  function onScroll() {
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    nav.classList.toggle("is-stuck", y > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            setTimeout(() => el.classList.add("visible"), Math.min(i * 70, 350));
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- pomodoro ---------- */
  const MODES = { work: { s: 25 * 60, label: "Фокус" }, short: { s: 5 * 60, label: "Перерыв" }, long: { s: 15 * 60, label: "Длинный перерыв" } };
  const RING_LEN = 691.15;

  const timeEl = $("#timerTime");
  const labelEl = $("#timerLabel");
  const ringEl = $("#timerRing");
  const startBtn = $("#timerStart");
  const resetBtn = $("#timerReset");
  const roundsEl = $("#timerRounds");

  let mode = "work";
  let remaining = MODES.work.s;
  let endTime = null;
  let interval = null;
  let rounds = 0;

  function fmt(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function renderRounds() {
    roundsEl.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement("i");
      if (i < rounds) dot.className = "on";
      roundsEl.appendChild(dot);
    }
  }

  function render() {
    const total = MODES[mode].s;
    timeEl.textContent = fmt(Math.max(0, remaining));
    labelEl.textContent = MODES[mode].label;
    ringEl.style.strokeDashoffset = RING_LEN * (1 - Math.max(0, remaining) / total);
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    } catch (e) { /* no audio */ }
  }

  function stopTimer() {
    clearInterval(interval);
    interval = null;
    endTime = null;
    startBtn.textContent = "Старт";
  }

  function tick() {
    remaining = Math.round((endTime - Date.now()) / 1000);
    if (remaining <= 0) {
      remaining = 0;
      render();
      stopTimer();
      beep();
      if (mode === "work") {
        rounds = (rounds + 1) % 5;
        renderRounds();
        const next = rounds === 0 ? "long" : "short";
        toast("Цикл завершён! Дальше — " + MODES[next].label.toLowerCase() + " " + MODES[next].s / 60 + " мин");
        setMode(next, false);
      } else {
        toast("Перерыв окончен — возвращаемся к работе");
        setMode("work", false);
      }
      return;
    }
    render();
  }

  function setMode(next, resetRounds) {
    mode = next;
    remaining = MODES[mode].s;
    if (resetRounds) rounds = 0;
    stopTimer();
    renderRounds();
    render();
    $$(".pomodoro__modes .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.mode === mode));
  }

  startBtn.addEventListener("click", () => {
    if (interval) { stopTimer(); return; }
    endTime = Date.now() + remaining * 1000;
    interval = setInterval(tick, 250);
    startBtn.textContent = "Пауза";
  });

  resetBtn.addEventListener("click", () => setMode(mode, false));

  $$(".pomodoro__modes .chip").forEach((chip) =>
    chip.addEventListener("click", () => setMode(chip.dataset.mode, false))
  );

  renderRounds();
  render();

  /* ---------- breathing 4-7-8 ---------- */
  const PHASES = [
    { name: "Вдох", sec: 4, scale: 1 },
    { name: "Задержка", sec: 7, scale: 1 },
    { name: "Выдох", sec: 8, scale: 0.55 },
  ];

  const breathCircle = $("#breathCircle");
  const breathPhase = $("#breathPhase");
  const breathCount = $("#breathCount");
  const breathCycles = $("#breathCycles");
  const breathBtn = $("#breathStart");

  let breathing = false;
  let phaseIdx = 0;
  let phaseStart = 0;
  let breathRAF = null;
  let cycles = 0;

  function setPhase(i) {
    phaseIdx = i;
    phaseStart = Date.now();
    const ph = PHASES[i];
    breathPhase.textContent = ph.name;
    breathCircle.style.transitionDuration = ph.sec + "s";
    breathCircle.style.transform = "scale(" + ph.scale + ")";
  }

  function breathLoop() {
    if (!breathing) return;
    const ph = PHASES[phaseIdx];
    const elapsed = (Date.now() - phaseStart) / 1000;
    const left = Math.max(0, Math.ceil(ph.sec - elapsed));
    breathCount.textContent = left + " " + (left === 1 ? "секунда" : left < 5 && left > 0 ? "секунды" : "секунд");

    if (elapsed >= ph.sec) {
      if (phaseIdx === PHASES.length - 1) {
        cycles++;
        breathCycles.textContent = cycles;
        setPhase(0);
      } else {
        setPhase(phaseIdx + 1);
      }
    }
    breathRAF = requestAnimationFrame(breathLoop);
  }

  breathBtn.addEventListener("click", () => {
    if (breathing) {
      breathing = false;
      cancelAnimationFrame(breathRAF);
      breathBtn.textContent = "Начать";
      breathPhase.textContent = "Пауза";
      breathCount.textContent = "Нажми, чтобы продолжить";
      breathCircle.style.transitionDuration = "0.6s";
      breathCircle.style.transform = "scale(0.55)";
      return;
    }
    breathing = true;
    breathBtn.textContent = "Стоп";
    setPhase(0);
    breathLoop();
  });

  /* ---------- resource filters ---------- */
  const chips = $$("#resourceFilters .chip");
  const resCards = $$("#resourceGrid .res");

  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      resCards.forEach((card) => {
        const show = f === "all" || card.dataset.cat === f;
        card.classList.toggle("is-hidden", !show);
        if (show) card.classList.add("visible");
      });
    })
  );

  /* ---------- checklists ---------- */
  const STORAGE_KEY = "ssg-checklists-v1";
  const rootCl = $("#checklistRoot");
  const lists = $$(".clist", rootCl);

  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    state = {};
  }

  const overallCount = $("#overallCount");
  const overallBar = $("#overallBar");

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function updateOverall() {
    let done = 0, total = 0;
    lists.forEach((list) => {
      $$('input[type="checkbox"]', list).forEach((cb) => {
        total++;
        if (cb.checked) done++;
      });
    });
    overallCount.textContent = done + " из " + total + " пунктов";
    overallBar.style.width = total ? (done / total) * 100 + "%" : "0%";
  }

  function updateList(list) {
    const id = list.dataset.list;
    const boxes = $$('input[type="checkbox"]', list);
    const done = boxes.filter((b) => b.checked).length;
    const count = $(".clist__count", list);
    const bar = $(".clist__bar span", list);

    count.textContent = done + "/" + boxes.length;
    bar.style.width = boxes.length ? (done / boxes.length) * 100 + "%" : "0%";
    list.classList.toggle("is-done", done === boxes.length);

    state[id] = boxes.map((b) => b.checked);
    save();
    updateOverall();

    if (done === boxes.length) {
      toast("Чек-лист «" + $("h3", list).textContent + "» выполнен. Так держать!");
    }
  }

  lists.forEach((list) => {
    const id = list.dataset.list;
    const boxes = $$('input[type="checkbox"]', list);
    const saved = state[id];
    if (Array.isArray(saved)) {
      boxes.forEach((b, i) => { b.checked = !!saved[i]; });
    }

    boxes.forEach((b) => b.addEventListener("change", () => updateList(list)));

    $(".clist__reset", list).addEventListener("click", () => {
      boxes.forEach((b) => { b.checked = false; });
      updateList(list);
      toast("Чек-лист сброшен");
    });

    // initial render (without toast)
    const done = boxes.filter((b) => b.checked).length;
    $(".clist__count", list).textContent = done + "/" + boxes.length;
    $(".clist__bar span", list).style.width = (done / boxes.length) * 100 + "%";
    list.classList.toggle("is-done", done === boxes.length && done > 0);
  });
  updateOverall();

  /* ---------- faq: закрывать остальные ---------- */
  const faqItems = $$(".faq details");
  faqItems.forEach((d) =>
    d.addEventListener("toggle", () => {
      if (d.open) faqItems.forEach((o) => { if (o !== d) o.open = false; });
    })
  );
})();
