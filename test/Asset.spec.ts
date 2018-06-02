import { expect } from 'chai';
import { NetworkType, PublicAccount } from 'nem2-sdk';
import { Asset } from '../index';

describe('Asset', () => {
    const network = NetworkType.MIJIN_TEST;
    const owner = PublicAccount.createFromPublicKey(
        '94814F5ACE5FEE9E5C1A97AA2545C5BE74C5D9801F66F1BC61547A7B6549BEBE',
        network,
    );

    it('should accept the source identifier & the asset identifier', () => {
        const asset = Asset.create(
            owner,
            'otherchain',
            '26198278f6e862fd82d26c7388a9ed19ed16282c2a4d562463b8b4336929c5d6',
            network,
        );

        expect(asset.owner).to.be.equal(owner);
        expect(asset.publicKey).to.be.equal('1485030412335ACAE6A59E8F5826AA7B7EAA831EAC73FE60E6A00E893A306F71');
        expect(asset.address.plain()).to.be.equal('SAG3VKH4XRCVYTMDMHUN62AH353TJC74BFDKKNOA');
        expect(asset.source).to.be.equal('otherchain');
        expect(asset.identifier).to.be.equal('26198278f6e862fd82d26c7388a9ed19ed16282c2a4d562463b8b4336929c5d6');
    });
});
