module.exports = function (window) {
    "use strict";

    require('./css/i-table.css'); // <-- define your own itag-name here

    var itagCore = require('itags.core')(window),
        itagName = 'i-table', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        microtemplate = require('i-parcel/lib/microtemplate.js'),
        IScroller = require('i-scroller')(window),
        RESIZE_MARGIN = 5,
        Itag;

    if (!window.ITAGS[itagName]) {

        Event.after('mouseover', function(e) {
            var node = e.target,
                itable = node.getParent();
            itable.setListeners();
        }, 'i-table >section[is="thead"]');

        Event.after('mouseout', function(e) {
            var node = e.target,
                itable = node.getParent();
            itable.removeListeners();
        }, 'i-table >section[is="thead"]');

        Event.after('mousedown', function(e) {
            var colIndex = e._colIndex,
                resize = e._startResize,
                itable = e._itable,
                model = itable.model,
                fixedHeaderNode = e._fixedHeaderNode,
                vChildNodes = fixedHeaderNode.vnode.vChildNodes,
                colNode = vChildNodes[colIndex].domNode,
                column = model.columns[colIndex],
                startPos, initialWidth, moveListener, dragNode, colLeft, verticalInsertNode,
                beforeNode, shiftVerticalNode, thNodes, fixedHeaderNodeLeft, atTheEnd, newIndex;
            if (resize) {
                fixedHeaderNode.setClass('resizing');
                // start dragging-feature to change col-width
                startPos = e.clientX;
                initialWidth = colNode.width;
                moveListener = Event.after('mousemove', function(e2) {
                    var newPos = e2.clientX,
                        difference = newPos - startPos,
                        newWidth = Math.inbetween(0, initialWidth + difference, fixedHeaderNode.width);
                    column.width = newWidth;
                });

                // CAUTIOUS: mouseup won't get caught when the mouse is released outside the window!!
                Event.onceAfter('mouseup', function() {
                    moveListener.detach();
                    fixedHeaderNode.removeClass('resizing');
                });
            }
            else {
                fixedHeaderNodeLeft = fixedHeaderNode.left;
                // start dragging-feature to change col-position
                // first setup the draggable-copy node to visualize the dragged node:
                dragNode = itable.getElement('>span.copy-node', true);
                dragNode || (dragNode=itable.addSystemElement('<span class="itsa-hidden copy-node"></span>'));
                verticalInsertNode = itable.getElement('>span.vertical-insert', true);
                verticalInsertNode || (verticalInsertNode=itable.addSystemElement('<span class="itsa-hidden vertical-insert"></span>'));
                colLeft = (colNode.left - fixedHeaderNodeLeft);
                dragNode.setInlineStyles([
                    {property: 'left', value: colLeft+'px'},
                    {property: 'width', value: colNode.width+'px'},
                    {property: 'height', value: colNode.height+'px'}
                ]);
                dragNode.toggleClass('first-child', (colIndex===0));
                dragNode.setHTML(colNode.getHTML());
                shiftVerticalNode = Math.round(verticalInsertNode.width/2);
                verticalInsertNode.setInlineStyle('left', ((colIndex===0) ? (colNode.right-fixedHeaderNodeLeft-shiftVerticalNode) : Math.max(0, (colLeft-shiftVerticalNode)))+'px');
                colNode.setClass('col-dragging');
                itable.setData('_draggedCol', colIndex);
                dragNode.removeClass('itsa-hidden');
                verticalInsertNode.removeClass('itsa-hidden');
                startPos = e.clientX;
                thNodes = fixedHeaderNode.getAll('>span');
                fixedHeaderNode.setClass('col-dragging');
                moveListener = Event.after('mousemove', function(e2) {
                    var mousePosX = e2.clientX,
                        difference = mousePosX - startPos,
                        newX = Math.inbetween(0, colLeft + difference, fixedHeaderNode.width-colNode.width);
                    beforeNode = null;
                    atTheEnd = false;
                    dragNode.setInlineStyle('left', newX+'px');
                    thNodes.some(function(node, index) {
                        var nodeLeft = node.left,
                            centerX = nodeLeft + Math.round(node.width/2);
                        if (mousePosX<centerX) {
                            beforeNode = node;
                            newX = nodeLeft;
                            newIndex = index;
                        }
                        return beforeNode;
                    });
                    (newIndex>=(colIndex+1)) && newIndex--;
                    if (!beforeNode) {
                        newIndex = thNodes.length-1;
                        beforeNode = thNodes[newIndex];
                        atTheEnd = true;
                        newX = (colIndex===thNodes.length-1) ? beforeNode.left : (beforeNode.right - shiftVerticalNode);
                    }
                    else if ((colIndex===0) && (beforeNode===thNodes[0])) {
                        newX = beforeNode.right;
                        newIndex = 0;
                    }
                    verticalInsertNode.setInlineStyle('left', Math.max(0, (newX-fixedHeaderNodeLeft-shiftVerticalNode))+'px');
                });
                Event.onceAfter('mouseup', function() {
                    moveListener.detach();
                    dragNode.setClass('itsa-hidden');
                    verticalInsertNode.setClass('itsa-hidden');
                    colNode.removeClass('col-dragging');
                    fixedHeaderNode.removeClass('col-dragging');
                    itable.removeData('_draggedCol');
                    if ((newIndex!==undefined) && (newIndex!==colIndex)) {
                        model.columns.insertAt(column, newIndex);
                    }
                    else {
                        itable.syncUI(); // unmark the cells with class: col-dragging
                    }
                });
                itable.syncUI(); // mark the cells with class: col-dragging
            }
        }, function(e) {
            var node = e.target.getParent(),
                fixedHeaderNode = node.inside('i-table >section[is="thead"]'),
                itable, model, vChildNodes, colIndex, firstCol, lastCol, xMouse, colLeft, colRight, startResize, insideRightArea, insideLeftArea, filterOk;
            if (!fixedHeaderNode) {
                return false;
            }
            itable = fixedHeaderNode.getParent(),
            model = itable.model,
            vChildNodes = fixedHeaderNode.vnode.vChildNodes;
            colIndex = vChildNodes.indexOf(node.vnode);
            firstCol = (colIndex===0);
            lastCol = (colIndex===(vChildNodes.length-1));
            xMouse = e.clientX;
            colLeft = node.left;
            colRight = colLeft + node.width;
            if (colIndex===-1) {
                // need to have this: when entering the table from left or right,
                // colIndex can be -1.
                return false;
            }
            insideRightArea = (xMouse<=colRight) && (xMouse>=(colRight-RESIZE_MARGIN));
            insideLeftArea = !insideRightArea && (xMouse>=colLeft) && (xMouse<=(colLeft+RESIZE_MARGIN));
            // store colIndex and resize, so it can be used in the subscriber
            startResize = model.resizable && ((insideLeftArea && !firstCol) || (insideRightArea && !lastCol));
            filterOk = model.reorderable || (model.resizable && startResize);
            if (filterOk) {
                e._colIndex = insideLeftArea ? (colIndex-1) : colIndex;
                e._startResize = startResize;
                e._fixedHeaderNode = fixedHeaderNode;
                e._itable = itable;
            }
            return filterOk;
        });

        Itag = IScroller.subClass(itagName, {

            init: function() {
                var element = this,
                    model = element.model;
                // i-scroller reads the innercontent as it were the template
                // i-table doesn't have a global template, but uses the innercontent as the columns-definition
                // we can easily transfrom it:
                try {
                    model.columns = JSON.parse(model.template);
                }
                catch(err) {
                    model.columns = [];
                }
            },

            attrs: {
                reorderable: 'boolean',
                resizable: 'boolean',
                sortable: 'boolean',
                sort: 'string'
            },

            // adjust behaviour of the iscroller:
            getDirection: function() {
                return 'xy';
            },

            removeListeners: function() {
                var element = this,
                    listener = element.getData('_headerMoveListener');
                if (listener) {
                    listener.detach();
                    element.removeData('_headerMoveListener');
                }
            },

            setListeners: function() {
                var element = this,
                    model = element.model,
                    listener;
                listener = element.selfAfter('mousemove', function(e) {
                    var node = e.target.getParent(),
                        fixedHeaderNode = element.getData('_fixedHeaderNode'),
                        vChildNodes = fixedHeaderNode.vnode.vChildNodes,
                        colIndex = vChildNodes.indexOf(node.vnode),
                        firstCol = (colIndex===0),
                        lastCol = (colIndex===(vChildNodes.length-1)),
                        xMouse = e.clientX,
                        colLeft = node.left,
                        colRight = colLeft + node.width,
                        resizeHandle, insideRightArea, insideLeftArea;
                    if (colIndex===-1) {
                        // need to have this: when entering the table from left or right,
                        // colIndex can be -1.
                        return;
                    }
                    insideRightArea = (xMouse<=colRight) && (xMouse>=(colRight-RESIZE_MARGIN));
                    insideLeftArea = !insideRightArea && (xMouse>=colLeft) && (xMouse<=(colLeft+RESIZE_MARGIN));
                    resizeHandle = model.resizable && ((insideLeftArea && !firstCol) || (insideRightArea && !lastCol));
                    fixedHeaderNode.toggleClass('resize', resizeHandle);
                });
                element.setData('_headerMoveListener', listener);
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method render
            * @chainable
            * @since 0.0.1
            */
            render: function() {
                var element = this,
                    css = '<style type="text/css"></style>',
                    fixedHeaderNode;
                // set element css:
                element.addSystemElement(css, false, true);
                element.$superProp('render');
                // fixedheadernode is only available after render of iscroller:
                fixedHeaderNode = element.getData('_fixedHeaderNode');
                fixedHeaderNode.setAttr('is', 'thead')
                               .removeClass('itsa-hidden');
            },

            templateHeaders: false,

            syncCols: function() {
                var element = this,
                    model = element.model,
                    columns = model.columns,
                    fixedHeaderNode = element.getData('_fixedHeaderNode'),
                    availableWidth = element.width - parseInt(element.getStyle('border-left-width'), 10) - parseInt(element.getStyle('border-right-width'), 10),
                    len = columns.length,
                    occupied = 0,
                    css = '',
                    headerContent = '',
                    cssNode = element.getElement('>style', true),
                    unspecified = [],
                    i, col, width, remaining, index;

                for (i=0; i<len; i++) {
                    col = columns[i];
                    if (typeof col==='string') {
                        col = {key: col};
                        columns[i] = col;
                    }
                    // now set the right width:
                    width = col.width;
                    if (width!==undefined) { // can be zero!
                        if (typeof width==='string') {
                            if (width.endsWith('%')) {
                                // calculate the width into pixels:
                                width = (width*availableWidth/100);
                            }
                            // always specified as number (saved as pixels)
                            else {
                                width = parseInt(width, 10);
                            }
                        }
                        occupied += width;
                        css += 'i-table section.i-table-row >section:nth-child('+(i+1)+'), '+
                               'i-table section.i-table-row >section:nth-child('+(i+1)+') section[is="td"], '+
                               'i-table >section[is="thead"] >span:nth-child('+(i+1)+'), '+
                               'i-table >section[is="thead"] >span:nth-child('+(i+1)+') span[is="th"] '+
                               '{width: '+width+'px}';
                    }
                    else {
                        // unspecified: give it the remaining width
                        // shared among other cols without width
                        unspecified[unspecified.length] = i;
                    }
                    // NEED DOUBLE SPAN!
                    // outer span has padding=0, so we can easily resize below padding, while the padding is applied to the inner span.
                    headerContent += '<span><span is="th">' + col.key + '</span>'+(model.sortable ? '<span is="sort"></span>' : '')+'</span>';
                }
                len = unspecified.length;
                if (len>0) {
                    remaining = Math.max(0, availableWidth - occupied)/len;
                    for (i=0; i<len; i++) {
                        index = unspecified[i];
                        css += 'i-table section.i-table-row >section:nth-child('+(index+1)+'), '+
                               'i-table section.i-table-row >section:nth-child('+(index+1)+') section[is="td"], '+
                               'i-table >section[is="thead"] >span:nth-child('+(index+1)+'), '+
                               'i-table >section[is="thead"] >span:nth-child('+(index+1)+') span[is="th"] '+
                               '{width: '+remaining+'px}';
                        occupied += remaining;
                    }
                }
                else if (occupied<availableWidth) {
                    // all cols are set, yet the table isn't fully filled
                    // we already have the last col's width set, but we can do it again: the latter will overrule.
                    // `availableWidth` holds the last set width
                    width || (width=0);
                    width += (availableWidth - occupied);
                    occupied = availableWidth; // needed for setting container width later on
                    len = columns.length; // redefine for it was changed
                    css += 'i-table section.i-table-row >section:nth-child('+len+'), '+
                           'i-table section.i-table-row >section:nth-child('+len+') section[is="td"], '+
                           'i-table >section[is="thead"] >span:nth-child('+len+'), '+
                           'i-table >section[is="thead"] >span:nth-child('+len+') span[is="th"] '+
                           '{width: '+width+'px}';

                }
                css += 'i-table >section[is="thead"], i-table >span {width:'+occupied+'px}';
                cssNode.setText(css);
                // no node.templateHeaders, but predefined:
                fixedHeaderNode.setHTML(headerContent);
                // save current definition of the columns as a copy:
                element.setData('_columnsCopy', columns.deepClone());
            },

            sync: function() {
                var element = this,
                    prevColdef = element.getData('_columnsCopy') || [],
                    scrollContainer, maxHeight, vRowChildNodes, vRowChildNode, len, i, vCellNodes, vCellChildNode, j, len2;
                element.model.columns.sameValue(prevColdef) || element.syncCols();
                element.$superProp('sync');
                if (ITSA.UA.isIE && ITSA.UA.ieVersion<10) {
                    // we need to calculate the height of each cell of every row and set the max-height as inline height
                    // only IE9, because above, we are using display: flex
                    scrollContainer = element.getData('_scrollContainer');
                    vRowChildNodes = scrollContainer.vnode.vChildNodes;
                    len = vRowChildNodes.length;
                    for (i=0; i<len; i++) {
                        vRowChildNode = vRowChildNodes[i];
                        vCellNodes = vRowChildNode.vChildNodes[0].vChildNodes;
                        len2 = vCellNodes.length;
                        // first calculate the maxheight:
                        maxHeight = 0;
                        for (j=0; j<len2; j++) {
                            vCellChildNode = vCellNodes[j].vChildNodes[0];
                            maxHeight = Math.max(maxHeight, vCellChildNode.domNode.height);
                        }
                        // set the max height for all cells
                        for (j=0; j<len2; j++) {
                            vCellChildNode = vCellNodes[j].vChildNodes[0];
                            vCellChildNode.domNode.setInlineStyle('height', maxHeight+'px');
                        }
                    }
                }
            },

            drawItem: function(oneItem, prevItem, index) {
                var element = this,
                    model = element.model,
                    columns = model.columns,
                    odd = ((index%2)!==0),
                    draggedCol = element.getData('_draggedCol'),
                    rowContent = '<section class="i-table-row '+(odd ? ' odd' : ' even')+'">',
                    len, i, col, value, formatter, cellContent;
                if (!Object.isObject(oneItem)) {
                    console.warn('table item is no object!');
                    return;
                }
                len = columns.length;
                for (i=0; i<len; i++) {
                    col = columns[i];
                    value = oneItem[col.key] || '';
                    formatter = col.formatter;
                    if (formatter) {
                        if (formatter.indexOf('<%')!==-1) {
                            cellContent = microtemplate(formatter, value);
                        }
                        else if (/{\S+}/.test(formatter)) {
                            cellContent = formatter.substitute(value);
                        }
                        else {
                            cellContent = formatter;
                        }
                    }
                    else {
                        cellContent = value;
                    }
                    // NEED DOUBLE SPAN!
                    // outer section has padding=0, so we can easily resize below padding, while the padding is applied to the inner section.
                    rowContent += '<section><section is="td" class="col-'+col.key.replaceAll(' ', '-')+((draggedCol===i) ? ' col-dragging' : '')+'">' + cellContent + '</section></section>';
                }
                rowContent += '</section>';
                return rowContent;
            },

            destroy: function() {
                this.removeListeners();
            }
        });

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
