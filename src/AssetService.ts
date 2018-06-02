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
        const transaction = AggregateTransaction.createComplete(
            deadline,
            [
                assetDefinition.toAggregate(asset.owner),
            ],
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
                const message = (assetDefinitionTx.innerTransactions[0] as TransferTransaction).message as PlainMessage;
                const messageSource = message.payload.split(',')[0];
                const messageIdentifier = message.payload.split(',')[1];
                const publicKey = Asset.deterministicPublicKey(messageSource, messageIdentifier);

                if (!Address.createFromPublicKey(publicKey, this.networkType).equals(address)) {
                    Rx.Observable.throw('Invalid asset');
                }

                return new Asset(
                    publicKey,
                    address,
                    assetDefinitionTx.signer!,
                    messageSource,
                    messageIdentifier,
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
