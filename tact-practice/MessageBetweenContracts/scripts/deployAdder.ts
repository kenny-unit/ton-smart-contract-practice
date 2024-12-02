import { toNano } from '@ton/core';
import { Adder } from '../wrappers/Adder';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const adder = provider.open(await Adder.fromInit());

    await adder.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(adder.address);

    // run methods on `adder`
}
