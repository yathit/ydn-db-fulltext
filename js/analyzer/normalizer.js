/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 27/7/13
 * Time: 8:18 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.text.Normalizer');



/**
 * Normalization language service.
 * @interface
 */
ydn.db.text.Normalizer = function() {

};


/**
 * Normalize a given word.
 * @param {string} word word to be normalized.
 * @return {string?} normalized word.
 */
ydn.db.text.Normalizer.prototype.normalize = function(word) {};



