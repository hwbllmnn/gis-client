/* Copyright (c) 2015 terrestris GmbH & Co. KG
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
Ext.define("Koala.view.form.Print", {
    extend: "Basepackage.view.form.Print",
    xtype: "k-form-print",

    maxHeight: null,
    maxWidth: 800,

    config: {
        irixUrl: '/irix-servlet'
    },

    initComponent: function() {
        this.callParent();

        /**
         * necessary to override the BasePackages bind.
         */
        this.setBind();

        var appCombo = this.down('combo[name=appCombo]');
        appCombo.setFieldLabel('Printapp');
        appCombo.setWidth(248);
        appCombo.on('select', this.addIrixFieldset, this);

    },

    listeners: {
        genericfieldsetadded: function(){
            this.addIrixCheckbox();
        }
    },

    /**
     * Overrides the default createPrint method;
     */
    createPrint: function(){
        var view = this;
        var spec = {};
        var mapComponent = view.getMapComponent();
        var mapView = mapComponent.getMap().getView();
        var layout = view.down('combo[name="layout"]').getValue();
        var format = view.down('combo[name="format"]').getValue();
        var attributes = {};
        var projection = mapView.getProjection().getCode();
        var rotation = mapView.getRotation();

        var printLayers =
            Ext.Array.filter(mapComponent.getLayers().getArray(),
            this.layerFilter);

        var serializedLayers =
            GeoExt.data.MapfishPrintProvider.getSerializedLayers(
                printLayers
        );

        var fieldsets =
            view.query('fieldset[name=attributes] fieldset');

        Ext.each(fieldsets, function(fs){
            var name = fs.name;
            // TODO double check when rotated
            var featureBbox = fs.extentFeature.getGeometry().getExtent();
            var dpi = fs.down('[name="dpi"]').getValue();

            attributes[name] = {
                bbox: featureBbox,
                dpi: dpi,
                // TODO Order of Layers in print seems to be reversed.
                layers: serializedLayers.reverse(),
                projection: projection,
                rotation: rotation
            };

        }, this);

        // Get all Fields except the DPI Field
        // TODO This query should be optimized or changed into some
        // different kind of logic
        var additionalFields = view.query(
            'fieldset[name=attributes]>field[name!=dpi]'
        );
        Ext.each(additionalFields, function(field){
            if(field.getName() === 'legend') {
                attributes.legend = view.getLegendObject();
            } else if (field.getName() === 'scalebar') {
                attributes.scalebar = view.getScaleBarObject();
            } else if (field.getName() === 'northArrow') {
                attributes.scalebar = view.getNorthArrowObject();
            } else {
                attributes[field.getName()] = field.getValue();
            }
        }, this);

        var app = view.down('combo[name=appCombo]').getValue();
        var url = view.getUrl() + app + '/buildreport.' + format;
        spec.attributes = attributes;
        spec.layout = layout;

        var irixCheckBox = this.down('[name="irix-fieldset-checkbox"]');
        var submitForm;

        if(irixCheckBox.getValue()){
            var irixJson = {};
            var mapfishPrint = [];

            spec.outputFormat = format;
            mapfishPrint[0] = spec;
            irixJson = this.setUpIrixJson(mapfishPrint);
            url = this.getIrixUrl();

            submitForm = Ext.create('Ext.form.Panel', {
                standardSubmit: true,
                url: url,
                method: 'POST',
                items: [{
                    xtype: 'textfield',
                    name: 'irixJson',
                    value: Ext.encode(irixJson)
                }]
            });
        } else {
            submitForm = Ext.create('Ext.form.Panel', {
                standardSubmit: true,
                url: url,
                method: 'POST',
                items: [{
                    xtype: 'textfield',
                    name: 'spec',
                    value: Ext.encode(spec)
                }]
            });
        }
        submitForm.submit();

    },

    addIrixCheckbox: function(){
        var me = this;
        var genericFieldset = me.down('fieldset[name=generic-fieldset]');
        var irixCheckbox = Ext.create('Ext.form.field.Checkbox', {
            name: 'irix-fieldset-checkbox',
            boxLabel: 'IRIX',
            handler: function(checkbox, checked){
                var irixFieldset = me.down('[name="irix-fieldset"]');
                if(checked){
                    irixFieldset.show();
                    me.setWidth(me.getWidth() * 3);
                } else{
                    irixFieldset.hide();
                    me.setWidth(me.getWidth() / 3);
                }
            }
        });

        genericFieldset.add(irixCheckbox);
    },

    addIrixFieldset: function(){
        var me = this;
        var fs = me.down('[name="irix-fieldset"]');
        var formContainer = me.down('[name="formContainer"]');

        if (!fs) {
            var irixFieldset = Ext.create('Ext.form.FieldSet', {
                title: 'IRIX',
                hidden: true,
                margin: '0 0 0 5px',
                flex: 2,
                name: 'irix-fieldset',
                layout: 'anchor',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'textfield',
                    name: 'Title',
                    fieldLabel: 'Titel'
                }, {
                    xtype: 'textfield',
                    name: 'User',
                    fieldLabel: 'Benutzer'
                }, {
                    xtype: 'fieldset',
                    name: 'identification-fieldset',
                    title: 'Identification',
                    items: [{
                        xtype: 'textfield',
                        name: 'OrganisationReporting',
                        fieldLabel: 'OrganisationReporting'
                    }, {
                        xtype: 'textfield',
                        name: 'ReportContext',
                        fieldLabel: 'ReportContext'
                    }, {
                        xtype: 'textfield',
                        name: 'SequenceNumber',
                        fieldLabel: 'SequenceNumber'
                    }, {
                        xtype: 'fieldset',
                        name: 'organisationcontact-fieldset',
                        title: 'OrganisationContact',
                        items: [{
                            xtype: 'textfield',
                            name: 'Name',
                            fieldLabel: 'Name'
                        }, {
                            xtype: 'textfield',
                            name: 'OrganisationID',
                            fieldLabel: 'OrganisationID'
                        }, {
                            xtype: 'textfield',
                            name: 'Country',
                            fieldLabel: 'Country'
                        }]
                    }]
                }, {
                    xtype: 'fieldset',
                    name: 'dokpoolmeta-fieldset',
                    title: 'DokpoolMeta',
                    items: [{
                        xtype: 'textfield',
                        name: 'Purpose',
                        fieldLabel: 'Purpose'
                    }, {
                        xtype: 'textfield',
                        name: 'DokpoolContentType',
                        fieldLabel: 'DokpoolContentType'
                    }, {
                        xtype: 'checkbox',
                        checked: true,
                        name: 'IsElan',
                        fieldLabel: 'IsElan',
                        boxLabel: ' '
                    }, {
                        xtype: 'checkbox',
                        checked: true,
                        name: 'IsDoksys',
                        fieldLabel: 'IsDoksys',
                        boxLabel: ' '
                    }, {
                        xtype: 'checkbox',
                        checked: true,
                        name: 'IsRodos',
                        fieldLabel: 'IsRodos',
                        boxLabel: ' '
                    }, {
                        xtype: 'checkbox',
                        checked: true,
                        name: 'IsRei',
                        fieldLabel: 'IsRei',
                        boxLabel: ' '
                    }, {
                        xtype: 'textfield',
                        name: 'NetworkOperator',
                        fieldLabel: 'NetworkOperator'
                    }, {
                        xtype: 'textfield',
                        name: 'SampleTypeId',
                        fieldLabel: 'SampleTypeId'
                    }, {
                        xtype: 'textfield',
                        name: 'SampleType',
                        fieldLabel: 'SampleType'
                    }, {
                        xtype: 'textfield',
                        name: 'Dom',
                        fieldLabel: 'Dom'
                    }, {
                        xtype: 'textfield',
                        name: 'DataType',
                        fieldLabel: 'DataType'
                    }, {
                        xtype: 'textfield',
                        name: 'LegalBase',
                        fieldLabel: 'LegalBase'
                    }, {
                        xtype: 'textfield',
                        name: 'MeasuringProgram',
                        fieldLabel: 'MeasuringProgram'
                    }, {
                        xtype: 'textfield',
                        name: 'Status',
                        fieldLabel: 'Status'
                    }, {
                        xtype: 'textfield',
                        name: 'SamplingBegin',
                        fieldLabel: 'SamplingBegin'
                    }, {
                        xtype: 'textfield',
                        name: 'SamplingEnd',
                        fieldLabel: 'SamplingEnd'
                    }]
                }]
            });
            formContainer.add(irixFieldset);
        }

    },

    setUpIrixJson: function(mapfishPrint){
        var irixJson = {};

        // Setup basic structure

        // Set printapp field on toplevel from combo
        irixJson.printapp = "" + this.down('combo[name=appCombo]').getValue();
        // TODO hardcoded request type for now
        irixJson['request-type'] = 'upload/respond';

        // Main irix object
        irixJson.irix = {};
        // subobjects
        irixJson.irix.Identification = {};
        irixJson.irix.Identification.OrganisationContact = {};
        irixJson.irix.DokpoolMeta = {};
        // on top-level, the array of mapfish-print
        irixJson['mapfish-print'] = mapfishPrint;

        // fill created irix structure
        var irixFields = this.query('fieldset[name=irix-fieldset] > field');
        Ext.each(irixFields, function(field){
            // currently 'Title' & 'User'
            irixJson.irix[field.getName()] = "" + field.getValue();
        });

        var identificationFields = this.query('fieldset[name=identification-fieldset] > field');
        Ext.each(identificationFields, function(field){
            irixJson.irix.Identification[field.getName()] = "" + field.getValue();
        });

        var organisationcontactFields = this.query('fieldset[name=organisationcontact-fieldset] > field');
        Ext.each(organisationcontactFields, function(field){
            irixJson.irix.Identification.OrganisationContact[field.getName()] = "" + field.getValue();
        });

        var dokpoolmetaFields = this.query('fieldset[name=dokpoolmeta-fieldset] > field');
        Ext.each(dokpoolmetaFields, function(field){
            irixJson.irix.DokpoolMeta[field.getName()] = "" + field.getValue();
        });

        return irixJson;
    }
});

//fillit = function(){
//    Ext.each(Ext.ComponentQuery.query('k-form-print textfield'), function(field){if(!(field instanceof Ext.form.field.ComboBox)){field.setValue(field.getName())} });
//}
