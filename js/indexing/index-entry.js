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


goog.provide('ydn.db.text.IndexEntry');
goog.require('natural.distance.Levenshtein');
goog.require('ydn.db.text.Token');



/**
 * Inverted Index entry.
 * @param {string} store_name inverted index schema.
 * @param {string} key_path inverted index schema.
 * @param {IDBKey} primary_key inverted index schema.
 * @param {string} value token value. The value is converted into lower case.
 * @param {string} keyword normalized value of original word.
 * @param {Array.<number>=} opt_positions score.
 * @constructor
 * @extends {ydn.db.text.Token}
 * @struct
 */
ydn.db.text.IndexEntry = function(store_name, key_path, primary_key, value,
                                  keyword, opt_positions) {
  goog.asserts.assertString(store_name, 'invalid store name "' +
      store_name + '"');
  goog.asserts.assert(goog.isDefAndNotNull(primary_key),
      'invalid primary_key "' + primary_key + '"');
  goog.asserts.assertString(value, 'invalid value "' + value + '"');
  goog.base(this, value, keyword);
  /**
   * @final
   * @type {string}
   * @protected
   */
  this.store_name = store_name;
  /**
   * @final
   * @type {string}
   * @protected
   */
  this.key_path = key_path;
  /**
   * @final
   * @type {IDBKey}
   * @protected
   */
  this.primary_key = primary_key;
  /**
   * Word count that this keyword encounter in the document.
   * @final
   * @private
   * @type {!Array.<number>}
   */
  this.loc_ = opt_positions || [];
};
goog.inherits(ydn.db.text.IndexEntry, ydn.db.text.Token);


/**
 * @const
 * @type {natural.distance.Levenshtein}
 */
ydn.db.text.IndexEntry.levenshtein = new natural.distance.Levenshtein();


/**
 * @return {number} number of occurance.
 */
ydn.db.text.IndexEntry.prototype.freq = function() {
  return this.loc_.length;
};


/**
 * Term frequency formula.
 * @enum {string}
 */
ydn.db.text.IndexEntry.TfMode = {
  LOG: 'l',
  FREQ: 'f',
  BOOLEAN: 'b'
};


/**
 * @type {ydn.db.text.IndexEntry.TfMode}
 */
ydn.db.text.IndexEntry.prototype.tfMode = ydn.db.text.IndexEntry.TfMode.LOG;


/**
 * Logarithmically scaled frequency.
 * @return {number} return  term frequency.
 */
ydn.db.text.IndexEntry.prototype.termFreq = function() {
  if (this.tfMode == ydn.db.text.IndexEntry.TfMode.LOG) {
    return Math.log(this.loc_.length + 1);
  } else if (this.tfMode == ydn.db.text.IndexEntry.TfMode.FREQ) {
    return this.loc_.length;
  } else {
    return this.loc_.length > 0 ? 1 : 0;
  }
};


/**
 * Token encounter in indexing string.
 * @param {number} count current word count.
 */
ydn.db.text.IndexEntry.prototype.encounter = function(count) {
  this.loc_.push(count);
};


/**
 * @return {!Object} JSON to stored into the database.
 */
ydn.db.text.IndexEntry.prototype.toJson = function() {
  // ideally, we want to use composite key ['storeName', 'primaryKey', 'value']
  // but IE10 does not support composite key, so encoded key, as used here
  // is workaround.
  // The reason we need to index both keyword and value is that, not all value
  // exist normalized form of keyword.
  // value is changed to lower case, so that searching is more sensitive.
  // Also note that, actual value in id is case sensative.
  return {
    'keyword': this.keyword,
    'keyPath': this.key_path,
    'value': this.value.toLowerCase(),
    'id': this.getId(), // store name and primary key
    'loc': this.loc_ // .slice() // no need defensive
  };
};


/**
 * @override
 */
ydn.db.text.IndexEntry.prototype.getId = function() {
  var id = [this.store_name, this.primary_key, this.value];
  return ydn.db.text.Token.isArrayKeyPathSupported ?
      id : ydn.db.utils.encodeKey(id);
};


/**
 * @return {string} source store name.
 */
ydn.db.text.IndexEntry.prototype.getStoreName = function() {
  return /** @type {string} */ (this.store_name);
};


/**
 * @return {string} source store name.
 */
ydn.db.text.IndexEntry.prototype.getKeyPath = function() {
  return /** @type {string} */ (this.key_path);
};


/**
 * @return {IDBKey} source primary key.
 */
ydn.db.text.IndexEntry.prototype.getPrimaryKey = function() {
  return /** @type {IDBKey} */ (this.primary_key);
};


/**
 * @return {string} return original value as key.
 */
ydn.db.text.Token.prototype.getKey = function() {
  return this.value;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.text.IndexEntry.prototype.toString = function() {
    return ['IndexEntry', this.store_name, this.primary_key,
      this.value].join(':');
  };
}

