import * as THREE from "https://esm.sh/three@0.185.1";
import { RoomEnvironment } from "https://esm.sh/three@0.185.1/examples/jsm/environments/RoomEnvironment.js";
/** Shared, static image-based interior lighting; never replaces the AR sky or XR lights. */
export function createInteriorEnvironment(renderer) {
  const room = new RoomEnvironment(),
    generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(room, 0.04);
  room.dispose();
  generator.dispose();
  target.texture.userData.sharedInteriorEnvironment = true;
  return {
    texture: target.texture,
    dispose() {
      target.dispose();
    },
  };
}
