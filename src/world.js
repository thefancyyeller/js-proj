import {CHUNK_SIZE, TILE_SIZE, TILES, RENDER_DIST, ENTITIES, EVICT_DIST} from "./config.js";
import { Chunk } from "./chunk.js";
import { generateChunk } from "./worldgen.js";

class Entity{
    constructor(type, tileX, tileY){
        this.type = type;
        this.tx = tileX;
        this.ty = tileY;
    }
};

export class GameWorld{
    chunks = new Map();
    player = new Entity(ENTITIES.PLAYER,0,0);
    constructor(seed){
        this.seed = seed;
        this.camera = {x: 0, y:0, zoom: 1};
    }

    update(){
        
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
};