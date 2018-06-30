import {
    AccountHttp,
    AccountInfo,
    Address,
    AggregateTransaction,
    BlockchainHttp,
    Deadline,
    NetworkType,
    PlainMessage,
    Transaction,
    TransactionType,
    TransferTransaction,
} from 'nem2-sdk';
import { Observable } from 'rxjs';
import { Asset } from '../index';

export class AssetService {
    public static readonly ASSET_PREFIX = 'asset(1):'; // (1) means version 1
    public static readonly METADATA_PREFIX = 'metadata(1):';

    public static publish(asset: Asset, deadline: Deadline = Deadline.create()): AggregateTransaction {
        const assetDefinition = TransferTransaction.create(
            deadline,
            asset.address,
            [],
            PlainMessage.create(`${this.ASSET_PREFIX}${asset.source},${asset.identifier}`),
            asset.networkType,
        );
        const innerTransactions = [
            assetDefinition.toAggregate(asset.owner),
        ];

        if (asset.metadata.length !== 0) {
            const metadata = Object.keys(asset.metadata)
                .map((key): string => `${key},${asset.metadata[key]}`);
            innerTransactions.push(
                TransferTransaction.create(
                    deadline,
                    asset.address,
                    [],
                    PlainMessage.create(`${this.METADATA_PREFIX}${metadata.join('.')}`),
                    asset.networkType,
                ).toAggregate(asset.owner),
            );
        }
        const transaction = AggregateTransaction.createComplete(
            deadline,
            innerTransactions,
            asset.networkType,
            [],
        );

        return transaction;
    }

    constructor(private readonly accountRepository: AccountHttp,
                private readonly blockRepository: BlockchainHttp,
                private readonly networkType: NetworkType) {
    }

    public byAssetIdentifier(source: string, identifier: string): Observable<Asset> {
        const publicKey = Asset.deterministicPublicKey(source, identifier);
        const address = Address.createFromPublicKey(
            publicKey,
            this.networkType);

        return this.byAddress(address);
    }

    public byPublicKey(publicKey: string): Observable<Asset> {
        const address = Address.createFromPublicKey(
            publicKey,
            this.networkType);

        return this.byAddress(address);
    }

    public byAddress(address: Address): Observable<Asset> {
        return Observable.of<Address>(address)
            .flatMap<Address, AccountInfo>((addr: Address): Observable<AccountInfo> =>
                this.accountRepository.getAccountInfo(addr))
            .flatMap<AccountInfo, Transaction[]>((account: AccountInfo): Observable<Transaction[]> => {
                return this.blockRepository.getBlockTransactions(account.addressHeight.compact());
            })
            .map((txs: Transaction[]) => {
                const transactions = txs
                    .filter((tx) => tx.type === TransactionType.AGGREGATE_BONDED
                        || tx.type === TransactionType.AGGREGATE_COMPLETE)
                    .map((tx) => tx as AggregateTransaction)
                    .filter((tx) => firstInnerTxTransferAndReceiver(tx, address));
                if (transactions.length !== 1) {
                    throw new Error(`Account ${address.pretty()} is not an asset`);
                }
                const assetDefinitionTx = transactions[0];
                const message = (assetDefinitionTx.innerTransactions.shift() as TransferTransaction)
                    .message as PlainMessage;
                if (message.payload.substring(0, AssetService.ASSET_PREFIX.length) !== AssetService.ASSET_PREFIX) {
                    throw new Error(`First message in account is not an ${AssetService.ASSET_PREFIX} prefix`);
                }
                const [messageSource, messageIdentifier] = assetIdentifierDefinition(message.payload);
                const publicKey = Asset.deterministicPublicKey(messageSource, messageIdentifier);

                if (!Address.createFromPublicKey(publicKey, this.networkType).equals(address)) {
                    Observable.throw('Invalid asset');
                }

                const metadata: {[key: string]: string | number | boolean } =
                    extractMetadata(assetDefinitionTx
                        .innerTransactions
                        .filter((x) => x.type === TransactionType.TRANSFER)
                        .map((x) => x as TransferTransaction)
                        .map((x) => x.message.payload));

                return new Asset(
                    publicKey,
                    address,
                    assetDefinitionTx.signer!,
                    messageSource,
                    messageIdentifier,
                    metadata,
                    this.networkType,
                );
            });
    }
}

const firstInnerTxTransferAndReceiver = (aggregateTx: AggregateTransaction, receiver: Address): boolean => {
    if (!(aggregateTx.innerTransactions[0] instanceof TransferTransaction)) {
        return false;
    }
    return (aggregateTx.innerTransactions[0] as TransferTransaction).recipient.equals(receiver);
};

const assetIdentifierDefinition = (message: string) => {
    const messageSource = message.split(',')[0].substring(AssetService.ASSET_PREFIX.length);
    const messageIdentifier = message.split(',')[1];
    return [messageSource, messageIdentifier];
};

export const extractMetadata = (payload: string[]): {[key: string]: string | boolean | number} => {
    const partial: Array<{[key: string]: string | boolean | number}> = payload
        .filter((mss: string) => mss.substring(0, AssetService.METADATA_PREFIX.length) === AssetService.METADATA_PREFIX)
        .map((mss) => mss.substring(AssetService.METADATA_PREFIX.length))
        .map((mss) => mss.split('.'))
        .map((rawMetadata: string[]) => {
            const innerMetadata: {[key: string]: string | boolean | number} = {};
            rawMetadata.forEach((x) => {
                const splitPair = x.split(',');
                let value: string | boolean | number;
                if (!isNaN(Number(splitPair[1]))) {
                    value = Number(splitPair[1]);
                } else if (parseBoolean(splitPair[1]) !== undefined) {
                    value = parseBoolean(splitPair[1])!!;
                } else {
                    value = splitPair[1];
                }
                innerMetadata[splitPair[0]] = value;
            });
            return innerMetadata;
        });
    const metadata: {[key: string]: string | boolean | number} = {};
    partial.forEach((notMerged) => {
        Object.keys(notMerged).forEach((key) => {
            metadata[key] = notMerged[key];
        });
    });
    return metadata;
};

const parseBoolean = (input: string): boolean | undefined => {
    if (input.toLowerCase() === 'true') {
        return true;
    } else if (input.toLowerCase() === 'false') {
        return false;
    }
    return undefined;
};
