import { WEAPONS } from './combat.js';
// Consistent, labelled silhouettes rather than platform-dependent emoji.
const originalShapes = [
  '<path d="M10 23v-9c0-3 4-3 4 0V9c0-3 4-3 4 0v4-6c0-3 4-3 4 0v6-3c0-3 4-3 4 0v12l-5 7h-7z"/>',
  '<path d="M5 10h24v7H18l-2 12h-7l2-12H5z"/><path d="M20 17v5h-4"/>',
  '<path d="M3 12h27v7H17v10h-6V19H6v5H3z"/><path d="M22 9h5v3M25 19v5"/>',
  '<path d="M2 11h10v15H2zM12 12h19v12H12zM6 7h9v4M3 26v5"/><path d="M14 16h17M14 20h17"/>',
  '<path d="M3 9h25v12H12l-3 9H3l4-11H3zM16 21v5h9v-5M28 10h4v10h-4"/>',
  '<path d="M2 12h10l3-2h17v5H15l-4 4-6 9H1l5-12H2z"/><path d="M16 16h11v4H16z"/>',
];
const shapes = [0, 1, 5, 2, 3, 4].map(index => originalShapes[index]);
export function createWeaponPicker(container, select) {
  const buttons = Array.from({ length: 9 }, (_, index) => {
    const button = document.createElement('button'), weapon = WEAPONS[index];
    button.type = 'button'; button.className = 'weapon-slot'; button.disabled = !weapon;
    button.title = `${index + 1}: ${weapon?.name || 'Empty slot'}`;
    button.setAttribute('aria-label', button.title);
    button.innerHTML = `<kbd>${index + 1}</kbd><svg viewBox="0 0 34 34" aria-hidden="true">${shapes[index] || '<path d="M11 17h12"/>'}</svg><span>${(index === 5 ? 'Launcher' : weapon?.name) || 'Empty'}</span>`;
    button.addEventListener('click', () => select(index)); container.appendChild(button);
    return button;
  });
  return selected => buttons.forEach((button, index) => {
    button.classList.toggle('selected', index === selected);
    button.setAttribute('aria-pressed', String(index === selected));
  });
}

export function weaponIcon(index) { return shapes[index] || shapes[0]; }
