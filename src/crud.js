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
goog.provide('ydn.db.crud.DbOperator.text');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db.text.QueryEngine');
goog.require('ydn.debug.error.InvalidOperationException');


/**
 * Full text search.
 * @param {ydn.db.schema.fulltext.ResultSet} query
 * @return {!ydn.db.Request<Array<FullTextSearchResult>>}
 */
ydn.db.crud.DbOperator.prototype.search = function(query) {
  var store_names = query.getStoreList();
  goog.log.finest(this.logger, 'query ' + query);
  var req = this.tx_thread.request(ydn.db.Request.Method.SEARCH, store_names,
      ydn.db.base.TransactionMode.READ_ONLY);
  req.addTxback(function() {
    var exe = this.getCrudExecutor();
    // console.log('search ' + query);

    query.nextLookup(function(store_name, index_name, kr, entry) {
      var iReq = req.copy();
      // console.log(store_name, index_name, kr);
      exe.list(iReq, ydn.db.base.QueryMethod.LIST_VALUE, store_name, index_name,
          kr.toIDBKeyRange(), 100, 0, false, false);
      iReq.addBoth(function(x) {
        // console.log(store_name, index_name, kr.lower, x);
        var e = null;
        if (!(x instanceof Array)) {
          e = x;
          x = [];
        }
        var next = query.addResult(this, /** @type {Array} */ (x));
        if (next === true) {
          req.notify(query);
        } else if (next === false) {
          req.callback(query.collect());
        }
        if (e) {
          throw e;
        }
      }, entry);
    });
  }, this);
  return req;
};

