import "@stdlib/deploy";
import "./increment_reply.tact";

message Add {
    counter: Address;
    target: Int as uint32;
}

contract Adder with Deployable {
    target: Int as uint32 = 0;

    receive(msg: Add) {
        self.target = msg.target;

        send(
            SendParameters {
                to: msg.counter,
                value: ton("0.05"),
                mode: SendRemainingValue | SendIgnoreErrors,
                body: "increment".asComment()
            }
        );
    }

    receive(msg: IncrementReply) {
        if (msg.counter < self.target) {
            send(
                SendParameters {
                    to: sender(),
                    value: ton("0.05"),
                    mode: SendRemainingValue | SendIgnoreErrors,
                    body: "increment".asComment()
                }
            );
        }
    }

    get fun target(): Int {
        return self.target;
    }
}
