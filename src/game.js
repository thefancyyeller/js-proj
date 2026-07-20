import { GameWorld } from "./world";
import { loadSprites, Renderer } from "./renderer";
import { InputManager} from "./inputManager";
import { InputEvent, KeyPressEvent, MouseWheelEvent } from "./inputEvents";


// Maps raw KeyboardEvent.code values to tile-space deltas.
const MOVE_KEYS = {
    Numpad1: [-1,  1], Numpad2: [ 0,  1], Numpad3: [ 1,  1],
    Numpad4: [-1,  0], Numpad5: [ 0,  0], Numpad6: [ 1,  0],
    Numpad7: [-1, -1], Numpad8: [ 0, -1], Numpad9: [ 1, -1],

    KeyW: [ 0, -1],
    KeyA: [-1,  0],
    KeyS: [ 0,  1],
    KeyD: [ 1,  0],
};

const canvas = document.getElementById('game');
const world = new GameWorld(1);
/**@type {Renderer} */
const renderer = new Renderer(canvas);
const inputManager = new InputManager(window, canvas);

// Init
loadSprites();

// Gameloop lives here, called when we get animation frame
function frame(timestamp){
    // Process Inputs
    const inputEvents = inputManager.drain(); // Read Queued Inputs
    for(const event of inputEvents){
        if(event instanceof(KeyPressEvent)){ // For now, always divert to gameWorld
            const dirVec = MOVE_KEYS[event.code];
            world.movePlayerDelta(dirVec[0], dirVec[1]);
            continue;
        }
        if(event instanceof MouseWheelEvent){
            world.zoomCamera(event.up? 1 : -1);
            continue;
        }
    }

    // Render
    renderer.render(world);
    requestAnimationFrame(frame);
}

// Starts the game
requestAnimationFrame(frame);