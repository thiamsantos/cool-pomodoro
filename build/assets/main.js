(function () {
'use strict';

var range; // Create a range object for efficently rendering strings to elements.
var NS_XHTML = 'http://www.w3.org/1999/xhtml';

var doc = typeof document === 'undefined' ? undefined : document;

var testEl = doc ?
    doc.body || doc.createElement('div') :
    {};

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var actualHasAttributeNS;

if (testEl.hasAttributeNS) {
    actualHasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    actualHasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    actualHasAttributeNS = function(el, namespaceURI, name) {
        return el.getAttributeNode(namespaceURI, name) != null;
    };
}

var hasAttributeNS = actualHasAttributeNS;


function toElement(str) {
    if (!range && doc.createRange) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = doc.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;

    if (fromNodeName === toNodeName) {
        return true;
    }

    if (toEl.actualize &&
        fromNodeName.charCodeAt(0) < 91 && /* from tag name is upper case */
        toNodeName.charCodeAt(0) > 90 /* target tag name is lower case */) {
        // If the target element is a virtual DOM node then we may need to normalize the tag name
        // before comparing. Normal HTML elements that are in the "http://www.w3.org/1999/xhtml"
        // are converted to upper case
        return fromNodeName === toNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        attrName = attr.name;
        attrNamespaceURI = attr.namespaceURI;
        attrValue = attr.value;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

            if (fromValue !== attrValue) {
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            }
        } else {
            fromValue = fromNode.getAttribute(attrName);

            if (fromValue !== attrValue) {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;

                if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
                    fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                }
            } else {
                if (!hasAttributeNS(toNode, null, attrName)) {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}

function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
        fromEl[name] = toEl[name];
        if (fromEl[name]) {
            fromEl.setAttribute(name, '');
        } else {
            fromEl.removeAttribute(name, '');
        }
    }
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'selected');
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'checked');
        syncBooleanAttrProp(fromEl, toEl, 'disabled');

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            // Needed for IE. Apparently IE sets the placeholder as the
            // node value and vise versa. This ignores an empty update.
            if (newValue === '' && fromEl.firstChild.nodeValue === fromEl.placeholder) {
                return;
            }

            fromEl.firstChild.nodeValue = newValue;
        }
    },
    SELECT: function(fromEl, toEl) {
        if (!hasAttributeNS(toEl, null, 'multiple')) {
            var selectedIndex = -1;
            var i = 0;
            var curChild = toEl.firstChild;
            while(curChild) {
                var nodeName = curChild.nodeName;
                if (nodeName && nodeName.toUpperCase() === 'OPTION') {
                    if (hasAttributeNS(curChild, null, 'selected')) {
                        selectedIndex = i;
                        break;
                    }
                    i++;
                }
                curChild = curChild.nextSibling;
            }

            fromEl.selectedIndex = i;
        }
    }
};

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

function noop() {}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdomFactory(morphAttrs) {

    return function morphdom(fromNode, toNode, options) {
        if (!options) {
            options = {};
        }

        if (typeof toNode === 'string') {
            if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
                var toNodeHtml = toNode;
                toNode = doc.createElement('html');
                toNode.innerHTML = toNodeHtml;
            } else {
                toNode = toElement(toNode);
            }
        }

        var getNodeKey = options.getNodeKey || defaultGetNodeKey;
        var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
        var onNodeAdded = options.onNodeAdded || noop;
        var onBeforeElUpdated = options.onBeforeElUpdated || noop;
        var onElUpdated = options.onElUpdated || noop;
        var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
        var onNodeDiscarded = options.onNodeDiscarded || noop;
        var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
        var childrenOnly = options.childrenOnly === true;

        // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
        var fromNodesLookup = {};
        var keyedRemovalList;

        function addKeyedRemoval(key) {
            if (keyedRemovalList) {
                keyedRemovalList.push(key);
            } else {
                keyedRemovalList = [key];
            }
        }

        function walkDiscardedChildNodes(node, skipKeyedNodes) {
            if (node.nodeType === ELEMENT_NODE) {
                var curChild = node.firstChild;
                while (curChild) {

                    var key = undefined;

                    if (skipKeyedNodes && (key = getNodeKey(curChild))) {
                        // If we are skipping keyed nodes then we add the key
                        // to a list so that it can be handled at the very end.
                        addKeyedRemoval(key);
                    } else {
                        // Only report the node as discarded if it is not keyed. We do this because
                        // at the end we loop through all keyed elements that were unmatched
                        // and then discard them in one final pass.
                        onNodeDiscarded(curChild);
                        if (curChild.firstChild) {
                            walkDiscardedChildNodes(curChild, skipKeyedNodes);
                        }
                    }

                    curChild = curChild.nextSibling;
                }
            }
        }

        /**
         * Removes a DOM node out of the original DOM
         *
         * @param  {Node} node The node to remove
         * @param  {Node} parentNode The nodes parent
         * @param  {Boolean} skipKeyedNodes If true then elements with keys will be skipped and not discarded.
         * @return {undefined}
         */
        function removeNode(node, parentNode, skipKeyedNodes) {
            if (onBeforeNodeDiscarded(node) === false) {
                return;
            }

            if (parentNode) {
                parentNode.removeChild(node);
            }

            onNodeDiscarded(node);
            walkDiscardedChildNodes(node, skipKeyedNodes);
        }

        // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
        // function indexTree(root) {
        //     var treeWalker = document.createTreeWalker(
        //         root,
        //         NodeFilter.SHOW_ELEMENT);
        //
        //     var el;
        //     while((el = treeWalker.nextNode())) {
        //         var key = getNodeKey(el);
        //         if (key) {
        //             fromNodesLookup[key] = el;
        //         }
        //     }
        // }

        // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
        //
        // function indexTree(node) {
        //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
        //     var el;
        //     while((el = nodeIterator.nextNode())) {
        //         var key = getNodeKey(el);
        //         if (key) {
        //             fromNodesLookup[key] = el;
        //         }
        //     }
        // }

        function indexTree(node) {
            if (node.nodeType === ELEMENT_NODE) {
                var curChild = node.firstChild;
                while (curChild) {
                    var key = getNodeKey(curChild);
                    if (key) {
                        fromNodesLookup[key] = curChild;
                    }

                    // Walk recursively
                    indexTree(curChild);

                    curChild = curChild.nextSibling;
                }
            }
        }

        indexTree(fromNode);

        function handleNodeAdded(el) {
            onNodeAdded(el);

            var curChild = el.firstChild;
            while (curChild) {
                var nextSibling = curChild.nextSibling;

                var key = getNodeKey(curChild);
                if (key) {
                    var unmatchedFromEl = fromNodesLookup[key];
                    if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
                        curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
                        morphEl(unmatchedFromEl, curChild);
                    }
                }

                handleNodeAdded(curChild);
                curChild = nextSibling;
            }
        }

        function morphEl(fromEl, toEl, childrenOnly) {
            var toElKey = getNodeKey(toEl);
            var curFromNodeKey;

            if (toElKey) {
                // If an element with an ID is being morphed then it is will be in the final
                // DOM so clear it out of the saved elements collection
                delete fromNodesLookup[toElKey];
            }

            if (toNode.isSameNode && toNode.isSameNode(fromNode)) {
                return;
            }

            if (!childrenOnly) {
                if (onBeforeElUpdated(fromEl, toEl) === false) {
                    return;
                }

                morphAttrs(fromEl, toEl);
                onElUpdated(fromEl);

                if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                    return;
                }
            }

            if (fromEl.nodeName !== 'TEXTAREA') {
                var curToNodeChild = toEl.firstChild;
                var curFromNodeChild = fromEl.firstChild;
                var curToNodeKey;

                var fromNextSibling;
                var toNextSibling;
                var matchingFromEl;

                outer: while (curToNodeChild) {
                    toNextSibling = curToNodeChild.nextSibling;
                    curToNodeKey = getNodeKey(curToNodeChild);

                    while (curFromNodeChild) {
                        fromNextSibling = curFromNodeChild.nextSibling;

                        if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }

                        curFromNodeKey = getNodeKey(curFromNodeChild);

                        var curFromNodeType = curFromNodeChild.nodeType;

                        var isCompatible = undefined;

                        if (curFromNodeType === curToNodeChild.nodeType) {
                            if (curFromNodeType === ELEMENT_NODE) {
                                // Both nodes being compared are Element nodes

                                if (curToNodeKey) {
                                    // The target node has a key so we want to match it up with the correct element
                                    // in the original DOM tree
                                    if (curToNodeKey !== curFromNodeKey) {
                                        // The current element in the original DOM tree does not have a matching key so
                                        // let's check our lookup to see if there is a matching element in the original
                                        // DOM tree
                                        if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
                                            if (curFromNodeChild.nextSibling === matchingFromEl) {
                                                // Special case for single element removals. To avoid removing the original
                                                // DOM node out of the tree (since that can break CSS transitions, etc.),
                                                // we will instead discard the current node and wait until the next
                                                // iteration to properly match up the keyed target element with its matching
                                                // element in the original tree
                                                isCompatible = false;
                                            } else {
                                                // We found a matching keyed element somewhere in the original DOM tree.
                                                // Let's moving the original DOM node into the current position and morph
                                                // it.

                                                // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                                // the `removeNode()` function for the node that is being discarded so that
                                                // all lifecycle hooks are correctly invoked
                                                fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                                fromNextSibling = curFromNodeChild.nextSibling;

                                                if (curFromNodeKey) {
                                                    // Since the node is keyed it might be matched up later so we defer
                                                    // the actual removal to later
                                                    addKeyedRemoval(curFromNodeKey);
                                                } else {
                                                    // NOTE: we skip nested keyed nodes from being removed since there is
                                                    //       still a chance they will be matched up later
                                                    removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                                                }

                                                curFromNodeChild = matchingFromEl;
                                            }
                                        } else {
                                            // The nodes are not compatible since the "to" node has a key and there
                                            // is no matching keyed node in the source tree
                                            isCompatible = false;
                                        }
                                    }
                                } else if (curFromNodeKey) {
                                    // The original has a key
                                    isCompatible = false;
                                }

                                isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                                if (isCompatible) {
                                    // We found compatible DOM elements so transform
                                    // the current "from" node to match the current
                                    // target DOM node.
                                    morphEl(curFromNodeChild, curToNodeChild);
                                }

                            } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                                // Both nodes being compared are Text or Comment nodes
                                isCompatible = true;
                                // Simply update nodeValue on the original node to
                                // change the text value
                                curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                            }
                        }

                        if (isCompatible) {
                            // Advance both the "to" child and the "from" child since we found a match
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }

                        // No compatible match so remove the old node from the DOM and continue trying to find a
                        // match in the original DOM. However, we only do this if the from node is not keyed
                        // since it is possible that a keyed node might match up with a node somewhere else in the
                        // target tree and we don't want to discard it just yet since it still might find a
                        // home in the final DOM tree. After everything is done we will remove any keyed nodes
                        // that didn't find a home
                        if (curFromNodeKey) {
                            // Since the node is keyed it might be matched up later so we defer
                            // the actual removal to later
                            addKeyedRemoval(curFromNodeKey);
                        } else {
                            // NOTE: we skip nested keyed nodes from being removed since there is
                            //       still a chance they will be matched up later
                            removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                        }

                        curFromNodeChild = fromNextSibling;
                    }

                    // If we got this far then we did not find a candidate match for
                    // our "to node" and we exhausted all of the children "from"
                    // nodes. Therefore, we will just append the current "to" node
                    // to the end
                    if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                        fromEl.appendChild(matchingFromEl);
                        morphEl(matchingFromEl, curToNodeChild);
                    } else {
                        var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
                        if (onBeforeNodeAddedResult !== false) {
                            if (onBeforeNodeAddedResult) {
                                curToNodeChild = onBeforeNodeAddedResult;
                            }

                            if (curToNodeChild.actualize) {
                                curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                            }
                            fromEl.appendChild(curToNodeChild);
                            handleNodeAdded(curToNodeChild);
                        }
                    }

                    curToNodeChild = toNextSibling;
                    curFromNodeChild = fromNextSibling;
                }

                // We have processed all of the "to nodes". If curFromNodeChild is
                // non-null then we still have some from nodes left over that need
                // to be removed
                while (curFromNodeChild) {
                    fromNextSibling = curFromNodeChild.nextSibling;
                    if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
                        // Since the node is keyed it might be matched up later so we defer
                        // the actual removal to later
                        addKeyedRemoval(curFromNodeKey);
                    } else {
                        // NOTE: we skip nested keyed nodes from being removed since there is
                        //       still a chance they will be matched up later
                        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                    }
                    curFromNodeChild = fromNextSibling;
                }
            }

            var specialElHandler = specialElHandlers[fromEl.nodeName];
            if (specialElHandler) {
                specialElHandler(fromEl, toEl);
            }
        } // END: morphEl(...)

        var morphedNode = fromNode;
        var morphedNodeType = morphedNode.nodeType;
        var toNodeType = toNode.nodeType;

        if (!childrenOnly) {
            // Handle the case where we are given two DOM nodes that are not
            // compatible (e.g. <div> --> <span> or <div> --> TEXT)
            if (morphedNodeType === ELEMENT_NODE) {
                if (toNodeType === ELEMENT_NODE) {
                    if (!compareNodeNames(fromNode, toNode)) {
                        onNodeDiscarded(fromNode);
                        morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                    }
                } else {
                    // Going from an element node to a text node
                    morphedNode = toNode;
                }
            } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
                if (toNodeType === morphedNodeType) {
                    morphedNode.nodeValue = toNode.nodeValue;
                    return morphedNode;
                } else {
                    // Text node to something else
                    morphedNode = toNode;
                }
            }
        }

        if (morphedNode === toNode) {
            // The "to node" was not compatible with the "from node" so we had to
            // toss out the "from node" and use the "to node"
            onNodeDiscarded(fromNode);
        } else {
            morphEl(morphedNode, toNode, childrenOnly);

            // We now need to loop over any keyed nodes that might need to be
            // removed. We only do the removal if we know that the keyed node
            // never found a match. When a keyed node is matched up we remove
            // it out of fromNodesLookup and we use fromNodesLookup to determine
            // if a keyed node has been matched up or not
            if (keyedRemovalList) {
                for (var i=0, len=keyedRemovalList.length; i<len; i++) {
                    var elToRemove = fromNodesLookup[keyedRemovalList[i]];
                    if (elToRemove) {
                        removeNode(elToRemove, elToRemove.parentNode, false);
                    }
                }
            }
        }

        if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
            if (morphedNode.actualize) {
                morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
            }
            // If we had to swap out the from node with a new node because the old
            // node was not compatible with the target node then we need to
            // replace the old DOM node in the original DOM tree. This is only
            // possible if the original DOM node was part of a DOM tree which
            // we know is the case if it has a parent node.
            fromNode.parentNode.replaceChild(morphedNode, fromNode);
        }

        return morphedNode;
    };
}

var morphdom = morphdomFactory(morphAttrs);

var morphdom_1 = morphdom;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var object = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matches = exports.equals = exports.checkObjectProperties = undefined;



var checkObjectProperties = exports.checkObjectProperties = function checkObjectProperties(a, b, aProps, bProps) {
  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i];

    var aProp = a[propName];
    var bProp = b[propName];

    if (Array.isArray(aProp) && Array.isArray(bProp)) {
      if (!(0, array.isEqual)(aProp, bProp)) { return false; }
    } else if (aProp !== bProp) {
      return false;
    }
  }

  return true;
};

var equals = exports.equals = function equals(a, b) {
  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);

  if (aProps.length != bProps.length) {
    return false;
  }

  return checkObjectProperties(a, b, aProps, bProps);
};

var matches = exports.matches = function matches(obj, props) {
  return Object.keys(props).every(function (key) {
    return obj[key] === props[key];
  });
};
});

var array = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.chunk = exports.remove = exports.indexOf = exports.flatten = exports.last = exports.tail = exports.head = exports.findIndexByObject = exports.isEqual = exports.where = exports.isEmpty = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };



function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var isEmpty = exports.isEmpty = function isEmpty(array) {
  return !(array && array.length > 0);
};

var where = exports.where = function where(array, properties) {
  return array.filter(function (entry) {
    return (0, object.matches)(entry, properties);
  });
};

var isEqual = exports.isEqual = function isEqual(array1, array2) {
  if (!Array.isArray(array1) || !Array.isArray(array2)) { return false; }
  if (array1.length !== array2.length) { return false; }

  return array1.every(function (element, index) {
    return (0, object.equals)(element, array2[index]);
  });
};

var findIndexByObject = exports.findIndexByObject = function findIndexByObject(array, element) {
  if (isEmpty(array) || !element) { return -1; }

  for (var i = 0; i < array.length; i++) {
    if ((0, object.equals)(array[i], element)) { return i; }
  }
  return -1;
};

var head = exports.head = function head(array) {
  return isEmpty(array) ? undefined : array[0];
};

var tail = exports.tail = function tail(array) {
  return isEmpty(array) ? [] : array.slice(1, array.length);
};

var last = exports.last = function last(array) {
  return isEmpty(array) ? undefined : array[array.length - 1];
};

var flatten = exports.flatten = function flatten(array) {
  if (isEmpty(array)) {
    return [];
  }
  return array.reduce(function (a, b) {
    return a.concat(Array.isArray(b) ? flatten(b) : b);
  }, []);
};

var indexOf = exports.indexOf = function indexOf(array, props) {
  if (isEmpty(array) || !props) { return -1; }

  if ((typeof props === 'undefined' ? 'undefined' : _typeof(props)) === 'object') {
    var element = where(array, props);
    return findIndexByObject(array, element[0]);
  } else {
    return array.indexOf(props);
  }
};

var remove = exports.remove = function remove(array, props) {
  if (isEmpty(array)) { return []; }
  if (!props) { return array; }

  var index = indexOf(array, props);

  return index > -1 ? [].concat(_toConsumableArray(array.slice(0, index)), _toConsumableArray(array.slice(index + 1))) : array;
};

var chunk = exports.chunk = function chunk(array, len) {
  var chunks = [],
      n = array.length;
  var i = 0;

  while (i < n) {
    chunks.push(array.slice(i, i += len));
  }

  return chunks;
};
});

var _function = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var curry = exports.curry = function curry(fn) {
  var arguments$1 = arguments;

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments$1[_key];
  }

  if (args.length === fn.length) {
    return fn.apply(undefined, args);
  }
  return curry.bind.apply(curry, [undefined, fn].concat(args));
};

