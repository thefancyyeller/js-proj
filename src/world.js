import {
    CHUNK_SIZE, TILE_SIZE, TILES, RENDER_DIST, ENTITIES, EVICT_DIST,
    ZOOM_STEP, ZOOM_MIN, ZOOM_MAX
} from "./config.js";
import { Chunk } from "./chunk.js";
import { generateChunk } from "./worldgen.js";
import { EntitySlide, RenderEvent } from "./renderEvents.js";
import { ContinuePathIntent, PlayerMoveIntent, SetPathIntent, WorldIntent } from "./worldIntent.js";

let nextId = 1;
function allocId() { // Gets a unique ID for an entity
    return nextId++;
}

class Entity {
    constructor(type, tileX, tileY) {
        this.etid = type;
        this.tx = tileX;
        this.ty = tileY;
        /**@type {number} */
        this.entityId = allocId();
    }
};

export class GameWorld {
    chunks = new Map();
    player = new Entity(ENTITIES.PLAYER, 1, 1);
    entities = [this.player];
    /**@type {Array<Array<number>>} A path player is set to follow */
    playerMoveQueue = [];
    /**@type {Array<RenderEvent>} all active render events that should be animated.*/
    #renderEvents = [];
    /**@type {WorldIntent[]} */
    #intents = [];


    constructor(seed) {
        this.seed = seed;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.#centerCamera();
        this.#manageChunks();
    }


    takeTurn() {
        this.#renderEvents = []; // Clear stack of dispatched render events
        this.#manageChunks();
        // Execute the next world intent...
        const turn = this.#intents.shift();
        const out = this.#renderEvents;
        if(!turn)
            return;
        // Execute intent
        if (turn instanceof PlayerMoveIntent) {
            const newCoords = [this.player.tx + turn.dx, this.player.ty + turn.dy];
            this.#moveEntity(this.player, newCoords[0], newCoords[1])
        }
        else if (turn instanceof ContinuePathIntent) {
            this.#continuePath();
        }
        else if(turn instanceof SetPathIntent){
            const ccoords = [Math.floor(turn.tx/CHUNK_SIZE), Math.floor(turn.ty / CHUNK_SIZE)];
            if(this.chunks.has(Chunk.idFor(...ccoords))){ // If chunk is loaded
                const path = this.#pathTo(this.player, turn.tx, turn.ty, 1000);
                // First tile is where the player already stands, so drop it.
                this.playerMoveQueue = path === null ? [] : path.slice(1);
            }
        }
        this.#centerCamera();
        return this.#renderEvents; // Return accumulated events
    }

    /**
     * 
     * @param {number} tx 
     * @param {number} ty 
     * @returns {TILES} tileType
     */
    getTile(tx, ty) {
        // Locate what chunk it is in
        const cx = Math.floor(tx / CHUNK_SIZE);
        const cy = Math.floor(ty / CHUNK_SIZE);
        const c = this.chunks.get(`${cx},${cy}`);
        if (c === undefined) {
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
    getEntity(entityId) {
        for (const entity of this.entities) {
            if (entity.entityId === entityId)
                return entity;
        }
        throw ("Entity not found!");
    }

    zoomCamera(direction) {
        this.camera.zoom += Math.sign(direction) * ZOOM_STEP;
        this.camera.zoom = Math.min(this.camera.zoom, ZOOM_MAX); // Clip the zoom
        this.camera.zoom = Math.max(this.camera.zoom, ZOOM_MIN);
        return;
    }

    #setPlayerPath(tx, ty) {
        const path = this.#pathTo(this.player, tx, ty);
        // #pathTo returns null on failure, and its first tile is where the
        // player already stands, so it isn't a move.
        this.playerMoveQueue = path === null ? [] : path.slice(1);
        return;
    }
    /**
     * 
     * @param {WorldIntent} intent 
     */
    giveIntent(intent) {
        this.#intents.push(intent);
    }

    // Continues the player on their path
    #continuePath() {
        if (this.playerMoveQueue.length === 0)
            return;
        const [tx, ty] = this.playerMoveQueue.shift();
        return this.#moveEntity(this.player, tx, ty);
    }

    /** 
     * @param {Entity} entity
     * Moves an entity to a new tile*/
    #moveEntity(entity, tx, ty) {
        if (this.getTile(tx, ty) === undefined) {
            console.log("Tried to move entity onto unloaded tile");
            return false;
        }
        if (!this.#canEnter(entity, tx, ty))
            return false;
        this.#renderEvents.push(new EntitySlide(entity.entityId, entity.tx, entity.ty, tx, ty));
        entity.tx = tx;
        entity.ty = ty;
        return true; // For now, always returns true.
    }

