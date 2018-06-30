import { expect } from 'chai';
import { extractMetadata } from '../src/AssetService';

describe('extractMetadata', () => {
    it('should extract a metadata pair', () => {
        const metadata = extractMetadata([
            'metadata(1):key,value',
        ]);
        expect(metadata).to.be.deep.equal({
            key: 'value',
        });
    });

    it('should extract the multiple metadata pairs', () => {
        const metadata = extractMetadata([
            'metadata(1):key,value.name,nem2-asset-library',
        ]);
        expect(metadata).to.be.deep.equal({
            key: 'value',
            name: 'nem2-asset-library',
        });
    });
});
