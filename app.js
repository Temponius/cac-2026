const $ = (s) => document.querySelector(s);
const [
  cForm,
  cTitle,
  cDate,
  cVal,
  cDur,
  cArea,
  activeTime,
  activeStatus,
  mainStudy,
  nextTaskInfo,
  completedEl,
  totalSessionsEl,
  totalWorkTimeEl,
  currentStreakEl,
  highestStreakEl,
] = [
  "#coursework_form",
  "#coursework_title",
  "#coursework_date",
  "#coursework_value",
  "#coursework_duration",
  "#coursework_area",
  "#active_time",
  "#active_status",
  "#main_study",
  "#next_task_info",
  "#completed_count",
  "#total_sessions",
  "#total_work_time",
  "#current_streak",
  "#highest_streak",
].map($);

const [
  initStartBtn,
  startBtn,
  pauseBtn,
  resetBtn,
  completeBtn,
  setTrigger,
  setDropdown,
  themeToggle,
  accentPicker,
] = [
  "#initial_start_study",
  "#start_study",
  "#pause_study",
  "#reset_study",
  "#complete_study",
  "#settings_trigger",
  "#settings_dropdown",
  "#theme_toggle",
  "#accent_picker",
].map($);

let courseworkList = [],
  completedCount = 0,
  totalSessions = 0,
  totalWorkSeconds = 0,
  currentStreak = 0,
  highestStreak = 0;
let pomoTime = 1500,
  pomoId = null,
  isStudyMode = true;

const themeColors = {
  matcha: { light: "#6cb860", dark: "#98e68a" },
  salmon: { light: "#d96b6b", dark: "#f89494" },
  blueberry: { light: "#619cd8", dark: "#8bc2fb" },
  burgundy: { light: "#b55866", dark: "#e07d8d" },
  concrete: { light: "#798897", dark: "#a7b6c5" },
  banana: { light: "#bfa43c", dark: "#f1d464" },
  lavender: { light: "#936cc7", dark: "#bfa3f5" },
};

const getPart1Mins = (m) => ({ 35: 18, 45: 20, 60: 30 })[m] || 20;
const getPart2Mins = (m) => ({ 35: 17, 45: 25, 60: 30 })[m] || 20;

setTrigger.onclick = (e) => (
  e.stopPropagation(),
  setDropdown.classList.toggle("show")
);
window.onclick = () => setDropdown.classList.remove("show");
setDropdown.onclick = (e) => e.stopPropagation();

function applyTheme(themeName) {
  const isDark = document.body.classList.contains("dark-mode");
  const color =
    themeColors[themeName]?.[isDark ? "dark" : "light"] ||
    (isDark ? "#98e68a" : "#6cb860");
  document.documentElement.style.setProperty("--accent-color", color);
}

function updateStatsDisplay() {
  completedEl.textContent = completedCount;
  totalSessionsEl.textContent = totalSessions;
  const hours = Math.floor(totalWorkSeconds / 3600);
  const minutes = Math.floor((totalWorkSeconds % 3600) / 60);
  totalWorkTimeEl.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  currentStreakEl.textContent = currentStreak;
  highestStreakEl.textContent = highestStreak;
}

function saveState() {
  localStorage.setItem("courseworkList", JSON.stringify(courseworkList));
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode"),
  );
  localStorage.setItem("accentTheme", accentPicker.value);
  localStorage.setItem("completedCount", completedCount);
  localStorage.setItem("totalSessions", totalSessions);
  localStorage.setItem("totalWorkSeconds", totalWorkSeconds);
  localStorage.setItem("currentStreak", currentStreak);
  localStorage.setItem("highestStreak", highestStreak);
}

function loadState() {
  courseworkList = JSON.parse(
    localStorage.getItem("courseworkList") || "[]",
  ).sort(sortCoursework);
  renderCoursework(courseworkList, cArea);

  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    themeToggle.checked = true;
  }

  const savedTheme = localStorage.getItem("accentTheme") || "matcha";
  accentPicker.value = savedTheme;
  applyTheme(savedTheme);

  completedCount = parseInt(localStorage.getItem("completedCount") || "0", 10);
  totalSessions = parseInt(localStorage.getItem("totalSessions") || "0", 10);
  totalWorkSeconds = parseInt(
    localStorage.getItem("totalWorkSeconds") || "0",
    10,
  );
  currentStreak = parseInt(localStorage.getItem("currentStreak") || "0", 10);
  highestStreak = parseInt(localStorage.getItem("highestStreak") || "0", 10);
  updateStatsDisplay();
}

