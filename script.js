const CLICK_COOLDOWN_MS = 200;
const FINAL_CLICK_MESSAGE_INTERVAL = 100;
const POPUP_VISIBLE_MS = 2400;
const POPUP_HIDE_MS = 3200;

const finalClickMessages = [
  "that's enough, weirdo.",
  'get back to work...',
  'the potato is starting to recognize you.',
  'this is your performance review now.',
  'hydration break. seriously.',
  'the foil has filed a complaint.',
  'you have achieved potato persistence.',
  'there are no more secrets in here.',
  'somewhere, a timer is judging you.',
  'the potato appreciates the attention.',
  'boss key not included.',
  'this counts as cardio, barely.',
  'you can stop whenever you want. allegedly.',
  'still here? bold choice.',
  'the tuber council is concerned.',
  'your mouse deserves a union.',
  'a watched potato never clocks out.',
  'this is not the productivity app.',
  'the steam is mostly awkward silence now.',
  'okay, one more hundred then we talk.',
  'excellent technique. questionable priorities.',
  'the potato has entered witness protection.',
  'there is no achievement. there is only potato.',
  'your dedication has been noted and archived.',
  'please blink twice if you need help.',
  'the algorithm has no idea what to do with this.',
  'some tabs were meant to be closed.',
  'the potato is emotionally unavailable.',
  'this is how legends become footnotes.',
  'you have poked past reason.',
  'the foil remembers every click.',
  'still cheaper than a meeting.',
  'a tiny spreadsheet somewhere misses you.',
  'the potato theme is looping because of you.',
  'do not cite this on your timesheet.',
  'you have unlocked absolutely nothing.',
  'the steam has unionized.',
  'please return to your regularly scheduled chaos.',
  'this is now a wellness concern.',
  'fine. the potato salutes you.',
  'you are now deep in the starch mines.',
  'your cursor has seen things.',
  'this clicker has no bottom. neither do you.',
  'the potato is considering a restraining order.',
  'productivity has left the chat.',
  'you have become the hot potato.',
  'the foil is no longer taking questions.',
  'this is what infinite scroll warned us about.',
  'a thousand clicks ago, there was hope.',
  'okay, now it is performance art.',
];

const audioSources = {
  pokes: [
    'assets/sfx/poke01.mp3',
    'assets/sfx/poke02.mp3',
    'assets/sfx/poke03.mp3',
  ],
  pop: 'assets/sfx/pop-open.mp3',
  cheers: [
    'assets/sfx/children-cheer01.mp3',
    'assets/sfx/children-cheer02.mp3',
  ],
  theme: 'assets/sfx/potato-theme-loop.mp3',
};

const phases = [
  {
    src: 'assets/foil-closed.png',
    alt: 'A closed steaming ball of crinkled foil',
    label: 'Click the closed foil hot potato',
    status: 'The hot potato is wrapped in foil.',
    clicks: 18,
    burst: 'foil',
  },
  {
    src: 'assets/potato-closed.png',
    alt: 'A whole closed baked potato sitting in open crinkled foil',
    label: 'Click the closed baked potato',
    status: 'The foil opened and revealed a whole baked potato.',
    clicks: 16,
    burst: 'potato',
  },
  {
    src: 'assets/potato-open.png',
    alt: 'A steaming baked potato open in crinkled foil',
    label: 'Click the open baked potato',
    status: 'The baked potato split open and started steaming.',
    clicks: 24,
    burst: 'potato',
  },
  {
    src: 'assets/hot-potato-eric.png',
    alt: "A cartoon baked potato wrapped in foil with a smiling bearded man's face and steam rising from the top",
    label: 'ADHD Hot Potato revealed',
    status: 'The hot potato face popped out.',
    clicks: Infinity,
    burst: 'victory',
  },
];

const clicker = document.querySelector('.clicker');
const image = document.querySelector('.hot-potato');
const particles = document.querySelector('.particle-field');
const status = document.querySelector('.sr-only[aria-live]');
const resetButton = document.querySelector('.reset-button');
const messagePopup = document.querySelector('.message-popup');

let phaseIndex = 0;
let phaseClicks = 0;
let totalClicks = 0;
let isTransitioning = false;
let lastClickAt = -Infinity;
let themeAudio = null;
let finalSequenceAudio = [];
let finalSequenceToken = 0;
let finalClickCount = 0;
let popupHideTimer = null;
let popupResetTimer = null;

