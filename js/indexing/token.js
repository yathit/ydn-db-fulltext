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
 * @fileoverview Index entry.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.text.Token');
goog.require('goog.asserts');
goog.require('goog.userAgent.product');
goog.require('ydn.db');
goog.require('ydn.db.schema.fulltext.Entry');
goog.require('ydn.db.utils');



/**
 * An object that associates a value and a numerical score
 * @param {string} value original word.
 * @param {string} keyword normalized value of original word.
 * @param {number=} opt_score score.
 * @constructor
 * @struct
 * @implements {ydn.db.schema.fulltext.Entry}
 */
ydn.db.text.Token = function(value, keyword, opt_score) {
  // goog.asserts.assert(value.length >= keyword.length, 'wrong arg?');
  /**
   * @final
   * @type {string}
   * @protected
   */
  this.keyword = keyword;
  /**
   * @final
   * @type {string}
   * @protected
   */
  this.value = value;
  /**
   * @type {number}
   * @protected
   */
  this.score = goog.isDefAndNotNull(opt_score) ? opt_score : NaN;
};


/**
 * @return {string} source store name.
 */
ydn.db.text.Token.prototype.getKeyword = function() {
  return this.keyword;
};


/**
 * @return {string} source store name.
 */
ydn.db.text.Token.prototype.getValue = function() {
  return this.value;
};


/**
 * @return {number} source store name.
 */
ydn.db.text.Token.prototype.getScore = function() {
  return this.score;
};


/**
 * Compare by score, then by id.
 * Note: this result 0 only if the same entry is compared.
 * @param {ydn.db.text.Token} a entry a.
 * @param {ydn.db.text.Token} b entry b.
 * @return {number} return 1 if score of entry a is smaller than that of b, -1
 * if score of entry b is smaller than a, otherwise compare by id.
 */
ydn.db.text.Token.cmp = function(a, b) {
  if (ydn.db.cmp(a.getId(), b.getId()) == 0) {
    return 0;
  } else {
    var a_score = a.getScore();
    var b_score = b.getScore();
    return a_score > b_score ? -1 : b_score > a_score ? 1 : 1;
  }
};


/**
 * @final
 * @type {boolean}
 */
ydn.db.text.Token.isArrayKeyPathSupported = !goog.userAgent.MOBILE &&
    (goog.userAgent.product.CHROME || goog.userAgent.product.FIREFOX);


/**
 * Uniquely identify this entry.
 * @return {IDBKey} Entry identifier.
 */
ydn.db.text.Token.prototype.getId = function() {
  return this.value;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.text.Token.prototype.toString = function() {
    return 'Entry:' + this.value;
  };
}


