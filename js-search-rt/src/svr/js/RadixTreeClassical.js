"use strict";

/*!
 * Copyright (c) 2012 Adam Eilers
 * See the file LICENSE.txt for copying permission.
 */

/*****
 * SearchCore Object definition
 *
 * how to use:
 *   var [object_name] = new RadixTree();
 *     //optional properties
 *     [object_name].keySwap = {key:swap_key};
 *
 */
function RadixTree() {
    this.keywordCount = 0;
    this.dataCount = 0;
    this.tree = {};
}

/***************************************************************************
 * SearchCore Object prototype functions
 **************************************************************************/

/***************************************************************************
 * Insert Functions
 */

/*****
 * @public
 * insert()
 * The purpose of this function is to check whether or not
 *   the key exists and either inserts the existing
 *   data for the key or creates a new node in the data
 *   structure.
 *
 * @params
 * key = mandatory, new key String used to insert new node and/or new data
 * data = mandatory, new "data" to attach to new/exiting node
 */
RadixTree.prototype.insert = function insert(key, data) {
    var index = new Index(this.tree),
        callbacks = new Callbacks(this._createNode, this._createNode, this._insertData, this._splitNode);

    //process key
    key = this._processKey(key);

    //start recursive insert
    this._traverse(key, data, index, callbacks);
}

/*****
 * @private
 * _insertData()
 * The purpose of this function is to insert a data into the
 *   existing node.
 *
 * @params
 * key = mandatory, existing key String used to insert data
 * data = mandatory, new "data" to attach to existing node
 * index = mandatory, Index object used to provide info of the tree
 */
RadixTree.prototype._insertData = function _insertData(key, data, index) {
    if (index.node.$ && index.node.$.length) {
        index.node.$.push(data);
    } else {
        index.node.$ = [data];
    }
    this.dataCount++;
}

/*****
 * @private
 * _createNode()
 * The purpose of this function is to create a new node in
 *   the data structure and add it to the array of words.
 *
 * @params
 * key = mandatory, new key String used to add new node
 * data = mandatory, new "data" to attach to new node
 * index = mandatory, Index object used to provide info of the tree
 */
RadixTree.prototype._createNode = function _createNode(key, data, index) {
    if (index.ttlCharsMatch !== 0) {
        key = key.substr(index.ttlCharsMatch);
    }
    index.node[key] = {$:[data]};
    this.keywordCount++;
    this.dataCount++;
}

/*****
 * @private
 * _splitNode()
 * The purpose of this function is to split an existing node.
 *
 * @params
 * key = mandatory, new key String used to split existing nodes and add new node
 * data = mandatory, new "data" to attach to new node
 * index = mandatory, Index object used to provide info of the tree
 */
RadixTree.prototype._splitNode = function _splitNode(key, data, index) {
    //create new key for existing content
    var i = index.ttlCharsMatch - index.charsMatch,
        tempKey = "",
        tempIndexKey = index.nodeKey.substr(index.charsMatch);
    tempKey = key.substr(i, index.charsMatch);

    //add new node to existing index
    if (index.ttlCharsMatch === key.length) {
        index.node[tempKey] = {$:[data]};
    //add new nodes to existing index
    } else {
        var str = key.substr(index.ttlCharsMatch);
        index.node[tempKey] = {};
        index.node[tempKey][str] = {$:[data]};
    }

    //append existing content to new node
    index.node[tempKey][tempIndexKey] = index.node[index.nodeKey];

    //delete existing node
    delete index.node[index.nodeKey];
    this.keywordCount++;
    this.dataCount++;
}

/***************************************************************************
 * Remove Functions
 */

/*****
 * @public
 * remove()
 * The purpose of this function is to check whether or not
 *   the key exists and either removes the data or responds
 *   with an appropriate error message why nothing was removed.
 *
 * @params
 * key = mandatory, signifies key String to remove
 * data = optional, if no "data" is passed, node will be removed
 */
RadixTree.prototype.remove = function remove(key, data) {
    var index = new Index(this.tree),
        callbacks = new Callbacks(this._removeError, this._removeError, this._removeData, this._removeError);

    //process key
    key = this._processKey(key);

    //start recursive removal
    this._traverse(key, data, index, callbacks);
}

/*****
 * @private
 * _removeData()
 * The purpose of this function is to first check if the data
 *   exists on the matching node. If so, then remove the data.
 *   If not, then throw an error message.
 *
 * @params
 * key = mandatory, existing key String used to remove either key or data
 * data = mandatory, existing "data" used to delete or "undefined" to delete entire node
 * index = mandatory, Index object used to provide info of the tree
 */
