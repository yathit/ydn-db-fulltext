
/**
 * @constructor
 */
var PubMedApp = function() {
  App.call(this);
  var db_schema = {
    fullTextCatalogs: [{
      name: 'pubmed-index',
      lang: 'en',
      indexes: [
        {
          storeName: 'pubmed',
          keyPath: 'title',
          weight: 1.0
        }, {
          storeName: 'pubmed',
          keyPath: 'abstract',
          weight: 0.5
        }]
    }],
    stores: [
      {
        name: 'pubmed',
        keyPath: 'id'
      }]
  };
  this.db = new ydn.db.Storage('pubmed', db_schema);
  var btn_search = document.getElementById('search');
  btn_search.onclick = this.handleSearch.bind(this);
  var input = document.getElementById('search_input');
  input.onkeyup = this.handleInputChanged.bind(this);

  this.stringency = 0.6;
  // this.sel_stc = document.getElementById("sel_stc");
  // this.sel_stc.onchange = this.handleStringencyChanged(this);
};
App.inherits(PubMedApp, App);


PubMedApp.prototype.handleStringencyChanged = function(e) {
  //this.stringency = parseInt(this.sel_stc.value, 10) || 0.4;
  //this.setStatus('set stringency to ' + this.stringency);
};


PubMedApp.prototype.handleInputChanged = function(event) {
  var key = event.keyCode || event.which;
  if (key == 13) {
    this.handleSearch(event);
  }
};


PubMedApp.prototype.ele_results_ = document.getElementById('results');

/**
 * @param {Array.<ydn.db.text.RankEntry>} arr
 */
PubMedApp.prototype.renderResult = function(arr) {
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
    a.target = '_blank';
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
      a.textContent = x.title;
      a.href = 'http://www.ncbi.nlm.nih.gov/pubmed/' + x.id;
      div.innerHTML = x.abstract;
      // console.log(x);
    }, li);
    ul.appendChild(li);
  }
  this.ele_results_.appendChild(ul);
};


PubMedApp.prototype.showStatistic = function(cb, scope) {
  this.db.count('pubmed').done(function(cnt) {
    this.updateEntryCount(cnt);
  }, this);
  this.db.count('pubmed-index').done(function(cnt) {
    this.updateIndexCount(cnt);
    if (cb) {
      cb.call(scope, cnt);
    }
  }, this);
};


/**
 * @param {Event} e
 */
PubMedApp.prototype.handleSearch = function(e) {
  var start = Date.now();
  var ele = document.getElementById('search_input');
  var term = ele.value;
  var rq = this.db.search('pubmed-index', term);
  rq.progress(function(pe) {
    // console.log(pe.length + ' results found');
  }, this);
  rq.done(function(pe) {
    this.renderResult(pe);
    var etime = (Date.now() - start);
    this.setStatus(pe.length + ' results found in the database. Search took ' + etime + ' ms.');
    if (e && (pe.length == 0 || pe[0].score < this.stringency)) {
      this.setStatus(' Searching on PubMed...', true);
      this.pubmedSearch(term, function(results) {
        this.setStatus(results.length + ' results found in PubMed. indexing');
        if (results.length > 0) {
          this.db.put('pubmed', results).done(function(x) {
            this.setStatus('Indexing done.');
            this.showStatistic(function() {
              this.handleSearch(null);
            }, this);
          }, this);
        } else {
          this.setStatus('No result for "' + term + '"');
        }
      }, this);
    }
  }, this);
};


PubMedApp.prototype.pubmedFetch = function(ids, cb, scope) {
  if (ids.length == 0) {
    cb.call(scope, []);
  }
  var url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=xml&id=' + ids.join(',');
  App.get(url, function(json) {
    // console.log(json);
     window.ans = json;
    var articles = [];
    if (json.PubmedArticleSet) {
      var arts = json.PubmedArticleSet[1].PubmedArticle;
      for (var i = 0; i < arts.length; i++) {
        var cit = arts[i];
        var art = cit.MedlineCitation.Article;
        articles[i] = {
          id: cit.MedlineCitation.PMID.$t,
          title: art.ArticleTitle.$t,
          abstract: art.Abstract ? art.Abstract.AbstractText.$t : ''
        };
      }
    }
    cb.call(scope, articles);
  }, this);
};


PubMedApp.prototype.pubmedSearch = function(term, cb, scope) {
  var url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=xml&term=' + term;
  App.get(url, function(json) {
    // console.log(json);
    var id_list = json.eSearchResult[1].IdList.Id;
    var ids = [];
    if (id_list) {
      ids =  id_list.map(function(x) {
        return x.$t;
      });
    }
    this.pubmedFetch(ids, cb, scope);
  }, this);
};



/**
 * Run the app.
 */
PubMedApp.prototype.run = function() {
  this.showStatistic();
  this.setStatus('Ready');
};


