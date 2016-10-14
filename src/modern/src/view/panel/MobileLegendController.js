/* Copyright (c) 2015-2016 terrestris GmbH & Co. KG
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @class Koala.view.panel.MobileLegendController
 */
Ext.define('Koala.view.panel.MobileLegendController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.k-panel-mobilelegend',
    requires: [
        'Ext.MessageBox'
    ],

    /**
     *
     */
    onInitialize: function() {
        var me = this;

        me.createTreeList();
    },

    /**
     *
     */
    onPainted: function() {
        var me = this;

        me.setInitialCheckStatus();
    },

    /**
     *
     */
    createTreeList: function() {
        var me = this;
        var view = me.getView();
        var treeStore;
        var treePanel;

        treeStore = Ext.create('GeoExt.data.store.LayersTree', {
            layerGroup: Ext.ComponentQuery.query('basigx-component-map')[0].getMap().getLayerGroup()
        });

        treePanel = Ext.create('Ext.list.Tree', {
            store: treeStore,
            width: 'calc(80vw)',
            listeners: {
                tap: {
                    fn: me.onTreeItemTap,
                    element: 'element'
                },
                scope: me
            }
        });

        view.add(treePanel);
    },

    /**
     *
     */
    setInitialCheckStatus: function() {
        var me = this;
        var view = me.getView();
        var treeList = view.down('treelist');
        var treeListItems = treeList.itemMap;

        Ext.iterate(treeListItems, function(k, item) {
            if (item instanceof Ext.list.TreeItem) {
                me.setTreeItemCheckStatus(item);
            }
        });

    },

    /**
     *
     */
    setTreeItemCheckStatus: function(item) {
        var me = this;
        var layer = item.getNode().getOlLayer();
        item.setText(me.getTreeListItemTpl().apply(layer));
    },

    /**
     *
     */
    onTreeItemTap: function(evt, target) {
        var me = this;
        var view = me.getView();
        var viewModel = me.getViewModel();
        var treeList = view.down('treelist');
        var selection = treeList.getSelection();
        var layer = selection ? selection.getOlLayer() : null;

        if (!target.getAttribute("class")) {
            return false;
        }

        if (target.getAttribute("class").indexOf("fa-times") > 0) {
            me.removeLayer(layer);
            return false;
        }

        if (target.getAttribute("class").indexOf("fa-eye") > 0) {
            if (layer && layer instanceof ol.layer.Layer) {

                if (me.isLayerAllowedToSetVisible(layer)) {
                    layer.setVisible(!layer.getVisible());
                    me.setTreeItemCheckStatus(treeList.getItem(selection));
                } else {
                    Ext.Msg.show({
                        title: viewModel.get('maxLayersMsgBoxTitle'),
                        message: Ext.String.format(
                                viewModel.get('maxLayersMsgBoxMessage'),
                                view.getMaxVisibleLayers()),
                        buttons: {
                            text: viewModel.get('maxLayersMsgBoxBtnText')
                        }
                    });
                }

            }
            return false;
        }

        if (target.getElementsByTagName("img").length > 0) {
            var legend = target.getElementsByTagName("img")[0];
            if (legend.style.display === 'none') {
                legend.style.display = 'inherit';
            } else {
                legend.style.display = 'none';
            }
        }
    },

    /**
     *
     */
    isLayerAllowedToSetVisible: function(layer) {
        var me = this;
        var view = me.getView();
        var map = Ext.ComponentQuery.query('basigx-component-map')[0].getMap();
        var mapLayers = map.getLayers();
        var visibleLayers = 0;

        // if maxVisibleLayers is falsy, no limitation is given
        if (!view.getMaxVisibleLayers()) {
            return true;
        }

        // only check if the layer is requested to set visible
        if (layer.getVisible()) {
            return true;
        }

        // get the actual count of visible layers in the map
        mapLayers.forEach(function(lyr) {
            if ((lyr.getSource() instanceof ol.source.Image ||
                    lyr.getSource() instanceof ol.source.Tile) &&
                    lyr.getVisible()) {
                visibleLayers++;
            }
        });

        if (visibleLayers >= view.getMaxVisibleLayers()) {
            return false;
        }

        return true;
    },

    /**
     *
     */
    getTreeListItemTpl: function() {
        return new Ext.XTemplate(
            '<tpl if="this.display(values)">',
                '<tpl if="this.isVisible(values)">',
                    '<i class="fa fa-eye" style="color:#157fcc;"></i> {text}',
                '<tpl else>',
                    '<i class="fa fa-eye-slash" style="color:#808080;"></i> {text}',
                '</tpl>',
                '<tpl if="this.isChartingLayer(values)">',
                    ' <i class="fa fa-bar-chart"></i>',
                '</tpl>',
                '<tpl if="this.isRemovable(values)">',
                    '<span style="float:right"><i class="fa fa-times" style="color:#157fcc;"></i></span>',
                '</tpl>',
                '<tpl if="this.getFilterText(values)">',
                    '<div style="color:#666; margin-left:20px; white-space:pre-line;">{[this.getFilterText(values)]}</div>',
                '</tpl>',
                '<img style="display:none; max-width:80%; margin-left:20px;" src="{[this.getLegendGraphicUrl(values)]}"></img>',
            '</tpl>',
             {
                display: function(layer) {
                    return (layer.get(
                        BasiGX.util.Layer.KEY_DISPLAY_IN_LAYERSWITCHER
                    ) !== false);
                },
                isVisible: function(layer) {
                    return layer.getVisible();
                },
                getFilterText: function(layer) {
                    return Koala.util.Layer.getFiltersTextFromMetadata(layer.metadata);
                },
                isRemovable: function(layer) {
                    return layer.get('allowRemoval') || false;
                },
                getLegendGraphicUrl: function(layer) {
                    return Koala.util.Layer.getCurrentLegendUrl(layer);
                },
                isChartingLayer: function(layer) {
                    // TODO: set layer property accordingly
                    return !!layer.hasActiveChart;
                }
            }
        );
    },

    /**
     *
     */
    removeLayer: function(layer) {
        var me = this;
        var viewModel = me.getViewModel();
        var map = Ext.ComponentQuery.query('basigx-component-map')[0].getMap();

        Ext.Msg.show({
            title: viewModel.get('removeLayerMsgBoxTitle'),
            message: Ext.String.format(
                    viewModel.get('removeLayerMsgBoxMessage'),
                    layer.get('name')),
            buttons: [{
                text: viewModel.get('removeLayerMsgBoxYesBtnText')
            },{
                text: viewModel.get('removeLayerMsgBoxNoBtnText')
            }],
            fn: function(btnId){
                if (btnId === viewModel.get('removeLayerMsgBoxYesBtnText')) {
                    map.removeLayer(layer);
                }
            }
        });
    }

});