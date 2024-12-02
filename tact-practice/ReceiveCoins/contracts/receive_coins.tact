import "@stdlib/deploy";

message Pay {
    message: String;
}

contract ReceiveCoins with Deployable {
    val: Int as uint32;

    init() {
        self.val = 0;
    } 

    receive(msg: Pay) {
        self.val += 1;

        dump(msg.message);
        dump(context().value);

        self.reply("Received TON Coins!".asComment());
    }

    get fun val(): Int {
        return self.val;
    }

    get fun balance(): Int {
        return myBalance();
    }
}