var compose = exports.compose = function compose() {
  var arguments$1 = arguments;

  for (var _len2 = arguments.length, fns = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    fns[_key2] = arguments$1[_key2];
  }

  return fns.reduce(function (f, g) {
    return function () {
      return f(g.apply(undefined, arguments));
    };
  });
};

var memoize = exports.memoize = function memoize(f) {
  return function () {
    var arguments$1 = arguments;

    for (var _len3 = arguments.length, params = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      params[_key3] = arguments$1[_key3];
    }

    f.memoize = f.memoize || {};

    return params in f.memoize ? f.memoize[params] : f.memoize[params] = f.apply(undefined, params);
  };
};

var debounce = exports.debounce = function debounce(fn) {
  var wait = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
  var immediate = arguments[2];
  return function () {
    var arguments$1 = arguments;

    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments$1[_key4];
    }

    var obj = undefined;
    var timeout = void 0;

    var delayed = function delayed() {
      if (!immediate) { fn.apply(obj, args); }
      timeout = null;
    };

    if (timeout) { clearTimeout(timeout); }else if (immediate) { fn.apply(obj, args); }

    timeout = setTimeout(delayed, wait);
  };
};

var throttle = exports.throttle = function throttle(fn, limit) {
  var wait = false;

  return function () {
    if (!wait) {
      fn.call();
      wait = true;
      setTimeout(function () {
        return wait = false;
      }, limit);
    }
  };
};

var pipe = exports.pipe = function pipe() {
  var arguments$1 = arguments;

  for (var _len5 = arguments.length, fns = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
    fns[_key5] = arguments$1[_key5];
  }

  return function (initial) {
    return fns.reduce(function (acc, fn) {
      return fn(acc);
    }, initial);
  };
};
});

var index$1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEmpty = exports.matches = exports.equals = exports.pipe = exports.throttle = exports.debounce = exports.memoize = exports.compose = exports.curry = exports.chunk = exports.where = exports.indexOf = exports.remove = exports.flatten = exports.last = exports.tail = exports.head = undefined;







exports.head = array.head;
exports.tail = array.tail;
exports.last = array.last;
exports.flatten = array.flatten;
exports.remove = array.remove;
exports.indexOf = array.indexOf;
exports.where = array.where;
exports.chunk = array.chunk;
exports.curry = _function.curry;
exports.compose = _function.compose;
exports.memoize = _function.memoize;
exports.debounce = _function.debounce;
exports.throttle = _function.throttle;
exports.pipe = _function.pipe;
exports.equals = object.equals;
exports.matches = object.matches;
exports.isEmpty = object.isEmpty;
});

var index_4 = index$1.pipe;
var index_5 = index$1.throttle;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

var Symbol$1 = root.Symbol;

var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$1.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$1.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$2.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString$1.call(value);
}

var nullTag = '[object Null]';
var undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

var getPrototype = overArg(Object.getPrototypeOf, Object);

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype;
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

function symbolObservablePonyfill(root) {
	var result;
	var Symbol = root.Symbol;

	if (typeof Symbol === 'function') {
		if (Symbol.observable) {
			result = Symbol.observable;
		} else {
			result = Symbol('observable');
			Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
}

/* global window */
var root$2;

if (typeof self !== 'undefined') {
  root$2 = self;
} else if (typeof window !== 'undefined') {
  root$2 = window;
} else if (typeof global !== 'undefined') {
  root$2 = global;
} else if (typeof module !== 'undefined') {
  root$2 = module;
} else {
  root$2 = Function('return this')();
}

var result = symbolObservablePonyfill(root$2);

var ActionTypes = {
  INIT: '@@redux/INIT'
};

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} enhancer The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
function createStore(reducer, preloadedState, enhancer) {
  var _ref2;

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState;
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.');
    }

    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }

    return action;
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.INIT });
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/zenparsing/es-observable
   */
  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return { unsubscribe: unsubscribe };
      }
    }, _ref[result] = function () {
      return this;
    }, _ref;
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT });

  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[result] = observable, _ref2;
}

/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
    /* eslint-disable no-empty */
  } catch (e) {}
  /* eslint-enable no-empty */
}

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

  return 'Given action ' + actionName + ', reducer "' + key + '" returned undefined. ' + 'To ignore an action, you must explicitly return the previous state.';
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers);
  var argumentName = action && action.type === ActionTypes.INIT ? 'preloadedState argument passed to createStore' : 'previous state received by the reducer';

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
  }

  if (!isPlainObject(inputState)) {
    return 'The ' + argumentName + ' has unexpected type of "' + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
  }

  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
    return !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key];
  });

  unexpectedKeys.forEach(function (key) {
    unexpectedKeyCache[key] = true;
  });

  if (unexpectedKeys.length > 0) {
    return 'Unexpected ' + (unexpectedKeys.length > 1 ? 'keys' : 'key') + ' ' + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + '. ') + 'Expected to find one of the known reducer keys instead: ' + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
  }
}

function assertReducerSanity(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, { type: ActionTypes.INIT });

    if (typeof initialState === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined.');
    }

    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
    if (typeof reducer(undefined, { type: type }) === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined.');
    }
  });
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];

    {
      if (typeof reducers[key] === 'undefined') {
        warning('No reducer provided for key "' + key + '"');
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }
  var finalReducerKeys = Object.keys(finalReducers);

  {
    var unexpectedKeyCache = {};
  }

  var sanityError;
  try {
    assertReducerSanity(finalReducers);
  } catch (e) {
    sanityError = e;
  }

  return function combination() {
    var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var action = arguments[1];

    if (sanityError) {
      throw sanityError;
    }

    {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);
      if (warningMessage) {
        warning(warningMessage);
      }
    }

    var hasChanged = false;
    var nextState = {};
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i];
      var reducer = finalReducers[key];
      var previousStateForKey = state[key];
      var nextStateForKey = reducer(previousStateForKey, action);
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(key, action);
        throw new Error(errorMessage);
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

function isCrushed() {}

if ("development" !== 'production' && typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  warning('You are currently using minified code outside of NODE_ENV === \'production\'. ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' + 'to ensure you have the correct code for your production build.');
}

var loadState = function (localStorage) {
  try {
    var serializedState = localStorage.getItem('state');
    if (serializedState === null) {
      return false
    }
    return JSON.parse(serializedState)
  } catch (err) {
    return false
  }
};

var saveState = function (localStorage, state) {
  try {
    var serializedState = JSON.stringify(state);
    localStorage.setItem('state', serializedState);
  } catch (err) {}
};

var CHANGE_TIMER_TYPE = 'CHANGE_TIMER_TYPE';
var CHANGE_TIMER_PLAY_STATE = 'CHANGE_TIMER_PLAY_STATE';
var DECREMENT_TIMER = 'DECREMENT_TIMER';
var TOGGLE_ADJUST = 'TOGGLE_ADJUST';
var RESET_TIMER = 'RESET_TIMER';



var changeTimerPlayState = function (state) { return ({
  type: CHANGE_TIMER_PLAY_STATE,
  payload: {
    state: state
  }
}); };

var changeTimerType = function (timerType, value) { return ({
  type: CHANGE_TIMER_TYPE,
  payload: {
    value: value,
    type: timerType
  }
}); };

var toggleAdjust = function (name) { return ({
  type: TOGGLE_ADJUST,
  payload: {
    name: name
  }
}); };

var resetTimer = function (value) { return ({
  type: RESET_TIMER,
  payload: {
    value: value
  }
}); };

var timer = function (state, action) {
  if ( state === void 0 ) state = {};

  switch (action.type) {
    case DECREMENT_TIMER:
      return Object.assign({}, state,
        {value: (state.value > 0) ? state.value - 1 : 0})
    case CHANGE_TIMER_PLAY_STATE:
      return Object.assign({}, state,
        {playState: action.payload.state})
    case CHANGE_TIMER_TYPE:
      return {
        playState: 'running',
        type: action.payload.type,
        value: action.payload.value
      }
    case RESET_TIMER:
      return {
        playState: 'paused',
        type: state.type,
        value: action.payload.value
      }
    default:
      return state
  }
};

var adjusts = function (state, action) {
  if ( state === void 0 ) state = {};

  switch (action.type) {
    case TOGGLE_ADJUST:
      return (( obj = Object.assign({}, state), obj[action.payload.name] = !state[action.payload.name], obj ))
  var obj;
    default:
      return state
  }
};


var reducers = Object.freeze({
	timer: timer,
	adjusts: adjusts
});

var timerInitialState = {
  value: 1500,
  type: 'code',
  playState: 'running'
};

var adjustsInitialState = {
  notification: false,
  sound: false,
  vibration: false
};

var localStorage$1;
if (typeof window === 'undefined') {
  localStorage$1 = {};
} else {
  localStorage$1 = window.localStorage;
}

var store = createStore(
  combineReducers(reducers),
  {
    timer: timerInitialState,
    adjusts: loadState(localStorage$1).adjusts || adjustsInitialState
  }
);

var formatTime = function (seconds) {
  var m = Math.floor(seconds % 3600 / 60);
  var s = Math.floor(seconds % 3600 % 60);
  var timeFormated = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  return timeFormated
};

var capitalize = function (str) { return str[0].toUpperCase() + str.slice(1); };

var getTitle = function (state) { return ((formatTime(state.timer.value)) + " | Pomodoro Timer"); };

var isPaused = function (state) { return state.timer.playState === 'paused'; };

var getNextPlayState = function (state) { return isPaused(state) ? 'running' : 'paused'; };

var getNextPlayStateText = function (state) { return isPaused(state) ? 'play' : 'pause'; };

var sequentiallyGetTimerType = function (current, types, mode) { return types.reduce(function (acc, item, index, array) { return item.type === current ? mode(array, index) : acc; }, {}); };

var isFirstItem = function (index) { return index === 0; };

var getPreviousItem = function (array, index) {
  var previousIndex = isFirstItem(index) ?
    array.length - 1 :
    index - 1;
  return array[previousIndex]
};

var isLastItem = function (array, index) { return index === (array.length - 1); };

var getNextItem = function (array, index) {
  var nextIndex = isLastItem(array, index) ? 0 : index + 1;
  return array[nextIndex]
};

var TIMER_TYPES = [
  {
    type: 'code',
    value: 1500
  },
  {
    type: 'social',
    value: 900
  },
  {
    type: 'coffee',
    value: 300
  }
];

var getValueToResetTimer = function (current, timerTypes) {
  var currentTimer = timerTypes.filter(function (timer) { return timer.type === current; });
  return currentTimer.length ? currentTimer[0].value : 0
};

var cssVariables = {
  textColor: '#fafafa',
  textColorAccent: '#9575cd',
  textColorDark: '#bdbdbd',
  darkColor: '#212121',
  accentColor: '#69f0ae',
  brandColor: '#673ab7',
  brandColorLight: '#7e57c2',
  brandColorDark: '#512da8'
};

var keyboardShortcuts = function (store) { return function (e) {
  var state = store.getState();
  var shortcut = e.code;
  var ctrlKeyIsPressed = e.ctrlKey;

  if (shortcut === 'Space') {
    var actionCreator = index_4(getNextPlayState, changeTimerPlayState);
    var action = actionCreator(state);
    store.dispatch(action);
    return false
  }

  if (!ctrlKeyIsPressed) {
    return false
  }

  var currentTimerType = state.timer.type;

  if (shortcut === 'ArrowLeft') {
    var ref = sequentiallyGetTimerType(
      currentTimerType,
      TIMER_TYPES,
      getPreviousItem
    );
    var type = ref.type;
    var value = ref.value;
    store.dispatch(changeTimerType(type, value));
    return false
  }

  if (shortcut === 'ArrowRight') {
    var ref$1 = sequentiallyGetTimerType(
      currentTimerType,
      TIMER_TYPES,
      getNextItem
    );
    var type$1 = ref$1.type;
    var value$1 = ref$1.value;
    store.dispatch(changeTimerType(type$1, value$1));
    return false
  }
}; };

var empty = {};


var empty$1 = Object.freeze({
	default: empty
});

var minDoc = ( empty$1 && empty ) || empty$1;

var document_1 = createCommonjsModule(function (module) {
var topLevel = typeof commonjsGlobal !== 'undefined' ? commonjsGlobal :
    typeof window !== 'undefined' ? window : {};


if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}
});

var index$6 = attributeToProperty;

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
};

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr];
        delete attrs[attr];
      }
    }
    return h(tagName, attrs, children)
  }
}

var VAR = 0;
var TEXT = 1;
var OPEN = 2;
var CLOSE = 3;
var ATTR = 4;
var ATTR_KEY = 5;
var ATTR_KEY_W = 6;
var ATTR_VALUE_W = 7;
var ATTR_VALUE = 8;
var ATTR_VALUE_SQ = 9;
var ATTR_VALUE_DQ = 10;
var ATTR_EQ = 11;
var ATTR_BREAK = 12;

var index$4 = function (h, opts) {
  h = index$6(h);
  if (!opts) { opts = {}; }
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  };

  return function (strings) {
    var arguments$1 = arguments;

    var state = TEXT, reg = '';
    var arglen = arguments.length;
    var parts = [];

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments$1[i+1];
        var p = parse(strings[i]);
        var xstate = state;
        if (xstate === ATTR_VALUE_DQ) { xstate = ATTR_VALUE; }
        if (xstate === ATTR_VALUE_SQ) { xstate = ATTR_VALUE; }
        if (xstate === ATTR_VALUE_W) { xstate = ATTR_VALUE; }
        if (xstate === ATTR) { xstate = ATTR_KEY; }
        p.push([ VAR, xstate, arg ]);
        parts.push.apply(parts, p);
      } else { parts.push.apply(parts, parse(strings[i])); }
    }

    var tree = [null,{},[]];
    var stack = [[tree,-1]];
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0];
      var p = parts[i], s = p[0];
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1];
        if (stack.length > 1) {
          stack.pop();
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          );
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]];
        cur[2].push(c);
        stack.push([c,cur[2].length-1]);
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = '';
        var copyKey;
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1]);
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey];
                }
              }
            } else {
              key = concat(key, parts[i][2]);
            }
          } else { break }
        }
        if (parts[i][0] === ATTR_EQ) { i++; }
        var j = i;
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) { cur[1][key] = strfn(parts[i][1]); }
            else { cur[1][key] = concat(cur[1][key], parts[i][1]); }
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) { cur[1][key] = strfn(parts[i][2]); }
            else { cur[1][key] = concat(cur[1][key], parts[i][2]); }
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase();
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true;
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true;
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1];
          stack.pop();
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          );
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) { p[2] = ''; }
        else if (!p[2]) { p[2] = concat('', p[2]); }
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2]);
        } else {
          cur[2].push(p[2]);
        }
      } else if (s === TEXT) {
        cur[2].push(p[1]);
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift();
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2]);
    }
    return tree[2][0]

    function parse (str) {
      var res = [];
      if (state === ATTR_VALUE_W) { state = ATTR; }
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i);
        if (state === TEXT && c === '<') {
          if (reg.length) { res.push([TEXT, reg]); }
          reg = '';
          state = OPEN;
        } else if (c === '>' && !quot(state)) {
          if (state === OPEN) {
            res.push([OPEN,reg]);
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg]);
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg]);
          }
          res.push([CLOSE]);
          reg = '';
          state = TEXT;
        } else if (state === TEXT) {
          reg += c;
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg]);
          reg = '';
          state = ATTR;
        } else if (state === OPEN) {
          reg += c;
        } else if (state === ATTR && /[\w-]/.test(c)) {
          state = ATTR_KEY;
          reg = c;
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) { res.push([ATTR_KEY,reg]); }
          res.push([ATTR_BREAK]);
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg]);
          reg = '';
          state = ATTR_KEY_W;
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ]);
          reg = '';
          state = ATTR_VALUE_W;
        } else if (state === ATTR_KEY) {
          reg += c;
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ]);
          state = ATTR_VALUE_W;
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK]);
          if (/[\w-]/.test(c)) {
            reg += c;
            state = ATTR_KEY;
          } else { state = ATTR; }
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ;
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ;
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK]);
          reg = '';
          state = ATTR;
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK]);
          reg = '';
          state = ATTR;
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE;
          i--;
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK]);
          reg = '';
          state = ATTR;
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c;
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg]);
        reg = '';
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg]);
        reg = '';
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg]);
        reg = '';
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg]);
        reg = '';
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg]);
        reg = '';
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') { return x }
    else if (typeof x === 'string') { return x }
    else if (x && typeof x === 'object') { return x }
    else { return concat('', x) }
  }
};

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$');
function selfClosing (tag) { return closeRE.test(tag) }

var window_1 = createCommonjsModule(function (module) {
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof commonjsGlobal !== "undefined") {
    module.exports = commonjsGlobal;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}
});

var watch = Object.create(null);
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36);
var KEY_ATTR = 'data-' + KEY_ID;
var INDEX = 0;

if (window_1 && window_1.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) { return }
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff);
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff);
      eachMutation(mutations[i].addedNodes, turnon);
    }
  });
  observer.observe(document_1.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  });
}

var index$8 = function onload (el, on, off, caller) {
  on = on || function () {};
  off = off || function () {};
  el.setAttribute(KEY_ATTR, 'o' + INDEX);
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller];
  INDEX += 1;
  return el
};

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el);
    watch[index][2] = 1;
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el);
    watch[index][2] = 0;
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR);
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue];
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target);
  }
  if (watch[newValue]) {
    on(newValue, mutation.target);
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) { return false }
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR);
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i]);
        }
      });
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn);
    }
  }
}

var index$3 = createCommonjsModule(function (module) {
var SVGNS = 'http://www.w3.org/2000/svg';
var XLINKNS = 'http://www.w3.org/1999/xlink';

var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
};
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
];

function belCreateElement (tag, props, children) {
  var el;

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS;
  }

  // If we are using a namespace
  var ns = false;
  if (props.namespace) {
    ns = props.namespace;
    delete props.namespace;
  }

  // Create the element
  if (ns) {
    el = document_1.createElementNS(ns, tag);
  } else {
    el = document_1.createElement(tag);
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {};
    var unload = props.onunload || function () {};
    index$8(el, function belOnload () {
      load(el);
    }, function belOnunload () {
      unload(el);
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller);
    delete props.onload;
    delete props.onunload;
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase();
      var val = props[p];
      // Normalize className
      if (key === 'classname') {
        key = 'class';
        p = 'class';
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for';
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') { val = key; }
        else if (val === 'false') { continue }
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val;
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val);
          } else if (/^xmlns($|:)/i.test(p)) {
            // skip xmlns definitions
          } else {
            el.setAttributeNS(null, p, val);
          }
        } else {
          el.setAttribute(p, val);
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) { return }
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i];
      if (Array.isArray(node)) {
        appendChild(node);
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString();
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node;
          continue
        }
        node = document_1.createTextNode(node);
      }

      if (node && node.nodeType) {
        el.appendChild(node);
      }
    }
  }
  appendChild(children);

  return el
}

