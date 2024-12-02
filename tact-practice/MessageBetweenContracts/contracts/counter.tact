import "@stdlib/deploy";
import "./increment_reply.tact";


contract Counter with Deployable {

    counter: Int as uint32;

    init() {
        self.counter = 0;
    }

    receive("increment") {
        self.counter += 1;
        self.reply(IncrementReply{counter: self.counter}.toCell());
    }

    get fun counter(): Int {
        return self.counter;
    }
    
}
