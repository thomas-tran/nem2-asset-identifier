import { sha3_256 } from 'js-sha3';
import {
    Address,
    NetworkType,
    PublicAccount,
} from 'nem2-sdk';

export class Asset {
    public static create(owner: PublicAccount,
                         source: string,
                         identifier: string,
                         metadata: {[key: string]: string | number | boolean}): Asset {
        const publicKey = Asset.deterministicPublicKey(source, identifier);
        const address = Address.createFromPublicKey(publicKey, owner.address.networkType);
        return new Asset(publicKey, address, owner, source, identifier, metadata, owner.address.networkType);
    }

    public static deterministicPublicKey(source: string, identifier: string): string {
        return sha3_256(source + identifier).toUpperCase();
    }

    constructor(public readonly publicKey: string,
                public readonly address: Address,
                public readonly owner: PublicAccount,
                public readonly source: string,
                public readonly identifier: string,
                public readonly metadata: {[key: string]: string | number | boolean},
                public readonly networkType: NetworkType) {
        const format = /[,]*/;
        Object.keys(metadata)
            .forEach((key) => {
                if (typeof metadata[key] === 'string'
                    && ((metadata[key] as string).indexOf(',') !== -1
                        || (metadata[key] as string).indexOf('.') !== -1)) {
                    throw Error(`${key} contains special characters`);
                }
            });
    }

    public getMetadata(key: string): string | number | boolean | undefined {
        return this.metadata[key];
    }
}
