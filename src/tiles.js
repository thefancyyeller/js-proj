/** Internal class def for tile definitions
 * @typedef {object} TileDef
 * @property {string} spritePath
 * @property {boolean} solid
 */

/** Rendering info for a tile */
export class TileRenderInfo{
    /**@type {TileDef} def*/
    constructor(def){
        /**@type {string}*/
        this.spritePath = def.spritePath;
    }
}

/**Simuilation data for a tile */
export class TileSimInfo{
    /**@type {TileDef} def*/
    constructor(def){
        /**@type {boolean}*/
        this.solid = def.solid;
    }
}

/** Actuial Tile Definitions
 * @satisfies {Record<string, TileDef>} */
const DEFS ={
    GRASS:{spritePath: "/grass.png", solid: false},
    DARK_GRASS:{spritePath: "/darkGrass.png", solid: false}
}

/** Takes an object of type T, maps the key names to a zero-based number so you can translate Tile object names to tile IDs
 * @template {Record<string, unknown>} T T is a record of strings bound to anything
 * @param {T} defs
 * @returns {{readonly [K in keyof T]: number}}
 */
function toIds(defs){
    return Object.freeze(Object.fromEntries(Object.keys(defs).map((tileNmae, index) => [tileNmae, index])));
}

/** Returns a Record mapping tileId to whatever the ctor says to pass the TileEntry from
 * @template T 
 * @param {new (def: TileDef) => T} Ctor
 * @returns {Readonly<Record<number, Readonly<T>>>}
 */
function project(Ctor) {
  return Object.freeze(Object.fromEntries(
    Object.entries(DEFS).map(([name, def]) => [TILES[name], new Ctor(def)])
  ));
}

export const TILES = toIds(DEFS);
/**@type {Record<number, TileRenderInfo>} */
export const TILE_RENDER_INFO = project(TileRenderInfo);
/**@type {Record<number, TileSimInfo} */
export const TILE_SIM_INFO = project(TileSimInfo);
