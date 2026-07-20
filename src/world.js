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
    }

    continuePath(){
        if(this.interupted || this.playerMoveQueue.length === 0)
            return;
        const [tx, ty] = this.playerMoveQueue.shift();
        if(this.#moveEntity(this.player, tx, ty)){
            this.update();
            this.#centerCamera();
        }
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

    setPlayerPath(tx, ty){
        const path = this.#pathTo(this.player, tx, ty, 10000);
        // #pathTo returns null on failure, and its first tile is where the
        // player already stands, so it isn't a move.
        this.playerMoveQueue = path === null ? [] : path.slice(1);
        return;
    }

    /** 
     * @param {Entity} entity
     * Steps the player by a tile delta and keeps the camera centred on them. */
    #moveEntity(entity, tx, ty){
        if(this.getTile(tx, ty) === undefined){
            console.log("Tried to move entity onto unloaded tile");
            return false;
        }
        if(!this.#canEnter(entity, tx, ty))
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
    #canEnter(entity, tx, ty){
        return true;
    }

    #pathTo(entity, tx, ty, maxIter = 1000){
        if(typeof entity === 'number'){ // dereference if given entity id
            entity = this.getEntity(entity);
        }
        function pathScore(path){ const last = path[path.length-1]; return Math.abs(last[0] - tx) + Math.abs(last[1] - ty);}
        function pathRedundant(path){
            const seen = new Set();
            for(let i = 0; i < path.length; i++){
                let tString = `${path[i][0]},${path[i][1]}`;
                if(seen.has(tString))
                    return true;
                seen.add(tString)
            }
            return false;
        };
        const walkableCheck = (path)=>{ // Checks if you can walk on the path.
            for(const tCord of path){
                if(!(this.#canEnter(entity, ...tCord)))
                    return false;
            }
            return true;
        };
        // A* algorithm
        /** @type {Array<Array<Array<number>>>} */
        let paths = [];
        const dirVecs = [[1,0], [0,1], [-1, 0], [0, -1]];
        paths.push([[entity.tx, entity.ty]]); // Init with a path standing still
        for(let iter = 0; iter < maxIter; iter++){
            paths = paths.filter(path => !pathRedundant(path) && walkableCheck(path));// remove redundant paths and unwalkable paths
            if(paths.length === 0)
                return null;
            paths.sort((aPath, bPath)=>{return pathScore(aPath) - pathScore(bPath);}); // Highest score at the end (worst candidate path)
            if(pathScore(paths[0]) === 0) // Check if we have arrived
                return paths[0];
            for(const d of dirVecs){
                const newPath = [...paths[0]];
                const term = paths[0][paths[0].length - 1];// Terminating tile on the path
                newPath.push([term[0] + d[0], term[1] + d[1]]);
                paths.push(newPath);
            }
            paths.shift();// delete most recent path
        }
        return null; // Couldnt find a path
    }
};