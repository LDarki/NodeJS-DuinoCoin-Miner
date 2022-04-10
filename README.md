# NodeJS-DuinoCoin-Miner
A **[duino-coin](https://duinocoin.com/)**.miner made in NodeJS.

## Installation

Install the dependencies
```bash
npm i
```

Run the miner
```
node index.js
```

Notes:

- Default config file:
```
username=LDarki
mining_key=None
hashlib=js-sha1
threads=2
```

- You can test for the best hash lib using this command:
```
node testLib.js
```
In order to use that script you need to have the config.ini file in the same directory.