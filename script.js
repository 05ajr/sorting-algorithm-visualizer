const algorithmInput = document.querySelector("#algorithm");
const sizeInput = document.querySelector("#size");
const speedInput = document.querySelector("#speed");
const barsContainer = document.querySelector("#bars");
const playButton = document.querySelector("#playButton");
const stepButton = document.querySelector("#stepButton");
const resetButton = document.querySelector("#resetButton");
const shuffleButton = document.querySelector("#shuffleButton");

const explanations = {
  bubble: "Bubble Sort compares neighboring numbers and swaps them when they're out of order. It keeps making passes until nothing needs to move. Its time complexity is O(n²) on average and in the worst case, but O(n) in the best case when the list is already sorted.",
  selection: "Selection Sort finds the smallest number in the unsorted part of the list and moves it to the next open position. Its time complexity is O(n²) in the best, average, and worst cases because it checks the remaining numbers each time.",
  insertion: "Insertion Sort builds a sorted section one number at a time, moving each new number left until it fits. Its time complexity is O(n) in the best case for an already sorted list, and O(n²) on average and in the worst case.",
  bozo: "Bozo Sort checks whether the list is sorted. If it isn't, it swaps two random numbers and tries again. Its best case is O(n), its expected time is roughly O(n x n!), and there is no fixed worst-case time limit. It can take a very long time even with a small list."
};

const stabilityInfo = {
  bubble: {
    stable: true,
    description: "Stable: equal numbers stay in their original relative order because Bubble Sort only swaps when the left number is larger."
  },
  selection: {
    stable: false,
    description: "Not stable: swapping the smallest number into place can move an equal number past another one."
  },
  insertion: {
    stable: true,
    description: "Stable: equal numbers keep their original order because Insertion Sort doesn't move one past another with the same value."
  },
  bozo: {
    stable: false,
    description: "Not stable: random swaps can change the order of equal numbers, even when the final list is sorted."
  }
};

let values = [];
let steps = [];
let stepIndex = -1;
let timer = null;
let bozo = null;

function randomValues(count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 85) + 15);
}

function makeSteps(numbers, algorithm) {
  const arr = [...numbers];
  const history = [];
  let comparisons = 0;
  let swaps = 0;

  function record(active = [], sorted = []) {
    history.push({ values: [...arr], active: [...active], sorted: [...sorted], comparisons, swaps });
  }

  if (algorithm === "bubble") {
    for (let i = 0; i < arr.length - 1; i++) {
      let changed = false;
      for (let j = 0; j < arr.length - 1 - i; j++) {
        comparisons++;
        record([j, j + 1], Array.from({ length: i }, (_, k) => arr.length - 1 - k));
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          swaps++;
          changed = true;
          record([j, j + 1], Array.from({ length: i }, (_, k) => arr.length - 1 - k));
        }
      }
      record([], Array.from({ length: i + 1 }, (_, k) => arr.length - 1 - k));
      if (!changed) break;
    }
  } else if (algorithm === "selection") {
    for (let i = 0; i < arr.length - 1; i++) {
      let smallest = i;
      for (let j = i + 1; j < arr.length; j++) {
        comparisons++;
        record([smallest, j], Array.from({ length: i }, (_, k) => k));
        if (arr[j] < arr[smallest]) smallest = j;
      }
      if (smallest !== i) {
        [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
        swaps++;
      }
      record([i, smallest], Array.from({ length: i + 1 }, (_, k) => k));
    }
  } else if (algorithm === "insertion") {
    for (let i = 1; i < arr.length; i++) {
      let j = i;
      while (j > 0) {
        comparisons++;
        record([j - 1, j]);
        if (arr[j - 1] <= arr[j]) break;
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        swaps++;
        record([j - 1, j]);
        j--;
      }
      record([], Array.from({ length: i + 1 }, (_, k) => k));
    }
  }

  record([], arr.map((_, i) => i));
  return history;
}

function drawBars(numbers, active = [], sorted = []) {
  const fragment = document.createDocumentFragment();
  numbers.forEach((number, index) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    if (sorted.includes(index)) bar.classList.add("sorted");
    if (active.includes(index)) bar.classList.add("active");
    bar.style.height = `${number}%`;
    bar.title = `Position ${index + 1}: ${number}`;
    fragment.append(bar);
  });
  barsContainer.replaceChildren(fragment);
  barsContainer.setAttribute("aria-label", `Bars with values ${numbers.join(", ")}`);
}

function updateCounters(state, stepsShown) {
  document.querySelector("#comparisons").textContent = state.comparisons;
  document.querySelector("#swaps").textContent = state.swaps;
  document.querySelector("#steps").textContent = stepsShown;
}

