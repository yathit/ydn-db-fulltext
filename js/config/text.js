/**
 * @fileoverview ydn-db-text build configuration file.
 */

goog.require('ydn.db.crud.Storage.text');

goog.exportProperty(ydn.db.crud.Storage.prototype, 'search',
    ydn.db.crud.Storage.prototype.search);
goog.exportProperty(ydn.db.text.ResultSet.prototype, 'collect',
    ydn.db.text.ResultSet.prototype.collect);


