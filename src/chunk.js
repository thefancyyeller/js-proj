import { TILES } from "./tiles";

export class Chunk{
    constructor(size, cx, cy){
        this.tiles = new Array(size * size).fill(TILES.GRASS);
        this.size = size;
        this.cx = cx;
        this.cy = cy;
    }

    static idFor(cx, cy){
        return `${cx},${cy}`;
    }

    get chunkId(){
        return Chunk.idFor(this.cx, this.cy);
    }
    /**
     * @param {number} col column number in the chunk
     * @param {number} row row number of this chunk
     * @returns {number} tileId*/
    tileAt(col, row){
        if((row * this.size + col) >= this.tiles.length)
            throw ("Chunk Error. Tile out of bounds.");
        return this.tiles[row * this.size + col];
    }
}