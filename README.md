ydn-db-fulltext
===============

Full text search module for [YDN-DB](https://github.com/yathit/ydn-db) database
library.

API Reference
-------------

Use `search` method to query full text search.

    db.search(catalog, query)


Documents are indexed during storing into the database using add or put methods.

Query format is free text, in which implicit and/or/near logic operator apply
for each token. Use double quote for exact match, - to subtract from the result
and * for prefix search.

*Parameters:*

* `{string} catalog`
   Full text search catalog name, as defined in schema.
* `{string} query`
   Free text query string.


*Returns:*

`{!ydn.db.Request}` Returns a request object.

  `done: {Array}` Return list of inverted index. An inverted index has the
  following attributes: `storeName`, `primaryKey`, `score`, `tokens`, representing for
  store name of original document, primary key of original document, match
  quality score and array of token objects. Token object has the following
  attributes: `keyPath`, `value` and `loc` representing key path of index of the
  original document, original word from the original document and array list of
  position of word in the document.

  `fail: {Error}` If any one of deleting a key fail, fail callback is invoked,
  with the resulting error in respective elements.

  `progress: {Array}` During index retrieval, raw inverted index are dispatched.

Example
-------

    var schema = {
      fullTextCatalogs: [{
        name: 'name',
        lang: 'en',
          sources: [
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


Full text catalog
-----------------
Full text catalog is a logical grouping of one or more full-text indexes. It is
defined in database initialization in database schema.

*Fields:*

* `{string} name` Full text catalog name.
* `{string=} lang` Language.
* `{Array} indexes` Full text indexes. Each index has source reference to
original document by `storeName` and `keyPath`. The value of `keyPath` is
the text to be indexed. `weight` factor is applied when ranking search result.
This value is not stored in the database can be changed after indexing as well.


    var catalog = {
      name: 'author-name',
      lang: 'en',
      sources: [{
        storeName: 'author',
        keyPath: 'first',
        weight: 1.0
      }, {
        storeName: 'author',
        keyPath: 'last',
        weight: 0.8
    }]

Demo applications
-----------------

* http://dev.yathit.com/index/demos.html


Dependency
----------

1. http://closure-library.googlecode.com/svn/trunk/
2. YDN-BASE: https://github.com/yathit/ydn-base.git
3. YDN-DB: https://github.com/yathit/ydn-db.git
4. fullproof: https://github.com/yathit/fullproof.git
5. natural: https://github.com/yathit/natural.git


Build process
-------------

Collect all dependency using `git` or `svn`. Generate closure dependency using
`ant deps`. Then you should able to run test files.
You should able to run example using raw js files.
Use `ant build` for minification.
