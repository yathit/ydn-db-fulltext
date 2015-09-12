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
goog.require('ydn.db.crud.DbOperator.text');


/**
 * @define {boolean} debug flag, always false.
 */
ydn.db.crud.Storage.text.DEBUG = false;


/**
 * Add full text indexer
 * @param {!ydn.db.schema.Store} store store object.
 * @param {!ydn.db.schema.fulltext.Catalog} ft_schema full text schema.
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
    /**
     * Inject document for indexing.
     * @param {!Array} arr list of keys.
     * @param {boolean} is_update if update (PUT), existing index will be removed
     * before adding new indexes.
     */
    var inject = function(arr, is_update) {
      var store_name = store.getName();
      if (ydn.db.crud.Storage.text.DEBUG) {
        window.console.log(mth + ': indexing ' +
            arr.length + ' objects for ' + store_name);
      }
      rq.await(function(keys, is_error, cb) {
        rq.notify(keys);
        if (is_error) {
          cb(keys, is_error);
          return;
        }
        var idx_st_name = ft_schema.getName();
        if (!goog.isArray(keys)) {
          keys = [keys];
        }
        for (var i = 0; i < keys.length; i++) {
          var p_key = /** @type {IDBKey} */ (keys[i]);
          if (!ydn.db.Key.isValidKey(p_key)) {
            continue;
          }
          if (is_update) {
            var kr = ydn.db.KeyRange.bound([store_name, p_key],
                [store_name, p_key, '\uffff']).toIDBKeyRange();
            var rm_req = me.getCoreOperator().removeInternal(idx_st_name, kr);
            if (ydn.db.crud.Storage.text.DEBUG) {
              rm_req.addBoth(function(n) {
                window.console.log(p_key + ' remove ' + n + ' indexes');
              });
            }
          }
          var doc = /** @type {!Object} */ (arr[i]);
          var scores = ft_schema.engine.analyze(store_name, p_key, doc);
          var json = scores.map(function(x) {
            return x.toJson();
          });
          if (ydn.db.crud.Storage.text.DEBUG) {
            window.console.log(json);
          }
          ft_schema.engine.addTotalDoc(json.length);
          var req = me.getCoreOperator().dumpInternal(idx_st_name, json);
          if (i == keys.length - 1) {
            req.addBoth(
                function(x) {
                  if (ydn.db.crud.Storage.text.DEBUG) {
                    window.console.log('index done', x);
                  }
                  cb(keys, is_error);
                });
          }
        }
      });
    };
    /**
     * Clear index.
     * @param {IDBKeyRange} kr key range.
     */
    var clearByKeyRange = function(kr) {
      var store_name = store.getName();
      if (ydn.db.crud.Storage.text.DEBUG) {
        window.console.log(mth + ': removing index ' +
            ydn.json.stringify(kr) + ' on ' + store_name);
      }
      rq.await(function(cnt, is_error, cb) {
        if (is_error) {
          cb(cnt, is_error);
        } else {
          rq.notify(cnt);
          if (kr) {
            kr = ydn.db.KeyRange.bound([store_name, kr.lower],
                [store_name, kr.upper, '\uffff']).toIDBKeyRange();
          }
          var req = me.getCoreOperator().removeInternal(store_name, kr);
          req.addBoth(function(x) {
            if (ydn.db.crud.Storage.text.DEBUG) {
              window.console.log('index removed', x);
            }
            cb(cnt, is_error);
          });
        }
      });
    };
    /**
     * Clear index.
     * @param {IDBKey} id key to be deleted.
     */
    var clearById = function(id) {
      var store_name = store.getName();
      if (ydn.db.crud.Storage.text.DEBUG) {
        window.console.log(mth + ': removing index for key ' +
            id + ' on ' + store_name);
      }
      if (ydn.db.Key.isValidKey(id)) {
        rq.await(function(cnt, is_error, cb) {
          if (is_error) {
            cb(cnt, is_error);
          } else {
            rq.notify(cnt);
            var kr = ydn.db.KeyRange.bound([store_name, id],
                [store_name, id, '\uffff']).toIDBKeyRange();
            var idx_st_name = ft_schema.getName();
            var req = me.getCoreOperator().removeInternal(idx_st_name, kr);
            req.addBoth(function(x) {
              if (ydn.db.crud.Storage.text.DEBUG) {
                window.console.log('index removed', x);
              }
              cb(cnt, is_error);
            });
          }
        });
      } else if (ydn.db.crud.Storage.text.DEBUG) {
        window.console.log('invalid key ', id);
      }
    };
    var mth = rq.getMethod();
    if (mth == ydn.db.Request.Method.PUT) {
      var doc = /** @type {!Object} */ (args[1]);
      inject([doc], true);
    } else if (mth == ydn.db.Request.Method.PUTS) {
      inject(/** @type {!Array} */ (args[1]), true);
    } else if (mth == ydn.db.Request.Method.ADD) {
      inject([args[1]], false);
    } else if (mth == ydn.db.Request.Method.ADDS) {
      inject(/** @type {!Array} */ (args[1]), false);
    } else if (mth == ydn.db.Request.Method.REMOVE ||
        mth == ydn.db.Request.Method.CLEAR) {
      var kr = /** @type {IDBKeyRange} */ (args[1]);
      clearByKeyRange(kr);
    } else if (mth == ydn.db.Request.Method.REMOVE_ID) {
      clearById(/** @type {!IDBKey} */ (args[1]));
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
  if (!ft_schema.engine.hasInit()) {
    // Note: some scoring engine require database statistic
    // this is the place to update database statistic for the first time.
    var sources = ft_schema.getSourceNames();
    this.getCoreOperator().countInternal(sources, true).addCallbacks(
        function(cnts) {
          var total = cnts.reduce(function(p, x) {return p + x;}, 0);
          ft_schema.engine.setTotalDoc(total);
        }, function(e) {
          throw e;
        }, this);
  }
  if (ydn.db.crud.Storage.text.DEBUG) {
    window.console.log('query', name, query);
  }
  var query_tokens = ft_schema.engine.query(name, query, opt_limit,
      opt_threshold);
  if (!query_tokens) {
    this.logger.finer('query "' + query + '" contains only noise and' +
        ' search is ignored');
    return ydn.db.Request.succeed(ydn.db.Request.Method.SEARCH, null);
  }
  return this.getCoreOperator().search(query_tokens);
};
