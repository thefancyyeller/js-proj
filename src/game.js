import { GameWorld } from "./world";
import { loadSprites, Renderer } from "./renderer";
import { InputManager} from "./inputManager";
import { InputEvent, KeyPressEvent, MouseLeftClickEvent, MouseWheelEvent } from "./inputEvents";
import { TILE_SIZE } from "./config";
import { ContinuePathIntent, PlayerMoveIntent, SetPathIntent } from "./worldIntent";


// Maps raw KeyboardEvent.code values to tile-space deltas.
const MOVE_KEYS = {
    Numpad1: [-1,  1], Numpad2: [ 0,  1], Numpad3: [ 1,  1],
    Numpad4: [-1,  0], Numpad5: [ 0,  0], Numpad6: [ 1,  0],
    Numpad7: [-1, -1], Numpad8: [ 0, -1], Numpad9: [ 1, -1],

    KeyW: [ 0, -1],
    KeyA: [-1,  0],
    KeyS: [ 0,  1],
    KeyD: [ 1,  0],

    ArrowUp:    [ 0, -1],
    ArrowDown:  [ 0,  1],
    ArrowLeft:  [-1,  0],
    ArrowRight: [ 1,  0],
};

const canvas = document.getElementById('game');
const world = new GameWorld(1);
/**@type {Renderer} */
const renderer = new Renderer(canvas);
const inputManager = new InputManager(window, canvas);

// Init — sprites must finish loading before the first render, otherwise
// renderer.render throws "Failed to find sprite for GRASS".
const spritesLoaded = loadSprites();

// Gameloop lives here, called when we get animation frame
function frame(timestamp){
    world.updateCamera(); // Camera always takes a step toward dest.
    // Do not process anything while animations are happening
    if(renderer.animationLock === false){
        const inputEvents = inputManager.drain(); // Read Queued Inputs
        if(inputEvents.length === 0)
            world.giveIntent(new ContinuePathIntent());
        for(const event of inputEvents){
            if(event instanceof(KeyPressEvent)){ // For now, always divert keypress to gameWorld
                const dirVec = MOVE_KEYS[event.code];
                if(dirVec === undefined)
                    continue; // if no binding for key, ignore it (don't kill the loop)
                world.giveIntent(new PlayerMoveIntent(...dirVec));
                break;
            }
            if(event instanceof MouseWheelEvent){
                world.zoomCamera(event.up? 1 : -1);
                break;
            }
            if(event instanceof MouseLeftClickEvent){
                const worldCoords = renderer.screenToWorld([event.sx, event.sy], world.camera);
                const tileCoords = worldCoords.map(coord => Math.floor(coord/TILE_SIZE));
                world.giveIntent(new SetPathIntent(...tileCoords));
                break;
            }
        }
        // Process world
        renderer.addEvents(world.takeTurn());
    }

    // Render
    renderer.render(world);
    requestAnimationFrame(frame);
}

// Starts the game once every sprite is loaded
spritesLoaded.then(() => {
    requestAnimationFrame(frame);
}).catch((err) => {
    console.error("Sprite loading failed; game not started.", err);
});