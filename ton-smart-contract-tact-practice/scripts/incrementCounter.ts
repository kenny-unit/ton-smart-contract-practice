import { NetworkProvider, sleep } from '@ton/blueprint';
import { Counter } from '../wrappers/Counter';
import { Address, toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const counter = provider.open(
        Counter.fromAddress(Address.parse('EQAxYvOrRvjM5Cxi9SNxvTFWXkxPms4HxFQgQEB4lfMvtnvl')),
    );
    const counterBefore = await counter.getCounter();

    console.log('Counter before: ', counterBefore);

    await counter.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Add',
            queryId: 0n,
            amount: 1n,
        },
    );

    let counterAfter = await counter.getCounter();
    let attempt = 1;

    while (counterAfter === counterBefore) {
        await sleep(2000);
        counterAfter = await counter.getCounter();
        attempt++;
    }

    console.log('Counter after', counterAfter);
}
