module.exports = function (window) {
    "use strict";

    require('./css/i-table.css'); // <-- define your own itag-name here

    var itagCore = require('itags.core')(window),
        itagName = 'i-table', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        IScroller = require('i-scroller')(window),
        Itag;

    if (!window.ITAGS[itagName]) {

        Itag = IScroller.subClass(itagName, {
            attrs: {
            },

            init: function() {
                var element = this,
                    designNode = element.getItagContainer();

                // when initializing: make sure NOT to overrule model-properties that already
                // might have been defined when modeldata was boundend. Therefore, use `defineWhenUndefined`
                // element.defineWhenUndefined('someprop', somevalue); // sets element.model.someprop = somevalue; when not defined yet
                element.model.columns = ['id', 'price'];
            },

            sync: function() {
                var element = this,
                    model = element,model,
                    columns = model.columns,
                    prefColDef = element.getData('_colDef') || {},
                    i, len, col;
                // redefine columns, in case they have changed:
                if (!prefColDef.sameValue(columns)) {
                    element.setData('_colDef', columns);
                    element.columns = [];
                    len = columns.length;
                    for (i=0; i<len; i++) {
                        col = columns[i];
                        (typeof col==='string') && (col = {key: col});
                        col.keyClass = 'col'+col.key.replaceAll(' ', '-');
                        element.columns.push(col);
                    }
                }
                element.$superProp('sync');
            }

            drawItem: function(oneItem, index) {
                var element = this,
                    model = element.model,
                    template = model.template,
                    odd = ((index%2)!==0),
                    itemContent = '<tr'+(odd ? ' class="odd"' : '')+'>';
                if (typeof oneItem==='string') {
                    itemContent += oneItem;
                }
                else {
                    if (template.indexOf('<%')!==-1) {
                        itemContent += microtemplate(template, oneItem);
                    }
                    else if (/{\S+}/.test(template)) {
                        itemContent += template.substitute(oneItem);
                    }
                    else {
                        itemContent += template;
                    }
                }
                itemContent += '</tr>';
                return itemContent;
            },

            destroy: function() {
            }
        });

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
