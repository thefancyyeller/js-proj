import { TILES, TILE_SIZE, CHUNK_SIZE, getTileName, ENTITIES, showPlayerPath} from "./config.js";
import { EntityRenderEvent, EntitySlide } from "./renderEvents.js";
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

/** Returns a single Promise that resolves once all sprites have loaded. */
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

/**
 * @overload
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
/**
 * @overload
 * @param {number[]} a
 * @param {number[]} b
 * @param {number} t
 * @returns {number[]}
 */
/**
 * @param {number|number[]} a
 * @param {number|number[]} b
 * @param {number} t
 */
export function lerp(a, b, t){
    if(typeof a === 'number' && typeof b === 'number')
        return a + ((b-a) * t);
    if(a.length !== b.length)
        throw ("Lerp error. Incompatible dimensions")
    let out = [...a]; // Clone a if both are arrays
    for(const idx in a){
        out[idx] = lerp(a[idx], b[idx], t);
    }
    return out;
}

export class Renderer{

    constructor(canvas) {
        /** @type {Canvas} */
        this.canvas = canvas;
        /**@type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext("2d");
        /**@type {boolean} */
        this.animationLock = false;
        /**@type {RenderEvent[]} */
        this.renderEvents = [];
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
     * @param {RendererEvents[]} events 
     */
    addEvents(events){
        if(events == null)
            return;
        this.renderEvents.push(...events);
        return;
    }

    /**
     * 
     * @param {GameWorld} gameWorld 
     * @returns 
     */
    render(gameWorld){
        const {camera} = gameWorld;
        let {renderEvents} = this;
        this.animationLock = false;
        // Handle animation array
        renderEvents = renderEvents.filter(e=> performance.now() < e.startTime + e.duration); // Remove expired animations
        for(const e of renderEvents){
            if(e.blocking)
                this.animationLock = true;
        }

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
        const animatedEntities = renderEvents.filter(e => e instanceof EntityRenderEvent).map(e => e.entityId);// Entities that should not be drawn as usual
        for(const entity of gameWorld.entities){
            if(animatedEntities.includes(entity.entityId)) // Being animated; drawn by the animation loop instead
                continue;
            const sprite = loadedSprites[entitySpritePaths[entity.etid]];
            const screenCoords = this.worldToScreen([entity.tx * TILE_SIZE, entity.ty * TILE_SIZE], gameWorld.camera);
            this.ctx.drawImage(sprite, screenCoords[0], screenCoords[1], TILE_SIZE * camera.zoom, TILE_SIZE * camera.zoom);
        }

        // Animations
        for(const e of renderEvents){
            if(e instanceof EntitySlide){
                const percent = Math.min((performance.now() - e.startTime) / e.duration, 1);
                const startWorldCoords = this.tileToWorld([e.startTX, e.startTY]);
                const endWorldCoords = this.tileToWorld([e.destTX, e.destTY]);
                const destWorld= lerp(startWorldCoords, endWorldCoords, percent);
                const destScreen = this.worldToScreen(destWorld, camera);
                const sprite = this.#getEntitySprite(e.entityId, gameWorld);
                this.ctx.drawImage(sprite, ...destScreen, camera.zoom * TILE_SIZE, camera.zoom * TILE_SIZE);
            }
            else{
                throw(`Unsupported animation type ${typeof e}`);
            }
        }

        // Debug Stuff
        // Render player path
        if(showPlayerPath){
            if(gameWorld.playerMoveQueue.length === 0)
                return;
            const sprite = loadedSprites[debugSpritePaths["crossHair"]];
            for(const step of gameWorld.playerMoveQueue){
                const screenCoords = this.worldToScreen(this.tileToWorld(step), camera);
                this.ctx.drawImage(sprite, screenCoords[0], screenCoords[1], drawSize, drawSize);
            }
        }

    }

    /**
     * 
     * @param {number} entityId
     * @param {GameWorld} world
     * @returns {HTMLImageElement}
     * Gets loaded sprite for an entity (Warning: DO NOT give it an ETID)
     */
    #getEntitySprite(entityId, world){
        const etid = world.getEntity(entityId).etid;
        return loadedSprites[entitySpritePaths[etid]];
    }
}