function pause() {
  clearInterval(timer);
  timer = null;
  const finished = bozo ? bozo.finished : stepIndex === steps.length - 1;
  const started = bozo ? bozo.stepsShown > 0 : stepIndex >= 0;
  playButton.textContent = finished ? "Finished" : started ? "Resume" : "Start";
}

function reset() {
  pause();
  const bozoSelected = algorithmInput.value === "bozo";
  const previousSize = values.length;

  sizeInput.min = bozoSelected ? "3" : "8";
  sizeInput.max = bozoSelected ? "6" : "45";
  if (previousSize > Number(sizeInput.max) || previousSize < Number(sizeInput.min)) {
    sizeInput.value = bozoSelected ? "5" : "25";
    values = randomValues(Number(sizeInput.value));
  }

  document.querySelector("#sizeValue").textContent = sizeInput.value;
  document.querySelector("#bozoHint").hidden = !bozoSelected;
  document.querySelector(".stats-note").textContent = bozoSelected
    ? "Each step is one random swap followed by a sortedness check."
    : "Each step is one frame of the animation, including comparisons and swaps.";

  bozo = bozoSelected ? { values: [...values], comparisons: 0, swaps: 0, stepsShown: 0, finished: false } : null;
  steps = bozoSelected ? [] : makeSteps(values, algorithmInput.value);
  stepIndex = -1;
  playButton.textContent = "Start";
  updateCounters({ comparisons: 0, swaps: 0 }, 0);
  document.querySelector("#status").textContent = "Ready";
  document.querySelector("#algorithmTitle").textContent = algorithmInput.selectedOptions[0].textContent;
  document.querySelector("#explanationText").textContent = explanations[algorithmInput.value];
  const stability = stabilityInfo[algorithmInput.value];
  const stabilityLabel = document.querySelector("#stability");
  stabilityLabel.textContent = stability.stable ? "Stable" : "Not stable";
  stabilityLabel.className = stability.stable ? "stability stable" : "stability unstable";
  document.querySelector("#stabilityText").textContent = stability.description;
  playButton.disabled = false;
  stepButton.disabled = false;
  drawBars(values);
}

function finishSorting() {
  pause();
  document.querySelector("#status").textContent = "Sorted";
  playButton.disabled = true;
  stepButton.disabled = true;
}

function checkBozoSorted() {
  for (let i = 1; i < bozo.values.length; i++) {
    bozo.comparisons++;
    if (bozo.values[i - 1] > bozo.values[i]) return false;
  }
  return true;
}

function nextBozoStep() {
  if (!bozo || bozo.finished) return;

  if (bozo.stepsShown === 0 && checkBozoSorted()) {
    bozo.finished = true;
    drawBars(bozo.values, [], bozo.values.map((_, i) => i));
    updateCounters(bozo, bozo.stepsShown);
    finishSorting();
    return;
  }

  const first = Math.floor(Math.random() * bozo.values.length);
  let second = Math.floor(Math.random() * (bozo.values.length - 1));
  if (second >= first) second++;

  [bozo.values[first], bozo.values[second]] = [bozo.values[second], bozo.values[first]];
  bozo.swaps++;
  bozo.stepsShown++;
  bozo.finished = checkBozoSorted();

  const sorted = bozo.finished ? bozo.values.map((_, i) => i) : [];
  drawBars(bozo.values, bozo.finished ? [] : [first, second], sorted);
  updateCounters(bozo, bozo.stepsShown);

  if (bozo.finished) finishSorting();
  else document.querySelector("#status").textContent = "Sorting";
}

function nextStep() {
  if (bozo) {
    nextBozoStep();
    return;
  }
  if (stepIndex >= steps.length - 1) return;
  stepIndex++;
  const current = steps[stepIndex];
  drawBars(current.values, current.active, current.sorted);
  updateCounters(current, stepIndex + 1);

  if (stepIndex === steps.length - 1) finishSorting();
  else document.querySelector("#status").textContent = "Sorting";
}

function start() {
  if (timer || (bozo ? bozo.finished : stepIndex >= steps.length - 1)) return;
  playButton.textContent = "Pause";
  timer = setInterval(nextStep, 650 - Number(speedInput.value) * 55);
}

playButton.addEventListener("click", () => {
  if (timer) pause();
  else start();
});
stepButton.addEventListener("click", () => {
  pause();
  nextStep();
});
resetButton.addEventListener("click", reset);
shuffleButton.addEventListener("click", () => {
  values = randomValues(Number(sizeInput.value));
  reset();
});
sizeInput.addEventListener("input", () => {
  document.querySelector("#sizeValue").textContent = sizeInput.value;
  values = randomValues(Number(sizeInput.value));
  reset();
});
speedInput.addEventListener("input", () => {
  document.querySelector("#speedValue").textContent = speedInput.value;
  if (timer) {
    pause();
    start();
  }
});
algorithmInput.addEventListener("change", reset);

values = randomValues(Number(sizeInput.value));
reset();
