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
 * @fileoverview Text analyzer.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */




goog.provide('ydn.db.text.Analyzer');
goog.require('fullproof.normalizer.english');
goog.require('goog.array');
goog.require('net.kornr.unicode');
goog.require('ydn.db.schema.fulltext.Catalog');
goog.require('ydn.db.text.IndexEntry');
goog.require('ydn.db.text.Normalizer');
goog.require('ydn.db.text.ResultSet');



/**
 * Text analyzer.
 * @param {ydn.db.schema.fulltext.Catalog} schema
 * @constructor
 */
ydn.db.text.Analyzer = function(schema) {
  /**
   * @protected
   * @type {number}
   */
  this.total_doc = NaN;

  /**
   * @final
   * @protected
   * @type {!Array.<!ydn.db.text.Normalizer>}
   */
  this.normalizers = ydn.db.text.Analyzer.getNormalizers(schema);
};


/**
 * @param {number} total total_doc the total number of documents.
 */
ydn.db.text.Analyzer.prototype.setTotalDoc = function(total) {
  this.total_doc = total;
};


/**
 * @return {boolean} true if total doc has set.
 */
ydn.db.text.Analyzer.prototype.hasInit = function() {
  return goog.isDef(this.total_doc);
};


/**
 * Increment total number of documents.
 * @param {number} ex
 */
ydn.db.text.Analyzer.prototype.addTotalDoc = function(ex) {
  this.total_doc += ex;
};


/**
 * @param {ydn.db.schema.fulltext.Catalog} schema
 * @return {!Array.<!ydn.db.text.Normalizer>}
 */
ydn.db.text.Analyzer.getNormalizers = function(schema) {
  if (schema.lang == 'en') {
    return fullproof.normalizer.english.getNormalizers(schema.normalizers);
  } else {
    return [];
  }
};


/**
 * Apply normalizers successively.
 * @param {string} word input.
 * @return {string?} normalized word.
 */
ydn.db.text.Analyzer.prototype.normalize = function(word) {
  for (var i = 0; i < this.normalizers.length; i++) {
    var w = this.normalizers[i].normalize(word);
    // console.log(word, w);
    if (w) {
      word = w;
    } else {
      return null;
    }
  }
  return word;
};


/**
 * Sometimes it's convenient to receive the whole set of words cut and
 * normalized by the analyzer. This method calls the callback parameter only
 * once, with as single parameter an array of normalized words.
 * @param {string} text
 * @return {Array.<string>}
 */
ydn.db.text.Analyzer.prototype.parse = function(text) {
  var tokens = [];
  // Note: parse is always sync.
  net.kornr.unicode.tokenize(text, function(start, len) {
    var token = text.substr(start, len);
    tokens.push(token);
  });
  return tokens;
};


/**
 * Score a query.
 * @param {string} text
 * @return {Array.<ydn.db.text.QueryToken>}
 */
ydn.db.text.Analyzer.prototype.scoreQuery = function(text) {
  var tokens = [];
  var positions = [];
  // Note: parse is always sync.
  net.kornr.unicode.tokenize(text, function(start, len) {
    var token = text.substr(start, len);
    tokens.push(token);
    positions.push(start);
  });
  var nTokens = [];
  for (var i = 0; i < tokens.length; i++) {
    nTokens[i] = this.normalize(tokens[i]);
  }
  var scores = [];
  var wordcount = 0;
  for (var i = 0; i < tokens.length; i++) {
    var word = nTokens[i];
    // console.log(tokens[i], word);
    if (goog.isDefAndNotNull(word)) {
      var score = goog.array.find(scores, function(s) {
        return s.getKeyword() == word;
      });
      if (!score) {
        score = new ydn.db.text.QueryToken(tokens[i], word, positions[i]);
        scores.push(score);
      }
    }
  }

  return scores;
};


/**
 * @param {string} text text to be prase and scored.
 * @param {ydn.db.schema.fulltext.InvIndex} inv_index inverted index.
 * @param {IDBKey} key primary key.
 * @return {!Array.<!ydn.db.text.IndexEntry>} scores for each unique token.
 */
ydn.db.text.Analyzer.prototype.score = function(text, inv_index, key) {
  var tokens = [];
  var positions = [];
  // Note: parse is always sync.
  net.kornr.unicode.tokenize(text, function(start, len) {
    var token = text.substr(start, len);
    tokens.push(token);
    positions.push(start);
  });
  var nTokens = [];
  for (var i = 0; i < tokens.length; i++) {
    nTokens[i] = this.normalize(tokens[i]);
  }

  var store_name = inv_index.getStoreName();
  var key_path = inv_index.getKeyPath();
  var scores = [];
  for (var i = 0; i < tokens.length; i++) {
    var word = tokens[i];
    var keyword = nTokens[i];
    if (goog.isDefAndNotNull(keyword)) {
      var score = goog.array.find(scores, function(s) {
        return s.getValue() == word;
      });
      if (!score) {
        score = new ydn.db.text.IndexEntry(store_name, key_path, key,
            word, keyword);
        scores.push(score);
      }
      score.encounter(positions[i]);
    }
  }

  return scores;
};

