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
console.warn('mouseover');
        }, 'i-table >section[is="thead"]');

        Event.after('mouseout', function(e) {
            var node = e.target,
                itable = node.getParent();
            itable.removeListeners();
console.warn('mouseout');
        }, 'i-table >section[is="thead"]');

        Event.after('mousedown', function(e) {
console.warn('after mousedown '+e._colIndex);
            var colIndex = e._colIndex,
                resize = e._startResize,
                itable = e._itable,
                model = itable.model,
                fixedHeaderNode = e._fixedHeaderNode,
                vChildNodes = fixedHeaderNode.vnode.vChildNodes,
                colNode = vChildNodes[colIndex].domNode,
                column = model.columns[colIndex],
                startPos, initialWidth, moveListener;
            if (resize) {
console.warn('column: '+column);
                // start dragging-feature to change col-width
                startPos = e.clientX;
                initialWidth = colNode.width;
                moveListener = Event.after('mousemove', function(e2) {
                    var newPos = e2.clientX,
                        difference = newPos - startPos,
                        newWidth = Math.inbetween(0, initialWidth + difference, fixedHeaderNode.width);
console.warn('newWidth: '+newWidth);
                    column.width = newWidth;
                });
                Event.onceAfter('mouseup', function() {
                    moveListener.detach();
                });
            }
            else {
                // start dragging-feature to change col-position
            }
        }, function(e) {
console.warn('after mousedown filterfn');
            var node = e.target.getParent(),
                fixedHeaderNode = node.inside('i-table >section[is="thead"]'),
                itable = fixedHeaderNode.getParent(),
                model = itable.model,
                vChildNodes, colIndex, firstCol, lastCol, xMouse, colLeft, colRight, startResize, insideRightArea, insideLeftArea, filterOk;
            if (!fixedHeaderNode) {
console.warn('after mousedown returns false 1');
                return false;
            }
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
console.warn('after mousedown returns false 2');
                return false;
            }
            insideRightArea = (xMouse<=colRight) && (xMouse>=(colRight-RESIZE_MARGIN));
            insideLeftArea = !insideRightArea && (xMouse>=colLeft) && (xMouse<=(colLeft+RESIZE_MARGIN));
            // store colIndex and resize, so it can be used in the subscriber
            startResize = ((insideLeftArea && !firstCol) || (insideRightArea && !lastCol));
            filterOk = model['col-reorder'] || (model['col-resize'] && startResize);
            if (filterOk) {
                e._colIndex = insideLeftArea ? (colIndex-1) : colIndex;
                e._startResize = startResize;
                e._fixedHeaderNode = fixedHeaderNode;
                e._itable = itable;
            }
console.warn('after mousedown returns filterOk: '+filterOk);
            return filterOk;
        });

        Itag = IScroller.subClass(itagName, {

            init: function() {
console.warn('init table');
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
                'col-reorder': 'boolean',
                'col-resize': 'boolean'
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
                    resizeHandle = ((insideLeftArea && !firstCol) || (insideRightArea && !lastCol));
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

            sync: function() {
                var element = this,
                    columns = element.model.columns,
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
                    if (width) {
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
                        css += 'i-table span.i-table-row >span:nth-child('+(i+1)+'), i-table >section[is="thead"] >span:nth-child('+(i+1)+'), i-table >section[is="thead"] >span:nth-child('+(i+1)+') span[is="th"] {width: '+width+'px}';
                    }
                    else {
                        // unspecified: give it the remaining width
                        // shared among other cols without width
                        unspecified[unspecified.length] = i;
                    }
                    // NEED DOUBLE SPAN!
                    // outer span has padding=0, so we can easily resize below padding, while the padding is applied to the inner span.
                    headerContent += '<span><span is="th">' + col.key + '</span></span>';
                }
                len = unspecified.length;
                if (len>0) {
                    remaining = Math.max(0, availableWidth - occupied)/len;
                    for (i=0; i<len; i++) {
                        index = unspecified[i];
                        css += 'i-table span.i-table-row >span:nth-child('+(index+1)+'), i-table >section[is="thead"] >span:nth-child('+(index+1)+'), i-table >section[is="thead"] >span:nth-child('+(index+1)+') span[is="th"] {width: '+remaining+'px}';
                    }
                }
                cssNode.setText(css);

                // no node.templateHeaders, but predefined:
                fixedHeaderNode.setHTML(headerContent);

                element.$superProp('sync');
            },

            drawItem: function(oneItem, index) {
                var element = this,
                    model = element.model,
                    columns = model.columns,
                    odd = ((index%2)!==0),
                    rowContent = '<span class="i-table-row '+(odd ? ' odd' : ' even')+'">',
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
                    rowContent += '<span class="col-'+col.key.replaceAll(' ', '-')+'">' + cellContent + '</span>';
                }
                rowContent += '</span>';
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
