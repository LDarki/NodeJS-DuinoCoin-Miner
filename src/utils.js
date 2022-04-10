const fetch = require('node-fetch');
const sha1 = require("js-sha1");
const jsSha1 = require("sha1");
const crypto = require('crypto');
const Benchmark = require("benchmark");
const Rusha = require('rusha');
const Hashes = require('jshashes')

const suite = new Benchmark.Suite;

const calculateHashrate = (hashes) => {
    hashes = parseFloat(hashes);
    let hashrate = hashes.toFixed(2) + " h/s";

    if (hashes / 1000 > 0.5) hashrate = (hashes / 1000).toFixed(2) + " Kh/s";
    if (hashes / 1000000 > 0.5) hashrate = (hashes / 1000000).toFixed(2) + " Mh/s";
    if (hashes / 1000000000 > 0.5) hashrate = (hashes / 1000000000).toFixed(2) + " Gh/s";

    return hashrate;
};

const getPool = async () => {
    return new Promise((resolve, reject) => {
        fetch("https://server.duinocoin.com/getPool")
            .then(res => res.json())
            .then(res => {
                if(res.success == true) resolve(res);
                else reject("Failed to fetch the pool");
            }).catch(err => {
                reject(err);
            });
    });
};

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
            hashlib = this.filter('fastest').map('name');
            if (hashlib.length > 1) {
                resolve(hashlib[0]);
            } else {
                resolve(hashlib);
            }
        })
        .run({ 'async': true });
    });
};

const _sha1 = (hashlib, str) => {
    if (hashlib == "rusha") return Rusha.createHash().update(str).digest('hex');
    if (hashlib == "sha1") return jsSha1(str);
    if (hashlib == "node crypto") return crypto.createHash('sha1').update(str).digest('hex');
    if (hashlib == "jshashes") return new Hashes.SHA1().hex(str);
    return sha1(str);
};

module.exports = {
    calculateHashrate,
    getPool,
    testLibs,
    _sha1
};