    /** Move camera to center of player's tile in worldspace*/
    #centerCamera() {
        this.camera.x = (this.player.tx * TILE_SIZE) + (TILE_SIZE / 2);
        this.camera.y = (this.player.ty * TILE_SIZE) + (TILE_SIZE / 2);
    }

    #loadChunk(cx, cy) {
        // For now, always regenerate. Later, itll check cache if chunk is modified
        return generateChunk(this.seed, cx, cy);
    }

    // For now just deletes all chunks. In future will archive modified
    #deleteChunk(chunk) {
        this.chunks.delete(chunk.chunkId);
    }

    /**
     * Loads and unloads chunks.
     */
    #manageChunks() {
        const playerChunk = [Math.floor(this.player.tx / CHUNK_SIZE), Math.floor(this.player.ty / CHUNK_SIZE)]; // Chunk location of camera
        // Load in chunks within renderDist (in a square)
        for (let x = playerChunk[0] - RENDER_DIST; x <= playerChunk[0] + RENDER_DIST; x++) {
            for (let y = playerChunk[1] - RENDER_DIST; y <= playerChunk[1] + RENDER_DIST; y++) {
                if (this.chunks.has(`${x},${y}`))
                    continue;
                let c = this.#loadChunk(x, y);
                this.chunks.set(c.chunkId, c);
            }
        }
        // Evict chunks that are outside of evict range
        for (const [id, chunk] of this.chunks) {
            const dx = Math.abs(chunk.cx - playerChunk[0]);
            const dy = Math.abs(chunk.cy - playerChunk[1]);
            if (dx > EVICT_DIST || dy > EVICT_DIST)
                this.#deleteChunk(chunk);
        }

    }

    /**
     * @param {Entity} entity 
     * @param {number} tx 
     * @param {number} ty 
     * @returns {boolean}
     * Checks if entity is allowed to enter tile (false if unloaded)
     */
    #canEnter(entity, tx, ty) {
        // tx,ty are tile coords; the chunk map is keyed by chunk coords.
        const cx = Math.floor(tx / CHUNK_SIZE);
        const cy = Math.floor(ty / CHUNK_SIZE);
        if (this.chunks.has(Chunk.idFor(cx, cy)))
            return true;
        return false;
        // TODO: Support entity collisions and non enterable tiles.
    }

    /**
     * A* pathfinder. Returns a path (array of [tx, ty]) whose first tile is the
     * entity's current tile and whose last tile is (tx, ty), or null if no path
     * is found within maxIter expanded nodes.
     */
    #pathTo(entity, tx, ty, maxIter = 1000) {
        if (typeof entity === 'number') { // dereference if given entity id
            entity = this.getEntity(entity);
        }
        const key = (x, y) => `${x},${y}`;
        const heuristic = (x, y) => Math.abs(x - tx) + Math.abs(y - ty); // Manhattan distance to goal
        const dirVecs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1,1], [-1, -1], [1. -1], [-1, 1]];
        const goalKey = key(tx, ty);

        const startKey = key(entity.tx, entity.ty);
        const cameFrom = new Map();               // tileKey -> [px, py] we arrived from
        const gScore = new Map([[startKey, 0]]);  // cheapest known cost to reach a tile
        const closed = new Set();                 // tiles already finalised
        // Open set: tiles still to expand. Kept as a small array scanned linearly
        // for the lowest f-score; fine for the sizes this game deals with.
        let open = [{ x: entity.tx, y: entity.ty, f: heuristic(entity.tx, entity.ty) }];

        for (let iter = 0; iter < maxIter && open.length > 0; iter++) {
            // Pull the open tile with the lowest f = g + h
            let bestIdx = 0;
            for (let i = 1; i < open.length; i++)
                if (open[i].f < open[bestIdx].f) bestIdx = i;
            const current = open.splice(bestIdx, 1)[0];
            const curKey = key(current.x, current.y);

            if (curKey === goalKey) { // Arrived; walk cameFrom back to the start
                const path = [[current.x, current.y]];
                let k = curKey;
                while (cameFrom.has(k)) {
                    const [px, py] = cameFrom.get(k);
                    path.unshift([px, py]);
                    k = key(px, py);
                }
                return path;
            }
            closed.add(curKey);

            for (const [dx, dy] of dirVecs) {
                const nx = current.x + dx, ny = current.y + dy;
                const nKey = key(nx, ny);
                if (closed.has(nKey) || !this.#canEnter(entity, nx, ny))
                    continue;
                const tentativeG = gScore.get(curKey) + 1;
                if (gScore.has(nKey) && tentativeG >= gScore.get(nKey))
                    continue; // Already reached this tile at least as cheaply
                cameFrom.set(nKey, [current.x, current.y]);
                gScore.set(nKey, tentativeG);
                const f = tentativeG + heuristic(nx, ny);
                const existing = open.find(n => n.x === nx && n.y === ny);
                if (existing) existing.f = f;
                else open.push({ x: nx, y: ny, f });
            }
        }
        console.log("Failed to find path.");
        return null; // Couldn't find a path within maxIter
    }
};