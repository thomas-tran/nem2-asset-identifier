import {
    Account,
    AccountHttp,
    Address,
    AggregateTransaction,
    BlockchainHttp,
    Deadline,
    NetworkType,
    PlainMessage,
    PublicAccount,
    TransactionType,
    TransferTransaction,
} from 'nem2-sdk';
import Rx from 'rxjs/Rx';
import { Asset } from '../index';

export class AssetService {
    public static publish(asset: Asset, deadline: Deadline = Deadline.create()): AggregateTransaction {
        const assetDefinition = TransferTransaction.create(
            deadline,
            asset.address,
            [],
            PlainMessage.create(`${asset.source},${asset.identifier}`),
            asset.networkType,
        );
        const innerTransactions = [
            assetDefinition.toAggregate(asset.owner),
        ];

        if (asset.metadata.length !== 0) {
            const metadata = asset
                .metadata
                .map((metadataPair): string => `${metadataPair[0]},${metadataPair[1]}`);
            innerTransactions.push(
                TransferTransaction.create(
                    deadline,
                    asset.address,
                    [],
                    PlainMessage.create(`metadata:${metadata.join('.')}`),
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

    public byAssetIdentifier(source: string, identifier: string): Rx.Observable<Asset> {
        const publicKey = Asset.deterministicPublicKey(source, identifier);
        const address = Address.createFromPublicKey(
            publicKey,
            this.networkType);

        return this.byAddress(address);
    }

    public byPublicKey(publicKey: string): Rx.Observable<Asset> {
        const address = Address.createFromPublicKey(
            publicKey,
            this.networkType);

        return this.byAddress(address);
    }

    public byAddress(address: Address): Rx.Observable<Asset> {
        return Rx.Observable.of(address)
            .flatMap((account) => this.accountRepository.getAccountInfo(address))
            .flatMap((account) => this.blockRepository.getBlockTransactions(account.addressHeight.compact()))
            .map((txs) => {
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
                const messageSource = message.payload.split(',')[0];
                const messageIdentifier = message.payload.split(',')[1];
                const publicKey = Asset.deterministicPublicKey(messageSource, messageIdentifier);

                if (!Address.createFromPublicKey(publicKey, this.networkType).equals(address)) {
                    Rx.Observable.throw('Invalid asset');
                }

                const metadata: Array<[string, string | number | boolean]> =
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

export const extractMetadata = (payload: string[]): Array<[string, string | boolean | number]> => {
    const partial: Array<Array<[string, string | boolean | number]>> = payload
        .filter((mss: string) => mss.substring(0, 'metadata:'.length) === 'metadata:')
        .map((mss) => mss.substring('metadata:'.length))
        .map((mss) => mss.split('.'))
        .map((rawMetadata: string[]) => {
            const metadata: Array<[string, string | boolean | number]> = [];
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
                metadata.push([splitPair[0], value]);
            });
            return metadata;
        });
    return [].concat.apply([], partial);
};

const parseBoolean = (input: string): boolean | undefined => {
    if (input.toLowerCase() === 'true') {
        return true;
    } else if (input.toLowerCase() === 'false') {
        return false;
    }
    return undefined;
};
