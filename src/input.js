// Maps raw KeyboardEvent.code values to tile-space deltas.
// Numpad gives all 8 directions (5 is "wait in place"), WASD gives the 4 cardinals.
const MOVE_KEYS = {
    Numpad1: [-1,  1], Numpad2: [ 0,  1], Numpad3: [ 1,  1],
    Numpad4: [-1,  0], Numpad5: [ 0,  0], Numpad6: [ 1,  0],
    Numpad7: [-1, -1], Numpad8: [ 0, -1], Numpad9: [ 1, -1],

    KeyW: [ 0, -1],
    KeyA: [-1,  0],
    KeyS: [ 0,  1],
    KeyD: [ 1,  0],
};

// Drop input rather than let a held key build a backlog the player has to watch play out
const MAX_QUEUED = 8;

export class Input{
    /** @type {{type: string, dx: number, dy: number}[]} */
    #queue = [];

    /**
     * @param {EventTarget} target element to listen on (defaults to the window)
     */
    constructor(target = window){
        this.target = target;
        this.target.addEventListener("keydown", this.#onKeyDown);
    }

    // Arrow field so `this` survives being handed to addEventListener,
    // and so dispose() can pass the identical reference to remove it.
    #onKeyDown = (e) => {
        const delta = MOVE_KEYS[e.code];
        if(delta === undefined)
            return;
        // Numpad arrows would otherwise scroll the page when numlock is off
        e.preventDefault();
        if(this.#queue.length >= MAX_QUEUED)
            return;
        this.#queue.push({type: "move", dx: delta[0], dy: delta[1]});
    };

    /** Hands over every event queued since the last call, and empties the queue. */
    drain(){
        const events = this.#queue;
        this.#queue = [];
        return events;
    }

    dispose(){
        this.target.removeEventListener("keydown", this.#onKeyDown);
    }
};
