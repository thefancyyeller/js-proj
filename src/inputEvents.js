export class InputEvent{

};

export class KeyPressEvent extends InputEvent{
    /**
     * @param {string} code
     * @param {boolean} down
     */
    constructor(code, down) {
        super();
        this.code = code;
        this.down = down;
    }
}

export class MouseWheelEvent extends InputEvent{
    /**
     *@param {boolean} up
     */
    constructor(up) {
        super();
        this.up = up;
    }
}

export class MouseLeftClickEvent extends InputEvent{
    /**
     * @param {number} sx Screen x of mouse click on canvas
     * @param {number} sy Screen y of mouse click on canvas;
     */
    constructor(sx, sy) {
        super();
        this.sx = sx;
        this.sy = sy;
    }
}