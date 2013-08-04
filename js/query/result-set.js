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
 * @param {ydn.db.schema.fulltext.Catalog} ft_schema full text schema.
 * @param {Array.<ydn.db.text.QueryToken>} query_tokens query tokens.
 * @param {number} limit Maximum number of satisfactory results.
 * @param {number} threshold Threshold score of a result to consider as
 * satisfactory.
 * @implements {ydn.db.schema.fulltext.ResultSet}
 * @struct
 */
ydn.db.text.ResultSet = function(ft_schema, query_tokens, limit, threshold) {
  /**
   * @protected
   * @type {ydn.db.schema.fulltext.Catalog}
   */
  this.catalog = ft_schema;
  /**
   * @protected
   * @type {Array.<ydn.db.text.QueryToken>}
   */
  this.query_tokens = query_tokens || [];
  /**
   * @protected
   * @type {Array.<ydn.db.text.ResultEntry>}
   */
  this.results = [];
  /**
   * Maximum number of satisfactory results.
   * @type {number}
   * @protected
   */
  this.limit = limit;
  /**
   * Threshold score of a result to consider as satisfactory.
   * @type {number}
   * @protected
   */
  this.threshold = threshold;
  /**
   * Lookup iteration lap lap.
   * @type {number}
   * @private
   */
  this.lap_ = 0;
  for (var i = 0; i < this.query_tokens.length; i++) {
    this.query_tokens[i].resultset = this;
  }
};


/**
 * @inheritDoc
 */
ydn.db.text.ResultSet.prototype.nextLookup = function(cb) {
  if (this.lap_ > 3) {
    throw new ydn.debug.error.InvalidOperationException('too many loopup laps');
  }
  var key, key_range, index_name;
  var store_name = this.catalog.getName();
  for (var j = 0; j < this.query_tokens.length; j++) {
    var token = this.query_tokens[j];
    if (this.lap_ == 0) {
      index_name = 'value';
      key = token.getValue().toLowerCase();
      key_range = ydn.db.KeyRange.only(key);
    } else if (this.lap_ == 1) {
      index_name = 'keyword';
      key = token.getKeyword();
      key_range = ydn.db.KeyRange.only(key);
    } else if (this.lap_ == 2) {
      index_name = 'value';
      key = token.getValue().toLowerCase();
      key_range = ydn.db.KeyRange.starts(key);
    } else {
      throw new ydn.debug.error.InvalidOperationException(
          'too many loopup laps');
    }
    cb(store_name, index_name, key_range, token);
  }
  this.lap_++;
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
  for (var i = 0; i < results.length; i++) {
    var entry = ydn.db.text.ResultEntry.fromJson(
        /** @type {ydn.db.text.QueryToken} */ (query), results[i]);
    this.results.push(entry);
  }
  var next = true;
  if (this.lap_ >= 3) {
    next = false;
  }
  var last_token = this.query_tokens[this.query_tokens.length - 1];
  var is_last_token = last_token.position === query.position;
  return is_last_token ? next : null;
};


/**
 * Collect non-redundant result with consolidate ranking.
 * @return {Array}
 */
ydn.db.text.ResultSet.prototype.collect = function() {
  var arr = [];
  for (var i = 0; i < this.results.length; i++) {
    var entry = new ydn.db.text.RankEntry(this.catalog, this.results[i]);
    var index = goog.array.binarySearch(arr, entry, ydn.db.text.Token.cmp);
    if (index < 0) {
      goog.array.insertAt(arr, entry, -(index + 1));
    } else {
      var existing_entry = arr[index];
      existing_entry.merge(entry);
    }
  }
  return arr.map(function(x) {
    return x.toJson();
  });
};