for (const phase of phases.slice(1)) {
  const preload = new Image();
  preload.src = phase.src;
}

clicker.addEventListener('click', (event) => {
  const now = performance.now();
  const rect = clicker.getBoundingClientRect();
  const x = event.clientX || rect.left + rect.width / 2;
  const y = event.clientY || rect.top + rect.height / 2;

  if (isTransitioning) {
    spawnTapParticles(x, y);
    return;
  }

  if (now - lastClickAt < CLICK_COOLDOWN_MS) {
    return;
  }

  lastClickAt = now;
  totalClicks += 1;
  phaseClicks += 1;
  clicker.style.setProperty('--tap-x', `${((x - rect.left) / rect.width) * 100}%`);
  clicker.style.setProperty('--tap-y', `${((y - rect.top) / rect.height) * 100}%`);
  clicker.style.setProperty('--wiggle', `${Math.min(phaseClicks, 9)}`);

  playRandomPoke();
  pulse('tapped');
  spawnTapParticles(x, y);

  if (phaseIndex === phases.length - 1) {
    handleFinalPhaseClick();
  }

  if (phaseClicks >= phases[phaseIndex].clicks) {
    revealNextPhase();
  }
});

resetButton.addEventListener('click', () => {
  stopFinalAudio();
  resetExperience();
});

function revealNextPhase() {
  if (phaseIndex >= phases.length - 1) {
    pulse('victory');
    spawnRevealParticles(phases[phaseIndex].burst);
    return;
  }

  const outgoing = phases[phaseIndex];
  phaseIndex += 1;
  phaseClicks = 0;
  isTransitioning = true;
  const incoming = phases[phaseIndex];
  const isFinalReveal = phaseIndex === phases.length - 1;

  playPopOpen(isFinalReveal);
  pulse(outgoing.burst === 'foil' ? 'cracking' : 'launching');
  spawnRevealParticles(outgoing.burst);

  window.setTimeout(() => {
    image.src = incoming.src;
    image.alt = incoming.alt;
    clicker.setAttribute('aria-label', incoming.label);
    status.textContent = incoming.status;
    resetButton.hidden = !isFinalReveal;
    isTransitioning = false;
    pulse('revealed');
  }, 260);
}

function resetExperience() {
  phaseIndex = 0;
  phaseClicks = 0;
  totalClicks = 0;
  finalClickCount = 0;
  isTransitioning = false;
  lastClickAt = -Infinity;

  const firstPhase = phases[0];
  image.src = firstPhase.src;
  image.alt = firstPhase.alt;
  clicker.setAttribute('aria-label', firstPhase.label);
  status.textContent = firstPhase.status;
  resetButton.hidden = true;
  hideMessagePopup(true);
  clicker.classList.remove('tapped', 'cracking', 'launching', 'revealed', 'victory');
}

function pulse(className) {
  clicker.classList.remove('tapped', 'cracking', 'launching', 'revealed', 'victory');
  void clicker.offsetWidth;
  clicker.classList.add(className);
}

function handleFinalPhaseClick() {
  finalClickCount += 1;

  if (finalClickCount % FINAL_CLICK_MESSAGE_INTERVAL === 0) {
    const messageIndex = (finalClickCount / FINAL_CLICK_MESSAGE_INTERVAL - 1) % finalClickMessages.length;
    showMessagePopup(finalClickMessages[messageIndex]);
  }
}

function showMessagePopup(message) {
  clearTimeout(popupHideTimer);
  clearTimeout(popupResetTimer);
  messagePopup.textContent = message;
  messagePopup.hidden = false;
  messagePopup.classList.remove('is-visible');
  void messagePopup.offsetWidth;
  messagePopup.classList.add('is-visible');

  popupHideTimer = window.setTimeout(() => {
    messagePopup.classList.remove('is-visible');
  }, POPUP_VISIBLE_MS);

  popupResetTimer = window.setTimeout(() => {
    messagePopup.hidden = true;
  }, POPUP_HIDE_MS);
}

function hideMessagePopup(immediate = false) {
  clearTimeout(popupHideTimer);
  clearTimeout(popupResetTimer);
  messagePopup.classList.remove('is-visible');

  if (immediate) {
    messagePopup.hidden = true;
  } else {
    popupResetTimer = window.setTimeout(() => {
      messagePopup.hidden = true;
    }, POPUP_HIDE_MS - POPUP_VISIBLE_MS);
  }
}

