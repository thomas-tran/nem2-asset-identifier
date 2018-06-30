# nem2-asset-identifier

:warning: experimental nem2 library to identify assets in nem2 blockchain. It will be submitted into [nemtech/NIP][nip] when it becomes more stable.

## Abstract

The goal of the library is identify an asset that does not belong to NEM main chain in a deterministic way, like other blockchains assets, private chains, [IPFS][ipfs] and so on.

## Usage

### Creating an asset

```typescript
import { Asset } from 'nem2-asset-identifier';
import { NetworkType, PublicAccount } from 'nem2-sdk';

const network = NetworkType.MIJIN_TEST;
const owner = PublicAccount.createFromPublicKey(
    '6C516BCD2F92F9C6F60477E7751DB030157CA33FEF1DAB0585C1B002D14896AE',
    network,
);

const asset = Asset.create(
    owner,
    'otherchain',
    '26198278f6e862fd82d26c7388a9ed19ed16282c2a4d562463b8b4336929c5d6',
    {
        'metadata_key': 'metadata_value',
    },
);

console.log(asset.getMetadata('metadata_key'));
```

### Publishing an asset

```typescript
import { Asset, AssetService } from 'nem2-asset-identifier';
import { Account, NetworkType, PublicAccount, TransactionHttp } from 'nem2-sdk';

// Services and Repositories
const transactionHttp = new TransactionHttp('http://localhost:3000');

// Replace with a private key
const privateKey = process.env.PRIVATE_KEY as string;
const account = Account.createFromPrivateKey(privateKey, NetworkType.MIJIN_TEST);

const asset = Asset.create(/* ... */); // Previous point
const publishableAsset = AssetService.publish(asset);

// Publishing
transactionHttp
    .announce(account.sign(publishableAsset))
    .subscribe(result => console.log('asset published'));
```

### Receiving an asset

```typescript
import { Asset, AssetService } from 'nem2-asset-identifier';
import { Account, NetworkType, PublicAccount, TransactionHttp, AccountHttp, BlockchainHttp } from 'nem2-sdk';

// constants
const node = 'http://localhost:3000';
const network = NetworkType.MIJIN_TEST;

// Services and Repositories
const assetService = new AssetService(new AccountHttp(node), new BlockchainHttp(node), network);

// by source and identifier
assetService.byAssetIdentifier('otherchain', '26198278f6e862fd82d26c7388a9ed19ed16282c2a4d562463b8b4336929c5d6')
    .subscribe(asset => {
        console.log('>>> Asset information');
        console.log('Address\t', asset.address);
    }, err => console.error('it is not a valid asset'));

assertService.byAddress('SAG3VKH4XRCVYTMDMHUN62AH353TJC74BFDKKNOA')
    .subscribe(asset => { /** ... */ }, err => console.error('it is not a valid asset'));

assertService.byPublicKey('1485030412335ACAE6A59E8F5826AA7B7EAA831EAC73FE60E6A00E893A306F71')
    .subscribe(asset => { /** ... */ }, err => console.error('it is not a valid asset'));
```

## License

Copyright (c) 2018 Aleix <aleix602@gmail.com> Licensed under the MIT License

[nip]: https://github.com/nemtech/NIP
[ipfs]: https://ipfs.io/