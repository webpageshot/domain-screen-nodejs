// CodeSnippets/Documents/Websites/NodeJs/createPdfServer.js
// TODO: sqlite
const cors = require("cors");
const express = require("express");
const puppeteer = require("puppeteer");
const path = require('path');
const status = require('./status');

// Globals
const port = 3000;
var browser;

// Initializing Express and Puppeteer Browser

const app = express();

// Middleware

app.use(cors());

// uruchomic na wydajnym serwerze contabo
// zrobic restart uslugi co godzine
// kasowac dane po 7 dniach
// dane w bazie sql
// kolejkowanie zapytan
// informacja o oczekiwaniu na realizacje w animacji gif - 1 minuta -+ 10 minut
// sprawdzanie najpierw w bazie danych
// realizacja limitow
// logi serwera i domen
//www.sending24.com/mailbox
// http://localhost:3000/url/https%3A%2F%2Fznajdztermin.pl
// http://localhost:3000/url/https%3A%2F%2Fwww.sending24.com
// http://localhost:3000/url/https%3A%2F%2Fplanemerytalny.pl%0D

function getPathByUrl(url, extension = 'png') {

    // Buffer.from("SGVsbG8gV29ybGQ=", 'base64').toString('ascii')
    const urld = Buffer.from(url).toString('base64');
    // console.log(urld);

    var img = path.join(extension, urld + '.' + extension);

    var p = path.join(__dirname, img);

    return p;
}

// Check if exist base64 of domain on image
//  if not, try to download
app.get('/url/:url', async (req, res) => {

    if (!req.params.url) {
        throw new Error("domain is required");
    }

    var url = req.params.url;

    // Buffer.from("SGVsbG8gV29ybGQ=", 'base64').toString('ascii')
    const urld = Buffer.from(url).toString('base64');
    // console.log(urld);

    var img = path.join('png', urld + '.png');

    var p = path.join(__dirname, img);

    // var url = decodeURI(req.params.url);


    // send a png file if exist
    const fs = require("fs"); // Or `import fs from "fs";` with ESM
    if (fs.existsSync(p)) {
        console.log(`HDD YES: ${url}`);
        res.sendFile(p);
        return true;
    }


    try {

        status(url, function (check) {
                console.log(check); //true

                // absolute path to the file
                let p = path.join(__dirname, img);
                const fs = require("fs");
                if (fs.existsSync(p)) {
                    console.log(`HDD YES: ${url}`);

                    // send a png file
                    res.sendFile(p);
                    return true;
                } else {
                    capture(img, url, res)
                    return true;
                }

            },
            function (check) {
                console.log(check); //true
                if (check == 'ERR_TLS_CERT_ALTNAME_INVALID' || check == 'ERR_TOO_MANY_REDIRECTS') {
                    capture(img, url, res)
                    return true;
                }

                download('', url, res);
                return false;
            }
        );

        // img = 'img/not.png';
        // download(img, url, res);

    } catch (err) {
        console.log(":::err.message:");
        console.log(err.message);
        download('', url, res);
        return false;
    }

    // img = 'img/not.png';
    // download(img, url, res);
})

/**
 * @param img
 * @param url
 * @param res
 * @returns {boolean}
 */
function download(img, url, res) {

    // absolute path to the file
    var p = path.join(__dirname, 'img', 'not.png');

    if (img.length === 0) {
        console.log(`HDD NOT: ${url}`);
    } else {
        console.log(`HDD YES: ${url}`);
        p = path.join(__dirname, img);
    }


    const fs = require("fs"); // Or `import fs from "fs";` with ESM
    if (fs.existsSync(p)) {

        // send a png file
        res.sendFile(p);
        return true;
    }
    return false;
}

/**
 *
 * @param img
 * @param url
 * @param res
 * @returns {Promise<boolean>}
 */
