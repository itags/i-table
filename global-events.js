module.exports = function (window) {
    "use strict";

    var SORT_DELAY_WHEN_REORDERABLE = 400, // ms
        ITSA = window.ITSA,
        Event = ITSA.Event,
        RESIZE_MARGIN = 5;

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
            startPos, initialWidth, moveListener, dragNode, colLeft, verticalInsertNode, sorting, sortPromise,
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
            // column-dragging OR sorting
            colNode.setClass('i-active');
            if (model.sortable) {
                if (model.reorderable) {
                    sortPromise = window.Promise.manage();
                    sortPromise.then(function() {
                        moveListener.detach();
                        sorting = true;
                        itable.sort(colIndex);
                    }).catch(function() {});
                    ITSA.later(sortPromise.fulfill, SORT_DELAY_WHEN_REORDERABLE);
                }
                else {
                    itable.sort(colIndex);
                }
            }
            if (model.reorderable) {
                moveListener = Event.after('mousemove', function(e2) {
                    var mousePosX, difference, newX;
                    if (sorting) {
                        return;
                    }
                    if (!itable.hasData('_draggedColInited')) {
                        sortPromise && sortPromise.reject();
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
                        itable.setData('_draggedColInited', true);
                    }

                    mousePosX = e2.clientX;
                    difference = mousePosX - startPos;
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
                    colNode.removeClass('i-active');
                    if (!sorting) {
                        moveListener.detach();
                        if (itable.hasData('_draggedColInited')) {
                            dragNode.setClass('itsa-hidden');
                            verticalInsertNode.setClass('itsa-hidden');
                            colNode.removeClass('col-dragging');
                            fixedHeaderNode.removeClass('col-dragging');
                            itable.removeData('_draggedCol')
                                  .removeData('_draggedColInited');
                            if ((newIndex!==undefined) && (newIndex!==colIndex)) {
                                model.columns.insertAt(column, newIndex);
                            }
                            else {
                                itable.syncUI(); // unmark the cells with class: col-dragging
                            }
                        }
                        else {
                            sortPromise.fulfill();
                        }
                    }
                });
                itable.syncUI(); // mark the cells with class: col-dragging
            }
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
        filterOk = model.reorderable || model.sortable || (model.resizable && startResize);
        if (filterOk) {
            e._colIndex = insideLeftArea ? (colIndex-1) : colIndex;
            e._startResize = startResize;
            e._fixedHeaderNode = fixedHeaderNode;
            e._itable = itable;
        }
        return filterOk;
    });

    // making editable:
    Event.after('doubletap', function(e) {
        var cellNode = e.target.getParent(),
            rowNode = cellNode.getParent(),
            rowIndex = parseInt(rowNode.getAttr('data-index'), 10),
            colIndex = rowNode.vnode.vChildNodes.indexOf(cellNode.vnode),
            itable = rowNode.inside('i-table'),
            model = itable.model;
        model.editCell = {col: colIndex, row: rowIndex};
    }, 'i-table section[is="td"]');

    Event.after('nodeinsert', function(e) {
        e.target.focus();
    }, 'i-table i-input');

    Event.after('i-input:changed', function(e) {
        var cellNode = e.target.getParent().getParent(),
            rowNode = cellNode.getParent(),
            rowIndex = parseInt(rowNode.getAttr('data-index'), 10),
            colIndex = rowNode.vnode.vChildNodes.indexOf(cellNode.vnode),
            itable = rowNode.inside('i-table'),
            model = itable.model,
            item = itable.getData('items')[rowIndex],
            colums = model.columns,
            col = colums[colIndex];
console.warn('colIndex '+colIndex);
console.warn('check: '+(cellNode.vnode.vParent===rowNode.vnode));
console.warn(cellNode.vnode);
console.warn(rowNode.vnode.vChildNodes);
        item[col.key] = e.newValue;
        delete model.editCell;
    }, 'i-table');

};