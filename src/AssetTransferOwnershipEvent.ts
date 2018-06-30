import { NetworkType, PublicAccount } from 'nem2-sdk';
import { Asset } from './Asset';
import { AssetEvent } from './AssetEvent';

export class AssetTransferOwnershipEvent implements AssetEvent {
    public static create(asset: Asset, newOwner: PublicAccount): AssetTransferOwnershipEvent {
        return new AssetTransferOwnershipEvent(asset, newOwner, false);
    }

    /**
     * @returns the event descriptor to be read later
     */
    public static descriptor(): string {
        return 'asset_event(transfer_ownership,1):';
    }

    /**
     * given a message, it returns true when the AssetEvent is able to apply the logic, otherwise false.
     * @param eventDescriptor message
     * @returns true when the eventDescriptor is of the AssetEvent
     */
    public static isEvent(eventDescriptor: string): boolean {
        const descriptor = AssetTransferOwnershipEvent.descriptor();
        const descriptorLength = descriptor.length;
        if (eventDescriptor.length !== descriptorLength + 64) {
            return false;
        }
        if (eventDescriptor.substr(0, descriptorLength).indexOf(descriptor) === -1) {
            return false;
        }
        try {
            // Using MIJIN_TEST as network because it doesn't matter.
            AssetTransferOwnershipEvent.extractPublicAccount(eventDescriptor, NetworkType.MIJIN_TEST);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * returns the instance of AssetEvent ready
     * @param eventDescriptor message with the event information
     * @param asset asset to apply the AssetEvent logic
     * @returns the asset after apply the logic
     */
    public static readAndApply(eventDescriptor: string, asset: Asset): Asset {
        if (!AssetTransferOwnershipEvent.isEvent(eventDescriptor)) {
            throw new Error('eventDescriptor is not of AssetTransferOwnershipEvent type');
        }
        const newOwner = AssetTransferOwnershipEvent.extractPublicAccount(eventDescriptor, asset.networkType);
        return AssetTransferOwnershipEvent.create(asset, newOwner).apply();
    }

    /**
     * it expects to contain the descriptor.
     * @param eventDescriptor
     */
    private static extractPublicAccount(eventDescriptor: string, networkType: NetworkType): PublicAccount {
        const descriptorLength = AssetTransferOwnershipEvent.descriptor().length;
        return PublicAccount.createFromPublicKey(
            eventDescriptor.substr(descriptorLength),
            networkType,
        );
    }

    constructor(public readonly asset: Asset,
                public readonly newOwner: PublicAccount,
                public readonly persisted: boolean) { }

    public apply(): Asset {
        return new Asset(
            this.asset.publicKey,
            this.asset.address,
            this.newOwner,
            this.asset.source,
            this.asset.identifier,
            this.asset.metadata,
            this.asset.events.concat(this),
            this.asset.networkType,
        );
    }

    public isPersisted(): boolean {
        return this.persisted;
    }

    public toDTO(): string {
        return AssetTransferOwnershipEvent.descriptor() + this.newOwner.publicKey;
    }
}
