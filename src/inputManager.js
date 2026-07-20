import { KeyPressEvent, InputEvent, MouseWheelEvent, MouseLeftClickEvent } from "./inputEvents";

// Drop input rather than let a held key build a backlog the player has to watch play out
const MAX_QUEUED = 8;

export class InputManager{
    /** @type {Array<InputEvent>} */
    #queue = [];

    /**
     * @param {EventTarget} target element to listen on (defaults to the window)
     * @param {HTMLCanvasElement} canvas the game's canvas, so we can report clicks on the canvas itself and 
     */
    constructor(target = window, canvas){
        this.target = target;
        /**@type {HTMLCanvasElement}*/
        this.canvas = canvas;
        this.target.addEventListener("keydown", this.#onKeyDown);
        // Not passive: we cancel the event so the page doesn't scroll under the canvas
        this.target.addEventListener("wheel", this.#onWheel, {passive: false});
        this.target.addEventListener("click", this.#onClick);
    }

    // Add events to the stack.
    /**@param {KeyboardEvent} e */
    #onKeyDown = (e) => {
        if(e.repeat)
            return;
        if(this.#queue.length >= MAX_QUEUED)
            return;
        this.#queue.push(new KeyPressEvent(e.code, true));
    };

    #onWheel = (e) => {
        e.preventDefault();
        // Notch size varies wildly between mice, trackpads and deltaMode values, only use direction
        const steps = -Math.sign(e.deltaY);
        if(steps === 0)
            return;
        // If input queue is too big
        if(this.#queue.length >= MAX_QUEUED)
            return;
        this.#queue.push(new MouseWheelEvent(steps > 0));
    };

    /**
     * 
     * @param {MouseEvent} e 
     */
    #onClick= (e) => {
        if(e.button !== 0) // Ignore all but left clicks for now. 2 = right click 0 = left click
            return;
        e.preventDefault();
        if( this.#queue.length >= MAX_QUEUED)
            return;
        // Translate from 'monitor space' to actual canvas space
        const rect = this.canvas.getBoundingClientRect();
        const canvasCoords = [(e.clientX - rect.left) * (this.canvas.width / rect.width),(e.clienty - rect.top) * (this.canvas.height / rect.height)];
        this.#queue.push(new MouseLeftClickEvent(canvasCoords[0], canvasCoords[1]));
    }

    /** Hands over every event queued since the last call, and empties the queue. */
    drain(){
        const events = this.#queue;
        this.#queue = [];
        return events;
    }
    /* 
    For completely removing the event listeners
    dispose(){
        this.target.removeEventListener("keydown", this.#onKeyDown);
        this.target.removeEventListener("wheel", this.#onWheel);
    }
    */
};