module.exports = index$4(belCreateElement);
module.exports.default = module.exports;
module.exports.createElement = belCreateElement;
});

var capitalizeString_1 = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = capitalizeString;
function capitalizeString(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
module.exports = exports["default"];
});

var prefixProperty_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prefixProperty;



var _capitalizeString2 = _interopRequireDefault(capitalizeString_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function prefixProperty(prefixProperties, property, style) {
  if (!prefixProperties.hasOwnProperty(property)) {
    return style;
  }

  // We need to preserve the order of the styles while inserting new prefixed
  // styles. Object order is not guaranteed, but this is better than nothing.
  // Note that this is brittle and is likely to break in older versions of
  // Node (e.g. Node 4).
  var newStyle = {};
  Object.keys(style).forEach(function (styleProperty) {
    if (styleProperty === property) {
      // We've found the style we need to prefix.
      var requiredPrefixes = prefixProperties[property];
      for (var i = 0, len = requiredPrefixes.length; i < len; ++i) {
        newStyle[requiredPrefixes[i] + (0, _capitalizeString2.default)(property)] = style[property];
      }
    }

    newStyle[styleProperty] = style[styleProperty];
  });

  return newStyle;
}
module.exports = exports['default'];
});

var prefixValue_1 = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prefixValue;
function prefixValue(plugins, property, value, style, metaData) {
  for (var i = 0, len = plugins.length; i < len; ++i) {
    var processedValue = plugins[i](property, value, style, metaData);

    // we can stop processing if a value is returned
    // as all plugin criteria are unique
    if (processedValue) {
      return processedValue;
    }
  }
}
module.exports = exports["default"];
});

var addNewValuesOnly_1 = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addNewValuesOnly;
function addIfNew(list, value) {
  if (list.indexOf(value) === -1) {
    list.push(value);
  }
}

function addNewValuesOnly(list, values) {
  if (Array.isArray(values)) {
    for (var i = 0, len = values.length; i < len; ++i) {
      addIfNew(list, values[i]);
    }
  } else {
    addIfNew(list, values);
  }
}
module.exports = exports["default"];
});

var isObject_1 = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isObject;
function isObject(value) {
  return value instanceof Object && !Array.isArray(value);
}
module.exports = exports["default"];
});

var createPrefixer_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createPrefixer;



var _prefixProperty2 = _interopRequireDefault(prefixProperty_1);



var _prefixValue2 = _interopRequireDefault(prefixValue_1);



var _addNewValuesOnly2 = _interopRequireDefault(addNewValuesOnly_1);



var _isObject2 = _interopRequireDefault(isObject_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createPrefixer(_ref) {
  var prefixMap = _ref.prefixMap,
      plugins = _ref.plugins;

  function prefixAll(style) {
    for (var property in style) {
      var value = style[property];

      // handle nested objects
      if ((0, _isObject2.default)(value)) {
        style[property] = prefixAll(value);
        // handle array values
      } else if (Array.isArray(value)) {
        var combinedValue = [];

        for (var i = 0, len = value.length; i < len; ++i) {
          var processedValue = (0, _prefixValue2.default)(plugins, property, value[i], style, prefixMap);
          (0, _addNewValuesOnly2.default)(combinedValue, processedValue || value[i]);
        }

        // only modify the value if it was touched
        // by any plugin to prevent unnecessary mutations
        if (combinedValue.length > 0) {
          style[property] = combinedValue;
        }
      } else {
        var _processedValue = (0, _prefixValue2.default)(plugins, property, value, style, prefixMap);

        // only modify the value if it was touched
        // by any plugin to prevent unnecessary mutations
        if (_processedValue) {
          style[property] = _processedValue;
        }

        style = (0, _prefixProperty2.default)(prefixMap, property, style);
      }
    }

    return style;
  }

  return prefixAll;
}
module.exports = exports['default'];
});

var isPrefixedValue_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isPrefixedValue;

var regex = /-webkit-|-moz-|-ms-/;

function isPrefixedValue(value) {
  return typeof value === 'string' && regex.test(value);
}
module.exports = exports['default'];
});

var calc_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = calc;



var _isPrefixedValue2 = _interopRequireDefault(isPrefixedValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var prefixes = ['-webkit-', '-moz-', ''];
function calc(property, value) {
  if (typeof value === 'string' && !(0, _isPrefixedValue2.default)(value) && value.indexOf('calc(') > -1) {
    return prefixes.map(function (prefix) {
      return value.replace(/calc\(/g, prefix + 'calc(');
    });
  }
}
module.exports = exports['default'];
});

var crossFade_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = crossFade;



var _isPrefixedValue2 = _interopRequireDefault(isPrefixedValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// http://caniuse.com/#search=cross-fade
var prefixes = ['-webkit-', ''];
function crossFade(property, value) {
  if (typeof value === 'string' && !(0, _isPrefixedValue2.default)(value) && value.indexOf('cross-fade(') > -1) {
    return prefixes.map(function (prefix) {
      return value.replace(/cross-fade\(/g, prefix + 'cross-fade(');
    });
  }
}
module.exports = exports['default'];
});

var cursor_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cursor;
var prefixes = ['-webkit-', '-moz-', ''];

var values = {
  'zoom-in': true,
  'zoom-out': true,
  grab: true,
  grabbing: true
};

function cursor(property, value) {
  if (property === 'cursor' && values.hasOwnProperty(value)) {
    return prefixes.map(function (prefix) {
      return prefix + value;
    });
  }
}
module.exports = exports['default'];
});

var filter_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = filter;



var _isPrefixedValue2 = _interopRequireDefault(isPrefixedValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// http://caniuse.com/#feat=css-filter-function
var prefixes = ['-webkit-', ''];
function filter(property, value) {
  if (typeof value === 'string' && !(0, _isPrefixedValue2.default)(value) && value.indexOf('filter(') > -1) {
    return prefixes.map(function (prefix) {
      return value.replace(/filter\(/g, prefix + 'filter(');
    });
  }
}
module.exports = exports['default'];
});

var flex_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = flex;
var values = {
  flex: true,
  'inline-flex': true
};

function flex(property, value) {
  if (property === 'display' && values.hasOwnProperty(value)) {
    return ['-webkit-box', '-moz-box', '-ms-' + value + 'box', '-webkit-' + value, value];
  }
}
module.exports = exports['default'];
});

var flexboxIE_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = flexboxIE;
var alternativeValues = {
  'space-around': 'distribute',
  'space-between': 'justify',
  'flex-start': 'start',
  'flex-end': 'end'
};
var alternativeProps = {
  alignContent: 'msFlexLinePack',
  alignSelf: 'msFlexItemAlign',
  alignItems: 'msFlexAlign',
  justifyContent: 'msFlexPack',
  order: 'msFlexOrder',
  flexGrow: 'msFlexPositive',
  flexShrink: 'msFlexNegative',
  flexBasis: 'msPreferredSize'
};

function flexboxIE(property, value, style) {
  if (alternativeProps.hasOwnProperty(property)) {
    style[alternativeProps[property]] = alternativeValues[value] || value;
  }
}
module.exports = exports['default'];
});

var flexboxOld_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = flexboxOld;
var alternativeValues = {
  'space-around': 'justify',
  'space-between': 'justify',
  'flex-start': 'start',
  'flex-end': 'end',
  'wrap-reverse': 'multiple',
  wrap: 'multiple'
};

var alternativeProps = {
  alignItems: 'WebkitBoxAlign',
  justifyContent: 'WebkitBoxPack',
  flexWrap: 'WebkitBoxLines'
};

function flexboxOld(property, value, style) {
  if (property === 'flexDirection' && typeof value === 'string') {
    if (value.indexOf('column') > -1) {
      style.WebkitBoxOrient = 'vertical';
    } else {
      style.WebkitBoxOrient = 'horizontal';
    }
    if (value.indexOf('reverse') > -1) {
      style.WebkitBoxDirection = 'reverse';
    } else {
      style.WebkitBoxDirection = 'normal';
    }
  }
  if (alternativeProps.hasOwnProperty(property)) {
    style[alternativeProps[property]] = alternativeValues[value] || value;
  }
}
module.exports = exports['default'];
});

var gradient_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = gradient;



var _isPrefixedValue2 = _interopRequireDefault(isPrefixedValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var prefixes = ['-webkit-', '-moz-', ''];

var values = /linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient/;

function gradient(property, value) {
  if (typeof value === 'string' && !(0, _isPrefixedValue2.default)(value) && values.test(value)) {
    return prefixes.map(function (prefix) {
      return prefix + value;
    });
  }
}
module.exports = exports['default'];
});

var imageSet_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = imageSet;



var _isPrefixedValue2 = _interopRequireDefault(isPrefixedValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// http://caniuse.com/#feat=css-image-set
var prefixes = ['-webkit-', ''];
function imageSet(property, value) {
  if (typeof value === 'string' && !(0, _isPrefixedValue2.default)(value) && value.indexOf('image-set(') > -1) {
    return prefixes.map(function (prefix) {
      return value.replace(/image-set\(/g, prefix + 'image-set(');
    });
  }
}
module.exports = exports['default'];
});

var position_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = position;
function position(property, value) {
  if (property === 'position' && value === 'sticky') {
    return ['-webkit-sticky', 'sticky'];
  }
}
module.exports = exports['default'];
});

var sizing_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sizing;
var prefixes = ['-webkit-', '-moz-', ''];

var properties = {
  maxHeight: true,
  maxWidth: true,
  width: true,
  height: true,
  columnWidth: true,
  minWidth: true,
  minHeight: true
};
var values = {
  'min-content': true,
  'max-content': true,
  'fill-available': true,
  'fit-content': true,
  'contain-floats': true
};

function sizing(property, value) {
  if (properties.hasOwnProperty(property) && values.hasOwnProperty(value)) {
    return prefixes.map(function (prefix) {
      return prefix + value;
    });
  }
}
module.exports = exports['default'];
});

var uppercasePattern = /[A-Z]/g;
var msPattern = /^ms-/;
var cache = {};

function hyphenateStyleName(string) {
    return string in cache
    ? cache[string]
    : cache[string] = string
      .replace(uppercasePattern, '-$&')
      .toLowerCase()
      .replace(msPattern, '-ms-');
}

var index$10 = hyphenateStyleName;

var hyphenateProperty_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = hyphenateProperty;



var _hyphenateStyleName2 = _interopRequireDefault(index$10);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function hyphenateProperty(property) {
  return (0, _hyphenateStyleName2.default)(property);
}
module.exports = exports['default'];
});

var transition_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = transition;



var _hyphenateProperty2 = _interopRequireDefault(hyphenateProperty_1);



var _isPrefixedValue2 = _interopRequireDefault(isPrefixedValue_1);



var _capitalizeString2 = _interopRequireDefault(capitalizeString_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var properties = {
  transition: true,
  transitionProperty: true,
  WebkitTransition: true,
  WebkitTransitionProperty: true,
  MozTransition: true,
  MozTransitionProperty: true
};


var prefixMapping = {
  Webkit: '-webkit-',
  Moz: '-moz-',
  ms: '-ms-'
};

function prefixValue(value, propertyPrefixMap) {
  if ((0, _isPrefixedValue2.default)(value)) {
    return value;
  }

  // only split multi values, not cubic beziers
  var multipleValues = value.split(/,(?![^()]*(?:\([^()]*\))?\))/g);

  for (var i = 0, len = multipleValues.length; i < len; ++i) {
    var singleValue = multipleValues[i];
    var values = [singleValue];
    for (var property in propertyPrefixMap) {
      var dashCaseProperty = (0, _hyphenateProperty2.default)(property);

      if (singleValue.indexOf(dashCaseProperty) > -1 && dashCaseProperty !== 'order') {
        var prefixes = propertyPrefixMap[property];
        for (var j = 0, pLen = prefixes.length; j < pLen; ++j) {
          // join all prefixes and create a new value
          values.unshift(singleValue.replace(dashCaseProperty, prefixMapping[prefixes[j]] + dashCaseProperty));
        }
      }
    }

    multipleValues[i] = values.join(',');
  }

  return multipleValues.join(',');
}

function transition(property, value, style, propertyPrefixMap) {
  // also check for already prefixed transitions
  if (typeof value === 'string' && properties.hasOwnProperty(property)) {
    var outputValue = prefixValue(value, propertyPrefixMap);
    // if the property is already prefixed
    var webkitOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function (val) {
      return !/-moz-|-ms-/.test(val);
    }).join(',');

    if (property.indexOf('Webkit') > -1) {
      return webkitOutput;
    }

    var mozOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function (val) {
      return !/-webkit-|-ms-/.test(val);
    }).join(',');

    if (property.indexOf('Moz') > -1) {
      return mozOutput;
    }

    style['Webkit' + (0, _capitalizeString2.default)(property)] = webkitOutput;
    style['Moz' + (0, _capitalizeString2.default)(property)] = mozOutput;
    return outputValue;
  }
}
module.exports = exports['default'];
});

var staticPrefixData =  {
  plugins: [calc_1,crossFade_1,cursor_1,filter_1,flex_1,flexboxIE_1,flexboxOld_1,gradient_1,imageSet_1,position_1,sizing_1,transition_1],
  prefixMap: {"transform":["Webkit","ms"],"transformOrigin":["Webkit","ms"],"transformOriginX":["Webkit","ms"],"transformOriginY":["Webkit","ms"],"backfaceVisibility":["Webkit"],"perspective":["Webkit"],"perspectiveOrigin":["Webkit"],"transformStyle":["Webkit"],"transformOriginZ":["Webkit"],"animation":["Webkit"],"animationDelay":["Webkit"],"animationDirection":["Webkit"],"animationFillMode":["Webkit"],"animationDuration":["Webkit"],"animationIterationCount":["Webkit"],"animationName":["Webkit"],"animationPlayState":["Webkit"],"animationTimingFunction":["Webkit"],"appearance":["Webkit","Moz"],"userSelect":["Webkit","Moz","ms"],"fontKerning":["Webkit"],"textEmphasisPosition":["Webkit"],"textEmphasis":["Webkit"],"textEmphasisStyle":["Webkit"],"textEmphasisColor":["Webkit"],"boxDecorationBreak":["Webkit"],"clipPath":["Webkit"],"maskImage":["Webkit"],"maskMode":["Webkit"],"maskRepeat":["Webkit"],"maskPosition":["Webkit"],"maskClip":["Webkit"],"maskOrigin":["Webkit"],"maskSize":["Webkit"],"maskComposite":["Webkit"],"mask":["Webkit"],"maskBorderSource":["Webkit"],"maskBorderMode":["Webkit"],"maskBorderSlice":["Webkit"],"maskBorderWidth":["Webkit"],"maskBorderOutset":["Webkit"],"maskBorderRepeat":["Webkit"],"maskBorder":["Webkit"],"maskType":["Webkit"],"textDecorationStyle":["Webkit","Moz"],"textDecorationSkip":["Webkit","Moz"],"textDecorationLine":["Webkit","Moz"],"textDecorationColor":["Webkit","Moz"],"filter":["Webkit"],"fontFeatureSettings":["Webkit","Moz"],"breakAfter":["Webkit","Moz","ms"],"breakBefore":["Webkit","Moz","ms"],"breakInside":["Webkit","Moz","ms"],"columnCount":["Webkit","Moz"],"columnFill":["Webkit","Moz"],"columnGap":["Webkit","Moz"],"columnRule":["Webkit","Moz"],"columnRuleColor":["Webkit","Moz"],"columnRuleStyle":["Webkit","Moz"],"columnRuleWidth":["Webkit","Moz"],"columns":["Webkit","Moz"],"columnSpan":["Webkit","Moz"],"columnWidth":["Webkit","Moz"],"flex":["Webkit","ms"],"flexBasis":["Webkit"],"flexDirection":["Webkit","ms"],"flexGrow":["Webkit"],"flexFlow":["Webkit","ms"],"flexShrink":["Webkit"],"flexWrap":["Webkit","ms"],"alignContent":["Webkit"],"alignItems":["Webkit"],"alignSelf":["Webkit"],"justifyContent":["Webkit"],"order":["Webkit"],"transitionDelay":["Webkit"],"transitionDuration":["Webkit"],"transitionProperty":["Webkit"],"transitionTimingFunction":["Webkit"],"backdropFilter":["Webkit"],"scrollSnapType":["Webkit","ms"],"scrollSnapPointsX":["Webkit","ms"],"scrollSnapPointsY":["Webkit","ms"],"scrollSnapDestination":["Webkit","ms"],"scrollSnapCoordinate":["Webkit","ms"],"shapeImageThreshold":["Webkit"],"shapeImageMargin":["Webkit"],"shapeImageOutside":["Webkit"],"hyphens":["Webkit","Moz","ms"],"flowInto":["Webkit","ms"],"flowFrom":["Webkit","ms"],"regionFragment":["Webkit","ms"],"boxSizing":["Moz"],"textAlignLast":["Moz"],"tabSize":["Moz"],"wrapFlow":["ms"],"wrapThrough":["ms"],"wrapMargin":["ms"],"touchAction":["ms"],"gridTemplateColumns":["ms"],"gridTemplateRows":["ms"],"gridTemplateAreas":["ms"],"gridTemplate":["ms"],"gridAutoColumns":["ms"],"gridAutoRows":["ms"],"gridAutoFlow":["ms"],"grid":["ms"],"gridRowStart":["ms"],"gridColumnStart":["ms"],"gridRowEnd":["ms"],"gridRow":["ms"],"gridColumn":["ms"],"gridColumnEnd":["ms"],"gridColumnGap":["ms"],"gridRowGap":["ms"],"gridArea":["ms"],"gridGap":["ms"],"textSizeAdjust":["Webkit","ms"],"borderImage":["Webkit"],"borderImageOutset":["Webkit"],"borderImageRepeat":["Webkit"],"borderImageSlice":["Webkit"],"borderImageSource":["Webkit"],"borderImageWidth":["Webkit"]}
};

