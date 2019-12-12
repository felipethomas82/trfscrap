const puppeteer = require('puppeteer');
const mongo = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://localhost:27017';
const TO_SCRAP = 'toScrap';
const DB_NAME = 'trfscrap';

var fs = require('fs');
let url = 'https://jurisprudencia.trf4.jus.br/pesquisa/pesquisa.php?tipo=1';

/*
    Function to insert the links of the docs in the collections to Scrap
    @Params links : Array  
*/
function insertScrape( paths ) {
    mongo.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, (err, client) => {
        if (err) {
            console.error(err)
            return
        }
        
        const db = client.db(DB_NAME);
        const collection = db.collection(TO_SCRAP);
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            collection.insertOne(
                {
                    path: path, 
                    scraped: false
                }
            )
            .then(result => {
                console.log("Inserted -> " + path);
            })
            .catch(err => {
                // duplicate entry
                console.log("Duplicated -> " + path);    
            });
        }

        client.close();
    })
}
// db.toScrap.count({"scraped": false})
/*
    Function to get the paths to execute the scraping 
*/
async function getToScrap() {
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
        let result = await collection.findOne({"scraped": false});
        return result.path;
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
    }
}

/*
    Function to get the count of pages to Scrap
*/
async function getCountToScrap() {
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
        let count = await collection.count({"scraped": false});
        return count;
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
    }
}

/*
    Function to get the paths to execute the scraping 
*/
async function updatePath( path, scraped ) {
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
        let result = await collection.updateOne( {"path" : path }, {$set : {"scraped": scraped}});
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
    }
}

function remainingTime( total, totalToScrap, i ) {
    let remaining = (((total/i) * (totalToScrap - i))/1000);
    return remaining > 3600 ? (remaining/60/60).toFixed(2) + " hrs" : 
            remaining > 60 ? (remaining/60).toFixed(2) + " mins" :
            remaining.toFixed(2) + " secs";
}

