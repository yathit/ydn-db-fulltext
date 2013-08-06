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
 * @fileoverview Output rank entry.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.text.RankEntry');
goog.require('natural.distance.Levenshtein');
goog.require('ydn.db.text.IndexEntry');



/**
 * Output rank entry is consolidation of resulting inverted entry.
 * @param {ydn.db.schema.fulltext.Catalog} catalog original entry.
 * @param {ydn.db.text.ResultEntry} entry original entry.
 * @constructor
 * @extends {ydn.db.text.IndexEntry}
 * @struct
 */
ydn.db.text.RankEntry = function(catalog, entry) {
  goog.base(this, entry.getStoreName(), entry.getKeyPath(),
      entry.getPrimaryKey(), entry.getValue(), entry.getKeyword(),
      []);
  /**
   * @protected
   * @final
   * @type {ydn.db.schema.fulltext.Catalog}
   */
  this.catalog = catalog;
  /**
   * Original result entry.
   * @type {Array.<ydn.db.text.ResultEntry>}
   * @protected
   * @final
   */
  this.results = [entry];
};
goog.inherits(ydn.db.text.RankEntry, ydn.db.text.IndexEntry);


/**
 * Number of results.
 * @return {number}
 */
ydn.db.text.RankEntry.prototype.count = function() {
  return this.results.length;
};


/**
 * @param {number} idx index of result entry.
 * @return {ydn.db.text.ResultEntry} entry at idx.
 */
ydn.db.text.RankEntry.prototype.entry = function(idx) {
  return this.results[idx];
};


/**
 * Merge resulting entry of same reference.
 * @param {ydn.db.text.RankEntry} entry same entry.
 */
ydn.db.text.RankEntry.prototype.merge = function(entry) {
  if (goog.DEBUG) {
    // merge only with same reference token.
    goog.asserts.assert(this.store_name == entry.store_name, 'store_name');
    goog.asserts.assert(this.primary_key == entry.primary_key, 'primary_key');
    goog.asserts.assert(entry.results.length == 1, 'must only have one result');
  }
  var result = entry.results[0];
  for (var i = 0; i < this.results.length; i++) {
    if (this.results[i].key_path == result.key_path &&
        this.results[i].value == result.value) {
      return; // already in the result list
    }
  }
  this.results.push(result);
};


/**
 * @inheritDoc
 */
ydn.db.text.RankEntry.prototype.getScore = function() {
  var score = 0;
  for (var i = 0; i < this.results.length; i++) {
    var entry = this.results[i];
    var index = this.catalog.getSource(entry.getStoreName(),
        entry.getKeyPath());
    goog.asserts.assertObject(index, 'Index for ' + entry.getStoreName() +
        ':' + entry.getKeyPath() + ' not found.');
    var s1 = entry.getScore();
    var w = index.getWeight();
    // console.log(entry.toString(), s1, w);
    score += s1 * w;
  }
  return score;
};


/**
 * Compare by score.
 * @param {ydn.db.text.RankEntry} a entry a.
 * @param {ydn.db.text.RankEntry} b entry b.
 * @return {number} return 1 if score of entry a is smaller or equal
 * than that of b, -1 otherwise.
 */
ydn.db.text.RankEntry.cmp = function(a, b) {
  var a_score = a.getScore();
  var b_score = b.getScore();
  return a_score <= b_score ? 1 : -1;
};


/**
 * @return {!Object} JSON to stored into the database.
 */
ydn.db.text.RankEntry.prototype.toJson = function() {
  // ideally, we want to use composite key ['storeName', 'primaryKey', 'value']
  // but IE10 does not support composite key, so encoded key, as used here
  // is workaround.
  var entry = {
    'value': this.value,
    'primaryKey': this.primary_key,
    'storeName': this.store_name,
    'score': this.getScore(),
    'tokens': []
  };
  for (var i = 0; i < this.results.length; i++) {
    entry['tokens'][i] = this.results[i].toJson();
  }
  return entry;
};



if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.text.RankEntry.prototype.toString = function() {
    return ['RankEntry', this.store_name, this.primary_key,
      this.value].join(':') + '[' + this.results.length + ']';
  };
}