RadixTree.prototype._removeData = function _removeData(key, data, index) {
    //if data is undefined, delete node
    if (typeof data === "undefined") {
        this.dataCount = this.dataCount - index.node.$.length;
        delete index.node.$;
        this.keywordCount--;
    //else delete data
    } else {
        var testData = JSON.stringify(data);

        //find matching data
        for (var i = 0, arrlen = index.node.$.length; i < arrlen; i++) {
            if (testData === JSON.stringify(index.node.$[i])) {
                break;
            }
        }

        //if match is found, remove data
        if (i < arrlen) {
            index.node.$.splice(i,1);
            this.dataCount--;
            //if data is empty, perform additional cleanup of node
            if (index.node.$.length === 0) {
                delete index.node.$;
                this.keywordCount--;
            }
        //else log error that data doesn't exist
        } else {
            console.log("Removal failed. Key: '" + key + "' matched but cound not find matching data to remove.");
        }
    }

    //if node is empty, remove empty nodes
    if (this._isEmpty(index.node)) {
        this._removeEmptyParents(index.parents);
    }
}

/*****
 * @private
 * _removeEmptyParents()
 * The purpose of this function is check the parents of the
 *   node that was removed in order to clean-up any additional
 *   empty nodes.
 *
 * @params
 * parents = mandatory, Object[] used to remove additional empty nodes
 */
RadixTree.prototype._removeEmptyParents = function _removeEmptyParents(parents) {
    //reverse order of parents array to traverse up the tree
    parents.reverse();
    //check parents for empty nodes
    for (var i = 0, arrlen = parents.length; i < arrlen; i++) {
        for (var str in parents[i]) {
            //if node is empty, delete it
            if (this._isEmpty(parents[i][str])) {
                delete parents[i][str];
            }
        }
    }
}

/*****
 * @private
 * _removeError()
 * The purpose of this function is to log the appropriate error
 *   message based on what exactly went wrong when traversing the
 *   tree for the appropriate key.
 *
 * @params
 * key = mandatory, String searched against to process error message
 * data = mandatory, "data" not used but mandatory for standardizing _processResults
 * index = mandatory, Index object used to provide info of the tree
 */
RadixTree.prototype._removeError = function _removeError(key, data, index) {
    switch(true) {
        //if key doesn't exist
        case (index.ttlCharsMatch === 0):
            console.log("Removal failed. key: '" + key + "' doesn't exist");
            break;
        //if key contains suffix of index.nodeKey
        case (index.ttlCharsMatch < key.length):
            console.log("Removal failed. key: '" + key + "' contains a suffix of a matching key: '" + key.substr(0, index.ttlCharsMatch) + "'");
            break;
        //if key exists
        case (index.ttlCharsMatch > 0):
            console.log("Removal failed. key: '" + key + "' has a partial match until here: '" + key.substr(0, index.ttlCharsMatch) + "'. Check spelling and try removal again");
            break;
        //error handling
        default:
            console.log("process results failed: " + key);
    }
}

/***************************************************************************
 * Build Function
 */

/*****
 * @public
 * buildJSONString()
 * The purpose of this function is to build the static data
 *   structure as a JSON object so that it can be returned as
 *   a flat file to be referenced at runtime on the front end.
 */
RadixTree.prototype.buildJSONString = function buildJSONString() {
    //back-end part of web service to return a copy of the tree
    return JSON.stringify(this.tree, null, 2);
}

/***************************************************************************
 * Utility Functions
 */

/*****
 * @private
 * _traverse()
 * The purpose of this function is to recursively traverse the
 *   data structure to find the matching node. Once the correct
 *   node on the tree is found, it passes the key, data, index,
 *   and callbacks to _processResults.
 *
 * @params
 * key = mandatory, String used to _processResults of tree traversal
 * data = mandatory, "data" used to _processResults
 * index = mandatory, Index object used to provide info of the tree
 * callbacks = mandatory, Callbacks object used to _processResults
 */
