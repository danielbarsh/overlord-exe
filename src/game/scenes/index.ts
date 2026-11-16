import type { SceneId } from '../types';
import { assemblyScene } from './assembly';
import { blueprintScene } from './blueprint';
import { chasmScene } from './chasm';
import { coreScene } from './core';
import { firewallScene } from './firewall';
import { gateScene } from './gate';
import { laserScene } from './lasers';
import type { SceneModule } from './types';

/** Scene registry: one module per stage theme. */
export const SCENES: Record<string, SceneModule> = {
  gate: gateScene,
  lasers: laserScene,
  assembly: assemblyScene,
  blueprint: blueprintScene,
  firewall: firewallScene,
  chasm: chasmScene,
  core: coreScene,
};

export function getScene(id: SceneId): SceneModule {
  return SCENES[id] ?? gateScene;
}