function playRandomPoke() {
  const src = audioSources.pokes[Math.floor(Math.random() * audioSources.pokes.length)];
  playOneShot(src, 0.62);
}

function playPopOpen(withFinalSequence = false) {
  const pop = makeAudio(audioSources.pop, 0.82);

  if (withFinalSequence) {
    const token = finalSequenceToken + 1;
    pop.onended = () => {
      if (token === finalSequenceToken && phaseIndex === phases.length - 1) {
        playFinalCheers();
      }
    };
    playAudio(pop);
    startFinalTheme();
    return;
  }

  playAudio(pop);
}

function startFinalTheme() {
  stopFinalAudio();
  themeAudio = makeAudio(audioSources.theme, 0.34);
  themeAudio.loop = true;
  finalSequenceAudio = [themeAudio];
  playAudio(themeAudio);
}

function playFinalCheers() {
  const firstCheer = makeAudio(audioSources.cheers[0], 0.82);
  const secondCheer = makeAudio(audioSources.cheers[1], 0.82);
  finalSequenceAudio.push(firstCheer, secondCheer);

  firstCheer.onended = () => playAudio(secondCheer);
  playAudio(firstCheer);
}

function stopFinalAudio() {
  finalSequenceToken += 1;

  for (const audio of finalSequenceAudio) {
    stopAudio(audio);
  }

  if (themeAudio) {
    stopAudio(themeAudio);
  }

  finalSequenceAudio = [];
  themeAudio = null;
}

function playOneShot(src, volume = 1) {
  const audio = makeAudio(src, volume);
  playAudio(audio);
  return audio;
}

function makeAudio(src, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.preload = 'auto';
  return audio;
}

function playAudio(audio) {
  const result = audio.play();

  if (result && typeof result.catch === 'function') {
    result.catch(() => {});
  }
}

function stopAudio(audio) {
  audio.pause();
  audio.currentTime = 0;
}

function spawnTapParticles(x, y) {
  const symbols = getTapSymbols();
  const count = phaseIndex === phases.length - 1 ? 22 : 7;
  const spread = phaseIndex === phases.length - 1 ? 130 : 64;

  for (let i = 0; i < count; i += 1) {
    createParticle({
      x,
      y,
      symbol: symbols[i % symbols.length],
      spread,
      life: 520 + Math.random() * (phaseIndex === phases.length - 1 ? 760 : 320),
      size: phaseIndex === phases.length - 1
        ? 0.85 + Math.random() * 1.15
        : 0.75 + Math.random() * 0.55,
    });
  }
}

function getTapSymbols() {
  if (phaseIndex === 0) {
    return ['✦', '✧', '▱'];
  }

  if (phaseIndex === phases.length - 1) {
    return ['🥔', '🦄', '🦴', '🍺', '🧈', '✨', '🔥', '🌀', '🍟', '🎉', '💀', '⚡', '🛸', '🧃', '🥨', '🫠'];
  }

  if (phaseIndex >= 2) {
    return ['🥔', '🧈', '✨', '✦', '·'];
  }

  return ['🥔', '✦', '·'];
}

function spawnRevealParticles(type) {
  const rect = clicker.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height * 0.48;
  const symbols = type === 'foil'
    ? ['✦', '✧', '▱', '▰']
    : ['🥔', '✨', '✦', '🥔'];

  for (let i = 0; i < 34; i += 1) {
    createParticle({
      x: centerX + (Math.random() - 0.5) * rect.width * 0.35,
      y: centerY + (Math.random() - 0.5) * rect.height * 0.18,
      symbol: symbols[i % symbols.length],
      spread: 180,
      life: 820 + Math.random() * 640,
      size: 0.85 + Math.random() * 0.9,
    });
  }
}

function createParticle({ x, y, symbol, spread, life, size }) {
  const particle = document.createElement('span');
  const angle = Math.random() * Math.PI * 2;
  const distance = spread * (0.25 + Math.random());
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - spread * 0.4;

  particle.className = 'particle';
  particle.textContent = symbol;
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.setProperty('--dx', `${dx}px`);
  particle.style.setProperty('--dy', `${dy}px`);
  particle.style.setProperty('--life', `${life}ms`);
  particle.style.setProperty('--size', `${size}`);

  particles.append(particle);
  window.setTimeout(() => particle.remove(), life);
}
