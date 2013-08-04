// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Hook into database operator to inject index on write and
 * add full text search function.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

// namespace for full-text search index
goog.provide('ydn.db.crud.Storage.text');
goog.require('ydn.db.text.QueryEngine');
goog.require('ydn.db.crud.Storage');


/**
 * @define {boolean} debug flag, always false.
 */
ydn.db.crud.Storage.text.DEBUG = false;


/**
 * Add full text indexer
 * @param {ydn.db.schema.Store} store store object.
 * @param {ydn.db.schema.fulltext.Catalog} ft_schema full text schema.
 * @protected
 */
ydn.db.crud.Storage.prototype.addFullTextIndexer = function(store, ft_schema) {
  var me = this;

  ft_schema.engine = new ydn.db.text.QueryEngine(ft_schema);
  /**
   * @param {!ydn.db.Request} rq
   * @param {goog.array.ArrayLike} args
   */
  var indexer = function(rq, args) {
    var mth = rq.getMethod();
    if (mth == ydn.db.Request.Method.PUT) {
      var doc = /** @type {!Object} */ (args[1]);
      var store_name = store.getName();
      if (ydn.db.crud.Storage.text.DEBUG) {
        window.console.log(mth + ' indexing ' + store_name +
            ydn.json.toShortString(doc));
      }
      rq.addCallback(function(key) {
        var p_key = /** @type {IDBKey} */ (key);
        var entries = ft_schema.engine.analyze(store_name, p_key, doc);
        var json = entries.map(function(x) {
          return x.toJson();
        });
        if (ydn.db.crud.Storage.text.DEBUG) {
          window.console.log(json);
        }
        me.getCoreOperator().dumpInternal(ft_schema.getName(), json);
      }, this);
    } else if (mth == ydn.db.Request.Method.PUTS) {
      var arr = /** @type {Array} */ (args[1]);
      var store_name = store.getName();
      if (ydn.db.crud.Storage.text.DEBUG) {
        window.console.log(mth + ' indexing ' + store_name +
            arr.length + ' objects');
      }
      rq.addCallback(function(keys) {
        for (var i = 0; i < keys.length; i++) {
          var doc = /** @type {!Object} */ (arr[i]);
          var p_key = /** @type {IDBKey} */ (keys[i]);
          var scores = ft_schema.engine.analyze(store_name, p_key, doc);
          var json = scores.map(function(x) {
            return x.toJson();
          });
          if (ydn.db.crud.Storage.text.DEBUG) {
            window.console.log(json);
          }
          me.getCoreOperator().dumpInternal(ft_schema.getName(), json);
        }
      }, this);
    }
  };
  store.addHook(indexer);
};


/**
 * Full text search query.
 * @param {string} name full text search index name.
 * @param {string} query text query.
 * @param {number=} opt_limit Maximum number of satisfactory results.
 * @param {number=} opt_threshold Threshold score of a result to consider as
 * success.
 * @return {!ydn.db.Request} search request.
 */
ydn.db.crud.Storage.prototype.search = function(name, query, opt_limit,
                                                opt_threshold) {

  var ft_schema = this.schema.getFullTextSchema(name);
  if (!ft_schema) {
    throw new ydn.debug.error.ArgumentException('full text index catalog "' +
        name + '" not found.');
  }
  var result = ft_schema.engine.query(name, query, opt_limit, opt_threshold);
  if (!result) {
    this.logger.finer('query "' + query + '" contains only noise and' +
        ' search is ignored');
    return ydn.db.Request.succeed(ydn.db.Request.Method.SEARCH, null);
  }
  return this.getCoreOperator().search(result);
};