var orderedElements = createCommonjsModule(function (module, exports) {
/* global Map */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) {
var arguments$1 = arguments;
 for (var i = 1; i < arguments.length; i++) { var source = arguments$1[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) { descriptor.writable = true; } Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) { defineProperties(Constructor.prototype, protoProps); } if (staticProps) { defineProperties(Constructor, staticProps); } return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OrderedElements = (function () {
    /* ::
    elements: {[string]: any};
    keyOrder: string[];
     static fromObject: ({[string]: any}) => OrderedElements;
    static fromMap: (Map<string,any>) => OrderedElements;
    static from: (Map<string,any> | {[string]: any} | OrderedElements) =>
        OrderedElements;
    */

    function OrderedElements() {
        var elements /* : {[string]: any} */ = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
        var keyOrder /* : string[] */ = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

        _classCallCheck(this, OrderedElements);

        this.elements = elements;
        this.keyOrder = keyOrder;
    }

    _createClass(OrderedElements, [{
        key: "forEach",
        value: function forEach(callback /* : (string, any) => void */) {
            var this$1 = this;

            for (var i = 0; i < this.keyOrder.length; i++) {
                callback(this$1.keyOrder[i], this$1.elements[this$1.keyOrder[i]]);
            }
        }
    }, {
        key: "map",
        value: function map(callback /* : (string, any) => any */) /* : OrderedElements */{
            var this$1 = this;

            var results = new OrderedElements();
            for (var i = 0; i < this.keyOrder.length; i++) {
                results.set(this$1.keyOrder[i], callback(this$1.keyOrder[i], this$1.elements[this$1.keyOrder[i]]));
            }
            return results;
        }
    }, {
        key: "set",
        value: function set(key, /* : string */value /* : any */) {
            if (!this.elements.hasOwnProperty(key)) {
                this.keyOrder.push(key);
            }
            this.elements[key] = value;
        }
    }, {
        key: "get",
        value: function get(key /* : string */) /* : any */{
            return this.elements[key];
        }
    }, {
        key: "has",
        value: function has(key /* : string */) /* : boolean */{
            return this.elements.hasOwnProperty(key);
        }
    }]);

    return OrderedElements;
})();

exports["default"] = OrderedElements;

OrderedElements.fromObject = function (obj) {
    return new OrderedElements(obj, Object.keys(obj));
};

OrderedElements.fromMap = function (map) {
    var ret = new OrderedElements();
    map.forEach(function (val, key) {
        ret.set(key, val);
    });
    return ret;
};

OrderedElements.from = function (obj) {
    if (obj instanceof OrderedElements) {
        // NOTE(emily): This makes a shallow copy of the previous elements, so
        // if the elements are deeply modified it will affect all copies.
        return new OrderedElements(_extends({}, obj.elements), obj.keyOrder.slice());
    } else if (
    // For some reason, flow complains about a plain
    // `typeof Map !== "undefined"` check. Casting `Map` to `any` solves
    // the problem.
    typeof /*::(*/Map /*: any)*/ !== "undefined" && obj instanceof Map) {
        return OrderedElements.fromMap(obj);
    } else {
        return OrderedElements.fromObject(obj);
    }
};
module.exports = exports["default"];
});

function hash(str) {
  var hash = 5381,
      i    = str.length;

  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
}

var index$12 = hash;

var util = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) { break; } } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) { _i['return'](); } } finally { if (_d) { throw _e; } } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



var _stringHash2 = _interopRequireDefault(index$12);



var _orderedElements2 = _interopRequireDefault(orderedElements);

/* ::
type Pair = [ string, any ];
type Pairs = Pair[];
type PairsMapper = (pair: Pair) => Pair;
type ObjectMap = { [id:string]: any };
*/

// {K1: V1, K2: V2, ...} -> [[K1, V1], [K2, V2]]
var objectToPairs = function objectToPairs(obj /* : ObjectMap */) {
    return (/* : Pairs */Object.keys(obj).map(function (key) {
            return [key, obj[key]];
        })
    );
};

exports.objectToPairs = objectToPairs;
var mapObj = function mapObj(obj, /* : ObjectMap */
fn /* : PairsMapper */
) /* : ObjectMap */{
    var keys = Object.keys(obj);
    var mappedObj = {};
    for (var i = 0; i < keys.length; i += 1) {
        var _fn = fn([keys[i], obj[keys[i]]]);

        var _fn2 = _slicedToArray(_fn, 2);

        var newKey = _fn2[0];
        var newValue = _fn2[1];

        mappedObj[newKey] = newValue;
    }
    return mappedObj;
};

exports.mapObj = mapObj;
// Flattens an array one level
// [[A], [B, C, [D]]] -> [A, B, C, [D]]
var flatten = function flatten(list /* : any[] */) {
    return (/* : any[] */list.reduce(function (memo, x) {
            return memo.concat(x);
        }, [])
    );
};

exports.flatten = flatten;
var flattenDeep = function flattenDeep(list /* : any[] */) {
    return (/* : any[] */list.reduce(function (memo, x) {
            return memo.concat(Array.isArray(x) ? flattenDeep(x) : x);
        }, [])
    );
};

exports.flattenDeep = flattenDeep;
var UPPERCASE_RE = /([A-Z])/g;
var UPPERCASE_RE_TO_KEBAB = function UPPERCASE_RE_TO_KEBAB(match /* : string */) {
    return (/* : string */'-' + match.toLowerCase()
    );
};

var kebabifyStyleName = function kebabifyStyleName(string /* : string */) /* : string */{
    var result = string.replace(UPPERCASE_RE, UPPERCASE_RE_TO_KEBAB);
    if (result[0] === 'm' && result[1] === 's' && result[2] === '-') {
        return '-' + result;
    }
    return result;
};

exports.kebabifyStyleName = kebabifyStyleName;
var isPlainObject = function isPlainObject(x /* : ObjectMap | any */
) {
    return (/* : boolean */typeof x === 'object' && !Array.isArray(x) && x !== null
    );
};

var recursiveMerge = function recursiveMerge(a, /* : OrderedElements | ObjectMap | Map<string,any> | any */
b /* : ObjectMap | Map<string,any> */
) /* : OrderedElements | any */{
    // TODO(jlfwong): Handle malformed input where a and b are not the same
    // type.

    if (!isPlainObject(a) || !isPlainObject(b)) {
        if (isPlainObject(b)) {
            return _orderedElements2['default'].from(b);
        } else {
            return b;
        }
    }

    var ret = _orderedElements2['default'].from(a);
    var right = _orderedElements2['default'].from(b);

    right.forEach(function (key, val) {
        if (ret.has(key)) {
            ret.set(key, recursiveMerge(ret.get(key), val));
        } else {
            ret.set(key, val);
        }
    });

    return ret;
};

exports.recursiveMerge = recursiveMerge;
/**
 * CSS properties which accept numbers but are not in units of "px".
 * Taken from React's CSSProperty.js
 */
var isUnitlessNumber = {
    animationIterationCount: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridRow: true,
    gridColumn: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,

    // SVG-related properties
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true
};

/**
 * Taken from React's CSSProperty.js
 *
 * @param {string} prefix vendor-specific prefix, eg: Webkit
 * @param {string} key style name, eg: transitionDuration
 * @return {string} style name prefixed with `prefix`, properly camelCased, eg:
 * WebkitTransitionDuration
 */
function prefixKey(prefix, key) {
    return prefix + key.charAt(0).toUpperCase() + key.substring(1);
}

/**
 * Support style names that may come passed in prefixed by adding permutations
 * of vendor prefixes.
 * Taken from React's CSSProperty.js
 */
var prefixes = ['Webkit', 'ms', 'Moz', 'O'];

// Using Object.keys here, or else the vanilla for-in loop makes IE8 go into an
// infinite loop, because it iterates over the newly added props too.
// Taken from React's CSSProperty.js
Object.keys(isUnitlessNumber).forEach(function (prop) {
    prefixes.forEach(function (prefix) {
        isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop];
    });
});

var stringifyValue = function stringifyValue(key, /* : string */
prop /* : any */
) /* : string */{
    if (typeof prop === "number") {
        if (isUnitlessNumber[key]) {
            return "" + prop;
        } else {
            return prop + "px";
        }
    } else {
        return '' + prop;
    }
};

exports.stringifyValue = stringifyValue;
// Hash a javascript object using JSON.stringify. This is very fast, about 3
// microseconds on my computer for a sample object:
// http://jsperf.com/test-hashfnv32a-hash/5
//
// Note that this uses JSON.stringify to stringify the objects so in order for
// this to produce consistent hashes browsers need to have a consistent
// ordering of objects. Ben Alpert says that Facebook depends on this, so we
// can probably depend on this too.
var hashObject = function hashObject(object /* : ObjectMap */) {
    return (/* : string */(0, _stringHash2['default'])(JSON.stringify(object)).toString(36)
    );
};

exports.hashObject = hashObject;
// Given a single style value string like the "b" from "a: b;", adds !important
// to generate "b !important".
var importantify = function importantify(string /* : string */) {
    return (/* : string */
        // Bracket string character access is very fast, and in the default case we
        // normally don't expect there to be "!important" at the end of the string
        // so we can use this simple check to take an optimized path. If there
        // happens to be a "!" in this position, we follow up with a more thorough
        // check.
        string[string.length - 10] === '!' && string.slice(-11) === ' !important' ? string : string + ' !important'
    );
};
exports.importantify = importantify;
});

var generate = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) { break; } } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) { _i['return'](); } } finally { if (_d) { throw _e; } } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _extends = Object.assign || function (target) {
var arguments$1 = arguments;
 for (var i = 1; i < arguments.length; i++) { var source = arguments$1[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



var _inlineStylePrefixerStaticCreatePrefixer2 = _interopRequireDefault(createPrefixer_1);



var _libStaticPrefixData2 = _interopRequireDefault(staticPrefixData);



var _orderedElements2 = _interopRequireDefault(orderedElements);



var prefixAll = (0, _inlineStylePrefixerStaticCreatePrefixer2['default'])(_libStaticPrefixData2['default']);

/* ::
import type { SheetDefinition } from './index.js';
type StringHandlers = { [id:string]: Function };
type SelectorCallback = (selector: string) => any;
export type SelectorHandler = (
    selector: string,
    baseSelector: string,
    callback: SelectorCallback
) => string | null;
*/

/**
 * `selectorHandlers` are functions which handle special selectors which act
 * differently than normal style definitions. These functions look at the
 * current selector and can generate CSS for the styles in their subtree by
 * calling the callback with a new selector.
 *
 * For example, when generating styles with a base selector of '.foo' and the
 * following styles object:
 *
 *   {
 *     ':nth-child(2n)': {
 *       ':hover': {
 *         color: 'red'
 *       }
 *     }
 *   }
 *
 * when we reach the ':hover' style, we would call our selector handlers like
 *
 *   handler(':hover', '.foo:nth-child(2n)', callback)
 *
 * Since our `pseudoSelectors` handles ':hover' styles, that handler would call
 * the callback like
 *
 *   callback('.foo:nth-child(2n):hover')
 *
 * to generate its subtree `{ color: 'red' }` styles with a
 * '.foo:nth-child(2n):hover' selector. The callback would return CSS like
 *
 *   '.foo:nth-child(2n):hover{color:red !important;}'
 *
 * and the handler would then return that resulting CSS.
 *
 * `defaultSelectorHandlers` is the list of default handlers used in a call to
 * `generateCSS`.
 *
 * @name SelectorHandler
 * @function
 * @param {string} selector: The currently inspected selector. ':hover' in the
 *     example above.
 * @param {string} baseSelector: The selector of the parent styles.
 *     '.foo:nth-child(2n)' in the example above.
 * @param {function} generateSubtreeStyles: A function which can be called to
 *     generate CSS for the subtree of styles corresponding to the selector.
 *     Accepts a new baseSelector to use for generating those styles.
 * @returns {?string} The generated CSS for this selector, or null if we don't
 *     handle this selector.
 */
var defaultSelectorHandlers = [
// Handle pseudo-selectors, like :hover and :nth-child(3n)
function pseudoSelectors(selector, /* : string */
baseSelector, /* : string */
generateSubtreeStyles /* : Function */
) /* */{
    if (selector[0] !== ":") {
        return null;
    }
    return generateSubtreeStyles(baseSelector + selector);
},

// Handle media queries (or font-faces)
function mediaQueries(selector, /* : string */
baseSelector, /* : string */
generateSubtreeStyles /* : Function */
) /* */{
    if (selector[0] !== "@") {
        return null;
    }
    // Generate the styles normally, and then wrap them in the media query.
    var generated = generateSubtreeStyles(baseSelector);
    return selector + '{' + generated + '}';
}];

exports.defaultSelectorHandlers = defaultSelectorHandlers;
/**
 * Generate CSS for a selector and some styles.
 *
 * This function handles the media queries and pseudo selectors that can be used
 * in aphrodite styles.
 *
 * @param {string} selector: A base CSS selector for the styles to be generated
 *     with.
 * @param {Object} styleTypes: A list of properties of the return type of
 *     StyleSheet.create, e.g. [styles.red, styles.blue].
 * @param {Array.<SelectorHandler>} selectorHandlers: A list of selector
 *     handlers to use for handling special selectors. See
 *     `defaultSelectorHandlers`.
 * @param stringHandlers: See `generateCSSRuleset`
 * @param useImportant: See `generateCSSRuleset`
 *
 * To actually generate the CSS special-construct-less styles are passed to
 * `generateCSSRuleset`.
 *
 * For instance, a call to
 *
 *     generateCSS(".foo", [{
 *       color: "red",
 *       "@media screen": {
 *         height: 20,
 *         ":hover": {
 *           backgroundColor: "black"
 *         }
 *       },
 *       ":active": {
 *         fontWeight: "bold"
 *       }
 *     }], defaultSelectorHandlers);
 *
 * with the default `selectorHandlers` will make 5 calls to
 * `generateCSSRuleset`:
 *
 *     generateCSSRuleset(".foo", { color: "red" }, ...)
 *     generateCSSRuleset(".foo:active", { fontWeight: "bold" }, ...)
 *     // These 2 will be wrapped in @media screen {}
 *     generateCSSRuleset(".foo", { height: 20 }, ...)
 *     generateCSSRuleset(".foo:hover", { backgroundColor: "black" }, ...)
 */
var generateCSS = function generateCSS(selector, /* : string */
styleTypes, /* : SheetDefinition[] */
selectorHandlers, /* : SelectorHandler[] */
stringHandlers, /* : StringHandlers */
useImportant /* : boolean */
) /* : string */{
    var merged /* : OrderedElements */ = styleTypes.reduce(util.recursiveMerge, new _orderedElements2['default']());

    var plainDeclarations = new _orderedElements2['default']();
    var generatedStyles = "";

    // TODO(emily): benchmark this to see if a plain for loop would be faster.
    merged.forEach(function (key, val) {
        // For each key, see if one of the selector handlers will handle these
        // styles.
        var foundHandler = selectorHandlers.some(function (handler) {
            var result = handler(key, selector, function (newSelector) {
                return generateCSS(newSelector, [val], selectorHandlers, stringHandlers, useImportant);
            });
            if (result != null) {
                // If the handler returned something, add it to the generated
                // CSS and stop looking for another handler.
                generatedStyles += result;
                return true;
            }
        });
        // If none of the handlers handled it, add it to the list of plain
        // style declarations.
        if (!foundHandler) {
            plainDeclarations.set(key, val);
        }
    });

    return generateCSSRuleset(selector, plainDeclarations, stringHandlers, useImportant, selectorHandlers) + generatedStyles;
};

exports.generateCSS = generateCSS;
/**
 * Helper method of generateCSSRuleset to facilitate custom handling of certain
 * CSS properties. Used for e.g. font families.
 *
 * See generateCSSRuleset for usage and documentation of paramater types.
 */
var runStringHandlers = function runStringHandlers(declarations, /* : OrderedElements */
stringHandlers, /* : StringHandlers */
selectorHandlers /* : SelectorHandler[] */
) /* */{
    var hasStringHandlers = !!stringHandlers;
    return declarations.map(function (key, val) {
        // If a handler exists for this particular key, let it interpret
        // that value first before continuing
        if (hasStringHandlers && stringHandlers.hasOwnProperty(key)) {
            // TODO(emily): Pass in a callback which generates CSS, similar to
            // how our selector handlers work, instead of passing in
            // `selectorHandlers` and have them make calls to `generateCSS`
            // themselves. Right now, this is impractical because our string
            // handlers are very specialized and do complex things.
            return stringHandlers[key](val, selectorHandlers);
        } else {
            return val;
        }
    });
};

/**
 * Generate a CSS ruleset with the selector and containing the declarations.
 *
 * This function assumes that the given declarations don't contain any special
 * children (such as media queries, pseudo-selectors, or descendant styles).
 *
 * Note that this method does not deal with nesting used for e.g.
 * psuedo-selectors or media queries. That responsibility is left to  the
 * `generateCSS` function.
 *
 * @param {string} selector: the selector associated with the ruleset
 * @param {Object} declarations: a map from camelCased CSS property name to CSS
 *     property value.
 * @param {Object.<string, function>} stringHandlers: a map from camelCased CSS
 *     property name to a function which will map the given value to the value
 *     that is output.
 * @param {bool} useImportant: A boolean saying whether to append "!important"
 *     to each of the CSS declarations.
 * @returns {string} A string of raw CSS.
 *
 * Examples:
 *
 *    generateCSSRuleset(".blah", { color: "red" })
 *    -> ".blah{color: red !important;}"
 *    generateCSSRuleset(".blah", { color: "red" }, {}, false)
 *    -> ".blah{color: red}"
 *    generateCSSRuleset(".blah", { color: "red" }, {color: c => c.toUpperCase})
 *    -> ".blah{color: RED}"
 *    generateCSSRuleset(".blah:hover", { color: "red" })
 *    -> ".blah:hover{color: red}"
 */
var generateCSSRuleset = function generateCSSRuleset(selector, /* : string */
declarations, /* : OrderedElements */
stringHandlers, /* : StringHandlers */
useImportant, /* : boolean */
selectorHandlers /* : SelectorHandler[] */
) /* : string */{
    var handledDeclarations /* : OrderedElements */ = runStringHandlers(declarations, stringHandlers, selectorHandlers);

    var originalElements = _extends({}, handledDeclarations.elements);

    // NOTE(emily): This mutates handledDeclarations.elements.
    var prefixedDeclarations = prefixAll(handledDeclarations.elements);

    var prefixedRules = (0, util.flatten)((0, util.objectToPairs)(prefixedDeclarations).map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var key = _ref2[0];
        var value = _ref2[1];

        if (Array.isArray(value)) {
            // inline-style-prefixer returns an array when there should be
            // multiple rules for the same key. Here we flatten to multiple
            // pairs with the same key.
            return value.map(function (v) {
                return [key, v];
            });
        }
        return [[key, value]];
    }));

    // Calculate the order that we want to each element in `prefixedRules` to
    // be in, based on its index in the original key ordering.
    var sortOrder = {};
    for (var i = 0; i < handledDeclarations.keyOrder.length; i++) {
        var key = handledDeclarations.keyOrder[i];
        sortOrder[key] = i;

        // In order to keep most prefixed versions of keys in about the same
        // order that the original keys were in but placed before the
        // unprefixed version, we generate the prefixed forms of the keys and
        // set their order to the same as the original key minus a little bit.
        var capitalizedKey = '' + key[0].toUpperCase() + key.slice(1);
        var prefixedKeys = ['Webkit' + capitalizedKey, 'Moz' + capitalizedKey, 'ms' + capitalizedKey];
        for (var j = 0; j < prefixedKeys.length; ++j) {
            if (!originalElements.hasOwnProperty(prefixedKeys[j])) {
                sortOrder[prefixedKeys[j]] = i - 0.5;
                originalElements[prefixedKeys[j]] = originalElements[key];
            }
        }
    }

    // Calculate the sort order of a given property.
    function sortOrderForProperty(_ref3) {
        var _ref32 = _slicedToArray(_ref3, 2);

        var key = _ref32[0];
        var value = _ref32[1];

        if (sortOrder.hasOwnProperty(key)) {
            if (originalElements.hasOwnProperty(key) && originalElements[key] !== value) {
                // The value is prefixed. Sort this just before the key with
                // the unprefixed value.
                return sortOrder[key] - 0.25;
            } else {
                // Either the key and value are unprefixed here, or this is a
                // prefixed key. Either way, this is handled by the sortOrder
                // calculation above.
                return sortOrder[key];
            }
        } else {
            // If the property isn't in the sort order, it wasn't in the
            // original set of unprefixed keys, so it must be a prefixed key.
            // Sort at order -1 to put it at the top of the set of styles.
            return -1;
        }
    }

    // Actually sort the rules according to the sort order.
    prefixedRules.sort(function (a, b) {
        return sortOrderForProperty(a) - sortOrderForProperty(b);
    });

    var transformValue = useImportant === false ? util.stringifyValue : function (key, value) {
        return (0, util.importantify)((0, util.stringifyValue)(key, value));
    };

    var rules = prefixedRules.map(function (_ref4) {
        var _ref42 = _slicedToArray(_ref4, 2);

        var key = _ref42[0];
        var value = _ref42[1];
        return (0, util.kebabifyStyleName)(key) + ':' + transformValue(key, value) + ';';
    }).join("");

    if (rules) {
        return selector + '{' + rules + '}';
    } else {
        return "";
    }
};
exports.generateCSSRuleset = generateCSSRuleset;
});

