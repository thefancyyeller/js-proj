// Commands for the world that dictate the players action intent next turn.
export class WorldIntent{

}

export class PlayerMoveIntent extends WorldIntent{
    constructor(dx, dy) {
        super();
        this.dx = dx;
        this.dy = dy;
    }
}

export class ContinuePathIntent extends WorldIntent{

}

export class SetPathIntent extends WorldIntent{
    /**
     * 
     * @param {number} tx 
     * @param {number} ty 
     */
    constructor(tx, ty) {
        super();
        this.tx = tx;
        this.ty = ty;
    }
}