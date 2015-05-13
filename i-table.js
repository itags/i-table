module.exports = function (window) {
    "use strict";

    require('./css/i-table.css'); // <-- define your own itag-name here
    require('itags.core')(window);

    var itagName = 'i-table', // <-- define your own itag-name here
        ITSA = window.ITSA,
        microtemplate = require('i-parcel/lib/microtemplate.js'),
        IScroller = require('i-scroller')(window),
        RESIZE_MARGIN = 5,
        Itag;

    if (!window.ITAGS[itagName]) {

        require('./global-events.js')(window);

        Itag = IScroller.subClass(itagName, {

            init: function() {
                var element = this,
                    model = element.model;
                // i-scroller reads the innercontent as it were the template
                // i-table doesn't have a global template, but uses the innercontent as the columns-definition
                // we can easily transform it:
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
                sortable: 'string',
                sort: 'string'
            },

            // adjust behaviour of the iscroller:
            getDirection: function() {
                return 'xy';
            },

            cloneItems: function() {
                // overrule `cloneItems` --> not only need they to be cloned, they might also need to be sorted
                var element = this,
                    i, len, col, columns;
                element.$superProp('cloneItems');
                // life sorting? than sort the table:
                if (element.model.sortable && (element.model.sortable.toLowerCase()==='life')) {
                    element._sortItems();
                }
                else {
                    // no guarantee the items are still sorted --> unmark it
                    columns = element.model.columns;
                    if (columns) {
                        len = columns.length;
                        for (i=0; i<len; i++) {
                            col = columns[i];
                            (col.sort==='hidden') || (col.sort='none');
                        }
                    }
                }
            },

            sort: function(colIndex, keepCurrent, force) {
                var element = this,
                    model = element.model,
                    columns = model.columns,
                    column = columns[colIndex],
                    i, len, col;
                if (!column) {
                    console.warn('trying to sort an invalid column. index: '+colIndex);
                    return;
                }
                if (!force && (!model.sortable || (column.sort==='hidden'))) {
                    console.warn('not allowed to sort column at index '+colIndex);
                    return;
                }
                len = columns.length;
                for (i=0; i<len; i++) {
                    col = columns[i];
                    if (force || (col.sort!=='hidden')) {
                        col.sort = (i===colIndex) ? ((col.sort==='up') ? 'down' : 'up') : (keepCurrent ? col.sort : 'none');
                    }
                }
            },

            _sortItems: function() {
                var element = this,
                    model = element.model,
                    column, colIndex, items, property, sortRendered, sortUp;
                // find the first col that has a sort property:
                model.columns.some(function(col, index) {
                    if ((col.sort==='up') || (col.sort==='down')) {
                        colIndex = index;
                    }
                    return (colIndex!==undefined);
                });
                if (colIndex!==undefined) {
                    column = model.columns[colIndex];
                    sortUp = (column.sort==='up');
                    items = element.getData('items');
                    property = column.key;
                    sortRendered = column.sortRendered;
                    items.sort(function(a, b) {
                        var aComp, bComp;
                        if (sortRendered) {
                            aComp = element.getCellContent(a, column);
                            bComp = element.getCellContent(b, column);
                        }
                        else {
                            aComp = a[property];
                            bComp = b[property];
                        }
                        if (aComp<bComp) {
                            return sortUp ? -1 : 1;
                        }
                        if (aComp>bComp) {
                            return sortUp ? 1 : -1;
                        }
                        // a must be equal to b
                        return sortUp ? 0 : -1;
                    });
                }
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
                    sortAttr = '',
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
                               '{width: '+width+'px;'+((width===0) ? 'height:0;' : '')+'}';
                    }
                    else {
                        // unspecified: give it the remaining width
                        // shared among other cols without width
                        unspecified[unspecified.length] = i;
                    }
                    // NEED DOUBLE SPAN!
                    // outer span has padding=0, so we can easily resize below padding, while the padding is applied to the inner span.
                    if (model.sortable) {
                        col.sort || (col.sort='none');
                        sortAttr = ' sort="'+col.sort+'"';
                    }
                    headerContent += '<span'+sortAttr+'><span is="th">' + col.key + '</span>'+(model.sortable ? '<span is="sort"></span>' : '')+'</span>';
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
                               '{width: '+remaining+'px;'+((remaining<0.5) ? 'height:0;' : '')+'}';
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
                           '{width: '+width+'px;'+((width===0) ? 'height:0;' : '')+'}';

                }
                css += 'i-table >section[is="thead"], i-table >span {width:'+occupied+'px}';
                cssNode.setText(css);
                // no node.templateHeaders, but predefined:
                fixedHeaderNode.setHTML(headerContent);
                // save current definition of the columns as a copy:
                element.setData('_columnsCopy', columns.deepClone());
                // if the sortdata changed, than we might need to resort:
                model.sortable && element._sortItems();
            },

            sync: function() {
                var element = this,
                    prevColDef = element.getData('_columnsCopy') || [],
                    scrollContainer, maxHeight, vRowChildNodes, vRowChildNode, len, i, vCellNodes, vCellChildNode, j, len2;

                element.model.columns.sameValue(prevColDef) || element.syncCols();
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

            getCellContent: function(item, col) {
                var value, formatter, cellContent;
                value = item[col.key];
                formatter = col.formatter;
                (value===undefined) && (value='');
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
                return cellContent;
            },

            drawItem: function(oneItem, prevItem, index) {
                var element = this,
                    model = element.model,
                    editCell = model.editCell,
                    columns = model.columns,
                    odd = ((index%2)!==0),
                    draggedCol = element.getData('_draggedCol'),
                    rowContent = '<section data-index="'+index+'" class="i-table-row '+(odd ? ' odd' : ' even')+'">',
                    len, i, col, cellContent, dataEditing;
                if (!Object.isObject(oneItem)) {
                    console.warn('table item is no object!');
                    return;
                }
                len = columns.length;
                for (i=0; i<len; i++) {
                    col = columns[i];
                    // NEED DOUBLE SPAN!
                    // outer section has padding=0, so we can easily resize below padding, while the padding is applied to the inner section.
                    if (editCell && (editCell.col===i) && (editCell.row===index)) {
                        cellContent = '<i-input><!--'+(oneItem[col.key] || '')+'--></i-input>';
                        dataEditing = '  data-editing="true"';
                    }
                    else {
                        cellContent = element.getCellContent(oneItem, col);
                        dataEditing = '';
                    }
                    rowContent += '<section><section is="td"'+dataEditing+' class="col-'+col.key.replaceAll(' ', '-')+((draggedCol===i) ? ' col-dragging' : '')+'">' + cellContent + '</section></section>';
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
