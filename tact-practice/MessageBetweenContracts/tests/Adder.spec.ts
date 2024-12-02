import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Adder } from '../wrappers/Adder';
import '@ton/test-utils';

describe('Adder', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let adder: SandboxContract<Adder>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        adder = blockchain.openContract(await Adder.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await adder.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: adder.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and adder are ready to use
    });
});
