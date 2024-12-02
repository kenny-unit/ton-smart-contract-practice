import "@stdlib/deploy";

message Withdraw {
    amount: Int as coins;
}

contract SendCoins with Deployable {

    const MinCoinsInStorage: Int = ton("0.01");
    deployer: Address;

    init() {
        self.deployer = sender();
    }

    receive() {}

    receive(msg: Withdraw) {
        require(self.deployer == sender(), "Message is not authorized.");
        require(msg.amount > 0, "Insufficient balance");
        send(
            SendParameters{
                to: sender(),
                bounce: true,
                value: min(msg.amount, myBalance() - context().value - self.MinCoinsInStorage),
                mode: SendRemainingValue + SendIgnoreErrors,
            }
        );
    }

    get fun balance(): Int {
        return myBalance();
    }
}
