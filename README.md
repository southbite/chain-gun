chain-gun
---------

experimental nodejs blockchain implementation using [gun](https://www.npmjs.com/package/gun) as the peer-to-peer transport and storage medium.

server/node: will be a gun/express node, gun is used to run the p2p network

client/lightweight wallet: will be a websockets client, connects to the server on its non network port and is able to perform gun put requests to a client/[session id]/queue key on gun, the server has a worker per queue that executes client requests and responds to data changes on the queue and writes back activity to the client

check out the [unit tests](https://github.com/southbite/chain-gun/blob/master/test/unit) for progress so far.

[TBD]