ydn-db-fulltext
===============

Full text search module for YDN-DB

Usage
-------

Use `search` method to query full text search.

    db.search(catalog, query)

Parameters:

* `{string} catalog`
   Full text search catalog name, as defined in schema.
* `{string} query`
   Free text query string.


Returns:

* `{!ydn.db.Request}` Returns a request object.
*    `done: {Array}` Return list of inverted index. An inverted index has the following attributes: storeName, primaryKey, score, tokens, representing for store name of original document, primary key of original document, match quality score and array of token objects. Token object has the following attributes: keyPath, value and loc representing key path of index of the original document, original word from the original document and array list of position of word in the document.
*    `fail: {Error}` If any one of deleting a key fail, fail callback is invoked, with the resulting error in respective elements.

Documents are indexed during storing into the database using add or put methods.

Query format is free text, in which implicit and/or/near logic operator apply
for each token. Use double quote for exact match, - to subtract from the result
and * for prefix search.

    var schema = {
      fullTextCatalogs: [{
        name: 'name',
        lang: 'en',
          indexes: [
            {
              storeName: 'contact',
              keyPath: 'first'
            }],
        ]},
        stores: [
          {
            name: 'contact',
            autoIncrement: true
          }]
    };
    var db = new ydn.db.Storage('db name', schema);
    db.put('contact', [{first: 'Jhon'}, {first: 'Collin'}]);
    db.search('name', 'jon').done(function(x) {
      console.log(x);
      db.get(x[0].storeName, x[0].primaryKey).done(function(top) {
        console.log(top);
      })
    });


Demo application
----------------

* http://dev.yathit.com/index/demos.html


Dependency
----------

1. YDN-DB: https://github.com/yathit/ydn-db.git
2. fullproof: https://github.com/yathit/fullproof.git
3. natural: https://github.com/yathit/natural.git

