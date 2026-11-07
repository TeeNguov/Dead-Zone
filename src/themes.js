import { makeBat } from './bats.js';
import { makePerson, makeQuadruped, makeBoss, setWorldTheme } from './world.js';
export const THEMES = {
  zombies: { label: '1 · Zombies', title: 'Dead Zone', subtitle: 'SURVIVE THE OUTBREAK', fog: 0x657263, nightFog: 0x414d40 },
  horror: { label: '2 · Fogbound horror', title: 'Fogbound', subtitle: 'A SILENT HILL–INSPIRED CITY', fog: 0x65716b, nightFog: 0x51433b },
};
export function applyActorTheme(actors, theme) {
  if (!THEMES[theme]) return false;
  setWorldTheme(theme);
  for (const actor of actors) {
    const replacement = actor.isBoss ? makeBoss() : actor.flying ? makeBat() : actor.monsterType === 'hound' ? makeQuadruped() : makePerson(false, actor.monsterType);
    // Retain the actor root and position object used by navigation and combat.
    for (const child of [...actor.group.children]) {
      child.traverse(n => { if (n.isMesh && n.geometry.type === 'ConeGeometry') n.geometry.dispose(); });
      actor.group.remove(child);
    }
    actor.group.add(...[...replacement.group.children]);
    for (const key of ['legL','legR','kneeL','kneeR','armL','armR','elbowL','elbowR','rightHand','leftHand','quadrupedLegs','quadrupedKnees','height','mouthHeight','visualTheme','wingL','wingR']) {
      if (key in replacement) actor[key] = replacement[key];
    }
  }
  return true;
}
