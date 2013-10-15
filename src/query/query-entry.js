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


goog.provide('ydn.db.text.QueryToken');
goog.provide('ydn.db.text.QueryType');
goog.require('ydn.db.text.Token');



/**
 * Entry for querying.
 * @param {ydn.db.text.QueryType} type query type.
 * @param {string} value original word.
 * @param {string} keyword normalized value of original word.
 * @param {number} position source key path.
 * @param {number} weight positional weight.
 * @constructor
 * @extends {ydn.db.text.Token}
 * @struct
 */
ydn.db.text.QueryToken = function(type, value, keyword, position, weight) {
  goog.base(this, value, keyword);
  goog.asserts.assert(goog.isNumber(position) && !isNaN(position),
      'position ' + value + ' expect a number, but ' + position + ' of type ' +
      typeof position + ' found.');
  /**
   * Location of the keyword in the document or query string.
   * @final
   * @type {number}
   */
  this.position = position;
  /**
   * Positional weight.
   * @final
   * @type {number}
   */
  this.pos_weight = weight;
  /**
   * @final
   * @type {ydn.db.text.QueryType}
   */
  this.type = type;
  /**
   * Averaging factor.
   * @type {number}
   */
  this.avg_factor = 1;
};
goog.inherits(ydn.db.text.QueryToken, ydn.db.text.Token);


/**
 * Query type, also serve as relative important.
 * @enum {number}
 */
ydn.db.text.QueryType = {
  PHONETIC: 0.6,
  PREFIX: 0.4,
  NONE: 0.8,
  NOT: 0,
  EXACT: 1
};


/**
 * @return {ydn.db.text.QueryType} query type.
 */
ydn.db.text.QueryToken.prototype.getType = function() {
  return this.type;
};


/**
 * @return {number} element score.
 */
ydn.db.text.QueryToken.prototype.getScore = function() {
  return this.pos_weight * this.type * this.avg_factor;
};


/**
 * @override
 */
ydn.db.text.QueryToken.prototype.getId = function() {
  return this.value + '|' + this.position;
};
