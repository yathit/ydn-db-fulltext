/*
 * Copyright 2012 Rodrigo Reyes
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


goog.provide('ydn.db.text.QueryEngine');
goog.require('fullproof.Analyzer');
goog.require('ydn.db.schema.fulltext.Engine');



/**
 * @param {ydn.db.schema.fulltext.Catalog} schema full text search schema.
 * @constructor
 * @implements {ydn.db.schema.fulltext.Engine}
 */
ydn.db.text.QueryEngine = function(schema) {
  /**
   * @final
   * @protected
   * @type {ydn.db.schema.fulltext.Catalog}
   */
  this.schema = schema;
  /**
   * @final
   * @protected
   * @type {fullproof.Analyzer}
   */
  this.analyzer = new fullproof.Analyzer(schema);
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
  var tokens = this.analyzer.scoreQuery(query);
  if (tokens.length == 0) {
    return null;
  }
  var limit = opt_limit || 10;
  var threshold = opt_threshold || 1;
  return new ydn.db.text.ResultSet(this.schema, tokens, limit, threshold);
};


/**
 * Analyze an indexing value.
 * @param {string} store_name the store name in which document belong.
 * @param {IDBKey} key primary of the document.
 * @param {!Object} obj the document to be indexed.
 * @return {Array.<ydn.db.text.QueryToken>} score for each token.
 */
ydn.db.text.QueryEngine.prototype.analyze = function(store_name, key, obj) {
  var scores = [];
  for (var i = 0; i < this.schema.count(); i++) {
    var source = this.schema.index(i);
    if (source.getStoreName() == store_name) {
      var text = ydn.db.utils.getValueByKeys(obj, source.getKeyPath());
      if (goog.isString(text)) {
        scores = scores.concat(this.analyzer.score(text, source, key));
      }
    }
  }
  return scores;
};


/**
 * Analyze query string or index value.
 * @param {string} query query string.
 * @return {Array.<string>} list of tokens.
 */
ydn.db.text.QueryEngine.prototype.parse = function(query) {
  return this.analyzer.parse(query);
};


/**
 * Normalized tokens.
 * @param {Array.<string>} tokens tokens.
 * @return {Array.<string>} normalized tokens.
 */
ydn.db.text.QueryEngine.prototype.normalize = function(tokens) {
  var nTokens = [];
  for (var i = 0; i < tokens.length; i++) {
    nTokens[i] = this.analyzer.normalize(tokens[i]);
  }
  return nTokens;
};

