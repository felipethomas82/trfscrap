const mongo = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://localhost:27017';
const SPARK_COLLECTION = 'spark';
const DB_NAME = 'trfscrap';
const TO_SCRAP = 'toScrap';

/*
    Function to get all results saved by spark
    @params _key: String with the key to search
*/
async function searchByKey( _key ) {
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
        const collection = db.collection(SPARK_COLLECTION);
        //db.spark.find({mineiro:{$exists : true}})
        var dynObj = {
            [_key]: { $exists: true }
        };
        console.log(dynObj);
        
        let result = await collection.find(dynObj).limit(1000);
        const results = [];
        let i=0;
        await result.forEach( function(row) {
            results.push( JSON.parse(JSON.stringify(row)) );
            i++;
        });
        return results;
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
    }
}


/*
    Function to get the path with proc number
    @params np: String with the proc number
*/
async function getPathByNP( np ) {
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
        np = np.replace('_np', '').replace('_d','');
        let regexString = ".*"+np+".*";
        let result = await collection.findOne({path: {$regex : regexString}});
        return result.path;
    } catch (error) {
        console.log(error);
    } finally {
        client.close();
    }
}

(async () => {
    // put strings in this array to execute the search
    let search = ["vibracao"];
    let result = await searchByKey( search[0] );
    let key = search[0];
    result.sort( (a,b) => b[key] > a[key] ? 1 : b[key] < a[key] ? -1 : 0 );
    // console.log(result);
    for (let i=0; i<10; i++) {
        console.log(result[i].file);
        console.log("HITS: " + result[i][key]);
        let path = await getPathByNP( result[i].file );
        console.log( path );
    }
    
    console.log("---------------------------------------------------");
    console.log("END SEARCH PROGRAM");
    console.log("\n\n");
})();