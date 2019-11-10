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
        let result = await collection.update( {"path" : path }, {"scraped": scraped});
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
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
        // const teste = await page.$$('a');
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
    while(pathToScrap) {
        console.log("Saving the html for the path: " + pathToScrap);
        let nroGProc = pathToScrap.split("numero_gproc=")[1].split("&")[0];
        console.log("numero_gproc: " + nroGProc);
        
        const response = await page.goto(pathToScrap, {waitUntil: 'load'});
        await page.setContent((await response.buffer()).toString('utf8'));
        const html = await page.content();
        fs.writeFileSync('scraped/' + nroGProc + '.html', html);
        updatePath(pathToScrap);
    }
    await browser.close();
    /*
    // get the first page to fill the search input
    let hotelData = await page.evaluate(() => {
        let hotels = [];
        // get the hotel elements
        let hotelsElms = document.querySelectorAll('div.sr_property_block[data-hotelid]');
        // get the hotel data
        hotelsElms.forEach((hotelelement) => {
            let hotelJson = {};
            try {
                hotelJson.name = hotelelement.querySelector('span.sr-hotel__name').innerText;
                hotelJson.reviews = hotelelement.querySelector('span.review-score-widget__subtext').innerText;
                hotelJson.rating = hotelelement.querySelector('span.review-score-badge').innerText;
                if(hotelelement.querySelector('strong.price')){
                    hotelJson.price = hotelelement.querySelector('strong.price').innerText;
                }
            }
            catch (exception){

            }
            hotels.push(hotelJson);
        });
        return hotels;
    });
    */

    // console.dir(hotelData);
})();