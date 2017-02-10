#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var rootdir = process.argv[2];

var oauth_clientid = "4E7SLp7CFM6vGcVwBhHxupyM3N0a";
var oauth_clientsecret = "5a73X2IDvAPMMe5ZkJrJrsm3tBUa";
// build_app = Casinocoin or Sandcoins
var build_app = "Casinocoin";

function replace_string_in_file(filename, to_replace, replace_with) {
    var data = fs.readFileSync(filename, 'utf8');
    var result = data.replace(new RegExp(to_replace, "g"), replace_with);
    fs.writeFileSync(filename, result, 'utf8');
}

if (rootdir) {
    console.log("### Root Directory: " + rootdir);
    var configFile = path.join(rootdir, "config.xml");
    var scssFile = path.join(rootdir, "scss/ionic.app.scss");
    var localefiles = ["www/locale-en.json", "www/locale-nl.json"];
    if(build_app == "Sandcoins"){
        // replace values
        console.log("### Replace to Sandcoins values");
        replace_string_in_file(configFile, "org\\.casinocoin\\.mobilewallet", "com.sandcoins.mobilewallet");
        replace_string_in_file(configFile, "<name>Casinocoin<\\/name>", "<name>Sandcoins</name>");
        replace_string_in_file(configFile, "<description>Casinocoin Mobile Wallet<\\/description>", "<description>Sandcoins Mobile Wallet</description>");
        replace_string_in_file(configFile, "wallet@casinocoin\\.org", "wallet@sandcoins.com");
        replace_string_in_file(configFile, "https:\\/\\/wallet\\.casinocoin\\.org\\/", "https://wallet.sandcoins.com/");
        replace_string_in_file(scssFile, "\\$assertive: #901119", "$assertive: #25c9fc");
        // copy files
        fs.createReadStream(path.join(rootdir, "resources/icon-sandcoin.png")).pipe(fs.createWriteStream(path.join(rootdir, "resources/icon.png")));
        fs.createReadStream(path.join(rootdir, "resources/splash-sandcoin.png")).pipe(fs.createWriteStream(path.join(rootdir, "resources/splash.png")));
        fs.createReadStream(path.join(rootdir, "resources/bg-sandcoin.png")).pipe(fs.createWriteStream(path.join(rootdir, "www/img/background.png")));
        fs.createReadStream(path.join(rootdir, "resources/sandcoin-icon-1024x1024.png")).pipe(fs.createWriteStream(path.join(rootdir, "www/img/home-icon.png")));
        // recreate resources
        var execFile = require('child_process').execFile;
        execFile("C:\\Users\\a.jochems\\AppData\\Roaming\\npm\\ionic.cmd", ["resources"], null, function(error, stdout, stderr) {
            console.log("### stdout: " + stdout);
        });
        // update locale files
        localefiles.forEach(function(val, index, array) {
            var fullfilename = path.join(rootdir, val);
            replace_string_in_file(fullfilename, "Casinocoin", "Sandcoins");
        });
    } else {
        // replace values
        console.log("### Replace to Casinocoin values");
        replace_string_in_file(configFile, "com\\.sandcoins\\.mobilewallet", "org.casinocoin.mobilewallet");
        replace_string_in_file(configFile, "<name>Sandcoins<\\/name>", "<name>Casinocoin</name>");
        replace_string_in_file(configFile, "<description>Sandcoins Mobile Wallet<\\/description>", "<description>Casinocoin Mobile Wallet</description>");
        replace_string_in_file(configFile, "wallet@sandcoins\\.com", "wallet@casinocoin.org");
        replace_string_in_file(configFile, "https:\\/\\/wallet\\.sandcoins\\.com\\/", "https://wallet.casinocoin.org/");
        replace_string_in_file(scssFile, "\\$assertive: #25c9fc", "$assertive: #901119");
        // copy files
        fs.createReadStream(path.join(rootdir, "resources/icon-casinocoin.png")).pipe(fs.createWriteStream(path.join(rootdir, "resources/icon.png")));
        fs.createReadStream(path.join(rootdir, "resources/splash-casinocoin.png")).pipe(fs.createWriteStream(path.join(rootdir, "resources/splash.png")));
        fs.createReadStream(path.join(rootdir, "resources/bg-casinocoin.png")).pipe(fs.createWriteStream(path.join(rootdir, "www/img/background.png")));
        fs.createReadStream(path.join(rootdir, "resources/casinocoin-icon-1024x1024.png")).pipe(fs.createWriteStream(path.join(rootdir, "www/img/home-icon.png")));
        // recreate resources
        var execFile = require('child_process').execFile;
        execFile("C:\\Users\\a.jochems\\AppData\\Roaming\\npm\\ionic.cmd", ["resources"], null, function(error, stdout, stderr) {
            console.log("### stdout: " + stdout);
        });
        // update locale files
        localefiles.forEach(function(val, index, array) {
            var fullfilename = path.join(rootdir, val);
            replace_string_in_file(fullfilename, "Sandcoins", "Casinocoin");
        });
    }
}
