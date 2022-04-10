const { PromiseSocket } = require("promise-socket");
const cluster = require("cluster");
const net = require("net");
const RL = require("readline");
const utils = require("./src/utils.js");
const fs = require('fs');
const ini = require('ini');
const path = require("path");
const CONFIG_FILE = path.join(__dirname, "config.ini");

let user = "",
    processes = 0,
    hashlib = "",
    mining_key = "",
    config = {};

const loadConfig = async () => {
    return new Promise((resolve, reject) => {
        if(fs.existsSync(CONFIG_FILE)) {
            fs.readFile(CONFIG_FILE, 'utf-8', (err, data) => {
                if (err) throw err;
                config = ini.parse(data);
                resolve(config);
            });
        } else {
            console.log("Config file not found");

            let configData = {
                "username": "LDarki",
                "mining_key": "None",
                "hashlib": "js-sha1",
                "threads": 2
            };

            config = configData;

            fs.writeFile(CONFIG_FILE, ini.stringify(configData), (err) => {
                if(err) throw err;
                resolve(config);
            });
        };
    });
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

const findNumber = (prev, toFind, diff, data, socket) => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < 100 * diff + 1; i++) {
            let hash = utils._sha1(hashlib, (prev + i));

            data.hashes = data.hashes + 1;

            if (hash == toFind) {
                socket.write(i.toString() + ",NodeJS Miner v3.0");
                resolve();
                break;
            }
        }
    });
};

const startMining = async (socket, data) => {
    // start the mining process
    let promiseSocket = new PromiseSocket(socket);
    promiseSocket.setTimeout(5000);
    while (true) {
        try {
            setTimeout(async () => {
                socket.write("JOB," + user + ",MEDIUM," + mining_key);
                let job = await promiseSocket.read();

                console.log(job);
                job = job.split(",");

                const prev = job[0];
                const toFind = job[1];
                const diff = job[2];

                await findNumber(prev, toFind, diff, data, socket);
                const str = await promiseSocket.read();

                if (str.includes("BAD")) {
                    data.rejected = data.rejected + 1;
                } else {
                    data.accepted = data.accepted + 1;
                }
                process.send(data);
                data.hashes = 0;
            }, 500);
        }
        catch (err) {
            console.log(`[${data.workerId}] Error while mining: ` + err);
            break;
        }
    }
};

if (cluster.isMaster) {
    let threads = [];

    loadConfig().then((cfg) => {

        user = cfg.username;
        processes = cfg.threads;
        hashlib = cfg.hashlib;
        mining_key = cfg.mining_key || "";

        console.log("Miner Started for user (" + user + ") with " + processes + " threads");

        for (let i = 0; i < processes; i++) {
            let worker = cluster.fork();

            console.log("Worker pid-" + worker.process.pid + " started");

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
    });
} else {

    loadConfig().then((cfg) => {
        user = cfg.username;
        processes = cfg.threads;
        hashlib = cfg.hashlib;
        mining_key = cfg.mining_key || "";
    });

    let workerData = {};
    workerData.workerId = cluster.worker.id - 1;
    workerData.hashes = 0;
    workerData.rejected = 0;
    workerData.accepted = 0;

    let socket = new net.Socket();

    socket.setEncoding("utf8");
    socket.setTimeout(5000);
    socket.connect(14166, "51.158.113.59");

    /*utils.getPool().then((data) => {
        console.log(`[${workerData.workerId}] ` + "Connecting to pool: " + data.name);
        socket.connect(data.port, data.ip);
    }).catch((err) => {
        console.log(err);
    });*/

    socket.once("data", (data) => {
        console.log(`[${workerData.workerId}] ` + "Pool MOTD: " + data);
        startMining(socket, workerData);
    });

    socket.on("end", () => {
        console.log(`[${workerData.workerId}] ` + "Connection ended");
    });

    socket.on("error", (err) => {
        if(err.message.code = "ETIMEDOUT")
        {
            console.log(`[${workerData.workerId}] ` + "Connection timed out");
            console.log(`[${workerData.workerId}] ` + "Restarting connection");
            utils.getPool().then((data) => {
                console.log(`[${workerData.workerId}] ` + "Connecting to pool: " + data.name);
                socket.connect(data.port, data.ip);
            }).catch((err) => {
                console.log(err);
            });
        }
        console.log(`[${workerData.workerId}] ` + `Socket error: ${err}`);
    });
}
