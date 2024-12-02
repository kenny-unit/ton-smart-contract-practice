import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { ReceiveCoins } from '../wrappers/ReceiveCoins';
import '@ton/test-utils';

describe('ReceiveCoins', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let receiveCoins: SandboxContract<ReceiveCoins>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        receiveCoins = blockchain.openContract(await ReceiveCoins.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await receiveCoins.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: receiveCoins.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and receiveCoins are ready to use
    });

    it('should refund', async () => {
        const balanceBefore: bigint = await receiveCoins.getBalance();
        const deployResult = await receiveCoins.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Pay',
                message: 'Hi!',
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: receiveCoins.address,
            success: true,
        });

        console.log(`Balance before: ${balanceBefore}`);

        const balanceAfter: bigint = await receiveCoins.getBalance();

        console.log(`Balance after: ${balanceAfter}`);

        expect(deployResult.transactions).toHaveTransaction({
            from: receiveCoins.address,
            to: deployer.address,
            success: true,
        });
    });
});
