import {CHUNK_SIZE, TILE_SIZE, TILES, RENDER_DIST, ENTITIES, EVICT_DIST,
        ZOOM_STEP, ZOOM_MIN, ZOOM_MAX} from "./config.js";
import { Chunk } from "./chunk.js";
import { generateChunk } from "./worldgen.js";

let nextId = 1;
function allocId(){ // Gets a unique ID for an entity
    return nextId++;
}

class Entity{
    constructor(type, tileX, tileY){
        this.etid = type;
        this.tx = tileX;
        this.ty = tileY;
        /**@type {number} */
        this.entityId = allocId();
    }

    
};

export class GameWorld{
    chunks = new Map();
    player = new Entity(ENTITIES.PLAYER,1,1);
    entities = [this.player];
    /**@type {Array<Array<number>>} */
    playerMoveQueue = []; // Schedules player to move to the following tiles, unless interrupt occurs
    interupted = false; // Flag for if player should continue doing queued moves

    constructor(seed){
        this.seed = seed;
        this.camera = {x: 0, y:0, zoom: 1};
        this.#centerCamera();
        this.#manageChunks();
    }

    update(){
        this.#manageChunks();
        if(!this.interupted && this.playerMoveQueue.length > 0){
            this.movePlayerDelta(...this.playerMoveQueue.unshift());
        }
    }

    /**
     * @param {number} entityId 
     * @returns {Entity} entity
     */
    getEntity(entityId){
        for( const entity of this.entities){
            if(entity.entityId === entityId)
                return entity;
        }
        throw("Entity not found!");
    }

    movePlayerDelta(dx, dy){ // Ignores delta moves that cannot be done
        const newCoords = [this.player.tx + dx, this.player.ty + dy];
        if(this.#moveEntity(this.player, newCoords[0], newCoords[1])){
            this.update();
            this.#centerCamera();
        }
        return;
    }

    zoomCamera(direction){
        this.camera.zoom += Math.sign(direction) * ZOOM_STEP;
        this.camera.zoom = Math.min(this.camera.zoom, ZOOM_MAX); // Clip the zoom
        this.camera.zoom = Math.max(this.camera.zoom, ZOOM_MIN);
        return;
    }

    /** 
     * @param {Entity} entity
     * Steps the player by a tile delta and keeps the camera centred on them. */
    #moveEntity(entity, tx, ty){
        const tile = this.getTile(tx, ty);
        if(tile === undefined){
            console.log("Tried to move entity onto unloaded tile");
            return false;
        }
        if(!this.#canEnter(entity, tile))
            return false;
        entity.tx = tx;
        entity.ty = ty;
        return true; // For now, always returns true.
    }

    // Move camera to center of player's tile in worldspace
    #centerCamera(){
        this.camera.x = (this.player.tx * TILE_SIZE) + (TILE_SIZE / 2);
        this.camera.y = (this.player.ty * TILE_SIZE) + (TILE_SIZE / 2);
    }

    #loadChunk(cx, cy){
        // For now, always regenerate. Later, itll check cache if chunk is modified
        return generateChunk(this.seed, cx, cy);
    }

    // For now just deletes all chunks. In future will archive modified
    #deleteChunk(chunk){
        this.chunks.delete(chunk.chunkId);
    }

    #manageChunks(){
        const playerChunk = [Math.floor(this.player.tx / CHUNK_SIZE), Math.floor(this.player.ty/ CHUNK_SIZE)]; // Chunk location of camera
        // Load in chunks within renderDist (in a square)
        for(let x = playerChunk[0] - RENDER_DIST; x <= playerChunk[0] + RENDER_DIST; x++){
            for( let y = playerChunk[1] - RENDER_DIST; y <= playerChunk[1] + RENDER_DIST; y++){
                if(this.chunks.has(`${x},${y}`))
                    continue;
                let c = this.#loadChunk(x, y);
                this.chunks.set(c.chunkId, c);
            }
        }
        // Evict chunks that are outside of evict range
        for(const [id, chunk] of this.chunks){
            const dx = Math.abs(chunk.cx - playerChunk[0]);
            const dy = Math.abs(chunk.cy - playerChunk[1]);
            if (dx > EVICT_DIST || dy > EVICT_DIST) 
                this.#deleteChunk(chunk);
        }

    }

    // Checks if entity can enter a tile TODO: actually check
    #canEnter(entity, tile){
        return true;
    }

    /**
     * 
     * @param {number} tx 
     * @param {number} ty 
     * @returns {TILES} tileType
     */
    getTile(tx, ty){
        // Locate what chunk it is in
        const cx = Math.floor(tx/CHUNK_SIZE);
        const cy = Math.floor(ty/CHUNK_SIZE);
        const c = this.chunks.get(`${cx},${cy}`);
        if(c === undefined){
            console.log("world.getTile error. Chunk not rendered");
            return c;
        }
        // JS % keeps the dividend's sign, so wrap negatives back into [0, CHUNK_SIZE)
        const col = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const row = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return c.tileAt(col, row);
    }
};