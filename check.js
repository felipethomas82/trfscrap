const puppeteer = require('puppeteer');
const mongo = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://localhost:27017';
const TO_SCRAP = 'toScrap';
const DB_NAME = 'trfscrap';

var fs = require('fs');

/*
    Function to get the paths to execute the scraping 
*/
async function getAllPaths() {
    const client = await mongo.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).catch(err => console.log(err));
    
    if (!client) {
        console.error(err)
        return
    }
    try {
        const db = client.db(DB_NAME);
        const collection = db.collection(TO_SCRAP);
        let result = await collection.find();
        const paths = [];
        await result.forEach( function(p) {
            paths.push( JSON.parse(JSON.stringify(p)) );
        });
        return paths;
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
    }
}

function getProcNumber( pathToScrap ) {
    if (pathToScrap.indexOf("numero_gproc=") >= 0) {
        return pathToScrap.split("numero_gproc=")[1].split("&")[0];
    } 
    if (pathToScrap.indexOf("documento=") >= 0) {
        return pathToScrap.split("documento=")[1].split("&")[0] + "_d";
    }
    if (pathToScrap.indexOf("numeroProcesso=") >= 0) {
        return pathToScrap.split("numeroProcesso=")[1].split("&")[0] + "_np";
    }
    if (pathToScrap.indexOf("arquivo=") >= 0) {
        pathToScrap = pathToScrap.split("arquivo=")[1].split("/");
        return pathToScrap[pathToScrap.length - 1];
    }
    
}

(async () => {
    
    // after the crawler completes the job, it begins to scraping the pages and saves the results to a folder
    let paths = await getAllPaths();
    console.log(paths.length + " to check");
    
    let filesName = [];
    //get all files name
    fs.readdirSync('./scraped/').forEach(file => {
        filesName.push(file);
    });
    //filter by txt extension
    console.log(filesName.length + " documents inside the folder scraped");
    let path = "";
    let nro;
    let filename;
    let procNumbers = [];
    // iterate over all paths get from DB and check if the path has a corresponding 
    for (let i=0; i<paths.length; i++) {
        path = paths[i].path;
        nro = getProcNumber( path );
        filename = nro + '.txt';
        if ( filesName.indexOf(filename) == -1 ) {
            console.log("Find a path not scraped. :/");
            console.log( path );
        }
        // paste in this if a number found in the below if (the commented one)
        if (nro == '40001415532') {
            console.log("Test of proc number duplicated");
            console.log(path);
            
        }
        // if (procNumbers.indexOf(nro) >= 0) {
        //     console.log("Proc number duplicated " + nro);
        // }
        // procNumbers.push(nro);
    }
    console.log("---------------------------------------------------");
    console.log("END CHECK PROGRAM");
    console.log("\n\n");
})();