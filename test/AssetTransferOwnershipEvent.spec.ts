import { expect } from 'chai';
import { NetworkType, PublicAccount } from 'nem2-sdk';
import { Asset } from '../index';
import { AssetTransferOwnershipEvent } from '../src/AssetTransferOwnershipEvent';

describe('AssetTransferOwnershipEvent', () => {
    const network = NetworkType.MIJIN_TEST;
    const owner = PublicAccount.createFromPublicKey(
        '94814F5ACE5FEE9E5C1A97AA2545C5BE74C5D9801F66F1BC61547A7B6549BEBE',
        network,
    );
    const newOwner = PublicAccount.createFromPublicKey(
        '324E154A02A9037F61118A6C11D4CDD4B63A48545CDDC5E1F0C0A02E88154FA5',
        NetworkType.MIJIN_TEST,
    );
    const asset = Asset.create(
        owner,
        'otherchain',
        '26198278f6e862fd82d26c7388a9ed19ed16282c2a4d562463b8b4336929c5d6',
        {},
    );

    it('should change the owner of the asset', () => {
        // Act
        const newAsset = asset.transferOwnership(newOwner);

        // Assert
        expect(newAsset.owner).to.be.equal(newOwner);
        expect(newAsset.events).to.have.length(1);
        expect(newAsset.events[0].isPersisted()).to.be.false;
    });

    it('should return the descriptor', () => {
        expect(AssetTransferOwnershipEvent.descriptor()).to.be.equal('asset_event(transfer_ownership,1):');
    });

    [
        'asset_event(transfer_ownership,1):324E154A02A9037F61118A6C11D4CDD4B63A48545CDDC5E1F0C0A02E88154FA5',
        'asset_event(transfer_ownership,1):324e154a02a9037f61118a6c11d4cdd4b63a48545cddc5e1f0c0a02e88154fa5',
    ].forEach((input) => {
        it(`isEvent given ${input} should return true`, () => {
            expect(AssetTransferOwnershipEvent.isEvent(input)).to.be.true;
        });
    });

    [
        'asset_event(transfer_ownership,1):z24e154a02a9037f61118a6c11d4cdd4b63a48545cddc5e1f0c0a02e88154fa5',
        'asset_event(transfer_ownership,1)',
        'it does not start by asset_event(transfer_ownership,1)',
        'asset_event(xransfer_ownership,1):324e154a02a9037f61118a6c11d4cdd4b63a48545cddc5e1f0c0a02e88154fa5',
    ].forEach((input) => {
        it(`isEvent given ${input} should return false`, () => {
            expect(AssetTransferOwnershipEvent.isEvent(input)).to.be.false;
        });
    });

    it('should change the owner of the asset given an event descriptor', () => {
        // Act
        const newAsset = AssetTransferOwnershipEvent.readAndApply(
            'asset_event(transfer_ownership,1):324E154A02A9037F61118A6C11D4CDD4B63A48545CDDC5E1F0C0A02E88154FA5',
            asset,
        );

        // Assert
        expect(newAsset.owner).to.be.deep.equal(newOwner);
        expect(newAsset.events).to.have.length(1);
        expect(newAsset.events[0].isPersisted()).to.be.false;
    });

    it('should throw error when trying to apply a non valid event descriptor', () => {
        // Assert
        expect(() => {
            AssetTransferOwnershipEvent.readAndApply(
                ',:324E154A02A9037F61118A6C11D4CDD4B63A48545CDDC5E1F0C0A02E88154FA5',
                asset,
            );
        }).to.throw('eventDescriptor is not of AssetTransferOwnershipEvent type');
    });

    it('should return the event descriptor', () => {
        // Act
        const event = AssetTransferOwnershipEvent.create(asset, newOwner);

        // Assert
        expect(event.toDTO()).to.be.equal(
            'asset_event(transfer_ownership,1):324E154A02A9037F61118A6C11D4CDD4B63A48545CDDC5E1F0C0A02E88154FA5',
        );
    });
});
