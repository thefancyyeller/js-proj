import { TILES } from "./config";

export class Chunk{
    constructor(size, cx, cy){
        this.tiles = new Array(size * size).fill(TILES.GRASS);
        this.size = size;
        this.cx = cx;
        this.cy = cy;
    }

    get chunkId(){
        return `${this.cx},${this.cy}`;
    }

    tileAt(col, row){
        if((row * this.size + col) >= this.tiles.length)
            throw ("Chunk Error. Tile out of bounds.");
        return this.tiles[row * this.size + col];
    }
}