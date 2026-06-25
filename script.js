const phases = [
  {
    src: 'assets/foil-closed.png',
    alt: 'A closed steaming ball of crinkled foil',
    label: 'Click the closed foil hot potato',
    status: 'The hot potato is wrapped in foil.',
    clicks: 9,
    burst: 'foil',
  },
  {
    src: 'assets/potato-closed.png',
    alt: 'A whole closed baked potato sitting in open crinkled foil',
    label: 'Click the closed baked potato',
    status: 'The foil opened and revealed a whole baked potato.',
    clicks: 8,
    burst: 'potato',
  },
  {
    src: 'assets/potato-open.png',
    alt: 'A steaming baked potato open in crinkled foil',
    label: 'Click the open baked potato',
    status: 'The baked potato split open and started steaming.',
    clicks: 12,
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
const status = document.querySelector('[aria-live]');

let phaseIndex = 0;
let phaseClicks = 0;
let totalClicks = 0;
let isTransitioning = false;

for (const phase of phases.slice(1)) {
  const preload = new Image();
  preload.src = phase.src;
}

clicker.addEventListener('click', (event) => {
  const rect = clicker.getBoundingClientRect();
  const x = event.clientX || rect.left + rect.width / 2;
  const y = event.clientY || rect.top + rect.height / 2;

  if (isTransitioning) {
    spawnTapParticles(x, y);
    return;
  }

  totalClicks += 1;
  phaseClicks += 1;
  clicker.style.setProperty('--tap-x', `${((x - rect.left) / rect.width) * 100}%`);
  clicker.style.setProperty('--tap-y', `${((y - rect.top) / rect.height) * 100}%`);
  clicker.style.setProperty('--wiggle', `${Math.min(phaseClicks, 9)}`);

  pulse('tapped');
  spawnTapParticles(x, y);

  if (phaseClicks >= phases[phaseIndex].clicks) {
    revealNextPhase();
  }
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

  pulse(outgoing.burst === 'foil' ? 'cracking' : 'launching');
  spawnRevealParticles(outgoing.burst);

  window.setTimeout(() => {
    image.src = incoming.src;
    image.alt = incoming.alt;
    clicker.setAttribute('aria-label', incoming.label);
    status.textContent = incoming.status;
    isTransitioning = false;
    pulse('revealed');
  }, 260);
}

function pulse(className) {
  clicker.classList.remove('tapped', 'cracking', 'launching', 'revealed', 'victory');
  void clicker.offsetWidth;
  clicker.classList.add(className);
}

function spawnTapParticles(x, y) {
  const symbols = phaseIndex === 0 ? ['✦', '✧', '▱'] : ['🥔', '✦', '·'];
  for (let i = 0; i < 7; i += 1) {
    createParticle({
      x,
      y,
      symbol: symbols[i % symbols.length],
      spread: 64,
      life: 520 + Math.random() * 320,
      size: 0.75 + Math.random() * 0.55,
    });
  }
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