async function capture(img, url, res) {
// if(capture(img, url, res)){
    const fs = require("fs"); // Or `import fs from "fs";` with ESM

    ///////////
    const browser = await puppeteer.launch({
        headless: true,
        timeout: 0,
        ignoreHTTPSErrors: true,
        // ignoreDefaultArgs: ['--disable-extensions'],
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--ignore-certificate-errors',
            // '--disable-gpu',
        ]
    });

    // try {
    const webPage = await browser.newPage();

    const response = await webPage.goto(url, {
        // waitUntil: "networkidle0"
    });

    const chain = response.request().redirectChain();
    // console.log(chain); // Return 1

    // console.log("chain " + chain.length); // Return 1
    if (chain.length > 0) {
        // url = chain[0].response().url();
        url = chain[0].response().headers().location;
        console.log("url redirected: ", url); // Return string 'http://example.com'

        // url = chain[1].url();
        // console.log("url", url); // Return string 'http://example.com'

        let path_png = path.join(__dirname, img);
        // console.log("path_png  redirected: ", path_png); // Return string 'http://example.com'
        let path_txt = getPathByUrl(url, 'txt');

        console.log(path_txt);

        if (fs.existsSync(path_png)) {
            // send a png file
            res.sendFile(path_png);
            console.log(`HDD YES: ${url}`);
        } else if (!fs.existsSync(path_txt)) {
            // create TXT to know, that was checked, and no make more redirection, even there are more than 1
            createTXT(url);
            capture(img, url, res);
        } else {
            // res.sendFile(path_png);
            // console.log(`HDD YES: ${url}`);
            download(img, url, res);
        }

        // capture(img, url, res);
        await browser.close();
        return true;

    }

    const png = await webPage.screenshot({path: img});

    // } catch (err) {
    //     console.log(err.toString());
    //     download('', url, res);
    //     await browser.close();
    //     return false;
    // }
    await browser.close();
    ///////////


    res.contentType("image/png");
    res.send(png);
    console.log(`HTTP YES: ${url}`);

    return true;
}

function createTXT(url) {

    let path = getPathByUrl(url, 'txt');

    const fs = require("fs"); // Or `import fs from "fs";` with ESM

    // let p = path.join(__dirname, 'txt', filename);

    // fs.writeFile(path, url, function (err) {
    //     if (err) {
    //         return false;
    //         return console.log(err);
    //     }
    //     console.log("The file was saved!");
    // });

// Or
    return fs.writeFileSync(path, url);
}

// http://localhost:3000/remove/png
// http://localhost:3000/remove/txt

app.get("/remove/:dir", async (req, resp) => {


    if (!req.params.dir) {
        // throw new Error("dir is required");
        resp.send({"status": false, "message": "dir is required"});
    }

    const directory = req.params.dir;
    console.log('remove cache on ', directory);


    const fs = require('fs');
    const path = require('path');


    fs.readdir(directory, (err, files) => {
        if (err) {
            // throw err;
            resp.send({"status": false, "message": err.message});
        }
        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) {
                    // throw err;
                    resp.send({"status": false, "message": err.message});

                }
            });
        }
    });

    resp.send({"status": true});
    // resp.send(`Request rcvd: ${url}`);
});

// ERR_TOO_MANY_REDIRECTS

process.on('unhandledRejection', function (err) {
    console.log(':::unhandledRejection:');
    console.log(err);
    // sendInTheCalvary(err);

});


app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})


/*
app.get("/http/:domain", async (req, resp) => {

    if (!req.params.domain) {
        throw new Error("domain is required");
    }

    var domain = req.params.domain;
    var url = `https://${domain}`


    console.log(`Rcvd: ${url}`);


    ///////////
    const browser = await puppeteer.launch({
        headless: true,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const webPage = await browser.newPage();

    await webPage.goto(url, {
        waitUntil: "networkidle0"
    });


    var img = 'png/' + domain + '.png';

    const png = await webPage.screenshot({path: img});

    await browser.close();
    ///////////


    resp.contentType("image/png");
    resp.send(png);
    // resp.send(`Request rcvd: ${url}`);
});
*/
