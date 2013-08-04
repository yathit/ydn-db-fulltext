/**
 * @constructor
 */
var Animals = function() {
  var db_schema = {
    fullTextCatalogs: [{
      name: 'name',
      lang: 'en',
      indexes: [
        {
          storeName: 'animal',
          keyPath: 'binomial',
          weight: 1.0
        }, {
          storeName: 'animal',
          keyPath: 'name',
          weight: 0.5
        }]
    }],
    stores: [
      {
        name: 'animal',
        keyPath: 'binomial',
        autoIncrement: true
      }]
  };
  this.db = new ydn.db.Storage('animals', db_schema);
  var btn_search = document.getElementById('search');
  btn_search.addEventListener('click', this.handleSearch.bind(this));
  var input = document.getElementById('search_input');
  input.onkeyup = this.handleInputChanged.bind(this);
};


Animals.prototype.handleInputChanged = function(e) {
  var key = event.keyCode || event.which;
  if (key == 13) {
    this.handleSearch(e);
  }
};


/**
 * @param {Array.<ydn.db.text.RankEntry>} arr
 */
Animals.prototype.renderResult = function(arr) {
  this.ele_results_.innerHTML = '';
  var ul = document.createElement('ul');
  for (var i = 0; i < arr.length; i++) {
    var entry = arr[i];
    var li = document.createElement('li');
    var span = document.createElement('span');
    // console.log(entry);
    span.textContent = entry.score.toFixed(2) + ' | ' + entry.value + ' : ' + entry.primaryKey;
    this.db.get(entry.storeName, entry.primaryKey).done(function(x) {
      this.textContent += ' [Full name: ' + x.name + ']';
    }, span);
    li.appendChild(span);
    ul.appendChild(li);
  }
  this.ele_results_.appendChild(ul);
};



/**
 * @param {Event} e
 */
Animals.prototype.handleSearch = function(e) {
  var ele = document.getElementById('search_input');
  var rq = this.db.search('name', ele.value);
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
 */
Animals.prototype.load = function(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  var me = this;
  xhr.onload = function(e) {
    var lines = xhr.responseText.split('\n');
    var animals = [];
    for (var i = 0; i < lines.length; i++) {
      var data = lines[i].split(';');
      if (data.length == 2) {
        animals.push({
          name: data[0].trim(),
          binomial: data[1].trim()
        });
      }
    }
    // console.log(animals);
    me.setStatus(animals.length + ' animals loaded.');
    me.db.put('animal', animals).then(function(keys) {
      this.setStatus(keys.length + ' animals saved.');
    }, function(e) {
      throw e;
    }, me);
  };
  xhr.send();
  this.setStatus('loading ' + url);
};


/**
 * Run the app.
 */
Animals.prototype.run = function() {
  this.db.addEventListener('ready', function(e) {
    this.db.count('animal').then(function(cnt) {
      // console.log(cnt);
      if (cnt < 2345) {
        this.load('data.csv');
      } else {
        this.setStatus(cnt + ' animals in this database.');
      }
    }, function(e) {
      throw e;
    }, this);
  }, false, this);
};

Animals.prototype.ele_status_ = document.getElementById('status');

Animals.prototype.ele_results_ = document.getElementById('results');


Animals.prototype.setStatus = function(msg) {
  this.ele_status_.textContent = msg;
};

