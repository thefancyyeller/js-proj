import { CHUNK_SIZE } from "./config"
import { Chunk } from "./chunk"

// Place holder simple chunk generation
export function generateChunk(seed, cx, cy){
    let out = new Chunk(CHUNK_SIZE, cx, cy);
    return out;
}