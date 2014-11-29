
var reachedFinalContinuation;
var setUp = function () {
  reachedFinalContinuation = false;
};
var db_schema = {
  fullTextCatalogs: [{
    name: 'test',
    lang: 'en',
    sources: [
      {
        storeName: 'article',
        keyPath: 'title',
        weight: 1.0
      }, {
        storeName: 'article',
        keyPath: 'body',
        weight: 0.5
      }]
  }],
  stores: [
    {
      name: 'article',
      keyPath: 'title'
    }]
};
var test_inject = function() {
  var data = {
    title: 'tiger',
    body: 'This is a test for data injection. Only one tiger injected'
  };
  var db = new ydn.db.Storage('test_inject-2', db_schema, {policy: 'atomic'});
  var done;
  var read_data, schema, keywords;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        var store_names = schema.stores.map(function(x) {return x.name});
        assertArrayEquals('two object store', ['article', 'test'], store_names);
        assertObjectEquals('article tiger inserted as it is', data, read_data);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout
  db.clear();
  db.getSchema(function(x) {
    schema = x;
  });
  db.put('article', data);
  db.get('article', 'tiger').addBoth(function(x) {
    read_data = x;
    done = true;
  });
};
var test_basic_query = function() {
  var data = {
    title: 'Tiger',
    body: 'Tiger live in forest.'
  };
  var db = new ydn.db.Storage('test_basic_query-1', db_schema);
  var done;
  var read_data, schema, result, result2;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('Tiger has a result 1', 1, result.length);
        assertEquals('has a result 2', 1, result2.length);
        assertEquals('correct result 1', 1, result.length);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout
  db.clear();
  db.put('article', data).addBoth(function() {
    db.search('test', 'Tiger').addBoth(function(x) {
      // console.log('Tiger', x)
      result = x;
    });
    db.search('test', 'forest').addBoth(function(x) {
      result2 = x;
      // console.log('forest', x);
      done = true;
    });

  });
};

var test_index_delete = function() {
  var data = {
    title: 'Tiger',
    body: 'Tiger live in forest.'
  };
  var opt = {mechanisms: ['websql']};
  var db = new ydn.db.Storage('test_index_delete-1', db_schema, opt);
  var done;
  var read_data, schema, n_rem, result1, result2;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('Tiger has a result 1', 1, result1.length);
        assertEquals('keys removed', 1, n_rem);
        assertEquals('number of result 2', 0, result2.length);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout
  db.clear();
  var k1;
  db.put('article', data).addBoth(function(x) {
    // console.log(x);
    k1 = x[0];
    db.search('test', 'Tiger').addBoth(function(x) {
      // console.log('Tiger', x)
      result1 = x;
    });
    db.remove('article', k1).addBoth(function(n) {
      n_rem = n;
      db.search('test', 'Tiger').addBoth(function(x) {
        result2 = x;
        // console.log('forest', x);
        done = true;
      });
    });

  });
};


var test_index_update = function() {
  var data = {
    title: 'Tiger',
    body: 'Tiger live in forest.'
  };
  var db = new ydn.db.Storage('test_index_update-1', db_schema);
  var done;
  var read_data, schema, n_rem, result1, result2, result3;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('forest has a result 1', 1, result1.length);
        assertEquals('number of result 2', 0, result2.length);
        assertEquals('number of result 3', 1, result3.length);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout
  db.clear();
  var k1;
  db.put('article', data).addBoth(function(x) {
    db.search('test', 'forest').addBoth(function(x) {
      // console.log('Tiger', x)
      result1 = x;
    });
    data.body = 'Tiger live in tree';
    db.put('article', data).addBoth(function(n) {
      db.search('test', 'forest').addBoth(function(x) {
        result2 = x;
      });
      db.search('test', 'tree').addBoth(function(x) {
        result3 = x;
        // console.log('forest', x);
        done = true;
      });
    });

  });
};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);
