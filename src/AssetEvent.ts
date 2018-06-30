import { Asset } from './Asset';

export interface AssetEvent {
    /**
     * Applies the specific logic to an asset and returns a new Asset with the logic applied and the event stored
     * @returns Asset Asset with the logic applied and stored the event
     */
    apply(): Asset;

    /**
     * @returns a boolean to know if an event applied to an asset has been read in the network
     * or still has to be persisted
     */
    isPersisted(): boolean;
}