RadixTree.prototype._traverse = function _traverse(key, data, index, callbacks) {
    var tempKey = key.substr(index.ttlCharsMatch),
        tempMatch = index.ttlCharsMatch;

    //loop through child objects
    for (var str in index.node) {
        //loop through characters
        for (var i = 0, strlen = tempKey.length; i < strlen; i++) {
            if (tempKey.charAt(i) !== str.charAt(i)) {
                break;
            }
        }

        //if any characters match
        if (i > 0) {
            index.charsMatch = i;
            index.ttlCharsMatch += i;
            //if exact match, add current node to parents and move to matching node
            if (i === str.length) {
                index.parents.push(index.node);
                index.node = index.node[str];
            }
            index.nodeKey = str;
            break;
        }
    }

    //if entire key hasn't been checked and there is more tree to search and matching node chars equals node length and total chars match has increased
    if (index.ttlCharsMatch < key.length && this._leafCount(index.node) && index.charsMatch === index.nodeKey.length && tempMatch !== index.ttlCharsMatch) {
        this._traverse(key, data, index, callbacks);
    //else process results
    } else {
        this._processResults(key, data, index, callbacks);
    }
}

/*****
 * @private
 * _processResults()
 * The purpose of this function is to process the results of the
 *   tree traversal with callbacks to either insert or remove.
 *
 * @params
 * key = mandatory, String used to _processResults of tree traversal
 * data = mandatory, "data" used to _processResults
 * index = mandatory, Index object used to provide info of the tree
 * callbacks = mandatory, Callbacks object used to _processResults
 */
RadixTree.prototype._processResults = function _processResults(key, data, index, callbacks) {
    switch(true) {
        //if key doesn't exist
        case (index.ttlCharsMatch === 0):
            callbacks.nonExists.call(this, key, data, index);
            break;
        //if key contains suffix of index.nodeKey
        case (index.ttlCharsMatch < key.length && index.charsMatch === index.nodeKey.length):
            callbacks.suffix.call(this, key, data, index);
            break;
        //if there is an exact match
        case (index.ttlCharsMatch === key.length && index.charsMatch === index.nodeKey.length):
            callbacks.exact.call(this, key, data, index);
            break;
        //if key exists
        case (index.ttlCharsMatch > 0):
            callbacks.exists.call(this, key, data, index);
            break;
        //error handling
        default:
            console.log("Process results failed: " + key);
    }
}

/*****
 * @private
 * _processKey()
 * The purpose of this function is to check the keySwap first to see if a
 *   better search string exists. Whether or not a keySwap takes place,
 *   it returns a lower case key with spaces converted to underscores.
 *
 * @param
 * key = mandatory, String used to process key before being entered/removed from the tree
 */
RadixTree.prototype._processKey = function _processKey(key) {
    if (this.keySwap && this.keySwap[key]) {
        key = this.keySwap[key];
    }
    return key.toLowerCase().replace(/ /g,"_");
}

/*****
 * @private
 * _leafCount()
 * The purpose of this function is to get the amount of children in the node
 *   but is limited to just the children, not the keyword data stored in $.
 *
 * @param
 * node = mandatory, Object used to check how many leaf nodes it contains
 */
RadixTree.prototype._leafCount = function _leafCount(node) {
    var size = 0;
    for (var key in node) {
        if (node.hasOwnProperty(key) && key !== "$") {
            size++;
        }
    }
    return size;
}

/*****
 * @private
 * _isEmpty()
 * The purpose of this function is to check if a leaf node is empty.
 *
 * @param
 * node = mandatory, Object used to check if node is empty
 */
RadixTree.prototype._isEmpty = function _isEmpty(node) {
    return Object.keys(node).length === 0;
}

/***************************************************************************
 * Utility Objects
 */

/*****
 * @private
 * Index Object
 * The purpose of this object is to hold data used when traversing the tree
 *
 * @params
 * node = mandatory, Object used to reference current matching node in the tree
 * nodeKey = mandatory, String contains current node key used for processing inserts
 * charsMatch = mandatory, int used to specify how many characters match on the current node
 * ttlCharsMatch = mandatory, int used to specify how my total characters match the current key
 * parents = mandatory, Object[] used to hold references of all the matching parent nodes
 */
function Index(node) {
    this.node = node;
    this.nodeKey = "";
    this.charsMatch = 0;
    this.ttlCharsMatch = 0;
    this.parents = [];
}

/*****
 * @private
 * Callbacks Object
 * The purpose of this object is to hold callbacks used when processing results
 *
 * @params
 * nonExists = mandatory, Function used to reference callback used when key doesn't exist
 * suffix = mandatory, Function used to reference callback used when key contains suffix of matching keyword
 * exact = mandatory, Function used to reference callback when exact match is found
 * exists = mandatory, Function used to reference callback when parts of the key exist in the tree
 */
function Callbacks(callback1, callback2, callback3, callback4) {
    this.nonExists = callback1;
    this.suffix = callback2;
    this.exact = callback3;
    this.exists = callback4;
}
