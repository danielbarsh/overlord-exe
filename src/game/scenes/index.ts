import type { SceneId } from '../types';
import { assemblyScene } from './assembly';
import { blueprintScene } from './blueprint';
import { gateScene } from './gate';
import { laserScene } from './lasers';
import type { SceneModule } from './types';

/**
 * Scene registry. Stages 5–7: add e.g. `firewall` (encapsulation),
 * `chasm` (inheritance), `core` (final boss).
 */
export const SCENES: Record<string, SceneModule> = {
  gate: gateScene,
  lasers: laserScene,
  assembly: assemblyScene,
  blueprint: blueprintScene,
};

export function getScene(id: SceneId): SceneModule {
  return SCENES[id] ?? gateScene;
}
