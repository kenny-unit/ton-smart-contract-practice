import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { SendCoins } from '../wrappers/SendCoins';
import '@ton/test-utils';
import { after } from 'node:test';

describe('SendCoins', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let sendCoins: SandboxContract<SendCoins>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        sendCoins = blockchain.openContract(await SendCoins.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await sendCoins.send(
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
            to: sendCoins.address,
            deploy: true,
            success: true,
        });

        const sendResult = await sendCoins.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            null,
        );

        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sendCoins.address,
            success: true,
        });
    });

    it('should be able to withdraw 0.2', async () => {
        const beforeBalance = await sendCoins.getBalance();

        expect(beforeBalance).toBeLessThanOrEqual(toNano('1'));

        const withdrawResult = await sendCoins.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Withdraw',
                amount: toNano('0.2'),
            },
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: sendCoins.address,
            to: deployer.address,
            success: true,
        });

        const afterBalance = await sendCoins.getBalance();

        expect(afterBalance).toBeLessThanOrEqual(toNano('0.8'));

        expect(withdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sendCoins.address,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and sendCoins are ready to use
    });
});
