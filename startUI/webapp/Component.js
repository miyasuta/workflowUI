sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "demo/startUI/model/models",
    "sap/ui/model/json/JSONModel"
    ],
    function (UIComponent,
	Device,
	models,
	JSONModel
    ) {
        "use strict";

        return UIComponent.extend("demo.startUI.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                this._getUserInfo();
            },

            _getUserInfo: function () {
                const url = this._getBaseURL() + "/user-api/currentUser";
                var oModel = new JSONModel();
                var mock = {
                    firstname: "Dummy",
                    lastname: "User",
                    email: "dummy.user@com",
                    name: "dummy.user@com",
                    displayName: "Dummy User (dummy.user@com)"
                };

                oModel.loadData(url);
                oModel.dataLoaded()
                    .then(() => {
                        //check if data has been loaded
                        if (!oModel.getData().email) {
                            oModel.setData(mock);
                        }
                        this.setModel(oModel, "userInfo");
                    });
            },

            _getBaseURL: function () {
                var appId = this.getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);
                return appModulePath;
            }
        });
    }
);