themeToggle.onchange = () => {
  document.body.classList.toggle("dark-mode", themeToggle.checked);
  applyTheme(accentPicker.value);
  saveState();
};

accentPicker.onchange = () => {
  applyTheme(accentPicker.value);
  saveState();
};

function sortCoursework(a, b) {
  const d = new Date(a.date) - new Date(b.date);
  return d !== 0 ? d : a.value === "sum" ? -1 : 1;
}

function updateTimer() {
  activeTime.textContent = `${String(Math.floor(pomoTime / 60)).padStart(2, "0")}:${String(pomoTime % 60).padStart(2, "0")}`;
}

function updateBtnStates() {
  startBtn.disabled = pomoId !== null;
  pauseBtn.disabled = pomoId === null;
}

function resetTimerState() {
  clearInterval(pomoId);
  pomoId = null;
  pomoTime = 1500;
  isStudyMode = true;
  activeTime.textContent = "25:00";
  activeStatus.textContent = "Work Mode";
  mainStudy.innerHTML = "";
  nextTaskInfo.textContent = "Next Up: None";
  updateBtnStates();
}

function updateStudyDisplay() {
  if (isStudyMode) {
    if (courseworkList.length) {
      const cur = courseworkList[0];
      mainStudy.innerHTML = cur.title;
      nextTaskInfo.textContent =
        courseworkList.length > 1 || cur.isSplitPart1
          ? cur.isSplitPart1
            ? "Next Up: Short Interval Break"
            : "Next Up: 5-Minute Break"
          : "Next Up: End of Session";
    } else {
      mainStudy.innerHTML = "No active assignments!";
      nextTaskInfo.textContent = "Next Up: None";
    }
  } else {
    mainStudy.innerHTML = "5-Minute Break";
    nextTaskInfo.textContent = courseworkList.length
      ? `Next Up: ${courseworkList[0].title}`
      : "Next Up: End of Session";
  }
}

function startTimer() {
  if (pomoId !== null) return;
  pomoId = setInterval(() => {
    if (pomoTime > 0) {
      pomoTime--;
      totalWorkSeconds++;
      updateStatsDisplay();
      saveState();
      updateTimer();
    } else {
      clearInterval(pomoId);
      pomoId = null;
      if (isStudyMode) {
        const cur = courseworkList[0];
        if (cur?.isSplitPart1) {
          cur.isSplitPart1 = false;
          cur.isSplitPart2 = true;
          isStudyMode = false;
          pomoTime = 300;
          activeStatus.textContent = "Interval Break";
          updateTimer();
          updateStudyDisplay();
          startTimer();
          return;
        }
        if (courseworkList.length) {
          courseworkList.shift();
          completedCount++;
          currentStreak++;
          if (currentStreak > highestStreak) highestStreak = currentStreak;
          updateStatsDisplay();
          saveState();
          renderCoursework(courseworkList, cArea);
        }
        if (courseworkList.length) {
          isStudyMode = false;
          pomoTime = 300;
          activeStatus.textContent = "Break Time";
          updateTimer();
          updateStudyDisplay();
          startTimer();
        } else {
          totalSessions++;
          updateStatsDisplay();
          saveState();
          alert("All assignments and breaks completed!");
          resetTimerState();
          document.body.className = document.body.classList.contains(
            "dark-mode",
          )
            ? "dashboard-mode dark-mode"
            : "dashboard-mode";
        }
      } else {
        if (courseworkList.length) {
          isStudyMode = true;
          const cur = courseworkList[0];
          pomoTime =
            (cur.isSplitPart2
              ? getPart2Mins(+cur.originalDuration)
              : +cur.duration) * 60;
          activeStatus.textContent = "Work Mode";
          updateTimer();
          updateStudyDisplay();
          startTimer();
        } else {
          totalSessions++;
          updateStatsDisplay();
          saveState();
          resetTimerState();
          document.body.className = document.body.classList.contains(
            "dark-mode",
          )
            ? "dashboard-mode dark-mode"
            : "dashboard-mode";
        }
      }
    }
  }, 1000);
  updateBtnStates();
}

