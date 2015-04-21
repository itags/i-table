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
        Itag;

    if (!window.ITAGS[itagName]) {

        Itag = IScroller.subClass(itagName, {
            attrs: {
            },

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
                    css = '<style type="text/css"></style>';
                // set element css:
                element.addSystemElement(css, false, true);
                element.$superProp('render');
            },

            sync: function() {
                var element = this,
                    columns = element.model.columns,
                    availableWidth = element.width - parseInt(element.getStyle('border-left-width'), 10) - parseInt(element.getStyle('border-right-width'), 10),
                    len = columns.length,
                    occupied = 0,
                    css = '',
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
                        if (width.endsWith('%')) {
                            // calculate the width into pixels:
                            width = (width*availableWidth/100);
                        }
                        // always specified as number (saved as pixels)
                        else {
                            width = parseInt(width, 10);
                        }
                        occupied += width;
                        css += 'i-table >span >span >span:nth-child('+(i+1)+') {width: '+width+'px}';
                    }
                    else {
                        // unspecified: give it the remaining width
                        // shared among other cols without width
                        unspecified[unspecified.length] = i;
                    }
                }
                len = unspecified.length;
                if (len>0) {
                    remaining = Math.max(0, availableWidth - occupied)/len;
                    for (i=0; i<len; i++) {
                        index = unspecified[i];
                        css += 'i-table >span >span >span:nth-child('+(index+1)+') {width: '+remaining+'px}';
                    }
                }
                cssNode.setText(css);
                element.$superProp('sync');
            },

            drawItem: function(oneItem, index) {
                var element = this,
                    model = element.model,
                    columns = model.columns,
                    odd = ((index%2)!==0),
                    rowContent = '<span class="'+(odd ? ' odd' : ' even')+'">',
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
            }
        });

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
