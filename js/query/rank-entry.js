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
 * @fileoverview Query entry.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.text.RankEntry');
goog.require('natural.distance.Levenshtein');
goog.require('ydn.db.text.IndexEntry');



/**
 * Output result entry.
 * @param {ydn.db.schema.fulltext.Catalog} catalog original entry.
 * @param {ydn.db.text.ResultEntry} entry original entry.
 * @constructor
 * @extends {ydn.db.text.IndexEntry}
 * @struct
 */
ydn.db.text.RankEntry = function(catalog, entry) {
  goog.base(this, entry.getStoreName(), entry.getKeyPath(),
      entry.getPrimaryKey(), entry.getValue(), entry.getKeyword(),
      [], NaN);
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
 * Merge resulting entry of same reference.
 * @param {ydn.db.text.RankEntry} entry
 */
ydn.db.text.RankEntry.prototype.merge = function(entry) {
  if (goog.DEBUG) {
    // merge only with same reference token.
    goog.asserts.assert(this.store_name == entry.store_name, 'store_name');
    goog.asserts.assert(this.primary_key == entry.primary_key, 'primary_key');
    goog.asserts.assert(this.value == entry.value, 'value');
    goog.asserts.assert(entry.results.length == 1, 'must only have one result');
  }
  if (this.key_path != entry.key_path) {
    this.results.push(entry.results[0]);
  } // otherwise, same result - we ignore
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
    // console.log(entry.toString(), s1);
    score += s1 * index.getWeight();
  }
  return score;
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

