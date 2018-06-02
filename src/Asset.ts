import { sha3_256 } from 'js-sha3';
import {
    Address,
    AggregateTransaction,
    Deadline,
    NetworkType,
    PlainMessage,
    PublicAccount,
    TransferTransaction,
} from 'nem2-sdk';

export class Asset {
    public static create(owner: PublicAccount,
                         source: string,
                         identifier: string,
                         metadata: Array<[string, string | number | boolean]>): Asset {
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
                public readonly metadata: Array<[string, string | number | boolean]>,
                public readonly networkType: NetworkType) {
    }

    public getMetadata(key: string): string | number | boolean | undefined {
        const metadata = this.metadata.filter((x) => x[0] === key);
        if (metadata.length === 0) {
            return undefined;
        }
        return metadata[0][1];
    }
}
