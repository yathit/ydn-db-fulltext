/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 30/7/13
 * Time: 6:14 PM
 * To change this template use File | Settings | File Templates.
 */


/**
 * Basic app.
 * @param {Function} parent app name as db name.
 * @constructor
 */
var App = function() {

};



App.prototype.ele_entry_ = document.getElementById('entry-count');
App.prototype.updateEntryCount = function(cnt, append) {
  if (append) {
    cnt += parseInt(this.ele_entry_.textContent, 10) || 0;
  }
  this.ele_entry_.textContent = cnt;
};
App.prototype.ele_index_ = document.getElementById('index-count');
App.prototype.updateIndexCount = function(cnt, append) {
  if (append) {
    cnt += parseInt(this.ele_index_.textContent, 10) || 0;
  }
  this.ele_index_.textContent = cnt;
};
App.prototype.ele_status_ = document.getElementById('status');
App.prototype.setStatus = function(msg, append) {
  if (append) {
    msg = this.ele_status_.textContent + msg;
  }
  this.ele_status_.textContent = msg;
};

// Utilities functions
/**
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
App.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  /** @override */
  childCtor.prototype.constructor = childCtor;
};


/**
 * @param {string} url
 * @param {Function} cb
 * @param {Object=} opt_scope
 */
App.get = function(url, cb, opt_scope) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  var me = this;
  xhr.onload = function(e) {
    var json;
    if (xhr.getResponseHeader('content-type').indexOf('text/xml') >= 0) {
      var json = App.xml2json(xhr.response);
    } else if (xhr.getResponseHeader('content-type').indexOf('json') >= 0) {
      json = JSON.parse(xhr.responseText);
    } else {
      json = xhr.responseText;
    }
    cb.call(opt_scope, json);
    cb = null;
  };
  xhr.send();
};


/**
 * Convert from XML to JSON format
 *
 *
 * @param {Element|Document|Node|string} xml XML data.
 * @param {(string|boolean)=} format This conversion assume xml is GData Atom
 * format.
 * @return {Object|*} JSON object.
 */
App.xml2json = function(xml, format) {
  // this code is based on http://davidwalsh.name/convert-xml-json

  // see http://code.google.com/apis/gdata/docs/json.html for Google
  // specification about conversion
  var is_atom_format = format == 'atom' || format === true;
  var is_plain = format == 'plain';

  /**
   * If an element has a namespace alias, the alias and element are concatenated
   * using "$". For example, ns:element becomes ns$element.
   * atom: is stripped.
   * @param {string} namespace
   * @return {string}
   */
  var ns2name = function(namespace) {
    if (is_atom_format && goog.string.startsWith(namespace, 'atom:')) {
      namespace = namespace.substring(5, namespace.length);
    }
    return namespace.replace('#text', '$t').replace(/:/g, '$');
  };

  // Create XML document object
  if (goog.isString(xml)) {
    xml = new DOMParser().parseFromString(xml, 'application/xml');
  }

  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (!is_plain && xml.attributes.length > 0) {
      for (var j = 0, n = xml.attributes.length; j < n; j++) {
        var attribute = xml.attributes.item(j);
        obj[ns2name(attribute.nodeName)] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0, m = xml.childNodes.length; i < m; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = ns2name(item.nodeName);
      if (is_plain && nodeName == '$t') {
        obj = item.nodeValue;
      } else if (!goog.isDef(obj[nodeName])) {
        obj[nodeName] = App.xml2json(item, format);
      } else {
        if (!goog.isArray(obj[nodeName])) {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(App.xml2json(item, format));  // ?
      }
    }
  }
  return obj;
};
