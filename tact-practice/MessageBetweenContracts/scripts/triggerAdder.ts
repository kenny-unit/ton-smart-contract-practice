import { NetworkProvider, sleep } from '@ton/blueprint';
import { Counter } from '../wrappers/Counter';
import { Address, toNano } from '@ton/core';
import { Adder } from '../wrappers/Adder';

export async function run(provider: NetworkProvider) {
    const counter = provider.open(
        await Counter.fromAddress(Address.parse('EQDRvxrxWMgmFMca5W5EbYzcStzDXxIzhpry23bpkyc7hRKS')),
    );
    const adder = provider.open(
        await Adder.fromAddress(Address.parse('EQDrUVFouvr2GX_mEy2c5G8-gu0yiY5CY4GdA_0k8kBduS5r')),
    );
    const counterBefore = await counter.getCounter();

    console.log(`Counter value before: ${counterBefore}`);

    await adder.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Add',
            counter: Address.parse('EQDRvxrxWMgmFMca5W5EbYzcStzDXxIzhpry23bpkyc7hRKS'),
            target: 10n,
        },
    );

    const currentTarget = await adder.getTarget();

    let attempt = 0;
    let counterAfter = counterBefore;

    while (counterAfter !== currentTarget) {
        attempt += 1;

        console.log(`Attempt ${attempt}`);

        counterAfter = await counter.getCounter();

        console.log(`Current counter: ${counterAfter}`);
        console.log(`Current target: ${currentTarget}`);

        await sleep(5000);
    }

    console.log(`Counter value after: ${counterAfter}`);
}