var browserRaw = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index$14 = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index$14 < queue.length) {
        var currentIndex = index$14;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index$14 = index$14 + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index$14 > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index$14; scan < newLength; scan++) {
                queue[scan] = queue[scan + index$14];
            }
            queue.length -= index$14;
            index$14 = 0;
        }
    }
    queue.length = 0;
    index$14 = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` or `self` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.

/* globals self */
var scope = typeof commonjsGlobal !== "undefined" ? commonjsGlobal : self;
var BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

var freeTasks = [];
// We queue errors to ensure they are thrown in right order (FIFO).
// Array-as-queue is good enough here, since we are just dealing with exceptions.
var pendingErrors = [];
var requestErrorThrow = browserRaw.makeRequestCallFromTimer(throwFirstError);

function throwFirstError() {
    if (pendingErrors.length) {
        throw pendingErrors.shift();
    }
}

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
var browserAsap = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    browserRaw(rawTask);
}

// We wrap tasks with recyclable task objects.  A task object implements
// `call`, just like a function.
function RawTask() {
    this.task = null;
}

// The sole purpose of wrapping the task is to catch the exception and recycle
// the task object after its single use.
RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        if (asap.onerror) {
            // This hook exists purely for testing purposes.
            // Its name will be periodically randomized to break any code that
            // depends on its existence.
            asap.onerror(error);
        } else {
            // In a web browser, exceptions are not fatal. However, to avoid
            // slowing down the queue of pending tasks, we rethrow the error in a
            // lower priority turn.
            pendingErrors.push(error);
            requestErrorThrow();
        }
    } finally {
        this.task = null;
        freeTasks[freeTasks.length] = this;
    }
};

var inject = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



var _asap2 = _interopRequireDefault(browserAsap);





/* ::
import type { SheetDefinition, SheetDefinitions } from './index.js';
import type { MaybeSheetDefinition } from './exports.js';
import type { SelectorHandler } from './generate.js';
*/

// The current <style> tag we are inserting into, or null if we haven't
// inserted anything yet. We could find this each time using
// `document.querySelector("style[data-aphrodite"])`, but holding onto it is
// faster.
var styleTag = null;

// Inject a string of styles into a <style> tag in the head of the document. This
// will automatically create a style tag and then continue to use it for
// multiple injections. It will also use a style tag with the `data-aphrodite`
// tag on it if that exists in the DOM. This could be used for e.g. reusing the
// same style tag that server-side rendering inserts.
var injectStyleTag = function injectStyleTag(cssContents /* : string */) {
    if (styleTag == null) {
        // Try to find a style tag with the `data-aphrodite` attribute first.
        styleTag = document.querySelector("style[data-aphrodite]");

        // If that doesn't work, generate a new style tag.
        if (styleTag == null) {
            // Taken from
            // http://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript
            var head = document.head || document.getElementsByTagName('head')[0];
            styleTag = document.createElement('style');

            styleTag.type = 'text/css';
            styleTag.setAttribute("data-aphrodite", "");
            head.appendChild(styleTag);
        }
    }

    if (styleTag.styleSheet) {
        // $FlowFixMe: legacy Internet Explorer compatibility
        styleTag.styleSheet.cssText += cssContents;
    } else {
        styleTag.appendChild(document.createTextNode(cssContents));
    }
};

// Custom handlers for stringifying CSS values that have side effects
// (such as fontFamily, which can cause @font-face rules to be injected)
var stringHandlers = {
    // With fontFamily we look for objects that are passed in and interpret
    // them as @font-face rules that we need to inject. The value of fontFamily
    // can either be a string (as normal), an object (a single font face), or
    // an array of objects and strings.
    fontFamily: function fontFamily(val) {
        if (Array.isArray(val)) {
            return val.map(fontFamily).join(",");
        } else if (typeof val === "object") {
            injectStyleOnce(val.src, "@font-face", [val], false);
            return '"' + val.fontFamily + '"';
        } else {
            return val;
        }
    },

    // With animationName we look for an object that contains keyframes and
    // inject them as an `@keyframes` block, returning a uniquely generated
    // name. The keyframes object should look like
    //  animationName: {
    //    from: {
    //      left: 0,
    //      top: 0,
    //    },
    //    '50%': {
    //      left: 15,
    //      top: 5,
    //    },
    //    to: {
    //      left: 20,
    //      top: 20,
    //    }
    //  }
    // TODO(emily): `stringHandlers` doesn't let us rename the key, so I have
    // to use `animationName` here. Improve that so we can call this
    // `animation` instead of `animationName`.
    animationName: function animationName(val, selectorHandlers) {
        if (Array.isArray(val)) {
            return val.map(function (v) {
                return animationName(v, selectorHandlers);
            }).join(",");
        } else if (typeof val === "object") {
            // Generate a unique name based on the hash of the object. We can't
            // just use the hash because the name can't start with a number.
            // TODO(emily): this probably makes debugging hard, allow a custom
            // name?
            var _name = 'keyframe_' + (0, util.hashObject)(val);

            // Since keyframes need 3 layers of nesting, we use `generateCSS` to
            // build the inner layers and wrap it in `@keyframes` ourselves.
            var finalVal = '@keyframes ' + _name + '{';
            Object.keys(val).forEach(function (key) {
                finalVal += (0, generate.generateCSS)(key, [val[key]], selectorHandlers, stringHandlers, false);
            });
            finalVal += '}';

            injectGeneratedCSSOnce(_name, finalVal);

            return _name;
        } else {
            return val;
        }
    }
};

// This is a map from Aphrodite's generated class names to `true` (acting as a
// set of class names)
var alreadyInjected = {};

// This is the buffer of styles which have not yet been flushed.
var injectionBuffer = "";

// A flag to tell if we are already buffering styles. This could happen either
// because we scheduled a flush call already, so newly added styles will
// already be flushed, or because we are statically buffering on the server.
var isBuffering = false;

var injectGeneratedCSSOnce = function injectGeneratedCSSOnce(key, generatedCSS) {
    if (!alreadyInjected[key]) {
        if (!isBuffering) {
            // We should never be automatically buffering on the server (or any
            // place without a document), so guard against that.
            if (typeof document === "undefined") {
                throw new Error("Cannot automatically buffer without a document");
            }

            // If we're not already buffering, schedule a call to flush the
            // current styles.
            isBuffering = true;
            (0, _asap2['default'])(flushToStyleTag);
        }

        injectionBuffer += generatedCSS;
        alreadyInjected[key] = true;
    }
};

var injectStyleOnce = function injectStyleOnce(key, /* : string */
selector, /* : string */
definitions, /* : SheetDefinition[] */
useImportant /* : boolean */
) {
    var selectorHandlers /* : SelectorHandler[] */ = arguments.length <= 4 || arguments[4] === undefined ? [] : arguments[4];

    if (!alreadyInjected[key]) {
        var generated = (0, generate.generateCSS)(selector, definitions, selectorHandlers, stringHandlers, useImportant);

        injectGeneratedCSSOnce(key, generated);
    }
};

exports.injectStyleOnce = injectStyleOnce;
var reset = function reset() {
    injectionBuffer = "";
    alreadyInjected = {};
    isBuffering = false;
    styleTag = null;
};

exports.reset = reset;
var startBuffering = function startBuffering() {
    if (isBuffering) {
        throw new Error("Cannot buffer while already buffering");
    }
    isBuffering = true;
};

exports.startBuffering = startBuffering;
var flushToString = function flushToString() {
    isBuffering = false;
    var ret = injectionBuffer;
    injectionBuffer = "";
    return ret;
};

exports.flushToString = flushToString;
var flushToStyleTag = function flushToStyleTag() {
    var cssContent = flushToString();
    if (cssContent.length > 0) {
        injectStyleTag(cssContent);
    }
};

exports.flushToStyleTag = flushToStyleTag;
var getRenderedClassNames = function getRenderedClassNames() {
    return Object.keys(alreadyInjected);
};

exports.getRenderedClassNames = getRenderedClassNames;
var addRenderedClassNames = function addRenderedClassNames(classNames /* : string[] */) {
    classNames.forEach(function (className) {
        alreadyInjected[className] = true;
    });
};

exports.addRenderedClassNames = addRenderedClassNames;
/**
 * Inject styles associated with the passed style definition objects, and return
 * an associated CSS class name.
 *
 * @param {boolean} useImportant If true, will append !important to generated
 *     CSS output. e.g. {color: red} -> "color: red !important".
 * @param {(Object|Object[])[]} styleDefinitions style definition objects, or
 *     arbitrarily nested arrays of them, as returned as properties of the
 *     return value of StyleSheet.create().
 */
var injectAndGetClassName = function injectAndGetClassName(useImportant, /* : boolean */
styleDefinitions, /* : MaybeSheetDefinition[] */
selectorHandlers /* : SelectorHandler[] */
) /* : string */{
    styleDefinitions = (0, util.flattenDeep)(styleDefinitions);

    var classNameBits = [];
    var definitionBits = [];
    for (var i = 0; i < styleDefinitions.length; i += 1) {
        // Filter out falsy values from the input, to allow for
        // `css(a, test && c)`
        if (styleDefinitions[i]) {
            classNameBits.push(styleDefinitions[i]._name);
            definitionBits.push(styleDefinitions[i]._definition);
        }
    }
    // Break if there aren't any valid styles.
    if (classNameBits.length === 0) {
        return "";
    }
    var className = classNameBits.join("-o_O-");

    injectStyleOnce(className, '.' + className, definitionBits, useImportant, selectorHandlers);

    return className;
};
exports.injectAndGetClassName = injectAndGetClassName;
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) { break; } } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) { _i['return'](); } } finally { if (_d) { throw _e; } } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _extends$1 = Object.assign || function (target) {
var arguments$1 = arguments;
 for (var i = 1; i < arguments.length; i++) { var source = arguments$1[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };





/* ::
import type { SelectorHandler } from './generate.js';
export type SheetDefinition = { [id:string]: any };
export type SheetDefinitions = SheetDefinition | SheetDefinition[];
type RenderFunction = () => string;
type Extension = {
    selectorHandler: SelectorHandler
};
export type MaybeSheetDefinition = SheetDefinition | false | null | void
*/

var StyleSheet = {
    create: function create(sheetDefinition /* : SheetDefinition */) {
        return (0, util.mapObj)(sheetDefinition, function (_ref) {
            var _ref2 = _slicedToArray(_ref, 2);

            var key = _ref2[0];
            var val = _ref2[1];

            return [key, {
                // TODO(emily): Make a 'production' mode which doesn't prepend
                // the class name here, to make the generated CSS smaller.
                _name: key + '_' + (0, util.hashObject)(val),
                _definition: val
            }];
        });
    },

    rehydrate: function rehydrate() {
        var renderedClassNames /* : string[] */ = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        (0, inject.addRenderedClassNames)(renderedClassNames);
    }
};

/**
 * Utilities for using Aphrodite server-side.
 */
var StyleSheetServer = {
    renderStatic: function renderStatic(renderFunc /* : RenderFunction */) {
        (0, inject.reset)();
        (0, inject.startBuffering)();
        var html = renderFunc();
        var cssContent = (0, inject.flushToString)();

        return {
            html: html,
            css: {
                content: cssContent,
                renderedClassNames: (0, inject.getRenderedClassNames)()
            }
        };
    }
};

/**
 * Utilities for using Aphrodite in tests.
 *
 * Not meant to be used in production.
 */
var StyleSheetTestUtils = {
    /**
     * Prevent styles from being injected into the DOM.
     *
     * This is useful in situations where you'd like to test rendering UI
     * components which use Aphrodite without any of the side-effects of
     * Aphrodite happening. Particularly useful for testing the output of
     * components when you have no DOM, e.g. testing in Node without a fake DOM.
     *
     * Should be paired with a subsequent call to
     * clearBufferAndResumeStyleInjection.
     */
    suppressStyleInjection: function suppressStyleInjection() {
        (0, inject.reset)();
        (0, inject.startBuffering)();
    },

    /**
     * Opposite method of preventStyleInject.
     */
    clearBufferAndResumeStyleInjection: function clearBufferAndResumeStyleInjection() {
        (0, inject.reset)();
    }
};

/**
 * Generate the Aphrodite API exports, with given `selectorHandlers` and
 * `useImportant` state.
 */
var makeExports = function makeExports(useImportant, /* : boolean */
selectorHandlers /* : SelectorHandler[] */
) {
    return {
        StyleSheet: _extends$1({}, StyleSheet, {

            /**
             * Returns a version of the exports of Aphrodite (i.e. an object
             * with `css` and `StyleSheet` properties) which have some
             * extensions included.
             *
             * @param {Array.<Object>} extensions: An array of extensions to
             *     add to this instance of Aphrodite. Each object should have a
             *     single property on it, defining which kind of extension to
             *     add.
             * @param {SelectorHandler} [extensions[].selectorHandler]: A
             *     selector handler extension. See `defaultSelectorHandlers` in
             *     generate.js.
             *
             * @returns {Object} An object containing the exports of the new
             *     instance of Aphrodite.
             */
            extend: function extend(extensions /* : Extension[] */) {
                var extensionSelectorHandlers = extensions
                // Pull out extensions with a selectorHandler property
                .map(function (extension) {
                    return extension.selectorHandler;
                })
                // Remove nulls (i.e. extensions without a selectorHandler
                // property).
                .filter(function (handler) {
                    return handler;
                });

                return makeExports(useImportant, selectorHandlers.concat(extensionSelectorHandlers));
            }
        }),

        StyleSheetServer: StyleSheetServer,
        StyleSheetTestUtils: StyleSheetTestUtils,

        css: function css() /* : MaybeSheetDefinition[] */{
            var arguments$1 = arguments;

            for (var _len = arguments.length, styleDefinitions = Array(_len), _key = 0; _key < _len; _key++) {
                styleDefinitions[_key] = arguments$1[_key];
            }

            return (0, inject.injectAndGetClassName)(useImportant, styleDefinitions, selectorHandlers);
        }
    };
};

var exports$1 = makeExports;

var noImportant$2 = createCommonjsModule(function (module, exports) {
// Module with the same interface as the core aphrodite module,
// except that styles injected do not automatically have !important
// appended to them.
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }





var _exports3 = _interopRequireDefault(exports$1);

var useImportant = false; // Don't add !important to style definitions
exports['default'] = (0, _exports3['default'])(useImportant, generate.defaultSelectorHandlers);
module.exports = exports['default'];
});

var noImportant = noImportant$2;

var noImportant_1 = noImportant.StyleSheet;
var noImportant_2 = noImportant.css;

var styles$2 = noImportant_1.create({
  display: {
    flexBasis: '100%',
    fontSize: '7.2rem',
    fontWeight: '400'
  }
});

var Display = function (time) { return index$3(["<p class=", ">", "</p>"], noImportant_2(styles$2.display), formatTime(time)); };

var styles$3 = noImportant_1.create({
  label: {
    color: cssVariables.textColorAccent,
    flexBasis: '100%',
    fontSize: '2.4rem'
  }
});

var Label = function (type) { return index$3(["<p class=", ">The ", " time!</p>"], noImportant_2(styles$3.label), type); };

var styles$1 = noImportant_1.create({
  timer: {
    alignItems: 'center',
    display: 'flex',
    flexFlow: 'column',
    textAlign: 'center'
  }
});

var Timer = function (state) { return index$3(["<div class=", ">\n    ", "\n    ", "\n  </div>"], noImportant_2(styles$1.timer), Display(state.timer.value), Label(state.timer.type)); };

var index$17 = function(a, b, str) {
  var bal = 0;
  var m = {};

  for (var i = 0; i < str.length; i++) {
    if (a == str.substr(i, a.length)) {
      if (!('start' in m)) { m.start = i; }
      bal++;
    }
    else if (b == str.substr(i, b.length) && 'start' in m) {
      bal--;
      if (!bal) {
        m.end = i;
        m.pre = str.substr(0, m.start);
        m.body = (m.end - m.start > 1)
          ? str.substring(m.start + a.length, m.end)
          : '';
        m.post = str.slice(m.end + b.length);
        return m;
      }
    }
  }
};

var clone_1 = createCommonjsModule(function (module) {
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    { circular = true; }

  if (typeof depth == 'undefined')
    { depth = Infinity; }

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      { return null; }

    if (depth == 0)
      { return parent; }

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) { child.lastIndex = parent.lastIndex; }
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    { return null; }

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) { flags += 'g'; }
  if (re.ignoreCase) { flags += 'i'; }
  if (re.multiline) { flags += 'm'; }
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if ('object' === 'object' && module.exports) {
  module.exports = clone;
}
});

var index$23 = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};

var conversions = createCommonjsModule(function (module) {
/* MIT license */


// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)

var reverseKeywords = {};
for (var key in index$23) {
	if (index$23.hasOwnProperty(key)) {
		reverseKeywords[index$23[key]] = key;
	}
}

var convert = module.exports = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	lch: {channels: 3, labels: 'lch'},
	hex: {channels: 1, labels: ['hex']},
	keyword: {channels: 1, labels: ['keyword']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']}
};

// hide .channels and .labels properties
for (var model in convert) {
	if (convert.hasOwnProperty(model)) {
		if (!('channels' in convert[model])) {
			throw new Error('missing channels property: ' + model);
		}

		if (!('labels' in convert[model])) {
			throw new Error('missing channel labels property: ' + model);
		}

		if (convert[model].labels.length !== convert[model].channels) {
			throw new Error('channel and label counts mismatch: ' + model);
		}

		var channels = convert[model].channels;
		var labels = convert[model].labels;
		delete convert[model].channels;
		delete convert[model].labels;
		Object.defineProperty(convert[model], 'channels', {value: channels});
		Object.defineProperty(convert[model], 'labels', {value: labels});
	}
}

convert.rgb.hsl = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var min = Math.min(r, g, b);
	var max = Math.max(r, g, b);
	var delta = max - min;
	var h;
	var s;
	var l;

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert.rgb.hsv = function (rgb) {
	var r = rgb[0];
	var g = rgb[1];
	var b = rgb[2];
	var min = Math.min(r, g, b);
	var max = Math.max(r, g, b);
	var delta = max - min;
	var h;
	var s;
	var v;

	if (max === 0) {
		s = 0;
	} else {
		s = (delta / max * 1000) / 10;
	}

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	v = ((max / 255) * 1000) / 10;

	return [h, s, v];
};

convert.rgb.hwb = function (rgb) {
	var r = rgb[0];
	var g = rgb[1];
	var b = rgb[2];
	var h = convert.rgb.hsl(rgb)[0];
	var w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert.rgb.cmyk = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var c;
	var m;
	var y;
	var k;

	k = Math.min(1 - r, 1 - g, 1 - b);
	c = (1 - r - k) / (1 - k) || 0;
	m = (1 - g - k) / (1 - k) || 0;
	y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

/**
 * See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
 * */
function comparativeDistance(x, y) {
	return (
		Math.pow(x[0] - y[0], 2) +
		Math.pow(x[1] - y[1], 2) +
		Math.pow(x[2] - y[2], 2)
	);
}

convert.rgb.keyword = function (rgb) {
	var reversed = reverseKeywords[rgb];
	if (reversed) {
		return reversed;
	}

	var currentClosestDistance = Infinity;
	var currentClosestKeyword;

	for (var keyword in index$23) {
		if (index$23.hasOwnProperty(keyword)) {
			var value = index$23[keyword];

			// Compute comparative distance
			var distance = comparativeDistance(rgb, value);

			// Check if its less, if so set as closest
			if (distance < currentClosestDistance) {
				currentClosestDistance = distance;
				currentClosestKeyword = keyword;
			}
		}
	}

	return currentClosestKeyword;
};

convert.keyword.rgb = function (keyword) {
	return index$23[keyword];
};

convert.rgb.xyz = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;

	// assume sRGB
	r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
	g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
	b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

	var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
	var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
	var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

	return [x * 100, y * 100, z * 100];
};

convert.rgb.lab = function (rgb) {
	var xyz = convert.rgb.xyz(rgb);
	var x = xyz[0];
	var y = xyz[1];
	var z = xyz[2];
	var l;
	var a;
	var b;

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

	l = (116 * y) - 16;
	a = 500 * (x - y);
	b = 200 * (y - z);

	return [l, a, b];
};

convert.hsl.rgb = function (hsl) {
	var h = hsl[0] / 360;
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var t1;
	var t2;
	var t3;
	var rgb;
	var val;

	if (s === 0) {
		val = l * 255;
		return [val, val, val];
	}

	if (l < 0.5) {
		t2 = l * (1 + s);
	} else {
		t2 = l + s - l * s;
	}

	t1 = 2 * l - t2;

	rgb = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}
		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			val = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			val = t2;
		} else if (3 * t3 < 2) {
			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			val = t1;
		}

		rgb[i] = val * 255;
	}

	return rgb;
};

convert.hsl.hsv = function (hsl) {
	var h = hsl[0];
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var smin = s;
	var lmin = Math.max(l, 0.01);
	var sv;
	var v;

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	v = (l + s) / 2;
	sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert.hsv.rgb = function (hsv) {
	var h = hsv[0] / 60;
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;
	var hi = Math.floor(h) % 6;

	var f = h - Math.floor(h);
	var p = 255 * v * (1 - s);
	var q = 255 * v * (1 - (s * f));
	var t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
	}
};

convert.hsv.hsl = function (hsv) {
	var h = hsv[0];
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;
	var vmin = Math.max(v, 0.01);
	var lmin;
	var sl;
	var l;

	l = (2 - s) * v;
	lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert.hwb.rgb = function (hwb) {
	var h = hwb[0] / 360;
	var wh = hwb[1] / 100;
	var bl = hwb[2] / 100;
	var ratio = wh + bl;
	var i;
	var v;
	var f;
	var n;

	// wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	i = Math.floor(6 * h);
	v = 1 - bl;
	f = 6 * h - i;

	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	n = wh + f * (v - wh); // linear interpolation

	var r;
	var g;
	var b;
	switch (i) {
		default:
		case 6:
		case 0: r = v; g = n; b = wh; break;
		case 1: r = n; g = v; b = wh; break;
		case 2: r = wh; g = v; b = n; break;
		case 3: r = wh; g = n; b = v; break;
		case 4: r = n; g = wh; b = v; break;
		case 5: r = v; g = wh; b = n; break;
	}

	return [r * 255, g * 255, b * 255];
};

convert.cmyk.rgb = function (cmyk) {
	var c = cmyk[0] / 100;
	var m = cmyk[1] / 100;
	var y = cmyk[2] / 100;
	var k = cmyk[3] / 100;
	var r;
	var g;
	var b;

	r = 1 - Math.min(1, c * (1 - k) + k);
	g = 1 - Math.min(1, m * (1 - k) + k);
	b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.rgb = function (xyz) {
	var x = xyz[0] / 100;
	var y = xyz[1] / 100;
	var z = xyz[2] / 100;
	var r;
	var g;
	var b;

	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

	// assume sRGB
	r = r > 0.0031308
		? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
		: r * 12.92;

	g = g > 0.0031308
		? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
		: g * 12.92;

	b = b > 0.0031308
		? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
		: b * 12.92;

	r = Math.min(Math.max(0, r), 1);
	g = Math.min(Math.max(0, g), 1);
	b = Math.min(Math.max(0, b), 1);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.lab = function (xyz) {
	var x = xyz[0];
	var y = xyz[1];
	var z = xyz[2];
	var l;
	var a;
	var b;

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

	l = (116 * y) - 16;
	a = 500 * (x - y);
	b = 200 * (y - z);

	return [l, a, b];
};

convert.lab.xyz = function (lab) {
	var l = lab[0];
	var a = lab[1];
	var b = lab[2];
	var x;
	var y;
	var z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	var y2 = Math.pow(y, 3);
	var x2 = Math.pow(x, 3);
	var z2 = Math.pow(z, 3);
	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert.lab.lch = function (lab) {
	var l = lab[0];
	var a = lab[1];
	var b = lab[2];
	var hr;
	var h;
	var c;

	hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert.lch.lab = function (lch) {
	var l = lch[0];
	var c = lch[1];
	var h = lch[2];
	var a;
	var b;
	var hr;

	hr = h / 360 * 2 * Math.PI;
	a = c * Math.cos(hr);
	b = c * Math.sin(hr);

	return [l, a, b];
};

convert.rgb.ansi16 = function (args) {
	var r = args[0];
	var g = args[1];
	var b = args[2];
	var value = 1 in arguments ? arguments[1] : convert.rgb.hsv(args)[2]; // hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	var ansi = 30
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert.hsv.ansi16 = function (args) {
	// optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
};

convert.rgb.ansi256 = function (args) {
	var r = args[0];
	var g = args[1];
	var b = args[2];

	// we use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	var ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert.ansi16.rgb = function (args) {
	var color = args % 10;

	// handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	var mult = (~~(args > 50) + 1) * 0.5;
	var r = ((color & 1) * mult) * 255;
	var g = (((color >> 1) & 1) * mult) * 255;
	var b = (((color >> 2) & 1) * mult) * 255;

	return [r, g, b];
};

convert.ansi256.rgb = function (args) {
	// handle greyscale
	if (args >= 232) {
		var c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	var rem;
	var r = Math.floor(args / 36) / 5 * 255;
	var g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	var b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert.rgb.hex = function (args) {
	var integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);

	var string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.hex.rgb = function (args) {
	var match = args.toString(16).match(/[a-f0-9]{6}/i);
	if (!match) {
		return [0, 0, 0];
	}

	var integer = parseInt(match[0], 16);
	var r = (integer >> 16) & 0xFF;
	var g = (integer >> 8) & 0xFF;
	var b = integer & 0xFF;

	return [r, g, b];
};

convert.rgb.hcg = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var max = Math.max(Math.max(r, g), b);
	var min = Math.min(Math.min(r, g), b);
	var chroma = (max - min);
	var grayscale;
	var hue;

	if (chroma < 1) {
		grayscale = min / (1 - chroma);
	} else {
		grayscale = 0;
	}

	if (chroma <= 0) {
		hue = 0;
	} else
	if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else
	if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma + 4;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert.hsl.hcg = function (hsl) {
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var c = 1;
	var f = 0;

	if (l < 0.5) {
		c = 2.0 * s * l;
	} else {
		c = 2.0 * s * (1.0 - l);
	}

	if (c < 1.0) {
		f = (l - 0.5 * c) / (1.0 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert.hsv.hcg = function (hsv) {
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;

	var c = s * v;
	var f = 0;

	if (c < 1.0) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert.hcg.rgb = function (hcg) {
	var h = hcg[0] / 360;
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	if (c === 0.0) {
		return [g * 255, g * 255, g * 255];
	}

	var pure = [0, 0, 0];
	var hi = (h % 1) * 6;
	var v = hi % 1;
	var w = 1 - v;
	var mg = 0;

	switch (Math.floor(hi)) {
		case 0:
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		case 1:
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		case 2:
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		case 3:
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		case 4:
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		default:
			pure[0] = 1; pure[1] = 0; pure[2] = w;
	}

	mg = (1.0 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255
	];
};

convert.hcg.hsv = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	var v = c + g * (1.0 - c);
	var f = 0;

	if (v > 0.0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert.hcg.hsl = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	var l = g * (1.0 - c) + 0.5 * c;
	var s = 0;

	if (l > 0.0 && l < 0.5) {
		s = c / (2 * l);
	} else
	if (l >= 0.5 && l < 1.0) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert.hcg.hwb = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;
	var v = c + g * (1.0 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert.hwb.hcg = function (hwb) {
	var w = hwb[1] / 100;
	var b = hwb[2] / 100;
	var v = 1 - b;
	var c = v - w;
	var g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert.apple.rgb = function (apple) {
	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
};

convert.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
};

convert.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert.gray.hsl = convert.gray.hsv = function (args) {
	return [0, 0, args[0]];
};

convert.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert.gray.hex = function (gray) {
	var val = Math.round(gray[0] / 100 * 255) & 0xFF;
	var integer = (val << 16) + (val << 8) + val;

	var string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.rgb.gray = function (rgb) {
	var val = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [val / 255 * 100];
};
});

var models$1 = Object.keys(conversions);

function buildGraph() {
	var graph = {};

	for (var len = models$1.length, i = 0; i < len; i++) {
		graph[models$1[i]] = {
			// http://jsperf.com/1-vs-infinity
			// micro-opt, but this is simple.
			distance: -1,
			parent: null
		};
	}

	return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
	var graph = buildGraph();
	var queue = [fromModel]; // unshift -> queue -> pop

	graph[fromModel].distance = 0;

	while (queue.length) {
		var current = queue.pop();
		var adjacents = Object.keys(conversions[current]);

		for (var len = adjacents.length, i = 0; i < len; i++) {
			var adjacent = adjacents[i];
			var node = graph[adjacent];

			if (node.distance === -1) {
				node.distance = graph[current].distance + 1;
				node.parent = current;
				queue.unshift(adjacent);
			}
		}
	}

	return graph;
}

function link(from, to) {
	return function (args) {
		return to(from(args));
	};
}

function wrapConversion(toModel, graph) {
	var path = [graph[toModel].parent, toModel];
	var fn = conversions[graph[toModel].parent][toModel];

	var cur = graph[toModel].parent;
	while (graph[cur].parent) {
		path.unshift(graph[cur].parent);
		fn = link(conversions[graph[cur].parent][cur], fn);
		cur = graph[cur].parent;
	}

	fn.conversion = path;
	return fn;
}

var route = function (fromModel) {
	var graph = deriveBFS(fromModel);
	var conversion = {};

	var models = Object.keys(graph);
	for (var len = models.length, i = 0; i < len; i++) {
		var toModel = models[i];
		var node = graph[toModel];

		if (node.parent === null) {
			// no possible conversion, or this node is the source model.
			continue;
		}

		conversion[toModel] = wrapConversion(toModel, graph);
	}

	return conversion;
};

var convert$2 = {};

var models = Object.keys(conversions);

function wrapRaw(fn) {
	var wrappedFn = function (args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		return fn(args);
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

function wrapRounded(fn) {
	var wrappedFn = function (args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		var result = fn(args);

		// we're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
		if (typeof result === 'object') {
			for (var len = result.length, i = 0; i < len; i++) {
				result[i] = Math.round(result[i]);
			}
		}

		return result;
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

models.forEach(function (fromModel) {
	convert$2[fromModel] = {};

	Object.defineProperty(convert$2[fromModel], 'channels', {value: conversions[fromModel].channels});
	Object.defineProperty(convert$2[fromModel], 'labels', {value: conversions[fromModel].labels});

	var routes = route(fromModel);
	var routeModels = Object.keys(routes);

	routeModels.forEach(function (toModel) {
		var fn = routes[toModel];

		convert$2[fromModel][toModel] = wrapRounded(fn);
		convert$2[fromModel][toModel].raw = wrapRaw(fn);
	});
});

var index$21 = convert$2;

var colorString = {
   getRgba: getRgba,
   getHsla: getHsla,
   getRgb: getRgb,
   getHsl: getHsl,
   getHwb: getHwb,
   getAlpha: getAlpha,

   hexString: hexString,
   rgbString: rgbString,
   rgbaString: rgbaString,
   percentString: percentString,
   percentaString: percentaString,
   hslString: hslString,
   hslaString: hslaString,
   hwbString: hwbString,
   keyword: keyword
};

function getRgba(string) {
   if (!string) {
      return;
   }
   var abbr =  /^#([a-fA-F0-9]{3})$/,
       hex =  /^#([a-fA-F0-9]{6})$/,
       rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       keyword = /(\D+)/;

   var rgb = [0, 0, 0],
       a = 1,
       match = string.match(abbr);
   if (match) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i] + match[i], 16);
      }
   }
   else if (match = string.match(hex)) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match.slice(i * 2, i * 2 + 2), 16);
      }
   }
   else if (match = string.match(rgba)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i + 1]);
      }
      a = parseFloat(match[4]);
   }
   else if (match = string.match(per)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
      }
      a = parseFloat(match[4]);
   }
   else if (match = string.match(keyword)) {
      if (match[1] == "transparent") {
         return [0, 0, 0, 0];
      }
      rgb = index$23[match[1]];
      if (!rgb) {
         return;
      }
   }

   for (var i = 0; i < rgb.length; i++) {
      rgb[i] = scale(rgb[i], 0, 255);
   }
   if (!a && a != 0) {
      a = 1;
   }
   else {
      a = scale(a, 0, 1);
   }
   rgb[3] = a;
   return rgb;
}

function getHsla(string) {
   if (!string) {
      return;
   }
   var hsl = /^hsla?\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hsl);
   if (match) {
      var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          s = scale(parseFloat(match[2]), 0, 100),
          l = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, s, l, a];
   }
}

function getHwb(string) {
   if (!string) {
      return;
   }
   var hwb = /^hwb\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hwb);
   if (match) {
    var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          w = scale(parseFloat(match[2]), 0, 100),
          b = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, w, b, a];
   }
}

function getRgb(string) {
   var rgba = getRgba(string);
   return rgba && rgba.slice(0, 3);
}

function getHsl(string) {
  var hsla = getHsla(string);
  return hsla && hsla.slice(0, 3);
}

function getAlpha(string) {
   var vals = getRgba(string);
   if (vals) {
      return vals[3];
   }
   else if (vals = getHsla(string)) {
      return vals[3];
   }
   else if (vals = getHwb(string)) {
      return vals[3];
   }
}

// generators
function hexString(rgb) {
   return "#" + hexDouble(rgb[0]) + hexDouble(rgb[1])
              + hexDouble(rgb[2]);
}

function rgbString(rgba, alpha) {
   if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
      return rgbaString(rgba, alpha);
   }
   return "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
}

function rgbaString(rgba, alpha) {
   if (alpha === undefined) {
      alpha = (rgba[3] !== undefined ? rgba[3] : 1);
   }
   return "rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2]
           + ", " + alpha + ")";
}

function percentString(rgba, alpha) {
   if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
      return percentaString(rgba, alpha);
   }
   var r = Math.round(rgba[0]/255 * 100),
       g = Math.round(rgba[1]/255 * 100),
       b = Math.round(rgba[2]/255 * 100);

   return "rgb(" + r + "%, " + g + "%, " + b + "%)";
}

function percentaString(rgba, alpha) {
   var r = Math.round(rgba[0]/255 * 100),
       g = Math.round(rgba[1]/255 * 100),
       b = Math.round(rgba[2]/255 * 100);
   return "rgba(" + r + "%, " + g + "%, " + b + "%, " + (alpha || rgba[3] || 1) + ")";
}

function hslString(hsla, alpha) {
   if (alpha < 1 || (hsla[3] && hsla[3] < 1)) {
      return hslaString(hsla, alpha);
   }
   return "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)";
}

function hslaString(hsla, alpha) {
   if (alpha === undefined) {
      alpha = (hsla[3] !== undefined ? hsla[3] : 1);
   }
   return "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, "
           + alpha + ")";
}

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
function hwbString(hwb, alpha) {
   if (alpha === undefined) {
      alpha = (hwb[3] !== undefined ? hwb[3] : 1);
   }
   return "hwb(" + hwb[0] + ", " + hwb[1] + "%, " + hwb[2] + "%"
           + (alpha !== undefined && alpha !== 1 ? ", " + alpha : "") + ")";
}

function keyword(rgb) {
  return reverseNames[rgb.slice(0, 3)];
}

// helpers
function scale(num, min, max) {
   return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
  var str = num.toString(16).toUpperCase();
  return (str.length < 2) ? "0" + str : str;
}


//create a list of reverse color names
var reverseNames = {};
for (var name in index$23) {
   reverseNames[index$23[name]] = name;
}

var Color = function (obj) {
	if (obj instanceof Color) {
		return obj;
	}
	if (!(this instanceof Color)) {
		return new Color(obj);
	}

	this.values = {
		rgb: [0, 0, 0],
		hsl: [0, 0, 0],
		hsv: [0, 0, 0],
		hwb: [0, 0, 0],
		cmyk: [0, 0, 0, 0],
		alpha: 1
	};

	// parse Color() argument
	var vals;
	if (typeof obj === 'string') {
		vals = colorString.getRgba(obj);
		if (vals) {
			this.setValues('rgb', vals);
		} else if (vals = colorString.getHsla(obj)) {
			this.setValues('hsl', vals);
		} else if (vals = colorString.getHwb(obj)) {
			this.setValues('hwb', vals);
		} else {
			throw new Error('Unable to parse color from string "' + obj + '"');
		}
	} else if (typeof obj === 'object') {
		vals = obj;
		if (vals.r !== undefined || vals.red !== undefined) {
			this.setValues('rgb', vals);
		} else if (vals.l !== undefined || vals.lightness !== undefined) {
			this.setValues('hsl', vals);
		} else if (vals.v !== undefined || vals.value !== undefined) {
			this.setValues('hsv', vals);
		} else if (vals.w !== undefined || vals.whiteness !== undefined) {
			this.setValues('hwb', vals);
		} else if (vals.c !== undefined || vals.cyan !== undefined) {
			this.setValues('cmyk', vals);
		} else {
			throw new Error('Unable to parse color from object ' + JSON.stringify(obj));
		}
	}
};

Color.prototype = {
	rgb: function () {
		return this.setSpace('rgb', arguments);
	},
	hsl: function () {
		return this.setSpace('hsl', arguments);
	},
	hsv: function () {
		return this.setSpace('hsv', arguments);
	},
	hwb: function () {
		return this.setSpace('hwb', arguments);
	},
	cmyk: function () {
		return this.setSpace('cmyk', arguments);
	},

	rgbArray: function () {
		return this.values.rgb;
	},
	hslArray: function () {
		return this.values.hsl;
	},
	hsvArray: function () {
		return this.values.hsv;
	},
	hwbArray: function () {
		if (this.values.alpha !== 1) {
			return this.values.hwb.concat([this.values.alpha]);
		}
		return this.values.hwb;
	},
	cmykArray: function () {
		return this.values.cmyk;
	},
	rgbaArray: function () {
		var rgb = this.values.rgb;
		return rgb.concat([this.values.alpha]);
	},
	rgbaArrayNormalized: function () {
		var rgb = this.values.rgb;
		var glRgba = [];
		for (var i = 0; i < 3; i++) {
			glRgba[i] = rgb[i] / 255;
		}
		glRgba.push(this.values.alpha);
		return glRgba;
	},
	hslaArray: function () {
		var hsl = this.values.hsl;
		return hsl.concat([this.values.alpha]);
	},
	alpha: function (val) {
		if (val === undefined) {
			return this.values.alpha;
		}
		this.setValues('alpha', val);
		return this;
	},

	red: function (val) {
		return this.setChannel('rgb', 0, val);
	},
	green: function (val) {
		return this.setChannel('rgb', 1, val);
	},
	blue: function (val) {
		return this.setChannel('rgb', 2, val);
	},
	hue: function (val) {
		if (val) {
			val %= 360;
			val = val < 0 ? 360 + val : val;
		}
		return this.setChannel('hsl', 0, val);
	},
	saturation: function (val) {
		return this.setChannel('hsl', 1, val);
	},
	lightness: function (val) {
		return this.setChannel('hsl', 2, val);
	},
	saturationv: function (val) {
		return this.setChannel('hsv', 1, val);
	},
	whiteness: function (val) {
		return this.setChannel('hwb', 1, val);
	},
	blackness: function (val) {
		return this.setChannel('hwb', 2, val);
	},
	value: function (val) {
		return this.setChannel('hsv', 2, val);
	},
	cyan: function (val) {
		return this.setChannel('cmyk', 0, val);
	},
	magenta: function (val) {
		return this.setChannel('cmyk', 1, val);
	},
	yellow: function (val) {
		return this.setChannel('cmyk', 2, val);
	},
	black: function (val) {
		return this.setChannel('cmyk', 3, val);
	},

	hexString: function () {
		return colorString.hexString(this.values.rgb);
	},
	rgbString: function () {
		return colorString.rgbString(this.values.rgb, this.values.alpha);
	},
	rgbaString: function () {
		return colorString.rgbaString(this.values.rgb, this.values.alpha);
	},
	percentString: function () {
		return colorString.percentString(this.values.rgb, this.values.alpha);
	},
	hslString: function () {
		return colorString.hslString(this.values.hsl, this.values.alpha);
	},
	hslaString: function () {
		return colorString.hslaString(this.values.hsl, this.values.alpha);
	},
	hwbString: function () {
		return colorString.hwbString(this.values.hwb, this.values.alpha);
	},
	keyword: function () {
		return colorString.keyword(this.values.rgb, this.values.alpha);
	},

	rgbNumber: function () {
		return (this.values.rgb[0] << 16) | (this.values.rgb[1] << 8) | this.values.rgb[2];
	},

	luminosity: function () {
		// http://www.w3.org/TR/WCAG20/#relativeluminancedef
		var rgb = this.values.rgb;
		var lum = [];
		for (var i = 0; i < rgb.length; i++) {
			var chan = rgb[i] / 255;
			lum[i] = (chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4);
		}
		return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
	},

	contrast: function (color2) {
		// http://www.w3.org/TR/WCAG20/#contrast-ratiodef
		var lum1 = this.luminosity();
		var lum2 = color2.luminosity();
		if (lum1 > lum2) {
			return (lum1 + 0.05) / (lum2 + 0.05);
		}
		return (lum2 + 0.05) / (lum1 + 0.05);
	},

	level: function (color2) {
		var contrastRatio = this.contrast(color2);
		if (contrastRatio >= 7.1) {
			return 'AAA';
		}

		return (contrastRatio >= 4.5) ? 'AA' : '';
	},

	dark: function () {
		// YIQ equation from http://24ways.org/2010/calculating-color-contrast
		var rgb = this.values.rgb;
		var yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
		return yiq < 128;
	},

	light: function () {
		return !this.dark();
	},

	negate: function () {
		var this$1 = this;

		var rgb = [];
		for (var i = 0; i < 3; i++) {
			rgb[i] = 255 - this$1.values.rgb[i];
		}
		this.setValues('rgb', rgb);
		return this;
	},

	lighten: function (ratio) {
		this.values.hsl[2] += this.values.hsl[2] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	darken: function (ratio) {
		this.values.hsl[2] -= this.values.hsl[2] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	saturate: function (ratio) {
		this.values.hsl[1] += this.values.hsl[1] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	desaturate: function (ratio) {
		this.values.hsl[1] -= this.values.hsl[1] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	whiten: function (ratio) {
		this.values.hwb[1] += this.values.hwb[1] * ratio;
		this.setValues('hwb', this.values.hwb);
		return this;
	},

	blacken: function (ratio) {
		this.values.hwb[2] += this.values.hwb[2] * ratio;
		this.setValues('hwb', this.values.hwb);
		return this;
	},

	greyscale: function () {
		var rgb = this.values.rgb;
		// http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
		var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
		this.setValues('rgb', [val, val, val]);
		return this;
	},

	clearer: function (ratio) {
		this.setValues('alpha', this.values.alpha - (this.values.alpha * ratio));
		return this;
	},

	opaquer: function (ratio) {
		this.setValues('alpha', this.values.alpha + (this.values.alpha * ratio));
		return this;
	},

	rotate: function (degrees) {
		var hue = this.values.hsl[0];
		hue = (hue + degrees) % 360;
		hue = hue < 0 ? 360 + hue : hue;
		this.values.hsl[0] = hue;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	/**
	 * Ported from sass implementation in C
	 * https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
	 */
	mix: function (mixinColor, weight) {
		var color1 = this;
		var color2 = mixinColor;
		var p = weight === undefined ? 0.5 : weight;

		var w = 2 * p - 1;
		var a = color1.alpha() - color2.alpha();

		var w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
		var w2 = 1 - w1;

		return this
			.rgb(
				w1 * color1.red() + w2 * color2.red(),
				w1 * color1.green() + w2 * color2.green(),
				w1 * color1.blue() + w2 * color2.blue()
			)
			.alpha(color1.alpha() * p + color2.alpha() * (1 - p));
	},

	toJSON: function () {
		return this.rgb();
	},

	clone: function () {
		var col = new Color();
		col.values = clone_1(this.values);
		return col;
	}
};

Color.prototype.getValues = function (space) {
	var this$1 = this;

	var vals = {};

	for (var i = 0; i < space.length; i++) {
		vals[space.charAt(i)] = this$1.values[space][i];
	}

	if (this.values.alpha !== 1) {
		vals.a = this.values.alpha;
	}

	// {r: 255, g: 255, b: 255, a: 0.4}
	return vals;
};

Color.prototype.setValues = function (space, vals) {
	var this$1 = this;

	var spaces = {
		rgb: ['red', 'green', 'blue'],
		hsl: ['hue', 'saturation', 'lightness'],
		hsv: ['hue', 'saturation', 'value'],
		hwb: ['hue', 'whiteness', 'blackness'],
		cmyk: ['cyan', 'magenta', 'yellow', 'black']
	};

	var maxes = {
		rgb: [255, 255, 255],
		hsl: [360, 100, 100],
		hsv: [360, 100, 100],
		hwb: [360, 100, 100],
		cmyk: [100, 100, 100, 100]
	};

	var i;
	var alpha = 1;
	if (space === 'alpha') {
		alpha = vals;
	} else if (vals.length) {
		// [10, 10, 10]
		this.values[space] = vals.slice(0, space.length);
		alpha = vals[space.length];
	} else if (vals[space.charAt(0)] !== undefined) {
		// {r: 10, g: 10, b: 10}
		for (i = 0; i < space.length; i++) {
			this$1.values[space][i] = vals[space.charAt(i)];
		}

		alpha = vals.a;
	} else if (vals[spaces[space][0]] !== undefined) {
		// {red: 10, green: 10, blue: 10}
		var chans = spaces[space];

		for (i = 0; i < space.length; i++) {
			this$1.values[space][i] = vals[chans[i]];
		}

		alpha = vals.alpha;
	}

	this.values.alpha = Math.max(0, Math.min(1, (alpha === undefined ? this.values.alpha : alpha)));

	if (space === 'alpha') {
		return false;
	}

	var capped;

	// cap values of the space prior converting all values
	for (i = 0; i < space.length; i++) {
		capped = Math.max(0, Math.min(maxes[space][i], this$1.values[space][i]));
		this$1.values[space][i] = Math.round(capped);
	}

	// convert to all the other color spaces
	for (var sname in spaces) {
		if (sname !== space) {
			this$1.values[sname] = index$21[space][sname](this$1.values[space]);
		}

		// cap values
		for (i = 0; i < sname.length; i++) {
			capped = Math.max(0, Math.min(maxes[sname][i], this$1.values[sname][i]));
			this$1.values[sname][i] = Math.round(capped);
		}
	}

	return true;
};

Color.prototype.setSpace = function (space, args) {
	var vals = args[0];

	if (vals === undefined) {
		// color.rgb()
		return this.getValues(space);
	}

	// color.rgb(10, 10, 10)
	if (typeof vals === 'number') {
		vals = Array.prototype.slice.call(args);
	}

	this.setValues(space, vals);
	return this;
};

Color.prototype.setChannel = function (space, index, val) {
	if (val === undefined) {
		// color.red()
		return this.values[space][index];
	} else if (val === this.values[space][index]) {
		// color.red(color.red())
		return this;
	}

	// color.red(100)
	this.values[space][index] = val;
	this.setValues(space, this.values[space]);

	return this;
};

var index$19 = Color;

/**
 * Expose `debug()` as the module.
 */

var debug_1 = debug$1;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug$1(name) {
  if (!debug$1.enabled(name)) { return function(){}; }

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug$1[name] || curr);
    debug$1[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug$1.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug$1.names = [];
debug$1.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug$1.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug$1.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug$1.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug$1.disable = function(){
  debug$1.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug$1.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) { return (ms / hour).toFixed(1) + 'h'; }
  if (ms >= min) { return (ms / min).toFixed(1) + 'm'; }
  if (ms >= sec) { return (ms / sec | 0) + 's'; }
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug$1.enabled = function(name) {
  for (var i = 0, len = debug$1.skips.length; i < len; i++) {
    if (debug$1.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug$1.names.length; i < len; i++) {
    if (debug$1.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) { return val.stack || val.message; }
  return val;
}

// persist

try {
  if (window.localStorage) { debug$1.enable(localStorage.debug); }
} catch(e){}

var debug = debug_1('css-color-function:parse');

/**
 * Expose `parse`.
 */

var parse_1$1 = parse;

/**
 * Parse a CSS color function string.
 *
 * @param {String} string
 * @return {Array}
 */

function parse (string) {
  if ('string' != typeof string) { string = string.toString(); }
  debug('string %s', string);

  /**
   * Match the current position in the string against a `regexp`, returning the
   * match if one exists.
   *
   * @param {RegExp} regexp
   * @return {Undefined or Array}
   */

  function match (regexp) {
    var m = regexp.exec(string);
    if (!m) { return; }
    string = string.slice(m[0].length);
    return m.slice(1);
  }

  /**
   * Match whitespace.
   */

  function whitespace () {
    match(/^\s+/);
  }

  /**
   * Match a right parentheses.
   *
   * @return {Array or Undefined}
   */

  function rparen () {
    var m = match(/^\)/);
    if (!m) { return; }
    debug('rparen');
    return m;
  }

  /**
   * Match a modifier: '+' '-' '*'.
   *
   * @return {Object or Undefined}
   */

  function modifier () {
    var m = match(/^([\+\-\*])/);
    if (!m) { return; }
    var ret = {};
    ret.type = 'modifier';
    ret.value = m[0];
    debug('modifier %o', ret);
    return ret;
  }

  /**
   * Match a generic number function argument.
   *
   * @return {Object or Undefined}
   */

  function number () {
    var m = match(/^([^\)\s]+)/);
    if (!m) { return; }
    var ret = {};
    ret.type = 'number';
    ret.value = m[0];
    debug('number %o', ret);
    return ret;
  }

  /**
   * Match a function's arguments.
   *
   * @return {Array}
   */

  function args () {
    var ret = [];
    var el;
    while (el = modifier() || fn() || number()) {
      ret.push(el);
      whitespace();
    }
    debug('args %o', ret);
    return ret;
  }

  /**
   * Match an adjuster function.
   *
   * @return {Object or Undefined}
   */

  function adjuster () {
    var m = match(/^(\w+)\(/);
    if (!m) { return; }
    whitespace();
    var el;
    var ret = {};
    ret.type = 'function';
    ret.name = m[0];
    ret.arguments = args();
    rparen();
    debug('adjuster %o', ret);
    return ret;
  }

  /**
   * Match a color.
   *
   * @return {Object}
   */

  function color () {
    var ret = {};
    ret.type = 'color';

    var col = match(/([^\)\s]+)/)[0];
    if (col.indexOf('(') != -1) {
      var piece = match(/([^\)]*?\))/)[0];
      col = col + piece;
    }

    ret.value = col;
    whitespace();
    return ret;
  }

  /**
   * Match a color function, capturing the first color argument and any adjuster
   * functions after it.
   *
   * @return {Object or Undefined}
   */

  function fn () {
    if (!string.match(/^color\(/)) { return; }

    var colorRef = index$17('(', ')', string);
    if (!colorRef) { throw new SyntaxError('Missing closing parenthese for \'' + string + '\''); }
    if (colorRef.body === '') { throw new SyntaxError('color() function cannot be empty'); }
    string = colorRef.body;
    whitespace();

    var ret = {};
    ret.type = 'function';
    ret.name = 'color';
    ret.arguments = [fn() || color()];
    debug('function arguments %o', ret.arguments);

    var el;
    while (el = adjuster()) {
      ret.arguments.push(el);
      whitespace();
    }

    // pass the rest of the string in case of recursive color()
    string = colorRef.post;
    whitespace();
    debug('function %o', ret);

    return ret;
  }

  /**
   * Return the parsed color function.
   */

  return fn();
}

var adjusters = createCommonjsModule(function (module, exports) {
/**
 * Basic RGBA adjusters.
 */

exports.red = rgbaAdjuster('red');
exports.blue = rgbaAdjuster('blue');
exports.green = rgbaAdjuster('green');
exports.alpha = exports.a = rgbaAdjuster('alpha');

/**
 * RGB adjuster.
 */

exports.rgb = function () {
  // TODO
};

/**
 * Basic HSLWB adjusters.
 */

exports.hue = exports.h = hslwbAdjuster('hue');
exports.saturation = exports.s = hslwbAdjuster('saturation');
exports.lightness = exports.l = hslwbAdjuster('lightness');
exports.whiteness = exports.w = hslwbAdjuster('whiteness');
exports.blackness = exports.b = hslwbAdjuster('blackness');

/**
 * Blend adjuster.
 *
 * @param {Color} color
 * @param {Object} args
 */

exports.blend = function (color, args) {
  var other = new index$19(args[0].value);
  var percentage = 1 - parseInt(args[1].value, 10) / 100;
  color.mix(other, percentage);
};

/**
 * Tint adjuster.
 *
 * @param {Color} color
 * @param {Object} args
 */

exports.tint = function (color, args) {
  args.unshift({ type: 'argument', value: 'white' });
  exports.blend(color, args);
};

/**
 * Share adjuster.
 *
 * @param {Color} color
 * @param {Object} args
 */

exports.shade = function (color, args) {
  args.unshift({ type: 'argument', value: 'black' });
  exports.blend(color, args);
};

/**
 * Contrast adjuster.
 *
 * @param {Color} color
 * @param {Object} args
 */
exports.contrast = function (color, args) {
  if (args.length == 0) { args.push({ type: 'argument', value: '100%' }); }
  var percentage = 1 - parseInt(args[0].value, 10) / 100;
  var max = color.luminosity() < .5 ? new index$19({ h:color.hue(), w:100, b:0 }) : new index$19({ h:color.hue(), w:0, b:100 });
  var min = max;
  var minRatio = 4.5;
  if (color.contrast(max) > minRatio) {
    var min = binarySearchBWContrast(minRatio, color, max);
    min.mix(max, percentage);
  }
  color.hwb(min.hwb());
};

/**
 * Generate a value or percentage of modifier.
 *
 * @param {String} prop
 * @return {Function}
 */

function rgbaAdjuster (prop) {
  return function (color, args) {
    var mod;
    if (args[0].type == 'modifier') { mod = args.shift().value; }

    var val = args[0].value;
    if (val.indexOf('%') != -1) {
      val = parseInt(val, 10) / 100;
      if (!mod) {
        val = val * (prop == 'alpha' ? 1 : 255);
      } else if (mod != '*') {
        val = color[prop]() * val;
      }
    } else {
      val = Number(val);
    }

    color[prop](modify(color[prop](), val, mod));
  };
}

/**
 * Generate a basic HSLWB adjuster.
 *
 * @param {String} prop
 * @return {Function}
 */

function hslwbAdjuster (prop) {
  return function (color, args) {
    var mod;
    if (args[0].type == 'modifier') { mod = args.shift().value; }
    var val = parseFloat(args[0].value, 10);
    color[prop](modify(color[prop](), val, mod));
  };
}

/**
 * Return the percentage of a `number` for a given percentage `string`.
 *
 * @param {Number} number
 * @param {String} string
 * @return {Number}
 */

function modify (val, amount, modifier) {
  switch (modifier) {
    case '+': return val + amount;
    case '-': return val - amount;
    case '*': return val * amount;
    default: return amount;
  }
}

/**
 * Return the color closest to `color` between `color` and `max` that has a contrast ratio higher than `minRatio`
 *  assumes `color` and `max` have identical hue
 *
 * @param {Number} minRatio
 * @param {Color} color
 * @param {Color} max
 **/

function binarySearchBWContrast (minRatio, color, max) {
  var hue = color.hue();
  var min = color.clone();
  var minW = color.whiteness();
  var minB = color.blackness();
  var maxW = max.whiteness();
  var maxB = max.blackness();
  while (Math.abs(minW - maxW) > 1 || Math.abs(minB - maxB) > 1) {
    var midW = Math.round((maxW + minW) / 2);
    var midB = Math.round((maxB + minB) / 2);
    min.whiteness(midW);
    min.blackness(midB);
    if (min.contrast(color) > minRatio) {
      maxW = midW;
      maxB = midB;
    } else {
      minW = midW;
      minB = midB;
    }
  }
  return min
}
});

var convert_1$1 = convert$1;

/**
 * Convert a color function CSS `string` into an RGB color string.
 *
 * @param {String} string
 * @return {String}
 */

function convert$1 (string) {
  var index = string.indexOf('color(');
  if (index == -1) { return string; }

  string = string.slice(index);
  string = index$17('(', ')', string);
  if (!string) { throw new SyntaxError('Missing closing parenthese for \'' + string + '\''); }
  var ast = parse_1$1('color(' + string.body + ')');
  return toRGB(ast) + convert$1(string.post);
}

/**
 * Given a color `ast` return an RGB color string.
 *
 * @param {Object} ast
 * @return {String}
 */

function toRGB (ast) {
  var color = new index$19(ast.arguments[0].type == "function" ? toRGB(ast.arguments[0]) : ast.arguments[0].value);
  var fns = ast.arguments.slice(1);

  fns.forEach(function (adjuster) {
    var name = adjuster.name;
    if (!adjusters[name]) { throw new Error('Unknown <color-adjuster> \'' + name + '\''); }

    // convert nested color functions
    adjuster.arguments.forEach(function (arg) {
      if (arg.type == 'function' && arg.name == 'color') {
        arg.value = toRGB(arg);
        arg.type = 'color';
        delete arg.name;
      }
    });

    // apply adjuster transformations
    adjusters[name](color, adjuster.arguments);
  });

  return color.rgbString();
}

var convert_1 = convert_1$1;

/**
 * Expose `parse`.
 */

var handleClick = function (e) {
  var actionCreator = index_4(getNextPlayState, changeTimerPlayState);
  var action = actionCreator(store.getState());
  store.dispatch(action);
  e.target.blur();
};

var buttonFocusStyle = {
  backgroundColor: convert_1(("color(" + (cssVariables.textColor) + " a(54%))"))
};

var styles$4 = noImportant_1.create({
  button: {
    appearance: 'none',
    backgroundColor: cssVariables.textColor,
    borderRadius: '50%',
    color: 'transparent',
    display: 'block',
    height: '5rem',
    left: '50%',
    marginTop: '3rem',
    position: 'relative',
    transform: 'translateX(-50%)',
    userSelect: 'none',
    width: '5rem',
    ':focus': buttonFocusStyle,
    ':hover': buttonFocusStyle,
    ':before': {
      borderBottom: '1.25rem solid transparent',
      borderLeft: ("2rem solid " + (cssVariables.darkColor)),
      borderTop: '1.25rem solid transparent',
      content: '""',
      display: 'block',
      height: 0,
      left: '1.75rem',
      position: 'absolute',
      top: '1.25rem',
      width: 0
    },
    ':after': {
      borderLeft: (".75rem solid " + (cssVariables.darkColor)),
      borderRight: (".75rem solid " + (cssVariables.darkColor)),
      content: '""',
      display: 'block',
      height: '2.25rem',
      left: '50%',
      position: 'absolute',
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      width: '2rem'
    }
  },
  play: {
    ':after': {
      opacity: 0
    },
    ':before': {
      opacity: 1
    }
  },
  pause: {
    ':after': {
      opacity: 1
    },
    ':before': {
      opacity: 0
    }
  }
});

var PlayStateControl = function (ref) {
    var state = ref.state;

    return index$3(["<button\n    class=\"", "\"\n    onclick=", ">\n    ", "\n  </button>"], noImportant_2(styles$4.button, isPaused(state) ? styles$4.play : styles$4.pause), handleClick, getNextPlayStateText(state));
};

var pulseHeartAnimation = {
  from: {
    transform: 'rotate(-135deg) scale(1)'
  },
  to: {
    transform: 'rotate(-135deg) scale(1.2)'
  }
};

var focusLinkStyle = {
  color: cssVariables.textColorDark
};

var heartAfterBeforeStyle = {
  backgroundColor: cssVariables.accentColor,
  borderRadius: '50%',
  content: '""',
  height: '10px',
  position: 'absolute',
  width: '10px'
};

var styles$5 = noImportant_1.create({
  footer: {
    backgroundColor: cssVariables.brandColorDark,
    paddingBottom: '1rem',
    paddingTop: '1rem',
    textAlign: 'center'
  },
  link: {
    color: cssVariables.textColor,
    textDecoration: 'none',
    ':hover': focusLinkStyle,
    ':focus': focusLinkStyle
  },
  heart: {
    animationName: pulseHeartAnimation,
    animationDuration: '.5s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in',
    backgroundColor: cssVariables.accentColor,
    display: 'inline-block',
    height: '10px',
    margin: '0 5px',
    position: 'relative',
    width: '10px',
    ':before': Object.assign({}, heartAfterBeforeStyle,
      {left: '50%',
      top: 0}),
    ':after': Object.assign({}, heartAfterBeforeStyle,
      {left: 0,
      top: '50%'})
  }
});

var Footer = function () { return index$3(["<footer class=", ">\n    Made with <span class=", "></span> by <a href=\"https://github.com/thiamsantos\" target=\"_blank\" rel=\"noopener\" class=", ">@thiamsantos</a>\n  </footer>"], noImportant_2(styles$5.footer), noImportant_2(styles$5.heart), noImportant_2(styles$5.link)); };

var buttonFocusStyles = {
  backgroundColor: cssVariables.brandColorDark
};

var styles$7 = noImportant_1.create({
  active: {
    backgroundColor: cssVariables.brandColorLight
  },
  button: {
    appearance: 'none',
    backgroundColor: cssVariables.brandColor,
    color: 'inherit',
    paddingBottom: '1rem',
    paddingTop: '1rem',
    width: '100%',

    ':hover': buttonFocusStyles,
    ':focus': buttonFocusStyles,

    ':not(:last-child)': {
      marginBottom: '.2rem',
      marginRight: 0
    },

    '@media (min-width: 300px)': {
      maxWidth: '10rem',
      ':not(:last-child)': {
        marginBottom: 0,
        marginRight: '.2rem'
      }
    }
  }
});

var changeTimer = function (ref) {
  var dispatch = ref.dispatch;
  var timer = ref.timer;

  return function (e) {
  var action = changeTimerType(timer.type, timer.value);
  dispatch(action);
  e.target.blur();
};
};

var Button = function (ref) {
    var state = ref.state;
    var dispatch = ref.dispatch;
    var timer = ref.timer;

    return index$3(["<button\n    class=\"", "\"\n    onclick=", ">\n    ", "\n  </button>"], noImportant_2(styles$7.button,
      state.timer.type === timer.type && styles$7.active), changeTimer({dispatch: dispatch, timer: timer}), capitalize(timer.type));
};

var styles$6 = noImportant_1.create({
  changeTimer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: '1rem',
    marginRight: '1rem',
    marginTop: '3rem',

    '@media (min-width: 300px)': {
      flexDirection: 'row'
    }
  }
});

var ChangeTimer = function (ref) {
    var state = ref.state;
    var dispatch = ref.dispatch;

    return index$3(["<section class=", ">\n    ", "\n  </section>"], noImportant_2(styles$6.changeTimer), TIMER_TYPES.map(function (item) { return Button({
        timer: item,
        state: state,
        dispatch: dispatch
      }); }
    ));
};

var focusInfo = {
  textDecoration: 'underline'
};

var styles$9 = noImportant_1.create({
  info: {
    color: cssVariables.textColor,
    textAlign: 'center',
    textDecoration: 'none',
    ':focus': focusInfo,
    ':hover': focusInfo
  }
});

var Info = function () { return index$3(["<a\n    href=\"https://en.wikipedia.org/wiki/Pomodoro_Technique\"\n    rel=\"noopener\"\n    target=\"_blank\"\n    class=", " >\n    What is Pomodoro?\n  </a>"], noImportant_2(styles$9.info)); };

var handleChange = function (dispatch, name) { return function () {
  var action = toggleAdjust(name.toLowerCase());
  dispatch(action);
}; };

var labelCheckedAfterBeforeStyle = {
  backgroundColor: cssVariables.accentColor,
  content: '""',
  display: 'block',
  position: 'absolute',
  transform: 'rotate(45deg)'
};

var styles$10 = noImportant_1.create({
  control: {
    marginTop: '1rem',
    '@media (min-width: 450px)': {
      marginTop: 0,
      ':not(:last-child)': {
        paddingRight: '3rem'
      }
    }
  },
  box: {
    backgroundColor: 'transparent',
    border: '.1rem solid currentColor',
    display: 'block',
    height: '2rem',
    left: '-3rem',
    position: 'absolute',
    top: '0',
    width: '2rem'
  },
  label: {
    position: 'relative'
  },
  labelChecked: {
    ':after': Object.assign({}, labelCheckedAfterBeforeStyle,
      {bottom: 0,
      height: '2rem',
      left: '-1.8rem',
      width: '.5rem'}),
    ':before': Object.assign({}, labelCheckedAfterBeforeStyle,
      {bottom: '.4rem',
      height: '.5rem',
      left: '-2.8rem',
      width: '1rem'})
  },
  input: {
    visibility: 'hidden'
  }
});

var Control = function (ref) {
    var state = ref.state;
    var dispatch = ref.dispatch;
    var name = ref.name;

    return index$3(["<div class=", ">\n    <input\n      type=\"checkbox\"\n      id=\"", "\"\n      class=", "\n      onchange=", "\n      checked=", " >\n    <label\n      for=\"", "\"\n      class=", ">\n      <span class=", "></span>\n      ", "\n    </label>\n  </div>"], noImportant_2(styles$10.control), name, noImportant_2(styles$10.input), handleChange(dispatch, name), state.adjusts[name], name, noImportant_2(styles$10.label, state.adjusts[name] && styles$10.labelChecked), noImportant_2(styles$10.box), capitalize(name));
};

var styles$8 = noImportant_1.create({
  adjusts: {
    backgroundColor: cssVariables.brandColor,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '1.4rem',
    padding: '1.5rem',

    '@media (min-width: 450px)': {
      flexDirection: 'row',
      justifyContent: 'space-around'
    }
  },
  controls: {
    display: 'inherit',
    flexDirection: 'inherit',
    fontSize: '1.6rem',
    paddingLeft: '2rem'
  }
});

var Adjusts = function (ref) {
    var state = ref.state;
    var dispatch = ref.dispatch;

    return index$3(["<section class=", ">\n    ", "\n    <div class=", ">\n      ", "\n    </div>\n  </section>"], noImportant_2(styles$8.adjusts), Info(), noImportant_2(styles$8.controls), ['notification', 'sound', 'vibration']
        .map(function (name) { return Control({state: state, dispatch: dispatch, name: name}); }));
};

var octoCatHoverStyle = {
  fill: cssVariables.brandColorLight
};

var styles$11 = noImportant_1.create({
  octoCat: {
    border: 0,
    color: cssVariables.darkColor,
    fill: cssVariables.brandColor,
    height: '80px',
    position: 'fixed',
    right: 0,
    top: 0,
    width: '80px',

    ':hover': octoCatHoverStyle,
    ':focus': octoCatHoverStyle
  },
  octoMember: {
    fill: 'currentColor'
  }
});

var GithubCorner = function (url) { return index$3(["<a\n    href=", "\n    rel=\"noopener\"\n    target=\"_blank\"\n    title=\"View source on Github\">\n    <svg\n      class=", "\n      viewBox=\"0 0 250 250\"\n      aria-hidden=\"true\"\n      tabindex=\"0\">\n      <path d=\"M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z\"/>\n      <path class=", " d=\"M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2\"/>\n      <path class=", " d=\"M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z\"/>\n    </svg>\n  </a>"], url, noImportant_2(styles$11.octoCat), noImportant_2(styles$11.octoMember), noImportant_2(styles$11.octoMember)); };

var styles = noImportant_1.create({
  app: {
    backgroundColor: cssVariables.darkColor,
    color: cssVariables.textColor,
    fontSize: '1.6rem',
    fontWeight: '300',
    lineHeight: '1.2',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Roboto", sans-serif',
    minHeight: '100vh'
  },
  main: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingBottom: '4rem',
    paddingTop: '4rem'
  }
});

var Root = function (ref) {
    var state = ref.state;
    var dispatch = ref.dispatch;

    return index$3(["<div id=\"app\" class=", ">\n    ", "\n    <main class=", ">\n      ", "\n      ", "\n      ", "\n    </main>\n    ", "\n    ", "\n  </div>"], noImportant_2(styles.app), GithubCorner('https://github.com/thiamsantos/cool-pomodoro'), noImportant_2(styles.main), Timer(state), PlayStateControl({state: state, dispatch: dispatch}), ChangeTimer({state: state, dispatch: dispatch}), Adjusts({state: state, dispatch: dispatch}), Footer());
};

var dispatch = store.dispatch;

document.body.appendChild(Root({state: store.getState(), dispatch: dispatch}));

var render = function () {
  var state = store.getState();

  morphdom_1(
    document.getElementById('app'),
    Root({state: state, dispatch: dispatch})
  );
};

var setTitle = function () {
  var state = store.getState();
  document.title = getTitle(state);
};

var save = function () {
  var state = store.getState();
  saveState(localStorage, {adjusts: state.adjusts});
};

var notify = function () {
  var state = store.getState();

  if (state.timer.value <= 0) {
    if (state.timer.playState === 'running') {
      var actionCreator = index_4(getValueToResetTimer, resetTimer);
      var action = actionCreator(state.timer.type, TIMER_TYPES);
      store.dispatch(action);
    }
    if (state.adjusts.vibration && 'vibrate' in window.navigator) {
      window.navigator.vibrate(1000);
    }
    if (state.adjusts.sound) {
      var sound = new Audio('audio/alarm.mp3');
      sound.play();
    }
    if (state.adjusts.notification && 'Notification' in window) {
      if (state.timer.type === 'code') {
        new Notification('Relax :)', {
          lang: 'en',
          icon: 'img/coffee.png',
          body: 'Go talk or drink a coffee!'
        });
      } else {
        new Notification('The time is over', {
          lang: 'en',
          icon: 'img/code.png',
          body: 'Hey back to code!'
        });
      }
    }
  }
};

store.subscribe(index_5(setTitle, 300));
store.subscribe(index_5(save, 1000));
store.subscribe(render);
store.subscribe(index_5(notify, 1000));

setInterval(function () {
  var state = store.getState();

  if (state.timer.playState === 'paused' || state.timer.value === 0) {
    return false
  }

  store.dispatch({type: 'DECREMENT_TIMER'});
}, 1000);

document.addEventListener('keyup', keyboardShortcuts(store));

if ('serviceWorker' in navigator || window.location.hostname === 'localhost') {
  navigator.serviceWorker.register('service-worker.js');
}

}());
