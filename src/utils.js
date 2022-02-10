const fetch = require('node-fetch');

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

module.exports = {
    calculateHashrate,
    getPool
};