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
goog.require('ydn.db.text.Token');



/**
 * Entry for querying.
 * @param {number} total_doc the total number of documents.
 * @param {string} value original word.
 * @param {string} keyword normalized value of original word.
 * @param {number} position source key path.
 * @constructor
 * @extends {ydn.db.text.Token}
 * @struct
 */
ydn.db.text.QueryToken = function(total_doc, value, keyword, position) {
  goog.base(this, value, keyword);
  /**
   * @final
   * @type {number}
   */
  this.total_doc = total_doc;
  /**
   * Location of the keyword in the document or query string.
   * @final
   * @type {number}
   */
  this.position = position;
  /**
   * @type {ydn.db.text.ResultSet}
   * @private
   */
  this.resultse = null;
};
goog.inherits(ydn.db.text.QueryToken, ydn.db.text.Token);


/**
 * @return {number} element score.
 */
ydn.db.text.QueryToken.prototype.getWeight = function() {
  return 1;
};


/**
 * @override
 */
ydn.db.text.QueryToken.prototype.getId = function() {
  return this.value + '|' + this.position;
};
