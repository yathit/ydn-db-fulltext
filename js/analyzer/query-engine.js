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
 * @fileoverview Indexing and query processor engine.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */




goog.provide('ydn.db.text.QueryEngine');
goog.require('fullproof.normalizer.english');
goog.require('goog.array');
goog.require('net.kornr.unicode');
goog.require('ydn.db.schema.fulltext.Catalog');
goog.require('ydn.db.text.IndexEntry');
goog.require('ydn.db.text.Normalizer');
goog.require('ydn.db.text.ResultSet');



/**
 * @param {!ydn.db.schema.fulltext.Catalog} schema full text search schema.
 * @constructor
 * @implements {ydn.db.schema.fulltext.Engine}
 */
ydn.db.text.QueryEngine = function(schema) {
  /**
   * @final
   * @protected
   * @type {!ydn.db.schema.fulltext.Catalog}
   */
  this.schema = schema;
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
  this.normalizers = ydn.db.text.QueryEngine.getNormalizers(schema);
};


/**
 * @param {number} total total_doc the total number of documents.
 */
ydn.db.text.QueryEngine.prototype.setTotalDoc = function(total) {
  this.total_doc = total;
};


/**
 * @return {boolean} true if engine is initialized.
 */
ydn.db.text.QueryEngine.prototype.hasInit = function() {
  // return goog.isDef(this.total_doc);
  return true;
};


/**
 * Increment total number of documents.
 * @param {number} ex
 */
ydn.db.text.QueryEngine.prototype.addTotalDoc = function(ex) {
  this.total_doc += ex;
};


/**
 * @param {ydn.db.schema.fulltext.Catalog} schema
 * @return {!Array.<!ydn.db.text.Normalizer>}
 */
ydn.db.text.QueryEngine.getNormalizers = function(schema) {
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
ydn.db.text.QueryEngine.prototype.normalize = function(word) {
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
ydn.db.text.QueryEngine.prototype.parse = function(text) {
  var tokens = [];
  // Note: parse is always sync.
  net.kornr.unicode.tokenize(text, function(start, len) {
    var token = text.substr(start, len);
    tokens.push(token);
  });
  return tokens;
};


/**
 * Free text query.
 * @param {string} catalog_name
 * @param {string} query
 * @param {number=} opt_limit
 * @param {number=} opt_threshold
 * @return {ydn.db.text.ResultSet}
 */
ydn.db.text.QueryEngine.prototype.query = function(catalog_name, query,
                                                   opt_limit, opt_threshold) {
  var tokens = this.parseQuery(query);
  if (tokens.length == 0) {
    return null;
  }
  var limit = opt_limit || 10;
  var threshold = opt_threshold || 1;
  return new ydn.db.text.ResultSet(this.schema, tokens, limit, threshold);
};


/**
 * Score a query.
 * @param {string} text
 * @return {!Array.<!ydn.db.text.QueryToken>}
 */
ydn.db.text.QueryEngine.prototype.parseQuery = function(text) {
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
  var total_score = 0;
  for (var i = 0; i < tokens.length; i++) {
    var word = tokens[i];
    var keyword = nTokens[i];
    // console.log(tokens[i], word);
    var is_prefix = text.charAt(positions[i] + word.length) == '*';
    var last_quote_pos = is_prefix ?
        positions[i] + word.length + 1 : positions[i] + word.length;
    var is_quoted = text.charAt(positions[i] - 1) == '"' &&
        text.charAt(last_quote_pos) == '"';
    var minus_pos = is_quoted ? positions[i] - 2 : positions[i] - 1;
    var not_query = text.charAt(minus_pos) == '-';
    var type = ydn.db.text.QueryType.NONE;
    if (is_prefix) {
      type = ydn.db.text.QueryType.PREFIX;
    } else if (is_quoted) {
      type = ydn.db.text.QueryType.EXACT;
    } else if (not_query) {
      type = ydn.db.text.QueryType.NOT;
    } else if (goog.isDefAndNotNull(keyword)) {
      type = ydn.db.text.QueryType.PHONETIC;
    }
    var pos_weight = 1 / (i + 2);
    var query = new ydn.db.text.QueryToken(type, word, keyword, positions[i],
        pos_weight);
    scores.push(query);
    total_score += query.getScore();
  }
  // normalize total score to 1.
  for (var i = 0; i < scores.length; ++i) {
    scores[i].avg_factor = 1 / total_score;
  }

  return scores;
};


/**
 * @param {string} text text to be prase and scored.
 * @param {ydn.db.schema.fulltext.InvIndex} inv_index inverted index.
 * @param {IDBKey} key primary key.
 * @return {!Array.<!ydn.db.text.IndexEntry>} scores for each unique token.
 */
ydn.db.text.QueryEngine.prototype.score = function(text, inv_index, key) {
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


/**
 * Analyze an indexing value.
 * @param {string} store_name the store name in which document belong.
 * @param {IDBKey} key primary of the document.
 * @param {!Object} obj the document to be indexed.
 * @return {Array.<!ydn.db.text.IndexEntry>} score for each token.
 */
ydn.db.text.QueryEngine.prototype.analyze = function(store_name, key, obj) {
  var scores = [];
  for (var i = 0; i < this.schema.count(); i++) {
    var source = this.schema.index(i);
    if (source.getStoreName() == store_name) {
      var text = ydn.db.utils.getValueByKeys(obj, source.getKeyPath());
      if (goog.isString(text)) {
        scores = scores.concat(this.score(text, source, key));
      }
    }
  }
  return scores;
};
