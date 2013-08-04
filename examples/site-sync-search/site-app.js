
/**
 * @constructor
 */
var SiteApp = function() {
  this.store_name = 'site-sync-search';
  this.domain = 'chromium.org';
  this.site_name = 'dev';
  this.db_schema = {
    fullTextCatalogs: [],
    stores: []};
  SiteApp.buildStoreSchema(this.db_schema, this.domain, this.site_name);
  this.db = new ydn.db.Storage(this.store_name, this.db_schema);
  var btn_search = document.getElementById('search');
  btn_search.onclick = this.handleSearch.bind(this);
  var input = document.getElementById('search_input');
  input.onkeyup = this.handleInputChanged.bind(this);
};


/**
 * Build store schema for Google Site for sync and full text search.
 * @param {DatabaseSchema} schema
 * @param {string} domain
 * @param {string} site_name
 * @protected
 */
SiteApp.buildStoreSchema = function(schema, domain, site_name) {
  var store_schema = {
    name: site_name, // page content
    keyPath: 'id.$t',
    type: 'TEXT',
    indexes: [
      {
        name: 'alternate',
        type: 'TEXT',
        generator: function(obj) {
          var links = obj['link'] || [];
          for (var i = 0; i < links.length; i++) {
            if (links[i]['rel'] == 'alternate') {
              return links[i]['href'];
            }
          }
        }
      }, {
        name: 'sites$parent',
        type: 'TEXT',
        generator: function(data) {
          var links = data['link'] || [];
          for (var i = 0; i < links.length; i++) {
            if (links[i]['rel'] == 'http://schemas.google.com/sites/2008#parent') {
              return links[i]['href'];
            }
          }
          return data['id']['$t'].replace(/\w+$/, '0'); // default page of id '0'
        }
      }, {
        name: 'updated.$t',
        type: 'TEXT'
      }]
  };
  var catalog = {
    name: site_name + '-index',
    lang: 'en',
    indexes: [
      {
        storeName: site_name,
        keyPath: 'title.$t',
        weight: 1.0
      }, {
        storeName: site_name,
        keyPath: 'content.$t',
        weight: 0.5
      }]
  };

  schema.stores.push(store_schema);
  schema.fullTextCatalogs.push(catalog);
};


SiteApp.prototype.randomWord = function(e) {
  this.db.values(this.site_name + '-index', 'value').done(function(keys) {
    console.log(keys);
  })
};


SiteApp.prototype.handleInputChanged = function(e) {
  var key = event.keyCode || event.which;
  if (key == 13) {
    this.handleSearch(e);
  }
};


/**
 * @param {Array.<ydn.db.text.RankEntry>} arr
 */
SiteApp.prototype.renderResult = function(arr) {
  var toggle = function(e) {
    var pe = e.target.nextElementSibling.nextElementSibling;
    if (e.target.textContent == 'hide') {
      pe.style.display = 'none';
      e.target.textContent = 'show';
    } else {
      pe.style.display = '';
      e.target.textContent = 'hide';
    }
  };
  this.ele_results_.innerHTML = '';
  var ul = document.createElement('ul');
  for (var i = 0; i < arr.length; i++) {
    var entry = arr[i];
    var li = document.createElement('li');
    var span = document.createElement('span');
    var a = document.createElement('a');
    var swt = document.createElement('a');
    var div = document.createElement('div');
    div.style.display = 'none';
    swt.onclick = toggle;
    swt.textContent = 'show';
    swt.className = 'toggle';
    swt.href = '#';
    // console.log(entry);
    span.textContent = entry.score.toFixed(2) + ' | ' + entry.value + ' ';
    li.appendChild(span);
    li.appendChild(swt);
    li.appendChild(a);
    li.appendChild(div);
    this.db.get(entry.storeName, entry.primaryKey).done(function(x) {
      var span = this.children[0];
      var swt = this.children[1];
      var a = this.children[2];
      var div = this.children[3];
      a.textContent = x.title.$t;
      a.href = x.alternate;
      div.innerHTML = x.content.$t;
      // console.log(x);
    }, li);
    ul.appendChild(li);
  }
  this.ele_results_.appendChild(ul);
};


/**
 * @param {Event} e
 */
SiteApp.prototype.handleSearch = function(e) {
  var ele = document.getElementById('search_input');
  var rq = this.db.search(this.site_name + '-index', ele.value);
  rq.progress(function(pe) {
    // console.log(pe.length + ' results found');
  }, this);
  rq.done(function(pe) {
    // console.log(pe);
    this.renderResult(pe);
  }, this);
};


/**
 * @param {string} url
 * @param {string} site_name
 * @param {Function} cb callback with next url and number of entries.
 */
SiteApp.prototype.loadFeed = function(url, site_name, cb) {

  SiteApp.get(url, function(json) {
    var feed = json.feed;
    var entries = feed.entry;
    this.setStatus(entries.length + ' entries loaded.');
    this.db.put(site_name, entries).then(function() {
      var links = feed['link'] || [];
      for (var j = 0; j < links.length; j++) {
        if (links[j]['rel'] == 'next') {
          var next = links[j]['href'];
          cb(next, entries.length);
          this.loadFeed(next, site_name, cb);
          return;
        }
      }
      cb(null, entries.length);
      this.setStatus('loaded');
    }, function(e) {
      throw e;
    }, this);
  }, this);
  this.setStatus('loading url ' + url);
};


/**
 * @param {string} domain
 * @param {string} site_name
 */
SiteApp.prototype.load = function(domain, site_name) {
  var max = 2;
  var url = 'https://sites.google.com/feeds/content/' + domain + '/' +
      site_name + '/?alt=json&kind=webpage&max-results=' + max;
  var me = this;
  this.loadFeed(url, site_name, function(next, cnt) {
    me.updateEntryCount(cnt, true);
    me.db.count(site_name + '-index').done(function(cnt) {
      me.updateIndexCount(cnt);
    });
  });
};


/**
 * @param {string} domain
 * @param {string} site_name
 */
SiteApp.prototype.update = function(domain, site_name) {
  this.setStatus('updating ' + site_name);
  // query last updated entry
  this.db.values(this.site_name, 'updated.$t', null, 1, 0, true).then(function(objs) {
    var last = objs[0];
    if (last) {
      console.log(last);
      // add 1 sec to last updated.
      var updated = (new Date(1 + (+new Date(last.updated.$t)))).toISOString();
      var url = 'https://sites.google.com/feeds/content/' + domain + '/' +
          site_name + '/?alt=json&kind=webpage&updated-min=' + updated;
      SiteApp.get(url, function(json) {
        var entries = json.feed.entry || [];
        if (entries.length) {
          this.setStatus(entries.length + ' new entries received');
          this.db.put(site_name, entries).then(function() {
            this.updateEntryCount(entries.length, true);
            this.db.count(site_name + '-index').done(function(cnt) {
              this.updateIndexCount(cnt);
            });
          }, function(e) {
            throw e;
          }, this);
        } else {
          this.setStatus('no new for ' + site_name);
          this.db.count(site_name).done(function(cnt) {
            this.updateEntryCount(cnt);
          }, this);
          this.db.count(site_name + '-index').done(function(cnt) {
            this.updateIndexCount(cnt);
          }, this);
        }
      }, this);
    } else {
      // load whole site
      this.load(domain, site_name);
    }
  }, function(e) {
    throw e;
  }, this);
};


/**
 * Run the app.
 */
SiteApp.prototype.run = function() {
  // get all root pages.
  // this.load('yathit.com', 'ydn-dev');
  this.update(this.domain, this.site_name);
};

SiteApp.prototype.ele_results_ = document.getElementById('results');

