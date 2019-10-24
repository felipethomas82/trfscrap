const puppeteer = require('puppeteer');

let url = 'https://jurisprudencia.trf4.jus.br/pesquisa/pesquisa.php?tipo=1';
(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 2000 });
    await page.goto(url);

    await page.waitForSelector('#textoPesqLivre');
    const txtPesquisa = page.$('#textoPesqLivre');
    txtPesquisa.value = 'aposentadoria especial';    
    await page.click('input[value="Pesquisar"]');
    await page.waitForSelector('#sbmProximaPagina');

    // await page.waitForNavigation({
    //     waitUntil: 'networkidle0',
    //   });
    
    const content = await page.content();
    // more than 1000 documents was found, so we need to click on button submit to show just the
    // first 1000 documents
    if ( content.indexOf( "frmDocumentos" ) > -1) {    
        await page.click('#parcial');
    } 
    // const teste = await page.$$('a');
    
    // console.log( await page.content());
    // evaluate the content and return all hrefs from all anchors
    const links = await page.evaluate(() => {
        const anchors = document.body.querySelectorAll('a');
        return [].map.call(anchors, a => a.href);
    });
    // filter the links to get only those with "inteiro_teor.php" in string
    const parsed = links.filter( l => l.indexOf('inteiro_teor.php') > -1);
    for (let i = 0; i<parsed.length; i++) {
        console.log(i + " - " + parsed[i]);
        
    }
    // console.log(JSON.stringify(links));

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