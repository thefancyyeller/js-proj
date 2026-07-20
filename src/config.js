export const TILE_SIZE = 32; // How many pixels are in a tile
export const CHUNK_SIZE = 16; // How many tiles in a chunk
export const RENDER_DIST = 4; // How far away chunks despawn
export const EVICT_DIST = RENDER_DIST + 2;

const TILE_NAMES = ['GRASS'];
export const TILES = Object.freeze(Object.fromEntries(TILE_NAMES.map((tname, index) => {return [tname, index]})));

const ENTITY_NAMES = ['PLAYER'];
export const ENTITIES = Object.freeze(Object.fromEntries(ENTITY_NAMES.map((name, index) => {return [name, index]})));

export function getTileName(tid){
    if(tid >= TILE_NAMES.length)
        throw ("Tile Name Lookup Error! Unrecognized tileID");
    return (TILE_NAMES[tid]);
}

export function getEntityName(etid){
    if(etid >= ENTITY_NAMES.length)
        throw ("Entity Name Lookup Error! Unrecognized entityTypeID");
    return (ENTITY_NAMES[etid]);
}