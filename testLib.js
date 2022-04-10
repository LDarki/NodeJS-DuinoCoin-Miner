const utils = require("./src/utils.js");
const fs = require('fs');
const ini = require('ini');
const path = require("path");
const CONFIG_FILE = path.join(__dirname, "config.ini");

if(fs.existsSync(CONFIG_FILE)) {
    fs.readFile(CONFIG_FILE, 'utf-8', (err, data) => {
        if (err) throw err;
        config = ini.parse(data);
        console.log(config);
        console.log("Searching for the best hash lib.");
        utils.testLibs().then((lib) => {
            config.hashlib = lib;

            fs.writeFile(CONFIG_FILE, ini.stringify(config), (err) => {
                if(err) throw err;
                console.log("Config file saved");
            });

            console.log("Using " + config.hashlib + " for hashing");
        });
    });
} else {
    console.log("Config file not found");
};