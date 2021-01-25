const { PromiseSocket } = require("promise-socket");
const sha1 = require("js-sha1");
const cluster = require("cluster");
const net = require("net");
const RL = require("readline");

let user = "",
    processes = 1;

console.clear();

const args = process.argv.slice(2);

if (!args[0]) return console.log("Error, please run [node index.js username threads]");
if (!args[1]) return console.log("Error, please run [node index.js username threads]");

user = args[0];
processes = args[1];
console.log("Miner Started for user (" + user + ") with " + processes + " threads");

const calculateHashrate = (hashes) => {
    hashes = parseFloat(hashes);
    let hashrate = hashes.toFixed(2) + " h/s";

    if (hashes / 1000 > 0.5) hashrate = (hashes / 1000).toFixed(2) + " Kh/s";
    if (hashes / 1000000 > 0.5) hashrate = (hashes / 1000000).toFixed(2) + " Mh/s";
    if (hashes / 1000000000 > 0.5) hashrate = (hashes / 1000000000).toFixed(2) + " Gh/s";

    return hashrate;
};

const printData = (threads) => {
    RL.cursorTo(process.stdout, 0, 0);
    RL.clearLine(process.stdout, 0);
    RL.clearScreenDown(process.stdout);

    let rows = [];
    for (const i in threads) {
        rows.push({
            Hashrate: calculateHashrate(threads[i].hashes),
            Accepted: threads[i].accepted,
            Rejected: threads[i].rejected,
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
        Hashrate: calculateHashrate(hr),
        Accepted: acc,
        Rejected: rej,
    };

    console.table(rows);
    rows = [];
};

const findNumber = (prev, toFind, diff) => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < 100 * diff; i++) {
            let hash = sha1(prev + i);

            data.hashes = data.hashes + 1;

            if (hash == toFind) {
                socket.write(i.toString() + ",,Node.JS Miner v2.0");
                resolve();
                break;
            }
        }
    });
};

const startMining = async () => {
    // start the mining process
    while (true) {
        socket.write("JOB,${user}");
        let job = await promiseSocket.read();
        job = job.split(",");

        const prev = job[0];
        const toFind = job[1];
        const diff = job[2];

        await findNumber(prev, toFind, diff);
        const str = await promiseSocket.read();
        if (str == "GOOD") {
            data.accepted = data.accepted + 1;
        } else {
            data.rejected = data.rejected + 1;
        }
        sendData();
        data.hashes = 0;
    }
};

const sendData = () => {
    process.send(data);
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

// I removed the else statement to put vairables in the global scope

let data = {};
data.workerId = cluster.worker.id - 1;
data.hashes = 0;
data.rejected = 0;
data.accepted = 0;

let socket = new net.Socket();
const promiseSocket = new PromiseSocket(socket);

socket.setEncoding("utf8");
socket.connect(2811, "51.15.127.80");

socket.once("data", (data) => {
    // login process
    if (data.includes("1.9")) {
        startMining();
    } else {
        console.log(data.slice(3));
        socket.end();
    }
});

socket.on("end", () => {
    console.log("Connection ended");
});

socket.on("error", (err) => {
    console.log(`Socket error: ${err}`);
});
