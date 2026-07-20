import { GameWorld } from "./world";
import { Renderer, loadSprites } from "./renderer";
import { Input } from "./input.js";

const canvas = document.getElementById('game');
const world = new GameWorld(1);
const renderer = new Renderer(canvas);
const input = new Input();

function gameTick(){
    for(const event of input.drain())
        world.handleEvent(event);
    world.update();
    renderer.render(world);
    requestAnimationFrame(gameTick);
}

loadSprites().then(() => requestAnimationFrame(gameTick));
