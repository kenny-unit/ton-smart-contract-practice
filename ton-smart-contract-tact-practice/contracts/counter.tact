import "@stdlib/deploy";

message Add {
    queryId: Int as uint32;
    amount: Int as uint32;
}

contract Counter with Deployable {
    id: Int as uint32;
    counter: Int as uint32;

    // Constructor
    init(id: Int){
        self.id = id;
        self.counter = 0;       
    }

    receive(message: Add) {
        self.counter += message.amount;
    }

    get fun id(): Int {
        return self.id;
    }

    get fun counter(): Int {
        return self.counter;
    }
}