/*
    Function to get the number of 'gproc' or 'documento' inside the path string.
    The path to scrap can have different formats, so the string gproc is not 
    present in all of them. I discovered this after a while :/
    Found 'numeroProcesso' too. :S
    Has PDF too. Not processed for now.
    Examples: 
    https://jurisprudencia.trf4.jus.br/pesquisa/inteiro_teor.php?orgao=1&documento=9442770&termosPesquisados=J2Fwb3NlbnRhZG9yaWEgZXNwZWNpYWwnICdtb3RvcmlzdGEgZGUgb25pYnVzJw==
    https://jurisprudencia.trf4.jus.br/pesquisa/inteiro_teor.php?orgao=1&numero_gproc=40000850053&versao_gproc=4&crc_gproc=5fba9ca6&termosPesquisados=J2Fwb3NlbnRhZG9yaWEgZXNwZWNpYWwnICdtb3RvcmlzdGEgZGUgb25pYnVzJw==
    https://jurisprudencia.trf4.jus.br/pesquisa/inteiro_teor.php?orgao=1&numeroProcesso=200471020050973&dataDisponibilizacao=18/05/2007
    http://jurisprudencia.trf4.jus.br/pesquisa/inteiro_teor.php?arquivo=/trf4/volumes2/VOL0059/20031015/ST5/3062003/200004011332189A.0664.PDF

*/
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
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', consoleObj => console.log(consoleObj.text()));
    await page.setViewport({ width: 1920, height: 2000 });
    
    // read the search strings from a text file and store in a array
    var searchString = fs.readFileSync('search_strings.txt').toString().split(/\r?\n/);
    for (const search of searchString) {
        if (search == "") continue;
        console.log("Starting the search of this search string --> " + search);
        await page.goto(url);
        await page.waitForSelector('#textoPesqLivre');
        // const txtPesquisa = page.$('#textoPesqLivre');
        // txtPesquisa.value = '"aposentadoria especial" e "motorista de onibus"';  
        // await page.$eval('#textoPesqLivre', el => el.value = '"aposentadoria especial" e "soldador"');
        await page.$eval('#textoPesqLivre', function(el, search) { 
            console.log("**************************************************");
            console.log(search);
            console.log("**************************************************");
            
            el.value = search;
        }, search);
        await page.click('input[value="Pesquisar"]');
        
        const content = await page.content();
        // more than 1000 documents was found, so we need to click on button submit to show just the
        // first 1000 documents
        if ( content.indexOf( "frmDocumentos" ) > -1) {    
            await page.click('#parcial').catch(err => console.log(err));
        } 
        let tryNext = true;
        let pageNumber = 1;
        // while has pagination, will try the next result page
        while (tryNext) {
            await page
                .waitForSelector('#sbmProximaPagina')
                .then(() => tryNext = true)
                .catch(() => tryNext = false);
            
            if (tryNext) {
                console.log('----- SEARCH STRING = ' + search + ' - PAGE ' + pageNumber + ' ----------------');
                // evaluate the content and return all hrefs from all anchors
                const links = await page.evaluate(() => {
                    const anchors = document.body.querySelectorAll('a');
                    return [].map.call(anchors, a => a.href);
                });
                // filter the links to get only those with "inteiro_teor.php" in string
                const parsed = links.filter( l => l.indexOf('inteiro_teor.php') > -1);
                insertScrape( parsed );
                await page.click('#sbmProximaPagina');
                pageNumber++;
            }
        }
        console.log("End of this search string --> " + search);
        fs.appendFile('searched_strings.txt', "\n" + search, function (err) {
            if (err) console.log(err); //throw err;
            console.log('String saved in the file searched_strings.txt!');
        });
    }
    
    // after the crawler completes the job, it begins to scraping the pages and saves the results to a folder
    let pathToScrap = await getToScrap();
    let totalToScrap = await getCountToScrap();
    let start;
    let end;
    let total = 0;
    let i = 1;
    while(pathToScrap) {
        start = new Date(); //get current date to measurement
        console.log("\nScraping " + i + " from " + totalToScrap + " pages to scrap");
        console.log("Scraping the path: " + pathToScrap); 
        // let nroGProc = pathToScrap.split("numero_gproc=")[1].split("&")[0];
        let nroGProc = getProcNumber( pathToScrap );
        console.log("numero_gproc: " + nroGProc);
        try {
            if (pathToScrap.toLowerCase().indexOf(".pdf") >= 0) {
                updatePath(pathToScrap, true); //sets true to remove from list
                i++;
                console.log("**** PDF -> Skip *****");
                continue;
            }
            const response = await page.goto(pathToScrap, {waitUntil: 'load'});
            // await page.setContent((await response.buffer()).toString('utf8'));
            const innerText = await page.evaluate(() => document.querySelector('body').innerText);
            const html = await page.content();
            if (innerText.indexOf("Acesso negado") >= 0) {
                console.log("******** ACCESS DENIED. Try again later **************");
                continue;
            }
            //save the result in html and txt format
            console.log("Saving html file at scraped/" + nroGProc + ".html");
            fs.writeFileSync('scraped/' + nroGProc + '.html', html);
            console.log("Saving text file at scraped/" + nroGProc + ".txt");
            fs.writeFileSync('scraped/' + nroGProc + '.txt', innerText);
            updatePath(pathToScrap, true); //sets true to remove from list
            //get another path to scrap
            pathToScrap = await getToScrap();
            //show the total time to scrap and remaining time
            end = new Date() - start;
            total += end;
            console.log("Scraping time: " + (end/1000).toFixed(4) + "s");
            console.log("Total execution time: " + (total/1000).toFixed(4) + "s");
            console.log("Remaining time: " + remainingTime(total, totalToScrap, i));
            i++;
        } catch (error) {
            console.log("**** Timeout. Trying again. *****");
        }
    }
    console.log("---------------------------------------------------");
    console.log("Closing headless browser. Ending connection.");
    await browser.close();
    console.log("END SCRAPING PROGRAM");
    console.log("\n\n");
})();