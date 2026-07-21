export class RenderEvent{
    constructor() {
        this.startTime = performance.now();
    }
    duration = 250; // Time in miliseconds the animation lasts
    blocking = true; // Game doesnt update while event is happening
};

/** A render event that prevents the entity from being drawn as usual */
export class EntityRenderEvent extends RenderEvent{
    /**
     *
     */
    constructor() {
        super();
        
    }
}
// Slides an entities tile from one tile to another
export class EntitySlide extends EntityRenderEvent{
    /**
     * 
     * @param {number} entityId 
     * @param {number} startTX 
     * @param {number} startTY 
     * @param {number} destTX
     * @param {number} destTY 
     */
    constructor(entityId, startTX, startTY, destTX, destTY) {
        super();
        this.entityId = entityId;
        this.startTX = startTX;
        this.startTY = startTY;
        this.destTX = destTX;
        this.destTY = destTY;
    }
}