"use strict";

/*!
 * Copyright (c) 2012 Adam Eilers
 * See the file LICENSE.txt for copying permission.
 */

/*****
 * SearchCore Object definition
 *
 * how to use:
 *   var [object_name] = RadixTree();
 *
 */
function RadixTree() {
    //private variables
    var keywordCount = 0,
        dataCount = 0,
        tree = {};
    //optional variable to swap keys
    //  keySwap = {key:swap_key};
    var keySwap = {};

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
    function insert(key, data) {
        var index = Index(tree),
            callbacks = Callbacks(createNode, createNode, insertData, splitNode);

        //process key
        key = processKey(key);

        //start recursive insert
        traverse(key, data, index, callbacks);
    }

    /*****
     * @private
     * insertData()
     * The purpose of this function is to insert a data into the
     *   existing node.
     *
     * @params
     * key = mandatory, existing key String used to insert data
     * data = mandatory, new "data" to attach to existing node
     * index = mandatory, Index object used to provide info of the tree
     */
    function insertData(key, data, index) {
        if (index.node.$ && index.node.$.length) {
            index.node.$.push(data);
        } else {
            index.node.$ = [data];
        }
        dataCount++;
    }

    /*****
     * @private
     * createNode()
     * The purpose of this function is to create a new node in
     *   the data structure and add it to the array of words.
     *
     * @params
     * key = mandatory, new key String used to add new node
     * data = mandatory, new "data" to attach to new node
     * index = mandatory, Index object used to provide info of the tree
     */
    function createNode(key, data, index) {
        if (index.ttlCharsMatch !== 0) {
            key = key.substr(index.ttlCharsMatch);
        }
        index.node[key] = {$:[data]};
        keywordCount++;
        dataCount++;
    }

    /*****
     * @private
     * splitNode()
     * The purpose of this function is to split an existing node.
     *
     * @params
     * key = mandatory, new key String used to split existing nodes and add new node
     * data = mandatory, new "data" to attach to new node
     * index = mandatory, Index object used to provide info of the tree
     */
    function splitNode(key, data, index) {
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
        keywordCount++;
        dataCount++;
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
    function remove(key, data) {
        var index = Index(tree),
            callbacks = Callbacks(removeError, removeError, removeData, removeError);

        //process key
        key = processKey(key);

        //start recursive removal
        traverse(key, data, index, callbacks);
    }

    /*****
     * @private
     * removeData()
     * The purpose of this function is to first check if the data
     *   exists on the matching node. If so, then remove the data.
     *   If not, then throw an error message.
     *
     * @params
     * key = mandatory, existing key String used to remove either key or data
     * data = mandatory, existing "data" used to delete or "undefined" to delete entire node
     * index = mandatory, Index object used to provide info of the tree
     */
    function removeData(key, data, index) {
        //if data is undefined, delete node
        if (typeof data === "undefined") {
            dataCount = dataCount - index.node.$.length;
            delete index.node.$;
            keywordCount--;
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
                dataCount--;
                //if data is empty, perform additional cleanup of node
                if (index.node.$.length === 0) {
                    delete index.node.$;
                    keywordCount--;
                }
            //else log error that data doesn't exist
            } else {
                console.log("Removal failed. Key: '" + key + "' matched but cound not find matching data to remove.");
            }
        }

        //if node is empty, remove empty nodes
        if (isEmpty(index.node)) {
            removeEmptyParents(index.parents);
        }
    }

    /*****
     * @private
     * removeEmptyParents()
     * The purpose of this function is check the parents of the
     *   node that was removed in order to clean-up any additional
     *   empty nodes.
     *
     * @params
     * parents = mandatory, Object[] used to remove additional empty nodes
     */
    function removeEmptyParents(parents) {
        //reverse order of parents array to traverse up the tree
        parents.reverse();
        //check parents for empty nodes
        for (var i = 0, arrlen = parents.length; i < arrlen; i++) {
            for (var str in parents[i]) {
                //if node is empty, delete it
                if (isEmpty(parents[i][str])) {
                    delete parents[i][str];
                }
            }
        }
    }

    /*****
     * @private
     * removeError()
     * The purpose of this function is to log the appropriate error
     *   message based on what exactly went wrong when traversing the
     *   tree for the appropriate key.
     *
     * @params
     * key = mandatory, String searched against to process error message
     * data = mandatory, "data" not used but mandatory for standardizing _processResults
     * index = mandatory, Index object used to provide info of the tree
     */
    function removeError(key, data, index) {
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
     * Utility Functions
     */

    /*****
     * @private
     * traverse()
     * The purpose of this function is to recursively traverse the
     *   data structure to find the matching node. Once the correct
     *   node on the tree is found, it passes the key, data, index,
     *   and callbacks to _processResults().
     *
     * @params
     * key = mandatory, String used to _processResults of tree traversal
     * data = mandatory, "data" used to _processResults
     * index = mandatory, Index object used to provide info of the tree
     * callbacks = mandatory, Callbacks object used to _processResults
     */
    function traverse(key, data, index, callbacks) {
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
        if (index.ttlCharsMatch < key.length && leafCount(index.node) && index.charsMatch === index.nodeKey.length && tempMatch !== index.ttlCharsMatch) {
            traverse(key, data, index, callbacks);
        //else process results
        } else {
            processResults(key, data, index, callbacks);
        }
    }

    /*****
     * @private
     * processResults()
     * The purpose of this function is to process the results of the
     *   tree traversal with callbacks to either insert or remove.
     *
     * @params
     * key = mandatory, String used to _processResults of tree traversal
     * data = mandatory, "data" used to _processResults
     * index = mandatory, Index object used to provide info of the tree
     * callbacks = mandatory, Callbacks object used to _processResults
     */
    function processResults(key, data, index, callbacks) {
        switch(true) {
            //if key doesn't exist
            case (index.ttlCharsMatch === 0):
                callbacks.nonExists(key, data, index);
                break;
            //if key contains suffix of index.nodeKey
            case (index.ttlCharsMatch < key.length && index.charsMatch === index.nodeKey.length):
                callbacks.suffix(key, data, index);
                break;
            //if there is an exact match
            case (index.ttlCharsMatch === key.length && index.charsMatch === index.nodeKey.length):
                callbacks.exact(key, data, index);
                break;
            //if key exists
            case (index.ttlCharsMatch > 0):
                callbacks.exists(key, data, index);
                break;
            //error handling
            default:
                console.log("Process results failed: " + key);
        }
    }

    /*****
     * @private
     * processKey()
     * The purpose of this function is to check the keySwap first to see if a
     *   better search string exists. Whether or not a keySwap takes place,
     *   it returns a lower case key with spaces converted to underscores.
     *
     * @param
     * key = mandatory, String used to process key before being entered/removed from the tree
     */
    function processKey(key) {
        if (keySwap && keySwap[key]) {
            key = keySwap[key];
        }
        return key.toLowerCase().replace(/ /g,"_");
    }

    /*****
     * @private
     * leafCount()
     * The purpose of this function is to get the amount of children in the node
     *   but is limited to just the children, not the keyword data stored in $.
     *
     * @param
     * node = mandatory, Object used to check if node is empty
     */
    function leafCount(node) {
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
     * isEmpty()
     * The purpose of this function is to check if a leaf node is empty.
     *
     * @param
     * node = mandatory, Object used to check if node is empty
     */
    function isEmpty(node) {
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
        return {
            node: node,
            nodeKey: "",
            charsMatch: 0,
            ttlCharsMatch: 0,
            parents:[]
        }
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
        return {
            nonExists: callback1,
            suffix: callback2,
            exact: callback3,
            exists: callback4
        }
    }

    //returns access to read variables only and access to the public functions insert and remove
    return {
        keywordCount: function getKeywordCount() { return keywordCount; },
        dataCount: function getDataCount() { return dataCount; },
        tree: function getTree() { return JSON.stringify(tree, null, 2); },
        insert: insert,
        remove: remove
    }
}