function renderCoursework(arr, container) {
  container.innerHTML = "";
  arr.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = `coursework-item ${item.value}`;
    row.innerHTML = `<div title="${item.title}">${item.title}</div><div>${item.date}</div><div>${item.value === "sum" ? "Summative" : "Formative"}</div>`;
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.onclick = () => (
      courseworkList.splice(idx, 1),
      saveState(),
      renderCoursework(courseworkList, cArea)
    );
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

cForm.onsubmit = (e) => {
  e.preventDefault();
  const mins = +cDur.value;
  courseworkList.push({
    title: cTitle.value,
    date: cDate.value,
    value: cVal.value,
    duration: cDur.value,
    originalDuration: cDur.value,
    isSplitPart1: mins >= 35,
    isSplitPart2: false,
  });
  courseworkList.sort(sortCoursework);
  saveState();
  renderCoursework(courseworkList, cArea);
  cForm.reset();
};

initStartBtn.onclick = () => {
  if (!courseworkList.length)
    return alert(
      "Please add at least one assignment before starting work mode!",
    );
  const isDark = document.body.classList.contains("dark-mode");
  document.body.className = isDark ? "study-mode dark-mode" : "study-mode";
  isStudyMode = true;
  const first = courseworkList[0],
    total = +first.duration;
  if (total >= 35) {
    first.isSplitPart1 = true;
    first.isSplitPart2 = false;
    pomoTime = getPart1Mins(total) * 60;
  } else {
    pomoTime = total * 60;
  }
  activeStatus.textContent = "Work Mode";
  updateTimer();
  updateStudyDisplay();
  startTimer();
};

startBtn.onclick = () => pomoId === null && startTimer();
pauseBtn.onclick = () =>
  pomoId !== null &&
  (clearInterval(pomoId), (pomoId = null), updateBtnStates());
resetBtn.onclick = () => {
  const isDark = document.body.classList.contains("dark-mode");
  resetTimerState();
  document.body.className = isDark
    ? "dashboard-mode dark-mode"
    : "dashboard-mode";
  loadState();
};

completeBtn.onclick = () => {
  if (!courseworkList.length) return;
  clearInterval(pomoId);
  pomoId = null;
  const isDark = document.body.classList.contains("dark-mode");
  if (isStudyMode) {
    const cur = courseworkList[0];
    if (cur.isSplitPart1) {
      cur.isSplitPart1 = false;
      cur.isSplitPart2 = true;
      isStudyMode = false;
      pomoTime = 300;
      activeStatus.textContent = "Interval Break";
      updateTimer();
      updateStudyDisplay();
      startTimer();
      return;
    }
    courseworkList.shift();
    completedCount++;
    currentStreak++;
    if (currentStreak > highestStreak) highestStreak = currentStreak;
    updateStatsDisplay();
    saveState();
    renderCoursework(courseworkList, cArea);
    if (courseworkList.length) {
      isStudyMode = false;
      pomoTime = 300;
      activeStatus.textContent = "Break Time";
      updateTimer();
      updateStudyDisplay();
      startTimer();
    } else {
      totalSessions++;
      updateStatsDisplay();
      saveState();
      alert("All assignments completed! Returning to dashboard.");
      resetTimerState();
      document.body.className = isDark
        ? "dashboard-mode dark-mode"
        : "dashboard-mode";
    }
  } else {
    if (courseworkList.length) {
      isStudyMode = true;
      const cur = courseworkList[0];
      pomoTime =
        (cur.isSplitPart2
          ? getPart2Mins(+cur.originalDuration)
          : +cur.duration) * 60;
      activeStatus.textContent = "Work Mode";
      updateTimer();
      updateStudyDisplay();
      startTimer();
    } else {
      totalSessions++;
      updateStatsDisplay();
      saveState();
      resetTimerState();
      document.body.className = isDark
        ? "dashboard-mode dark-mode"
        : "dashboard-mode";
    }
  }
};

loadState();
