import {CHUNK_SIZE, TILE_SIZE, TILES, RENDER_DIST, ENTITIES, EVICT_DIST} from "./config.js";
import { Chunk } from "./chunk.js";
import { generateChunk } from "./worldgen.js";

class Entity{
    constructor(type, tileX, tileY){
        this.etid = type;
        this.tx = tileX;
        this.ty = tileY;
    }
};

export class GameWorld{
    chunks = new Map();
    player = new Entity(ENTITIES.PLAYER,1,1);
    entities = [this.player];

    constructor(seed){
        this.seed = seed;
        this.camera = {x: 0, y:0, zoom: 1};
        this.#centerCamera();
        this.#manageChunks();
    }

    update(){
        this.#manageChunks();
    }

    /**
     * Applies one decoded input event.
     * @param {{type: string, dx: number, dy: number}} event
     */
    handleEvent(event){
        if(event.type === "move")
            this.movePlayer(event.dx, event.dy);
    }

    /** Steps the player by a tile delta and keeps the camera centred on them. */
    movePlayer(dx, dy){
        this.player.tx += dx;
        this.player.ty += dy;
        this.#centerCamera();
    }

    // Camera is in world pixels and marks the centre of the view, so it just
    // sits on the player's tile centre -- no screen size involved.
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

    /**
     * 
     * @param {number} tx 
     * @param {number} ty 
     * @returns {TILES}
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