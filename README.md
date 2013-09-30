ydn-db-fulltext
===============

Full text search module for [YDN-DB](https://github.com/yathit/ydn-db) database
library.


Features
--------

* Unicode-base tokenization supporting full language spectrum.
* Stemming and phonetic normalization for English language.
* Free text query base ranking with logical and, or and near.
* Support exact match and prefix match.
* Being based on YDN-DB, storage mechanisms could be IndexedDB, WebSQL or localStorage.
* Easy and flexible configuration using fulltext catalog.


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
* `{string=} lang` Language. Stemming, word segmentation and phonetic normalization
 are language dependent. `lang` must be defined to index properly. Currently
 only `en` is well supported. For more languages, check out on [natural](https://github.com/yathit/natural.git)
 project repo.
* `{Array} sources` Full text indexes. Each index has source reference to
original document by `storeName` and `keyPath`. The value of `keyPath` is
the text to be indexed. `weight` factor is applied when ranking search result.
This value is not stored in the database can be changed after indexing as well.

The following full text catalog index author name on `first` and `last` field
of record value with weighting more on `first`.

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

* [Animal database search](http://dev.yathit.com/demo/ydn-db-text/animals/animals.html)
Basic indexing operation, featuring text suggestion input.
* [Biomedical Medical Journal Abstract Search](http://dev.yathit.com/demo/ydn-db-text/pubmed-search/index.html)
Ajax data load, free text search ranking and presenting result with matching words highlighted.
* [All demos](http://dev.yathit.com/index/demos.html)


Dependency
----------

1. Closure library: http://closure-library.googlecode.com/svn/trunk/
2. YDN-BASE: https://github.com/yathit/ydn-base.git
3. YDN-DB: https://github.com/yathit/ydn-db.git
4. fullproof: https://github.com/yathit/fullproof.git
5. natural: https://github.com/yathit/natural.git


Build process
-------------

See detail build procedure in [YDN-DB](https://github.com/yathit/ydn-db).

Collect all dependency using `git` or `svn`. Generate closure dependency using
`ant deps`. Then you should able to run HTML test files in the source code folders.
You should able to run example using raw js files.
Use `ant build` for minification.

Help and bug report
-------------------

Please file an issue for bug report describing how we could reproduce the problem.

Ask technical question in [Stackoverflow #ydn-db](http://stackoverflow.com/questions/tagged/ydn-db)
with ydb-db hash.

Follow on Twitter [@yathit](https://twitter.com/yathit) for update and news.

License
-------

Licensed under the Apache License, Version 2.0