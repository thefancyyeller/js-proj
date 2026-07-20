import { TILES, TILE_SIZE, CHUNK_SIZE, getTileName, ENTITIES, showPlayerPath} from "./config.js";
import {GameWorld} from "./world.js";

// Map of tile IDs to sprite paths (with specific non-integer exceptions)
const tileSpritePaths = {
    [TILES.GRASS]: "/grass.png",
    darkGrass: "/darkGrass.png",
};

const entitySpritePaths ={
    [ENTITIES.PLAYER]: "/player.png"
};

const debugSpritePaths = {
    "crossHair": "/crossHair.png"
};

// Map of sprite paths to actually loaded sprites
const loadedSprites = {};

/** Returns a promise array of all sprites being loaded*/
export function loadSprites(){
    function imageLoadPromise(spritePath){
        return new Promise((resolve, reject)=>{
            const img = new Image();
            img.onload = () => {loadedSprites[spritePath] = img; resolve();};
            img.onerror = () => reject(new Error(`Failed to load sprite ${spritePath}`));
            img.src = spritePath;
        });
    };
    const paths = [
    ...Object.values(tileSpritePaths),
    ...Object.values(entitySpritePaths),
    ...Object.values(debugSpritePaths),
    ];
    return Promise.all(paths.map(imageLoadPromise));
}

export class Renderer{

    constructor(canvas) {
        /** @type {Canvas} */
        this.canvas = canvas;
        /**@type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext("2d");
        /**@type {boolean} */
        this.animations = true;
    }

    worldToScreen(coords, camera){
        return [
            (coords[0] - camera.x) * camera.zoom + this.canvas.width  / 2,
            (coords[1] - camera.y) * camera.zoom + this.canvas.height / 2,
        ];
    }

    screenToWorld(coords, camera){
        return [
            (coords[0] - this.canvas.width  / 2) / camera.zoom + camera.x,
            (coords[1] - this.canvas.height / 2) / camera.zoom + camera.y,
        ];
    }

    tileToWorld(tCoords){
        return [tCoords[0] * TILE_SIZE, tCoords[1] * TILE_SIZE];
    }

    /**
     * 
     * @param {GameWorld} gameWorld 
     * @returns 
     */
    render(gameWorld){
        const {camera} = gameWorld;

        // Render tiles
        const tilesVert = Math.ceil(this.canvas.height / (TILE_SIZE * camera.zoom));
        const tilesHorizont = Math.ceil(this.canvas.width / (TILE_SIZE * camera.zoom));
        // Figure out the tile we start rendering at, working back from the
        // camera to the world point at the canvas' top-left corner
        const topLeft = this.screenToWorld([0, 0], camera);
        let startTile = [Math.floor(topLeft[0] / TILE_SIZE), Math.floor(topLeft[1] / TILE_SIZE)];
        const drawSize = TILE_SIZE * camera.zoom;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for(let tx = startTile[0]; tx <= startTile[0] + tilesHorizont; tx++){
            for(let ty = startTile[1]; ty <= startTile[1] + tilesVert; ty++){
                const t = gameWorld.getTile(tx, ty);
                if(t === undefined) // Chunk not loaded yet
                    continue;
                let tSprite;
                if(t === TILES.GRASS && ((tx + ty) % 2 === 0)){// Special case to make grass look more interesting
                    tSprite = loadedSprites["/darkGrass.png"];
                }
                else{
                    tSprite = loadedSprites[tileSpritePaths[t]];
                    if(tSprite === undefined){
                        throw new Error(`Failed to find sprite for ${getTileName(t)}`);
                    }
                }
                const screenCoords = this.worldToScreen([tx*TILE_SIZE, ty*TILE_SIZE], camera);
                this.ctx.drawImage(tSprite, screenCoords[0], screenCoords[1], drawSize, drawSize);
            }
        }

        // Render Entities
        for(const entity of gameWorld.entities){
            const sprite = loadedSprites[entitySpritePaths[entity.etid]];
            const screenCoords = this.worldToScreen([entity.tx * TILE_SIZE, entity.ty * TILE_SIZE], gameWorld.camera);
            this.ctx.drawImage(sprite, screenCoords[0], screenCoords[1], TILE_SIZE * camera.zoom, TILE_SIZE * camera.zoom);
        }

        // Render player path
        if(showPlayerPath){
            const sprite = loadedSprites[debugSpritePaths["crossHair"]];
            for(const step of gameWorld.playerMoveQueue){
                const screenCoords = this.worldToScreen(this.tileToWorld(step), camera);
                this.ctx.drawImage(sprite, screenCoords[0], screenCoords[1], drawSize, drawSize);
            }
        }

    }
}

