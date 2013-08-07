// Copyright 2013 YDN Authors. All Rights Reserved.
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
 * @fileoverview Indexed entry.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.text.ResultSet');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.text.QueryToken');
goog.require('ydn.db.text.RankEntry');
goog.require('ydn.db.text.ResultEntry');



/**
 * Result set.
 *
 * @constructor
 * @param {!ydn.db.schema.fulltext.Catalog} ft_schema full text schema.
 * @param {!Array.<!ydn.db.text.QueryToken>} query_tokens query tokens.
 * @param {number=} opt_limit Maximum number of satisfactory results.
 * @param {number=} opt_threshold Threshold score of a result to consider as
 * satisfactory.
 * @implements {ydn.db.schema.fulltext.ResultSet}
 * @struct
 */
ydn.db.text.ResultSet = function(ft_schema, query_tokens,
                                 opt_limit, opt_threshold) {
  /**
   * @protected
   * @type {!ydn.db.schema.fulltext.Catalog}
   */
  this.catalog = ft_schema;
  /**
   * @protected
   * @type {!Array.<!ydn.db.text.QueryToken>}
   */
  this.query_tokens = query_tokens;
  /**
   * @protected
   * @type {!Array.<!ydn.db.text.ResultEntry>}
   */
  this.results = [];
  /**
   * Maximum number of satisfactory results.
   * @type {number}
   * @protected
   */
  this.limit = opt_limit || 1000;
  /**
   * Threshold score of a result to consider as satisfactory.
   * @type {number}
   * @protected
   */
  this.threshold = opt_threshold || NaN;
  this.result_count_ = 0;
};


/**
 * @inheritDoc
 */
ydn.db.text.ResultSet.prototype.nextLookup = function(cb) {
  var key, key_range, index_name;
  var store_name = this.catalog.getName();
  for (var j = 0; j < this.query_tokens.length; j++) {
    var token = this.query_tokens[j];
    var t = token.getType();
    if (t == ydn.db.text.QueryType.PREFIX ||
        t == ydn.db.text.QueryType.PHONETIC) {
      index_name = 'value';
      key = token.getValue().toLowerCase();
      key_range = ydn.db.KeyRange.starts(key);
      cb(store_name, index_name, key_range, token);
      this.result_count_++;
    } else {
      index_name = 'value';
      key = token.getValue().toLowerCase();
      key_range = ydn.db.KeyRange.only(key);
      cb(store_name, index_name, key_range, token);
      this.result_count_++;
    }
    if (t == ydn.db.text.QueryType.PHONETIC) {
      index_name = 'keyword';
      key = token.getKeyword();
      key_range = ydn.db.KeyRange.only(key);
      cb(store_name, index_name, key_range, token);
      this.result_count_++;
    }
  }
};


/**
 * Get list of store name involved in this catalog.
 * @return {!Array.<string>}
 */
ydn.db.text.ResultSet.prototype.getStoreList = function() {
  var store_names = [this.catalog.getName()];
  for (var i = 0; i < this.catalog.count(); i++) {
    var source_name = this.catalog.index(i).getStoreName();
    if (store_names.indexOf(source_name) == -1) {
      store_names.push(source_name);
    }
  }
  return store_names;
};


/**
 * @inheritDoc
 */
ydn.db.text.ResultSet.prototype.addResult = function(q, results) {
  var query = /** @type {ydn.db.text.QueryToken} */ (q);
  // console.log(results.length + ' for ' + query.getValue() + ' in ' +
  // (results[0] ? JSON.stringify(results[0].id) : ''))
  for (var i = 0; i < results.length; i++) {
    var entry = ydn.db.text.ResultEntry.fromJson(query, results[i]);
    this.results.push(entry);
  }
  this.result_count_--;
  if (this.result_count_ == 0) {
    return false; // done
  }
  var last_token = this.query_tokens[this.query_tokens.length - 1];
  var is_last_token = last_token.position === query.position;
  if (is_last_token) {
    return true;
  } else {
    return null; // no op
  }
};


/**
 * Collect non-redundant result with consolidate ranking.
 * @return {Array.<ydn.db.text.RankEntry>}
 */
ydn.db.text.ResultSet.prototype.collect = function() {
  var arr = [];
  var not_results = [];
  for (var i = 0; i < this.results.length; i++) {
    var res = this.results[i];
    var qt = res.query.getType();
    if (qt == ydn.db.text.QueryType.NOT) {
      var n_idx = goog.array.findIndex(not_results, function(a) {
        return a.getPrimaryKey() == res.getPrimaryKey() &&
            a.getStoreName() == res.getStoreName();
      });
      if (n_idx == -1) {
        not_results.push(res);
      }
      continue;
    }
    var entry = new ydn.db.text.RankEntry(this.catalog, res);
    var ex_idx = goog.array.findIndex(arr, function(a) {
      return a.getPrimaryKey() == entry.getPrimaryKey() &&
          a.getStoreName() == entry.getStoreName();
    });
    if (ex_idx >= 0) {
      // scoring has changed, so we remove the entry and re-insert to proper
      // ranking.
      var existing_entry = arr[ex_idx];
      goog.array.removeAt(arr, ex_idx);
      existing_entry.merge(entry);
      entry = existing_entry;
    }
    goog.array.binaryInsert(arr, entry, ydn.db.text.RankEntry.cmp);
  }
  // filter not
  // console.log(arr, not_results);
  for (var j = 0; j < not_results.length; j++) {
    var n = not_results[j];
    for (var i = arr.length - 1; i >= 0; --i) {
      var e = arr[i];
      if (n.getPrimaryKey() == e.getPrimaryKey() &&
          n.getStoreName() == e.getStoreName()) {
        // console.log('not', n.getStoreName(), n.getPrimaryKey())
        arr.splice(j, 1);
        break;
      }
    }
  }
  var result = arr.map(function(x) {
    return x.toJson();
  });
  // console.log('returning ' + result.length + ' of ' + this.results.length);
  return result;
};


