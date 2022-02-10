const { PromiseSocket } = require("promise-socket");
const cluster = require("cluster");
const net = require("net");
const RL = require("readline");
const fetch = require('node-fetch');
const utils = require("./src/utils.js");

const sha1 = require("js-sha1");
const jsSha1 = require("sha1");
const crypto = require('crypto');
const Benchmark = require("benchmark");
const Rusha = require('rusha');
const Hashes = require('jshashes')

const suite = new Benchmark.Suite;

let lastPool = "",
    user = "",
    processes = 2,
    hashlib = "js-sha1";

console.clear();

const args = process.argv.slice(2);

if (!args[0] || !args[1]) return console.log("Error, please run [node index.js username threads]");

user = args[0];
processes = args[1];
console.log("Miner Started for user (" + user + ") with " + processes + " threads");

const testLibs = async () => {
    return new Promise((resolve, reject) => {
        console.log("Testing hashing libs...");
        const testString = "someKey" + ":someValue".repeat(50);
        console.log(`Test string is ${testString.length} chars long`);

        suite
        .add('js-sha1', function() {
            sha1(testString);
        })
        .add('node crypto', function() {
            crypto.createHash('sha1').update(testString).digest('hex');
        })
        .add('sha1', function() {
            jsSha1(testString);
        })
        .add("rusha", function() {
            Rusha.createHash().update(testString).digest('hex'); 
        })
        .add("jshashes", function() {
            new Hashes.SHA1().hex(testString)
        })
        .on('cycle', function(event) {
            console.log(String(event.target));
        })
        .on('complete', function() {
            console.log('Fastest is ' + this.filter('fastest').map('name'));
            hashlib = this.filter('fastest').map('name');
            resolve(hashlib);
        })
        .run({ 'async': true });
    });
};

const _sha1 = (str) => {
    if (hashlib == "rusha") return Rusha.createHash().update(str).digest('hex');
    if (hashlib == "sha1") return jsSha1(str);
    if (hashlib == "node crypto") return crypto.createHash('sha1').update(str).digest('hex');
    if (hashlib == "jshashes") return new Hashes.SHA1().hex(str);
    return sha1(str);
};

const printData = (threads) => {
    RL.cursorTo(process.stdout, 0, 0);
    RL.clearLine(process.stdout, 0);
    RL.clearScreenDown(process.stdout);

    let rows = [];
    for (const i in threads) {
        rows.push({
            Hashrate: utils.calculateHashrate(threads[i].hashes),
            Accepted: threads[i].accepted,
            Rejected: threads[i].rejected
        });
    }

    let hr = 0,
        acc = 0,
        rej = 0;

    for (const i in threads) {
        hr = hr + threads[i].hashes;
        acc = acc + threads[i].accepted;
        rej = rej + threads[i].rejected;
    }

    rows["Total"] = {
        Hashrate: utils.calculateHashrate(hr),
        Accepted: acc,
        Rejected: rej
    };

    console.table(rows);
    rows = [];
};

const findNumber = (prev, toFind, diff) => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < 100 * diff + 1; i++) {
            let hash = _sha1(prev + i);

            data.hashes = data.hashes + 1;

            if (hash == toFind) {
                socket.write(i.toString() + ",NodeJS Miner v2.0");
                resolve();
                break;
            }
        }
    });
};

const startMining = async () => {
    // start the mining process
    while (true) {
        socket.write("JOB," + user + ",MEDIUM");
        let job = await promiseSocket.read();
        job = job.split(",");

        const prev = job[0];
        const toFind = job[1];
        const diff = job[2];

        await findNumber(prev, toFind, diff);
        const str = await promiseSocket.read();

        if (str.includes("BAD")) {
            data.rejected = data.rejected + 1;
        } else {
            data.accepted = data.accepted + 1;
        }
        process.send(data);
        data.hashes = 0;
    }
};

if (cluster.isMaster) {
    let threads = [];

    for (let i = 0; i < processes; i++) {
        let worker = cluster.fork();

        let data = {};
        data.hashes = 0;
        data.rejected = 0;
        data.accepted = 0;

        threads.push(data);

        worker.on("message", (msg) => {
            threads[msg.workerId].hashes = msg.hashes;
            threads[msg.workerId].rejected = msg.rejected;
            threads[msg.workerId].accepted = msg.accepted;
            printData(threads);
        });
    }
    return;
}

let data = {};
data.workerId = cluster.worker.id - 1;
data.hashes = 0;
data.rejected = 0;
data.accepted = 0;

let socket = new net.Socket();
const promiseSocket = new PromiseSocket(socket);

socket.setEncoding("utf8");

testLibs().then((lib) => {
    hashlib = lib;
    utils.getPool().then((data) => {
        lastPool = data;
        console.log("Connecting to pool: " + data.name);
        socket.connect(data.port, data.ip);
    }).catch((err) => {
        console.log(err);
    });
});

socket.once("data", (data) => {
    // login process
    console.log("received data: " + data);
    if (data.includes("3.")) {
        startMining();
    } else {
        console.log(data);
        socket.end();
    }
});

socket.on("end", () => {
    console.log("Connection ended");
});

socket.on("error", (err) => {
    if(err.message.code = "ETIMEDOUT")
    {
        console.log("Error: Timed Out, trying to connect to get another Pool.");
        fetch("https://server.duinocoin.com/getPool", { method: "Get" })
        .then(res => res.json())
        .then((json) => {
            let poolJson = json[0];
            if(json.success == true) {
                lastPool = poolJson.name;
                socket.connect(poolJson.port, poolJson.ip);
            }
            else {
                console.log("Error, could not get pool");
            }
        });
    }
    console.log(`Socket error: ${err}`);
});
