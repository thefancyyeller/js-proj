import { TILES, TILE_SIZE, CHUNK_SIZE} from "./config.js";
import {GameWorld} from "./world.js";

const spriteLib = {
    [TILES.GRASS]: "grass.png",
};

function worldToScreen(coords, camera){
    return [(coords[0] - camera.x) * camera.zoom, (coords[1] - camera.y) * camera.zoom]; 
}

export class Renderer{
    constructor(canvas) {
        this.ctx = canvas.getContext("2d");
    }

    render(gameWorld){
        // Render tiles

        return;
    }
}

